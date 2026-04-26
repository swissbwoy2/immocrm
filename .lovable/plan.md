## Objectif
Rendre le scrubbing de la vidéo (`/public/videos/dashboard-client.mp4`) parfaitement fluide quand l'utilisateur scrolle sur la section "Notre application" sur desktop.

## Diagnostic
La vidéo actuelle :
- 540×1168, H.264, 30 fps, 10 s, 300 frames, ~1.18 MB
- Encodée en H.264 standard → **keyframes espacées tous les ~250 frames** → chaque `video.currentTime = X` doit décoder depuis le keyframe précédent → lag perceptible et saccadé.
- `useSpring(stiffness: 200, damping: 25, mass: 0.3)` est encore un peu nerveux et provoque des micro-secousses quand on combine spring + seek lent.

## Plan d'amélioration

### 1. Ré-encoder la vidéo avec **toutes les frames en keyframe** (all-intra)
C'est LA clé pour un scrubbing fluide. Je relance ffmpeg avec :
- `-g 1 -keyint_min 1` → chaque frame est un keyframe (seek instantané)
- `-x264-params "keyint=1:scenecut=0"` (sécurité)
- `-crf 23 -preset slow` → garde une bonne qualité
- `-movflags +faststart` (déjà présent)
- Garde 540×1168, 30 fps, 10 s, sans audio
Taille attendue : ~3–5 MB (acceptable, gain de fluidité énorme).

Sortie → `public/videos/dashboard-client.mp4` (overwrite).

### 2. Adoucir la spring dans `AppShowcaseSection.tsx`
Remplacer :
```ts
useSpring(scrollYProgress, { stiffness: 200, damping: 25, mass: 0.3 })
```
par une spring plus douce et plus inertielle :
```ts
useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.35, restDelta: 0.0005 })
```
→ mouvement plus glissé, moins réactif aux à-coups du trackpad/molette.

### 3. Utiliser `requestVideoFrameCallback` + throttle frame-aligned
Au lieu d'écrire `currentTime` à chaque event motion (qui peut tirer 120 fois/s sur trackpad ProMotion), je :
- Stocke la cible dans une ref (`targetTimeRef`).
- Dans une boucle `requestAnimationFrame`, j'interpole vers la cible (lerp 0.15) et j'appelle `video.currentTime = lerped` **une seule fois par frame**, et seulement si la différence dépasse `1/30 s` (un pas de frame).
→ Évite les doubles seeks par frame, supprime les saccades.

### 4. Allonger légèrement le track scroll
Passer `height: '160vh'` → `'200vh'` sur desktop pour donner plus d'amplitude au scroll → chaque crans de molette = moins de delta vidéo = perception plus fluide.

### 5. Préchargement garanti avant scrub
Avant d'autoriser le scrub, attendre `loadeddata` + `canplaythrough` ; tant qu'on n'a pas ça, on n'écrit pas dans `currentTime`. (Évite les freezes au premier scroll.)

## Fichiers modifiés
- `public/videos/dashboard-client.mp4` (ré-encodage all-intra via ffmpeg)
- `src/components/public-site/sections/AppShowcaseSection.tsx` (spring + rAF lerp + track 200vh + gate readiness)

## Aucun changement
- `IPhoneMockup3D.tsx` (mockup intact)
- Comportement mobile (autoplay loop) inchangé — seul le desktop scrub est concerné
