## Objectif

Transformer la vidéo de fond du hero d'accueil (`DiagonalSplitReveal`) :
- Au lieu de jouer en `autoPlay loop`, la vidéo **avance frame par frame en fonction du scroll**.
- Plage de scrub : **0 → 7 secondes** de la vidéo (et non la durée totale).
- Une fois la dernière frame atteinte, la vidéo **reste figée** sur la frame finale (pas de loop, pas de bascule autoplay).
- **Pas d'autoplay sur mobile** : le scrub se déclenche dès que l'utilisateur scrolle.

## Fichier modifié

`src/components/public-site/DiagonalSplitReveal.tsx`

## Changements techniques

### 1. Élément `<video>` (desktop, mobile, reduced-motion)
- Retirer `autoPlay` et `loop`.
- Ajouter `ref={videoRef}`, garder `muted playsInline preload="auto"`.
- Précharger la frame initiale : au `onLoadedMetadata`, faire `video.currentTime = 0` et `video.pause()`.

### 2. Desktop / Tablette — scrub lié au `smoothProgress`
Utiliser `useMotionValueEvent` de framer-motion :
```ts
useMotionValueEvent(smoothProgress, 'change', (p) => {
  const v = videoRef.current;
  if (!v) return;
  const targetMax = Math.min(7, v.duration || 7); // cap à 7s
  v.currentTime = Math.min(p, 1) * targetMax;
});
```
La piste sticky existante (`220vh` desktop / `180vh` tablette) sert déjà de "rail" de scrub — aucun changement de hauteur nécessaire.

### 3. Mobile — scrub one-shot au scroll utilisateur
Actuellement le mobile fait un one-shot animation (split en 1.6s) déclenché à `scrollY > 40`.
Nouveau comportement :
- Pas d'autoplay (déjà retiré globalement).
- Quand `hasScrolled` passe à `true`, lancer une animation manuelle qui fait passer `video.currentTime` de 0 → 7s sur ~1.6s (même durée que le split d'image), via `requestAnimationFrame`.
- À la fin, `video.pause()` sur la frame 7s.
- Si l'utilisateur n'a pas encore scrollé, la vidéo reste figée sur la frame 0.

### 4. Reduced motion
- Retirer aussi `autoPlay loop` ici.
- Au mount, set `video.currentTime = 7` (frame finale) et `video.pause()` → l'utilisateur voit directement l'image finale immersive.

## Points d'attention

- **iOS Safari** : le scrubbing nécessite un MP4 avec keyframes fréquents. Le fichier actuel `hero-reveal-video.mp4` devrait fonctionner ; si saccades visibles, on pourra le ré-encoder (hors scope ici).
- **Aucune modification** des transitions diagonales (clip-path, translate, opacity du titre) — uniquement la lecture vidéo change.
- **Aucune nouvelle dépendance** (`useMotionValueEvent` est déjà dans framer-motion installé).

## Hors scope

- Pas de changement sur `HeroSection.tsx` ni sur les autres landings.
- Pas de ré-encodage du MP4.
- Pas de fallback séquence d'images.
