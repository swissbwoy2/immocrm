## Problème
Sur mobile, l'ouverture fonctionne mais la fermeture (scroll vers le haut) ne se déclenche pas correctement.

**Cause racine** dans `src/components/ui/scroll-expansion-hero.tsx` :
1. Le composant retourne une **version statique sans animation** quand `window.innerWidth < 768px` → aucune réversibilité possible.
2. Sur desktop, le conteneur `250vh` mappé sur `[0, 0.5]` crée ~125vh de "scroll mort" avant que la fermeture ne soit visible.
3. `isMobile` est calculé une seule fois au render (pas réactif au resize/rotation).

## Solution

### 1. Supprimer le bypass mobile
Retirer la branche `if (isMobile || prefersReducedMotion)` qui désactive Framer Motion sur petit écran. Garder uniquement la branche `prefersReducedMotion` pour l'accessibilité (sans expansion, juste l'image statique).

### 2. Détection mobile réactive
Remplacer le calcul one-shot par le hook existant `useIsMobile` (déjà dans le projet, basé sur `matchMedia`).

### 3. Compresser la zone de scroll
- Hauteur conteneur : `250vh` → `150vh`
- Plages `useTransform` : `[0, 0.5]` → `[0, 1]` pour utiliser toute la course
- Idem pour `titleOpacity`/`titleY` : `[0, 0.3]` → `[0, 0.6]`

### 4. Lisser via useSpring
Wrapper `scrollYProgress` avec `useSpring({ stiffness: 100, damping: 30, restDelta: 0.001 })` pour fluidifier l'inertie tactile mobile (où le scroll est saccadé).

### 5. Adaptations mobile
- Scale initial : `0.78` mobile / `0.6` desktop (image plus visible dès le départ sur petit écran)
- `touch-action: pan-y` sur le conteneur sticky pour éviter les conflits gestuels
- Typographie responsive déjà présente (`text-4xl md:text-6xl`)

## Fichier modifié
- `src/components/ui/scroll-expansion-hero.tsx` — logique unique animée (mobile + desktop), avec fallback `prefersReducedMotion` uniquement.

## Pas d'impact
- Pas de changement sur les sections enfants (`children`)
- Pas de changement sur `container-scroll-animation.tsx`
- Pas de changement business / data
