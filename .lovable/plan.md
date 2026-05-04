# Partage du calendrier entre agents co-assignés

## Objectif

Permettre à chaque agent co-assigné sur un même client de **voir dans son propre calendrier** les visites et événements créés par ses collègues sur ce client. Ainsi :
- Plus de visites fixées **en double** sur la même offre.
- Plus de **conflits horaires** (deux agents proposant la même plage au même client).

Le partage est limité aux **clients réellement co-assignés** (via `client_agents`). Les visites/events des autres clients restent invisibles.

## Périmètre

**Pages impactées :**
- `src/pages/agent/Calendrier.tsx` — calendrier principal
- `src/pages/agent/Visites.tsx` — liste des visites
- `src/pages/agent/Carte.tsx` — carte des visites

**Pas impacté :** clients, coursiers, admin, propriétaires (logique inchangée).

## Comportement utilisateur

1. Quand l'agent A et l'agent B sont co-assignés au client X :
   - Agent A voit dans son calendrier ses propres visites **+** celles que B a créées pour le client X.
   - Idem pour B.
2. Les visites/events « partagées » (créées par un autre agent co-assigné) sont **visuellement distinguées** :
   - Petit badge « Co-agent : Prénom N. » sur la carte de visite.
   - Couleur/opacité légèrement différente pour les distinguer des siennes.
3. **Lecture seule** sur les visites des co-agents :
   - Pas de bouton modifier/supprimer/feedback sur une visite créée par un autre.
   - Tooltip explicatif : « Visite créée par {agent}, lecture seule ».
4. Avant de fixer une nouvelle visite, l'agent voit visuellement le créneau déjà occupé par son co-agent sur le même client → conflit évité.

## Détails techniques

### 1. Récupération des données (Calendrier.tsx)

La RLS sur `visites` autorise déjà la lecture pour les co-agents (policy `Agents multi peuvent gérer visites`). Aucune migration nécessaire.

**Modifier `loadData()` :**

```ts
// Après avoir récupéré clientIds via client_agents
const clientIds = clientAgentsData?.map(ca => ca.client_id) || [];

// Visites : élargir le filtre — soit miennes, soit sur un client co-assigné
const visitesRes = await supabase
  .from('visites')
  .select('*, offres(*), clients!visites_client_id_fkey(id, user_id), agents!visites_agent_id_fkey(id, user_id, profiles!agents_user_id_fkey(prenom, nom))')
  .or(`agent_id.eq.${agentData.id},client_id.in.(${clientIds.join(',')})`)
  .order('date_visite', { ascending: true })
  .limit(15000);

// Calendar events : idem
const eventsRes = await supabase
  .from('calendar_events')
  .select('*, agents!calendar_events_agent_id_fkey(id, profiles!agents_user_id_fkey(prenom, nom))')
  .or(`agent_id.eq.${agentData.id},client_id.in.(${clientIds.join(',')})`)
  .order('event_date', { ascending: true });
```

Garder un fallback si `clientIds` est vide (uniquement filtre sur `agent_id`).

### 2. Marquage « visite partagée »

Ajouter un flag dérivé côté front :

```ts
const visitesWithProfiles = visitesRes.data?.map(v => ({
  ...v,
  is_shared: v.agent_id !== agentData.id,
  shared_by_name: v.agent_id !== agentData.id 
    ? `${v.agents?.profiles?.prenom ?? ''} ${v.agents?.profiles?.nom?.[0] ?? ''}.`
    : null,
  // ... reste inchangé
}));
```

### 3. RLS calendar_events (à vérifier)

Vérifier que la policy SELECT de `calendar_events` autorise la lecture pour co-agents. Sinon, ajouter une migration :

```sql
CREATE POLICY "Co-agents can view shared calendar events"
  ON public.calendar_events FOR SELECT
  USING (
    client_id IN (SELECT get_my_co_agent_client_ids())
  );
```

### 4. UI — distinction visuelle

Dans `PremiumAgentDayEvents.tsx` et `EventManagerCalendar` :
- Si `visite.is_shared === true` → ajouter badge `<Badge variant="outline">Co-agent : {shared_by_name}</Badge>`.
- Désactiver les actions (modifier, feedback, supprimer) avec tooltip.
- Légère opacité (ex. `opacity-80`) ou bordure pointillée pour les visites partagées.

### 5. Filtre client (existant)

Le filtre par client fonctionne tel quel : si l'agent filtre sur le client X, il verra à la fois ses visites et celles de ses co-agents pour X.

### 6. Pages secondaires

- `Visites.tsx` : appliquer la même logique `.or(...)` + badge « Co-agent ».
- `Carte.tsx` : appliquer la même logique pour que les marqueurs des co-agents apparaissent (avec couleur différente).

## Hors périmètre (à confirmer)

- Notifications quand un co-agent crée/modifie une visite : **pas inclus** dans ce plan (peut être ajouté ensuite).
- Synchronisation Google Calendar des visites partagées : **pas inclus** (chaque agent ne sync que ses propres visites).
- Édition collaborative (les deux agents pouvant modifier la même visite) : **non**, lecture seule pour préserver l'attribution.

## Résultat attendu

Après implémentation, deux agents co-assignés au même client voient le même planning de visites pour ce client, avec des couleurs distinguant qui a créé quoi. Les doublons et chevauchements deviennent visuellement évidents avant validation.
