## Objectif

Sur `/admin/clients`, ajouter un mode d'affichage **"Clients par agent"** pour piloter la charge de travail (assignations principales, co-assignations, total portfolio, clients récents en priorité, clients sans agent). 100% UI/front. Mode `Liste clients` actuel **strictement intact**.

## Périmètre

- **Modifier** : `src/pages/admin/Clients.tsx`
- **Créer** : `src/components/admin/clients/ClientsByAgentView.tsx`
- **Ne pas modifier** : DB, RLS, Edge Functions, `AdminClientDetail`, dashboard, système d'assignation, page agent, `PremiumClientCard`, types globaux.

## 1. Chargement front enrichi (non bloquant)

Dans `loadData()` de `Clients.tsx` :

```ts
type ClientAgent = { client_id: string; agent_id: string; is_primary: boolean; created_at: string | null };
const [clientAgents, setClientAgents] = useState<ClientAgent[]>([]);

const { data: caData, error: caError } = await supabase
  .from('client_agents')
  .select('client_id, agent_id, is_primary, created_at')
  .limit(15000);

if (caError) console.error('client_agents fetch failed', caError);
setClientAgents(caData ?? []);
```

**Non bloquant** : erreur ou null → `setClientAgents([])`. La page et le mode `Liste clients` restent 100% fonctionnels.

## 2. Toggle de mode d'affichage

À côté de `PremiumPageHeader`, 2 pills :

```ts
const [viewMode, setViewMode] = useState<'list' | 'byAgent'>('list');
```

- `list` = défaut, **strictement inchangé**. Pas de localStorage.
- `byAgent` → `<ClientsByAgentView clients={clients} clientProfiles={clientProfiles} agents={agents} clientAgents={clientAgents} />`.

## 3. Composant `ClientsByAgentView`

### 3.1 Types locaux légers

```ts
type ClientLite = { id: string; user_id?: string | null; agent_id?: string | null; created_at?: string | null; updated_at?: string | null; [k: string]: any };
type ProfileLite = { nom?: string | null; prenom?: string | null; email?: string | null; telephone?: string | null; [k: string]: any };
type AgentLite = { id: string; profile?: ProfileLite; [k: string]: any };

type ClientsByAgentViewProps = {
  clients: ClientLite[];
  clientProfiles: Map<string, ProfileLite>; // keyed by client.user_id (structure existante)
  agents: AgentLite[];
  clientAgents: ClientAgent[];
};
```

Aucun type global du projet n'est modifié.

### 3.2 States internes (valeurs techniques stables)

```ts
const [selectedAgent, setSelectedAgent] = useState<'all' | string>('all');
const [responsibilityFilter, setResponsibilityFilter] = useState<'all' | 'primary' | 'co'>('all');
const [clientSortOrder, setClientSortOrder] = useState<'desc' | 'asc'>('desc');
const [searchTerm, setSearchTerm] = useState('');
```

Logique = valeurs techniques uniquement. Labels UI séparés.

### 3.3 Helpers profil client (fallbacks sécurisés)

`clientProfiles` est une `Map<user_id, Profile>` (clés = `client.user_id`), champs `nom`/`prenom`/`email`/`telephone`.

```ts
const getClientProfile = (c: ClientLite): ProfileLite | undefined =>
  c.user_id ? clientProfiles.get(c.user_id) : undefined;

const getClientDisplayName = (c: ClientLite): string => {
  const p = getClientProfile(c);
  const full = [p?.prenom ?? (c as any).prenom, p?.nom ?? (c as any).nom]
    .filter(Boolean).join(' ').trim();
  return full || 'Client sans profil';
};

const getClientDisplayEmail = (c: ClientLite): string | null => {
  const p = getClientProfile(c);
  return p?.email ?? (c as any).email ?? null;
};

const getClientDisplayPhone = (c: ClientLite): string | null => {
  const p = getClientProfile(c);
  return p?.telephone ?? (c as any).telephone ?? null;
};
```

