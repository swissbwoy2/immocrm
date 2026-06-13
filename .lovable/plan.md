## Objectif

Alléger la home publique en supprimant deux éléments lourds :
1. **`DiagonalSplitReveal`** — animation scrub scroll qui pré-charge une vidéo MP4 hero.
2. **`TravelingGoldKey3D`** — scène 3D Three.js fixée en arrière-plan, montée dans `HomePage.tsx`.

## Changements

### 1. `src/components/public-site/sections/HeroSection.tsx`
- Retirer les imports `DiagonalSplitReveal`, `heroRevealVideo`, `heroChasseurMobileAsset` (et `heroChasseurAsset` si plus utilisé).
- Remplacer le wrapper `<DiagonalSplitReveal>...</DiagonalSplitReveal>` par directement la `<section>` interne.
- Ajouter dans la section un fond simple : image statique `hero-chasseur-split.png` (desktop) / `hero-chasseur-mobile-916.png` (mobile via `<picture>`), avec overlay `bg-background/85` pour garder la lisibilité du contenu. Pas d'animation scrub, pas de vidéo.

### 2. `src/pages/public-site/HomePage.tsx`
- Retirer l'import `TravelingGoldKey3D` et son `WebGLErrorBoundary` wrapper.
- Garder le reste du flux des sections inchangé.

### 3. Fichiers candidats à suppression (optionnel, à confirmer ensuite)
- `src/components/public-site/DiagonalSplitReveal.tsx`
- `src/components/public-site/3d/TravelingGoldKey3D.tsx` (+ assets 3D liés)
- `src/assets/hero-reveal-video.mp4`

Je laisserai ces fichiers en place dans cette passe pour ne rien casser, et on pourra purger après vérification visuelle si tout est OK.

## Hors scope
- Aucune modification des autres sections, du theme, des couleurs, des CTA.
- Aucune modification backend.

## Vérification
- Screenshot mobile 390×844 et desktop 1280×720 : hero rendu avec l'image statique, plus de vidéo qui charge, plus de canvas 3D dans le DOM.
