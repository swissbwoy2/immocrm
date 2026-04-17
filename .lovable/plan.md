
## Analyse de la demande

3 objectifs distincts :
1. **Loader global** avec logo Immo-Rama à chaque changement de page
2. **Page admin "Offres envoyées"** trop lente / ne s'ouvre pas (1500+ offres)
3. **Augmenter la capacité du site** pour fluidité maximale

## Investigation nécessaire

Je dois lire avant de planifier précisément :
- `src/components/PageLoader.tsx` (existant) — pour le remplacer par un loader brandé
- `src/components/PageTransition.tsx` — voir si un loader transition existe
- La page "Offres envoyées" admin — identifier le fichier et la requête lente
- `src/App.tsx` — où injecter le loader global Suspense

## Plan d'action

### Lot 1 — Loader global brandé Immo-Rama
- Refondre `src/components/PageLoader.tsx` avec :
  - Logo `logoImmoRama` (déjà importé ailleurs) animé (pulse + spinner subtil)
  - Fond blanc/dark adaptatif
  - Texte "Logisorama" + "by Immo-rama.ch"
- S'assurer qu'il est utilisé dans **tous** les `<Suspense fallback={...}>` du routing (App.tsx) → remplacer les fallbacks `null` ou autres loaders par `<PageLoader />`

### Lot 2 — Page "Offres envoyées" admin (perf 1500+ offres)
Diagnostic probable : requête SELECT * sans pagination + jointures lourdes (clients, profiles, immeubles).

Optimisations à appliquer :
- **Pagination serveur** : afficher 50 offres par page avec `range()` au lieu de tout charger
- **Filtres avant requête** : statut / agent / date pour réduire le volume avant fetch
- **Compteur via `count: 'exact', head: true`** au lieu de récupérer toutes les lignes pour la stat
- **Index DB** : vérifier index sur `offres.created_at`, `offres.statut`, `offres.agent_id` — créer migration si manquants
- **Lazy-load** des données secondaires (profil acheteur) seulement à l'expansion d'une carte
- **Skeleton loader** pendant le fetch (pas un blocage total)

### Lot 3 — Capacité d'instance Lovable Cloud
La capacité serveur (Postgres CPU/RAM) ne se modifie **pas par code** — c'est un paramètre d'infrastructure côté Lovable Cloud.

→ Je vais expliquer à l'utilisateur **où cliquer** pour upgrader l'instance Cloud (Backend → Advanced settings → Upgrade instance) et fournir un bouton `presentation-open-backend`. Cela complète les optimisations code du Lot 2.

### Lot 4 — Performance générale du chargement
- Vérifier que les routes utilisent bien `lazy()` partout (déjà le cas pour CookieConsent, à étendre si besoin)
- Précharger le logo Immo-Rama (`<link rel="preload">` dans `index.html`) pour éviter le flash sur le loader
- Confirmer que le `PageTransition` n'ajoute pas de délai artificiel

## Fichiers impactés

1. `src/components/PageLoader.tsx` — refonte avec logo
2. `src/App.tsx` — uniformiser les Suspense fallbacks
3. `index.html` — preload du logo
4. Page admin offres envoyées (à identifier : probablement `src/pages/admin/OffresEnvoyees.tsx` ou similaire) — pagination + filtres + count head
5. Migration SQL — index sur `offres` si manquants

## Garanties
- Aucun impact sur l'authentification, les RLS, le tracking UTM, ni les Edge Functions
- Pagination respecte la règle mémoire `limit(15000)` / `fetchAllPaginated` (utilisé uniquement quand nécessaire — ici on veut au contraire **limiter** l'affichage)
- Logo respecte la charte `mem://style/brand-identity-guidelines`

## Question préalable

Avant de coder, je dois confirmer un point ambigu sur le loader.
