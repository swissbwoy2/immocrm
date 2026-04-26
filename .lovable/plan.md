## Objectif

- **Hero (`DiagonalSplitReveal`)** : conserver intégralement le scroll frame-par-frame sur 10 secondes — **aucune modification**.
- **Mockup iPhone (`AppShowcaseSection`)** : passer en **autoplay loop simple** sur **tous** les devices (desktop, tablette, mobile), supprimer toute la logique de scrubbing.

## Fichier modifié

`src/components/public-site/sections/AppShowcaseSection.tsx`

## Changements détaillés

1. **Supprimer la logique de scrub** :
   - Retirer les imports `useScroll`, `useSpring`, `useMotionValueEvent`.
   - Retirer les refs `targetTimeRef`, `currentTimeRef`, `rafRef`.
   - Retirer le `useEffect` rAF (lerp + `video.currentTime`).
   - Retirer le hook `useScroll` + `useSpring` + `useMotionValueEvent`.
   - Retirer le state `videoReady` et la constante `SCRUB_DURATION`.

2. **Forcer autoplay partout** :
   - Remplacer `const useScrub = !isMobile && !prefersReducedMotion` par `const useScrub = false` (ou simplement supprimer la branche scrub).
   - L'élément `<video>` reste avec `autoPlay loop muted playsInline preload="metadata"`.
   - Garder le `useEffect` de fallback qui force `v.play()` sur première interaction tactile (utile iOS avec économiseur de batterie).

3. **Section layout** :
   - Retirer `height: '220vh'` et le wrapper `sticky top-0 h-screen`.
   - La section devient un bloc standard `py-16 md:py-24` avec `min-h` naturel — exactement comme la branche mobile actuelle.

4. **Conserver tel quel** :
   - Détection `isMobile` (utile pour `IPhoneMockup3D flat={isMobile}` et `scale-[0.78]`).
   - Ordre `order-2 lg:order-1` mockup / `order-1 lg:order-2` texte.
   - Tous les visuels (orbital rings, halo, badge "En direct", feature bars, CTA).

## Résultat attendu

- **Hero** : scroll-scrubbing 10s intact (déjà géré dans `DiagonalSplitReveal`, fichier non touché).
- **Section "Notre application"** : la vidéo dans l'iPhone tourne en boucle automatique dès l'arrivée à l'écran, sur desktop, tablette et mobile. Plus de scroll bloqué/long, l'utilisateur scrolle naturellement à travers la section.
