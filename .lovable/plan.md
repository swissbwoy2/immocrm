# Étendre is_shared / badge « Co-agent » à Visites.tsx et Carte.tsx

## Contexte

Le calendrier (`Calendrier.tsx` + `PremiumAgentDayEvents.tsx`) affiche déjà les visites/événements des co-agents avec un badge violet « Co-agent : Prénom N. » et désactive les actions sur les items partagés.

Cette logique doit être étendue à deux autres écrans :
- `src/pages/agent/Visites.tsx` — liste des visites (charge déjà ses propres + co-agents avec un flag `is_own`, mais le badge est minimaliste et **les actions ne sont pas désactivées**).
- `src/pages/agent/Carte.tsx` — carte Google Maps (ne charge **que** ses propres visites aujourd'hui).

## Périmètre

**Visites.tsx** : 4 actions à désactiver pour les visites partagées + badge harmonisé + pas de bulk select sur partagées.
**Carte.tsx** : élargir la requête + distinguer visuellement les marqueurs des co-agents.

## Détails techniques

### 1. `src/pages/agent/Visites.tsx`

#### a) Mapping (loadVisites)

Remplacer le mapping `visitesWithProfiles` (~ligne 300) pour ajouter `is_shared` et `shared_by_name` dérivés du flag `is_own` déjà présent :

```ts
const visitesWithProfiles = visitesData?.map(v => {
  const isShared = v.is_own === false;
  const sharedAgent: any = v.agents;
  const prenom = sharedAgent?.profiles?.prenom ?? '';
  const nom = sharedAgent?.profiles?.nom ?? '';
  return {
    ...v,
    client_profile: profilesMap.get(v.clients?.user_id),
    candidature: candidaturesMap.get(`${v.offre_id}-${v.client_id}`) || null,
    is_shared: isShared,
    shared_by_name: isShared ? `${prenom} ${nom.charAt(0)}.`.trim() : null,
  };
}) || [];
```

#### b) Carte de visite (`renderPremiumVisiteCard`, lignes 680-921)

- Calculer `const isShared = !!visite.is_shared;` en tête de fonction.
- Style : ajouter `'border-dashed border-purple-500/50 bg-purple-500/[0.02] opacity-90'` quand `isShared` (priorité sur `urgency.urgent`).
- Remplacer le badge minimaliste actuel (lignes 747-751) par un badge violet harmonisé :
  ```tsx
  {isShared && visite.shared_by_name && (
    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
      <Users className="h-3 w-3 mr-1" />
      Co-agent : {visite.shared_by_name}
    </Badge>
  )}
  ```
  (importer `Users` depuis `lucide-react` si pas déjà fait).
- **Désactiver actions** : envelopper avec `{!isShared && (...)}` :
  - Bouton « Marquer effectuée / Donner feedback » (lignes 858-882).
  - Bouton « Déléguer à un coursier » (lignes 884-902).
  - Bouton « Annuler délégation » (lignes 903-917).
  - Checkbox de bulk select (lignes 717-724) → ne pas afficher si partagée.
- `onClick={() => handleOpenDetail(visite)}` (ligne 699) reste actif (lecture du détail OK).

#### c) Carte « En attente » (`renderPendingRequestCard`, lignes 924-1061)

Une visite déléguée par un autre agent ne doit pas pouvoir être acceptée/refusée par moi. Filtrer en amont, là où cette fonction est appelée :

```ts
.filter((v: any) => !v.is_shared)
```

(à appliquer là où `renderPendingRequestCard` est utilisé — chercher les appels après ligne 1063 et ajouter le filtre).

#### d) Bulk delete

Dans `toggleVisiteSelection` / `selectAll`, exclure les `is_shared`. Le plus simple : la checkbox n'apparaît plus pour ces items (point b), donc l'utilisateur ne peut pas les sélectionner. Mais aussi exclure dans une éventuelle action « tout sélectionner » : chercher `setSelectedVisites(new Set(visites...` et filtrer `.filter(v => !v.is_shared)`.

#### e) Dialog de détail (selectedVisite)

Dans le `Dialog` de détail (autour des lignes 1640-1740), désactiver également les boutons d'action si `selectedVisite?.is_shared` :
- `handleAcceptDelegatedVisit` (boutons lignes 1647 et 1738).
- `handleRefuseDelegatedVisit` (ligne 1658).
- `handleMarquerEffectuee` (ligne 1671).
- `handleDeleteVisite` (ligne 1704).

Remplacer ces boutons par un message info :
```tsx
{selectedVisite?.is_shared && (
  <div className="p-3 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 text-sm flex items-center gap-2">
    <Users className="h-4 w-4" />
    Visite gérée par {selectedVisite.shared_by_name} (co-agent) — lecture seule
  </div>
)}
```

### 2. `src/pages/agent/Carte.tsx`

#### a) Élargir la requête

Récupérer les co-clients et faire un OR sur `agent_id` ou `client_id IN (co)` :

```ts
const { data: agentData } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
if (!agentData) { setLoading(false); return; }

const { data: clientAgentsData } = await supabase
  .from('client_agents')
  .select('client_id')
  .eq('agent_id', agentData.id);
const coClientIds = clientAgentsData?.map(ca => ca.client_id) || [];

const clientFilter = coClientIds.length > 0 ? `,client_id.in.(${coClientIds.join(',')})` : '';

const { data } = await supabase
  .from('visites')
  .select('*, agents:agent_id(id, user_id, profiles!agents_user_id_fkey(prenom, nom))')
  .or(`agent_id.eq.${agentData.id}${clientFilter}`)
  .gte('date_visite', new Date().toISOString())
  .order('date_visite', { ascending: true })
  .limit(15000);

const enriched = (data || []).map((v: any) => {
  const isShared = v.agent_id !== agentData.id;
  const prenom = v.agents?.profiles?.prenom ?? '';
  const nom = v.agents?.profiles?.nom ?? '';
  return {
    ...v,
    is_shared: isShared,
    shared_by_name: isShared ? `${prenom} ${nom.charAt(0)}.`.trim() : null,
  };
});
setVisites(enriched);
```

#### b) Distinguer les marqueurs partagés

Approche minimaliste sans toucher à `VisitesMapView` : injecter un statut virtuel `partagee` côté Carte.tsx pour les visites des co-agents, et l'ajouter au `STATUS_CONFIG` :

```ts
const STATUS_CONFIG = {
  // ... existant
  partagee: { label: 'Co-agent', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
};

// Avant le render :
const visitesForMap = filteredVisites.map((v: any) => 
  v.is_shared ? { ...v, statut: 'partagee' } : v
);
```

Et passer `visitesForMap` à `<VisitesMapView missions={visitesForMap} ... />`.

Avantage : la pin Google Maps + le label dans la liste latérale prennent automatiquement la couleur violette via `statusConfig`.

#### c) Filtre supplémentaire (optionnel)

Ajouter un Select « Mes visites / Co-agents / Toutes » pour permettre d'isoler. Hors périmètre minimal — on s'en tient au filtre temporel existant pour cette itération.

## Hors périmètre

- Notifications temps réel quand un co-agent crée/modifie une visite.
- Ajout du flag `is_shared` à `Dashboard.tsx` ou autres écrans secondaires.
- Toggle « afficher visites des co-agents » (par défaut tout est visible).

## Résultat attendu

- **Visites.tsx** : visites des co-agents listées avec un badge violet harmonisé, bordure pointillée, **aucun bouton d'action** (marquer effectuée, déléguer, annuler, supprimer, accepter/refuser). Le détail s'ouvre en lecture seule avec un bandeau « gérée par {Co-agent} ».
- **Carte.tsx** : marqueurs des visites des co-agents affichés en violet sur la carte, repérables instantanément pour éviter les conflits de tournée.
