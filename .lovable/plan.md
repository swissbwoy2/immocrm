## Objectif

Sur `/agent/clients`, distinguer instantanément clients **principaux**, **co-assignés** et **portfolio total**, avec focus par défaut sur les principaux. 100% UI/front, aucune migration, aucun changement RLS ni backend.

## Fichiers modifiés

- `src/pages/agent/MesClients.tsx`
- `src/components/premium/PremiumClientCard.tsx` (2 props optionnelles + badge)

## 1. Exposer la responsabilité dans la donnée client

Dans la boucle `transformedClients` de `MesClients.tsx`, ajouter au objet retourné :
- `isPrimaryAgent: boolean` — déjà calculé localement, à exposer
- `primaryAgentName: string | null` — prénom de l'agent principal **uniquement si** l'agent connecté est co-assigné ; sinon `null`

Source : entrée `client_agents` où `is_primary === true`, via le profil joint déjà chargé.

## 2. State scope (focus par défaut)

```ts
const [selectedScope, setSelectedScope] = useState<'primary' | 'co' | 'all'>('primary');
```

Pas de `localStorage` — l'agent revient toujours sur ses principaux à l'ouverture.

## 3. Bloc KPI premium (3 cartes cliquables)

Inséré juste sous `PremiumPageHeader`, au-dessus des filtres existants.

```text
┌────────────────────┬────────────────────┬────────────────────┐
│ Crown   Principaux │ Handshake Co-ass.  │ Briefcase  Total   │
│        X clients   │        Y clients   │      X+Y clients   │
│  Priorité de suivi │   Support équipe   │     Vue globale    │
└────────────────────┴────────────────────┴────────────────────┘
```

- Carte 1 "Principaux" : accent primaire fort, icône `Crown` → `setSelectedScope('primary')`
- Carte 2 "Co-assignations" : style secondaire/muted, icône `Handshake` → `setSelectedScope('co')`
- Carte 3 "Portfolio total" : neutre, icône `Briefcase` → `setSelectedScope('all')`
- État sélectionné : ring + shadow

## 4. Calcul des compteurs (stables)

Basés sur `clientsActifsOnly` (déjà existant, exclut `reloge`) :

```ts
const primaryClients = clientsActifsOnly.filter(c => c.isPrimaryAgent === true);
const coAssignedClients = clientsActifsOnly.filter(c => c.isPrimaryAgent !== true);
const primaryCount = primaryClients.length;
const coCount = coAssignedClients.length;
const totalCount = primaryCount + coCount;
```

Catégories exclusives, pas de doublons. Compteurs non impactés par recherche / filtres secondaires / tri.

## 5. Pills filtre "Périmètre"

Ligne dédiée au-dessus de la barre de recherche, 3 pills synchronisées avec `selectedScope` :
- `🌟 Principaux (X)`
- `🤝 Co-assignés (Y)`
- `📊 Tous (X+Y)`

Filtre scope appliqué **avant** les autres dans `filteredClients`. Recherche texte et filtres existants inchangés.

## 6. Badge "Principal / Co-assigné" sur la carte

Modifier `PremiumClientCard.tsx` :
- 2 nouvelles props optionnelles : `isPrimaryAgent?: boolean`, `primaryAgentName?: string | null`
- Inséré en **première position** dans la zone badges du header (lignes 140-159)
  - `isPrimaryAgent` → badge accent `<Crown /> Principal`
  - sinon → badge muted `<Users /> Co-assigné`, suffixé `avec {primaryAgentName}` si disponible

`MesClients.tsx` passe les deux props lors du rendu.

## 7. Tri intelligent en vue "Tous"

Dans `sortedClients`, si `selectedScope === 'all'` : trier d'abord par `isPrimaryAgent` desc, puis appliquer le tri date existant. Les autres scopes gardent le tri actuel.

## 8. Empty states contextuels

Selon `selectedScope` :
- `primary` → "Aucun client principal assigné pour le moment." / "Les clients dont vous êtes responsable apparaîtront ici en priorité."
- `co` → "Aucune co-assignation active." / "Les clients partagés avec votre équipe apparaîtront ici."
- `all` → "Aucun client actif trouvé." / "Votre portefeuille client apparaîtra ici dès qu'un client vous sera assigné."

## Hors scope

Dashboard, page détail, autres pages, DB, RLS, edge functions, chargement de données, indicateurs métier (urgence, prochaine action, score). Rien d'autre.

## Validation

Build TS OK + `/agent/clients` :
- Ouvre par défaut sur "Principaux"
- 3 compteurs corrects, clic carte = filtre
- Pills synchronisées
- Badge `Principal` / `Co-assigné avec X` visible
- Vue "Tous" : principaux en tête
- Filtres et recherche existants intacts
