
## Objectif

Ajouter sur `/admin/agents/:id` un bloc **« Projection financière »** qui montre, pour cet agent uniquement :
- **Commission projetée de l'agent** (sa part personnelle)
- **CA projeté de l'agence** issu de ses dossiers (part agency)
- Un détail ligne par ligne pour comprendre d'où viennent les chiffres

Réutilise exactement la même formule que le Dashboard admin pour rester cohérent.

## Formule (identique à `Dashboard.tsx` lignes 246-275)

Pour chaque client lié à l'agent (via `client_agents`, primaire **ou** co-agent) :
- Filtre : `statut <> 'reloge'` ET ancienneté ≤ 90 jours
- `splitAgent` = `client_agents.commission_split` de **la ligne de cet agent** (pas du primaire) → c'est la quote-part personnelle de cet agent ; fallback `clients.commission_split` puis `45`
- `base` = `clients.budget_max` (loyer mensuel) — modèle location, commission = loyer brut sans TVA (mémoire)
- `commissionAgent`  = `base × splitAgent / 100`
- `partAgence`       = `base × (100 - splitAgent) / 100`

Total agent = somme des `commissionAgent` ; Total agence = somme des `partAgence`.

## Plan UI (un seul fichier : `src/pages/admin/AgentDetail.tsx`)

### 1. Étendre le fetch (autour des lignes 213-244 où on charge déjà `client_agents` pour cet agent)

Sélectionner aussi `commission_split, is_primary` (déjà fait) + `clients.budget_max, clients.commission_split, clients.statut, clients.date_ajout` (déjà via `clients!inner(*)`). Aucun appel supplémentaire nécessaire.

### 2. Calculer la projection en mémoire

Dans un `useMemo`, mapper `clients` → `{ clientId, clientName, base, splitAgent, commissionAgent, partAgence, isPrimary, daysElapsed }` en filtrant statut/90 jours, puis sommer.

### 3. Insérer un nouveau bloc juste avant la section « Clients assignés » (ligne ~789)

Layout :
- **2 grandes tuiles côte à côte** (style cohérent avec les KPIs existants ligne 730) :
  - 💰 « Commission projetée agent » — gros chiffre CHF + sous-titre `X dossiers actifs`
  - 🏢 « CA projeté agence » — gros chiffre CHF + sous-titre `Sur la base des budgets max`
- **Mini-tableau dépliable** (`Collapsible`) listant chaque client contributeur : nom, badge `Principal`/`Co-agent`, budget, % agent, CHF commission, CHF agence. Trié par contribution agent décroissante.
- **Note explicative** discrète : « Projection sur les locations, sur 90 jours d'ancienneté, hors clients relogés. Modèle : commission = loyer brut sans TVA. »

### 4. Réutiliser le composant existant ?

`AgencyProjectionSection` (admin/AgencyProjectionSection.tsx) est centré sur l'agence globale et liste **plusieurs agents**. Pour la page d'un agent on veut une vision plus condensée et centrée sur lui. → Créer un petit composant local `AgentFinancialProjection.tsx` (~80 lignes) qui prend `{ commissionAgent, partAgence, items[] }` en props pour ne pas alourdir AgentDetail.

## Hors scope (à confirmer)

Ventes (`biens_en_vente`, modèle Net Seller) : la projection actuelle du Dashboard ne les inclut pas. Je propose de les laisser hors de cette projection pour rester strictement cohérent avec ce que voit déjà l'admin sur le Dashboard. Si tu veux les ajouter aussi (3ᵉ tuile « Pipeline ventes »), dis-le.

## Fichiers touchés

- `src/pages/admin/AgentDetail.tsx` (ajout du bloc + useMemo, ~30 lignes)
- `src/components/admin/AgentFinancialProjection.tsx` (nouveau, ~80 lignes)

Aucune migration DB, aucune Edge Function.