**Jamais** d'erreur runtime si `user_id` absent ou profil manquant : le client reste visible avec `Client sans profil`.

### 3.4 Helpers recherche

```ts
const matchesClientSearch = (c: ClientLite, term: string): boolean => {
  const n = term.trim().toLowerCase();
  if (!n) return true;
  const p = getClientProfile(c);
  const values = [
    p?.prenom, p?.nom, p?.email, p?.telephone,
    (c as any).prenom, (c as any).nom, (c as any).email, (c as any).telephone,
  ].filter(Boolean).join(' ').toLowerCase();
  return values.includes(n);
};

const matchesAgentSearch = (a: AgentLite, term: string): boolean => {
  const n = term.trim().toLowerCase();
  if (!n) return true;
  const values = [a.profile?.prenom, a.profile?.nom, a.profile?.email]
    .filter(Boolean).join(' ').toLowerCase();
  return values.includes(n);
};
```

Recherche combinée : un client matche si `matchesClientSearch(c)` OU si son agent matche.

Données dérivées via `useMemo`.

## 4. Assignments (anti-doublons)

```ts
type Assignment = { clientId: string; agentId: string; isPrimary: boolean; assignedAt: string | null };
```

1. Indexer `clientAgents` par `client_id`.
2. Pour chaque client :
   - Si ≥1 ligne `client_agents` → utiliser uniquement `client_agents`.
   - Sinon → fallback `clients.agent_id` → `{ isPrimary: true, assignedAt: client.created_at }`.
3. Déduplication finale `(clientId, agentId)` via `Map` ; `isPrimary === true` gagne ; garder `assignedAt` le plus récent.

**Jamais** additionner `client_agents` + `clients.agent_id` pour le même client.

## 5. Clients sans agent

```ts
clientsWithoutAgent = clients.filter(c => !clientAgentsByClient.has(c.id) && !c.agent_id);
```

## 6. Agent buckets + agents introuvables

```ts
const agentsById = new Map(agents.map(a => [a.id, a]));
```

`Map<agentId, { agent: AgentLite | null; isUnknown: boolean; primary: ClientLite[]; co: ClientLite[] }>`.

Si `agentId` absent de `agentsById` : bucket avec `isUnknown: true`, label `Agent inconnu`, style discret. KPI corrects, clients non perdus.

Set sur `clientId` par agent.

## 7. KPI globaux (5 cartes, `PremiumKPICard`)

```ts
const uniqueClientCount = new Set(clients.map(c => c.id)).size;
```

1. **Clients actifs** — `uniqueClientCount`, "Tous agents confondus"
2. **Agents actifs** — agents (connus + inconnus) avec ≥1 client, "Portefeuille en cours"
3. **Assignations principales** — `assignments.filter(a => a.isPrimary).length`, "Responsabilité directe"
4. **Co-assignations** — `assignments.filter(a => !a.isPrimary).length`, "Support équipe"
5. **Sans agent** — `clientsWithoutAgent.length`, "À traiter", alerte douce. **Uniquement si > 0**.

Note : `Clients actifs = clients uniques. Assignations principales et co-assignations = relations agent-client.`

## 8. Filtres de la vue

- Select Agent : `Tous les agents` (`'all'`) + agents connus.
- Pills Responsabilité : `Tous` / `Principaux` / `Co-assignés`.
- Recherche texte (helpers §3.4).
- Select Tri clients : `Plus récent d'abord` (`'desc'`, défaut) / `Plus ancien d'abord` (`'asc'`).

## 9. Section "Clients sans agent assigné"

```ts
const filteredClientsWithoutAgent = clientsWithoutAgent.filter(c => matchesClientSearch(c, searchTerm));
const showWithoutAgentSection =
  filteredClientsWithoutAgent.length > 0 &&
  selectedAgent === 'all' &&
  responsibilityFilter === 'all';
```

Jamais de section vide. Liste limitée à 10 + bouton `Voir tous (Z)`. Badge `Sans agent` alerte douce.

```ts
navigate(`/admin/clients/${client.id}`)  // backticks
```

