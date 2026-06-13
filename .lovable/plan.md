
# 3 corrections ciblées sur le site public

## 1. Remplacer l'image du hero "split reveal" par le chasseur
- Uploader `user-uploads://ChatGPT_Image_13_juin_2026_18_31_03_1-2.png` via `lovable-assets` → `src/assets/hero-chasseur-split.png.asset.json`
- Dans `src/components/public-site/sections/HeroSection.tsx` :
  - Remplacer `import heroBg from '@/assets/hero-bg.jpg'` par l'import du nouveau pointeur asset
  - `imageSrc={heroChasseur.url}` au lieu de `imageSrc={heroBg}`
- Le composant `DiagonalSplitReveal` (split diagonal 18°, vidéo derrière, scrub scroll) reste **identique** — on ne touche qu'à la source image.

## 2. Réparer la vidéo scroll-driven du split reveal
La vidéo derrière le split ne se lance plus au scroll. Investigation à faire en preview live :
- Lire console / network pour erreurs vidéo (404, CORS, decode)
- Vérifier que `expansionRef` (wrapper `height: 380vh`) génère bien du scroll
- Vérifier que le parent n'a pas reçu `overflow:hidden` via mes overrides récents
- Vérifier que `prefersReducedMotion` n'est pas true en preview (sinon bascule en vidéo figée)
- Vérifier que le sticky parent (inline `background: 'hsl(30 15% 8%)'`) n'a pas été cassé par mon override `[style*="hsl(30 15%"]` qui le passe à blanc — mais ça ne devrait pas tuer le scroll

Correctifs probables (selon diagnostic) :
- Si la vidéo échoue à charger : vérifier path `src/assets/hero-reveal-video.mp4` et fallback autoplay
- Si scroll bloqué : retirer un `overflow-hidden` introduit par erreur ou re-vérifier la sticky chain (un ancêtre avec `overflow:hidden`/`overflow:auto` casse `position:sticky`)
- Si le ref ne se monte plus : aucun lien identifié avec mes changements CSS, donc investigation requise

## 3. Supprimer les barres de progression brunes/dorées (3ᵉ image)
Localisé dans `src/components/public-site/sections/AppShowcaseSection.tsx` ligne ~306-315 :
```tsx
<div className="relative h-1.5 w-full bg-[hsl(30_15%_12%)] rounded-full overflow-hidden">
  <div style={{ background: 'linear-gradient(to right, hsl(38 45% 48%), hsl(38 55% 65%))' }} />
</div>
```
Les inline `style` avec gradients dorés (`hsl(38 45% 48%)`) ne sont pas attrapés par mes overrides actuels (qui ciblent `[style*="hsl(30 15%"]` uniquement).

Ajouter dans le bloc `.theme-luxury` de `src/index.css` :
```css
/* Inline gold styles → green primary */
.theme-luxury [style*="hsl(38 "],
.theme-luxury [style*="hsl(38 45%"],
.theme-luxury [style*="hsl(38 55%"],
.theme-luxury [style*="hsl(28 35%"],
.theme-luxury [style*="hsl(40 35%"],
.theme-luxury [style*="hsl(40 25%"] {
  background-image: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--imr-green-light))) !important;
  color: hsl(var(--imr-ink)) !important;
}
.theme-luxury [style*="linear-gradient"][style*="hsl(38"] {
  background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--imr-green-light))) !important;
}
```

## Vérification
- Screenshot du hero : nouvelle image chasseur visible, split diagonal préservé
- Scroll : vidéo se scrub frame par frame derrière le split
- Section AppShowcase : barres en vert (zéro doré/brun)
- Reste du site public inchangé

## Hors scope
- Aucun changement de contenu / copy / animations
- App interne intacte
