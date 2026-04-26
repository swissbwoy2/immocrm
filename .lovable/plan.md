## Problèmes identifiés

1. **Couleurs hors charte** : la section utilise du jaune vif `hsl(45 100% 50%)` alors que tout le site (Hero, Pricing) utilise un **doré champagne sobre** `hsl(38 45% 48%)` → `hsl(38 55% 65%)` sur fond `hsl(30 15% 8%)`.
2. **Scroll scrub cassé** : 
   - Le track de **200vh** crée un effet "tunnel" qui peut donner l'impression que le scroll est bloqué.
   - Sur mobile, `useScroll` + `currentTime` n'est pas fiable si `preload="metadata"` n'a pas chargé assez de frames → la vidéo reste figée.
   - Le `useSpring` avec damping=30 ajoute du lag perçu comme "ne suit pas".
3. **UX mobile** : le mockup iPhone est trop grand, les anneaux orbitaux dépassent, et la hauteur 160vh sur mobile + sticky cause des saccades.

## Corrections

### 1. Charte couleur (AppShowcaseSection.tsx + IPhoneMockup3D.tsx)
Remplacer **toutes** les occurrences de :
- `hsl(45 100% 50%)` → `hsl(38 45% 48%)` (doré principal)
- `hsl(38 85% 55%)` / `hsl(38 80% 45%)` → `hsl(38 55% 65%)` (doré clair)
- Gradient CTA : `from-[hsl(38_45%_44%)] via-[hsl(38_55%_52%)] to-[hsl(28_35%_38%)]` (identique au Hero)
- Texte sur boutons : `text-[hsl(40_35%_98%)]` au lieu de `text-black`
- Eyeglow / halo / rings : tons `hsl(38 45% 48% / 0.x)`
- Réutiliser la classe `luxury-shimmer-btn luxury-cta-glow` du Hero pour cohérence

### 2. Scroll scrub robuste
- **Réduire le track** : `120vh` desktop, `100vh` mobile (au lieu de 200/160) → la section ne "bloque" plus le scroll perçu.
- **Précharger la vidéo** : `preload="auto"` + `playsInline muted` + déclencher `v.load()` au mount pour avoir les frames seekables immédiatement.
- **Supprimer useSpring** sur mobile (ou réduire stiffness à 200, damping 20) → scrub plus réactif.
- **Fallback intelligent** : si après 2s la vidéo n'a pas `readyState >= 2`, basculer sur `autoplay loop` plutôt que de rester figé.
- **Désactiver le scrub sur mobile** : sur < 768px, utiliser directement `autoplay loop muted playsInline` (le scrub frame-par-frame est très peu fiable sur Safari iOS et donne une mauvaise UX). Garder le scrub uniquement desktop/tablette large.

### 3. UX mobile
- Mockup iPhone : `scale-75` sur mobile, anneaux orbitaux masqués (`hidden md:block`).
- Layout : passer en `flex-col` strict sur mobile avec mockup **au-dessus** du texte (ordre 1), pas en grille inversée.
- Réduire les `blur-3xl` (coûteux GPU mobile) → `blur-2xl` + opacité réduite.
- Padding section : `py-16` mobile au lieu de hauteur fixe.
- Badge "En direct" : repositionner pour ne pas chevaucher le contenu mobile.

### 4. Bonus
- Ajouter `will-change: transform` sur le wrapper iPhone pour fluidité.
- Respecter `prefers-reduced-motion` (déjà partiellement fait, à compléter en désactivant le scrub).

## Fichiers modifiés
- `src/components/public-site/sections/AppShowcaseSection.tsx` (refonte couleurs + logique scroll mobile/desktop)
- `src/components/public-site/IPhoneMockup3D.tsx` (vérifier couleurs frame titanium si jaunes utilisées)

## Résultat attendu
- Section visuellement intégrée (doré champagne sobre identique au Hero/Pricing).
- Scroll naturel et fluide sur PC : la vidéo défile en suivant le scroll.
- Sur mobile/tablette : la vidéo joue en autoplay loop discret, plus de blocage perçu.
- Mockup iPhone bien dimensionné, pas de débordement.