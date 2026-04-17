
## Objectif

Ajouter uniquement le **logo Immo-Rama animé** lors du chargement des pages dans les espaces privés (admin, agent, client). Garder le thème actuel inchangé.

## Plan

### 1. Utiliser `PageLoader.tsx` existant
Le composant existe déjà (`src/components/PageLoader.tsx`) avec :
- Logo Immo-Rama
- Animation pulse + ping ring
- 3 dots qui rebondissent
- Texte "Logisorama by Immo-rama.ch"

Aucune modification nécessaire — il est parfait.

### 2. Brancher `PageLoader` sur le `<Suspense>` global de `src/App.tsx`
Vérifier le fallback actuel et le remplacer par `<PageLoader />`. Cela garantit que **chaque navigation vers une route lazy-loaded** affiche le logo pendant le chargement du chunk JS.

### 3. Améliorer `src/components/PageTransition.tsx`
Actuellement il ne fait rien (juste un wrapper). Ajouter un mini-loader qui s'affiche brièvement pendant les transitions internes (entre routes déjà chargées) si la transition dépasse 150ms.

## Fichiers à modifier

- ✏️ `src/App.tsx` — fallback Suspense global = `<PageLoader />`
- ✏️ `src/components/PageTransition.tsx` — afficher logo si transition > 150ms

## Garanties

- ✅ Thème actuel **inchangé** sur admin/agent/client (aucune modif CSS)
- ✅ Landing publique garde le thème luxe ivoire & or
- ✅ Logo Immo-Rama affiché à chaque chargement de page dans les espaces privés
- ✅ Zéro impact sur auth, RLS, Edge Functions, tracking, performance