Route confirmée : `/admin/clients/:id`.

## 10. Tri des clients

Cascade : `assignedAt` → `client.updated_at` → `client.created_at`. Défaut `'desc'`.

## 11. Cartes agent

```text
┌─────────────────────────────────────────────┐
│ [Avatar] Prénom Nom · email                 │
│ X principaux · Y co-assignés · Z total      │
├─────────────────────────────────────────────┤
│ Client A   [Crown Principal]   10.06.2026   │
│ Client B   [Users Co-assigné]  08.06.2026   │
│   → Principal : Prénom                      │
└─────────────────────────────────────────────┘
```

- Buckets `isUnknown` : header `Agent inconnu`, style discret.
- Liste respecte filtres + tri.
- Ligne cliquable → `` navigate(`/admin/clients/${client.id}`) ``.
- 10 clients max + bouton `Voir tous (Z)`.
- Nom/email affichés via `getClientDisplayName` / `getClientDisplayEmail` (fallback `Client sans profil`).

## 12. Badges responsabilité

- **Principal** : `Crown`, accent primaire.
- **Co-assigné** : `Users`, variant `secondary` muted, suffixe `avec {Prénom principal}` si dispo (via `client_agents.is_primary=true` ou fallback `clients.agent_id` ; `Agent inconnu` si introuvable).
- **Sans agent** : alerte douce.

## 13. Tri des agents

Défaut : nb principaux desc → total desc → alphabétique. Buckets `isUnknown` en fin.
Select optionnel léger : `Plus de principaux` / `Plus grand portefeuille` / `A-Z`.
Agents sans client dans le filtre actif : carte masquée.

## 14. Empty states

- Aucun agent avec client : "Aucun client assigné pour le moment." / "Les portefeuilles agents apparaîtront ici dès qu'un client sera assigné."
- Filtres trop restrictifs : "Aucun client ne correspond à ces filtres." / "Modifiez l'agent, le type d'assignation ou la recherche."

## 15. Anti-doublons compteurs (strict)

- KPI 1 = `new Set(clients.map(c => c.id)).size`.
- KPI 3/4 = relations.
- KPI 5 = clients uniques sans assignation.
- Compteurs par agent = Set sur `clientId`.
- Si `client_agents` existe → ignorer `clients.agent_id`.

## 16. Anti-régression (priorité maximale)

Mode `Liste clients` **strictement intact** : filtres, recherche, tri, multi-sélection, bulk, navigation détail, responsive, permissions, design premium. Fonctionne même si `clientAgents = []`. Aucun type global modifié.

## 17. Hors scope

DB, RLS, Edge Functions, page détail, dashboard, création/édition client, système d'assignation, page agent, `PremiumClientCard`, types globaux. Pas de scoring, objectifs, commissions, alertes, automatisations.

## 18. Validation

- Build TS OK (aucun type global touché).
- Mode `Liste clients` défaut et 100% intact.
- Fetch `client_agents` non bloquant.
- KPIs corrects ; KPI 5 et section "Sans agent" affichés uniquement si pertinent (jamais vide).
- Recherche via `clientProfiles.get(client.user_id)` + fallback champs client + agent.
- Helpers `getClientDisplayName`/`Email`/`Phone` : aucun crash si `user_id`/profil absent, fallback `Client sans profil`.
- Section "Sans agent" filtrée par recherche, masquée si `selectedAgent !== 'all'` ou `responsibilityFilter !== 'all'`.
- Bucket `Agent inconnu` pour `agent_id` introuvables ; clients non perdus.
- Logique basée sur valeurs techniques (`'all' | 'primary' | 'co'`, `'desc' | 'asc'`).
- Cartes agent : compteurs corrects, tri défaut récent → ancien.
- Badges Principal / Co-assigné / Sans agent visibles, suffixe `avec {Prénom}` quand dispo.
- Navigation via backticks `` `/admin/clients/${client.id}` ``.
- KPI 1 via Set strict.
- Aucun doublon `agent_id` + `client_agents`.
- Responsive mobile/tablette OK.
