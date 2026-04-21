

# Plan : corriger le crash dashboard client après inscription `/nouveau-mandat`

## Diagnostic

**Cliente concernée** : Pranvera Durguti (Haris Qeska, créée 21/04 13:16) — a bien `client_id` + `parcours_type='location'` en base. Donc le profil existe, le client existe, mais le dashboard `/client` crashe et tombe sur l'ErrorBoundary global de `main.tsx` → page rouge "Une erreur est survenue".

**Problème** : impossible de savoir QUEL composant crashe car :
1. L'ErrorBoundary global (`src/components/ErrorBoundary.tsx`) n'affiche la stack que en `import.meta.env.DEV` — invisible en prod sur logisorama.ch.
2. Aucun log d'erreur n'est envoyé en base.
3. Un seul ErrorBoundary global = tout le dashboard tombe pour un seul sous-composant qui crashe.

**Hypothèses du composant qui crashe** (à isoler) :
- `PremiumCandidatesCard` avec `clientRevenus = 0` et `budgetDemande = 0` (nouveau client n'a rien renseigné)
- `SolvabilityAlert` / `PremiumDossierChecklistCard` avec données vides
- `PremiumMandatProgress` avec `date_ajout` null
- Hook `useNotifications` ou `useClientCandidates` avec un `client.id` fraîchement créé sans données associées

## Correctif (3 axes)

### Axe 1 — Rendre l'ErrorBoundary diagnostique en production

Fichier : `src/components/ErrorBoundary.tsx`

- Toujours afficher l'erreur (toString + premières lignes du componentStack) même en prod, dans un `<details>` repliable "Détails techniques".
- Logger automatiquement chaque crash dans une table `error_logs` (créer la table via migration : `id, user_id, error_message, error_stack, component_stack, page_url, user_agent, created_at`) pour qu'on puisse voir côté admin ce qui a planté chez la cliente.
- Ajouter un bouton "Se déconnecter" en plus de "Réessayer" / "Retour à l'accueil" pour permettre à un client coincé de sortir d'une session corrompue.

### Axe 2 — Isoler chaque section du dashboard avec un ErrorBoundary local

Fichier : `src/pages/client/Dashboard.tsx`

Wrapper individuellement avec `<SectionErrorBoundary>` (nouveau composant léger) :
- `PremiumDashboardHeader`
- Bloc KPIs
- `ClientStatsSection`
- `SolvabilityAlert` / `PurchaseSolvabilityAlert`
- `PremiumDossierChecklistCard`
- `PremiumCandidatesCard`
- Bloc candidatures en cours

Chaque `SectionErrorBoundary` affiche un petit message inline "Cette section est temporairement indisponible" au lieu de faire tomber tout le dashboard.

### Axe 3 — Hardening défensif des composants suspects

Fichiers :
- `src/components/premium/PremiumCandidatesCard.tsx` : tolérer `clientRevenus = 0` et `budgetDemande = 0` sans crash.
- `src/components/premium/PremiumDossierChecklistCard.tsx` : tolérer `candidates = []` et `documents = []`.
- `src/components/SolvabilityAlert.tsx` : tolérer `result.budgetDemande = 0` (pas afficher "budget supérieur à 0" si rien renseigné).
- `src/pages/client/Dashboard.tsx` ligne 452-453 : `calculateDaysElapsed/calculateDaysRemaining` doivent tolérer `client.date_ajout` null + `client.created_at` null (fallback à `new Date()`).

## Contraintes

- ZÉRO modification de la logique métier (RLS, queries Supabase, calculs de solvabilité existants).
- Préserver le dispatcher `parcours_type` actuel.
- Ne PAS toucher au flux `/nouveau-mandat` qu'on vient de refondre.
- La table `error_logs` doit avoir RLS : INSERT public pour authenticated, SELECT réservé aux admins.

## Validation

1. Migration `error_logs` créée + RLS en place.
2. La cliente Pranvera reload `/client` → soit le dashboard s'affiche, soit elle voit quelles sections sont en panne (mais le reste fonctionne).
3. Si crash persistant : on consulte `error_logs` pour `user_id = '5ff93bde-c9f3-48f2-852e-4db43477fe60'` et on a la stack précise → on corrige le composant exact.
4. Build TypeScript = 0 erreur.
5. Tester en local en simulant un client neuf : `client.date_ajout = null, revenus_mensuels = 0, candidates = []` → dashboard rendu sans crash.

## Fichiers modifiés

```text
src/components/ErrorBoundary.tsx               (toujours afficher + log DB + bouton signout)
src/components/SectionErrorBoundary.tsx        (NOUVEAU — léger)
src/pages/client/Dashboard.tsx                 (wrap chaque section + fallback dates)
src/components/premium/PremiumCandidatesCard.tsx          (defensive)
src/components/premium/PremiumDossierChecklistCard.tsx    (defensive)
src/components/SolvabilityAlert.tsx                       (defensive)
supabase/migrations/<timestamp>_error_logs.sql            (nouvelle table + RLS)
```

Approuve → je passe en mode default, je crée la table `error_logs`, je rends l'ErrorBoundary diagnostique, j'isole chaque section, et on identifie immédiatement quel composant crashe chez ta cliente.

