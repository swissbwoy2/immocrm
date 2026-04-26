
# Objectif
Éliminer toutes les micro-saccades du scrub vidéo Hero pour un rendu **ultra fluide** sur mobile, tablette et desktop, tout en conservant les 10 secondes frame-par-frame.

# Diagnostic actuel
Le composant `DiagonalSplitReveal.tsx` souffre de 3 sources de saccades :

1. **Spring trop "raide"** (`stiffness: 120, damping: 30, mass: 0.4`) → réagit trop vite au scroll, amplifie les ticks de la molette/du pouce.
2. **`useMotionValueEvent` synchrone** : chaque event de scroll déclenche immédiatement `video.currentTime = X`. Or sur mobile, les seek vidéo coûtent cher → si plusieurs events arrivent en <16ms, on bloque le thread principal.
3. **Aucun throttle via `requestAnimationFrame`** : le seek se fait hors du cycle de rendu du navigateur, ce qui désynchronise vidéo et transformations CSS.
4. **Seuil de seek trop bas** (`0.02s`) → trop de seeks consécutifs sur petits scrolls.

# Plan d'action — `src/components/public-site/DiagonalSplitReveal.tsx`

### 1. Adoucir le spring pour un lissage premium
Remplacer le `useSpring` par des paramètres plus "soyeux" :
- `stiffness: 60` (au lieu de 120) → réaction plus douce
- `damping: 22` (au lieu de 30) → moins de freinage brutal
- `mass: 0.6` (au lieu de 0.4) → inertie plus naturelle
- Résultat : le scroll se "déroule" au lieu de saccader.

### 2. Synchroniser le seek vidéo avec `requestAnimationFrame`
Au lieu d'appliquer `video.currentTime` immédiatement dans `useMotionValueEvent` :
- Stocker la cible dans un `useRef` (`targetTimeRef`).
- Lancer une boucle `requestAnimationFrame` qui interpole la valeur actuelle vers la cible (lerp à ~25% par frame).
- Appliquer `video.currentTime` **une seule fois par frame** (60fps max).
- Annuler la boucle au démontage.

Bénéfice : le seek est synchronisé avec le repaint navigateur → zéro tearing, zéro saccade.

### 3. Augmenter le seuil de seek
Passer de `0.02s` à `0.04s` → réduit de moitié le nombre de seeks coûteux sur mobile sans perte visible de précision.

### 4. Utiliser `requestVideoFrameCallback` quand disponible
Sur Chrome/Safari récents, l'API `video.requestVideoFrameCallback()` permet de synchroniser parfaitement le rendu CSS avec la frame vidéo réellement décodée. Fallback gracieux sur `requestAnimationFrame` pour Firefox.

### 5. Forcer l'accélération GPU sur la vidéo
Ajouter `transform: translateZ(0)` et `backface-visibility: hidden` sur le wrapper vidéo pour garantir une compositing layer dédiée (évite les repaints du compositor).

### 6. Préserver tout le reste
- `SCRUB_DURATION = 10s` : inchangé
- `trackHeight` (340/360/380vh) : inchangé
- Logique d'unlock iOS : inchangée
- Fallback autoplay : inchangé
- Clip-path diagonal et transformations image : inchangés

# Fichiers modifiés
- `src/components/public-site/DiagonalSplitReveal.tsx` (uniquement)

# Résultat attendu
- Scroll perçu comme "buttery smooth" sur iPhone, iPad, desktop.
- Vidéo qui suit le doigt/la molette sans à-coups.
- Aucune régression sur la durée (10s) ni sur la révélation diagonale.
