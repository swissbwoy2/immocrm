# Plan de correction

## Objectif
Faire en sorte que la bannière, la barre de menu et le texte du hero ne se chevauchent plus sur mobile, tout en gardant la bannière visible.

## Ce que je vais corriger
1. Remplacer les offsets codés en dur par un espacement fiable entre bannière, header et contenu.
2. Donner au header une hauteur mobile stable pour éviter les variations qui recouvrent le hero.
3. Ajouter au hero un décalage top basé sur la vraie hauteur bannière + header, au lieu d’un simple `pt-32`.
4. Vérifier que le widget reste visible sans repasser au-dessus du contenu mobile.

## Détails techniques
- `PublicSiteLayout.tsx`
  - définir une structure cohérente pour la bannière fixe
  - préparer un offset global réutilisable pour le reste de la page
- `PublicSiteHeader.tsx`
  - supprimer le `top: calc(36px + ...)` fragile
  - utiliser un positionnement dépendant d’une hauteur de bannière explicite
  - stabiliser le padding/hauteur mobile du header
- `HeroSection.tsx`
  - remplacer le `pt-32 / md:pt-36` par un top spacing aligné sur la hauteur réelle de la bannière + du header
  - conserver le visuel hero tel quel, sans réintroduire le split ni la vidéo

## Résultat attendu
- bannière visible
- barre de menu visible
- titre du hero entièrement lisible
- aucun texte coupé sur mobile