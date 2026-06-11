# Optimisation /agent/clients — ajustements finaux

La majorité de la spec est **déjà implémentée** dans `src/pages/agent/MesClients.tsx` :
- 3 KPI cards cliquables (Principaux / Co-assignations / Portfolio total) avec icônes Crown / Handshake / Briefcase
- `selectedScope` initialisé à `'primary'` (focus par défaut)
- Pills Principaux / Co-assignés / Tous avec compteurs
- Tri `recent` / `ancien` + clients principaux en premier en mode `all`
- Empty states contextuels par scope
- Badges `Principal` / `Co-assigné avec [Prénom]` déjà gérés dans `PremiumClientCard`

Restent **4 ajustements ciblés**, 100 % front, anti-régression, sans toucher au backend.

## 1. `src/pages/agent/MesClients.tsx`

### a. Aligner les libellés KPI sur la spec
- `Principaux` → `Mes principaux`
- `Co-assignations` → `Co-assignés`
- `Portfolio total` → `Total portfolio`

(Les pills gardent `Principaux / Co-assignés / Tous` comme demandé.)

### b. Étendre la recherche client
Actuellement la recherche ne couvre que `prenom` + `nom`. Ajouter `email` et `telephone` (déjà mappés dans le `transformedClients`) :

```ts
const q = searchTerm.toLowerCase();
const matchSearch = q === "" ||
  client.prenom?.toLowerCase().includes(q) ||
  client.nom?.toLowerCase().includes(q) ||
  `${client.prenom} ${client.nom}`.toLowerCase().includes(q) ||
  client.email?.toLowerCase().includes(q) ||
  client.telephone?.toLowerCase().includes(q);
```

### c. Total portfolio dédupliqué via `Set`
Remplacer `totalCount = primaryCount + coCount` par :

```ts
const totalCount = new Set([
  ...primaryClients.map(c => c.id),
  ...coAssignedClients.map(c => c.id),
]).size;
```

(Comportement identique aujourd'hui car les buckets sont mutuellement exclusifs, mais conforme à la spec et défensif si la logique d'assignation évolue.)

## 2. `src/components/premium/PremiumClientCard.tsx`

Fallback texte quand l'agent principal est introuvable :

```tsx
{isPrimaryAgent === false && (
  <Badge>
    {primaryAgentName
      ? `Co-assigné avec ${primaryAgentName}`
      : 'Co-assigné avec agent inconnu'}
  </Badge>
)}
```

## Hors scope (non touché)
- DB / RLS / Edge Functions
- Page admin Clients / dashboard / page détail client
- Système d'assignation, types globaux
- Filtres existants (régions, pièces, type recherche, permis, statut, budget)
- Responsive, design premium, navigation

## Validation
- Build TS OK
- `/agent/clients` ouvre sur scope `primary`
- KPI affichent `Mes principaux`, `Co-assignés`, `Total portfolio`
- Recherche fonctionne sur nom, prénom, email, téléphone
- Total dédupliqué via `Set`
- Badge `Co-assigné avec agent inconnu` visible quand le prénom du principal manque
