## 🎯 Objectif

Transformer le Hero actuel de la landing page (`/`) en un **Split Reveal cinématique** :

- L'**image actuelle** (villa avec piscine) + le **texte "Ton futur appartement, Notre Mission !"** restent visibles au chargement
- Au **scroll**, l'image se coupe en **diagonale à 18°** : la moitié supérieure-gauche glisse vers le haut-gauche, la moitié inférieure-droite glisse vers le bas-droit
- La **vidéo MP4** (`vesync_-_smart_home_-_full_1080p.mp4`) jouée en boucle muette est **révélée derrière** l'image
- Le **bandeau "Un logiciel propulsé par Immo-rama.ch"**, le **header** (logo + boutons "Mon espace client" / "Activer ma recherche") et l'**indicateur de scroll** restent intacts par-dessus

## 📂 Fichiers concernés

### 1. `src/assets/hero-reveal-video.mp4` (nouveau)
Copie depuis `user-uploads://vesync_-_smart_home_-_full_1080p.mp4` via `code--copy`.

### 2. `src/components/public-site/DiagonalSplitReveal.tsx` (nouveau)
Nouveau composant autonome avec :
- **Wrapper externe** `h-[250vh]` (desktop/tablette) ou `h-[100vh]` (mobile) → donne la "piste de scroll"
- **Container sticky** `sticky top-0 h-screen overflow-hidden` qui reste fixe pendant le scroll
- **3 couches superposées** (z-index croissant) :
  1. **Vidéo MP4** (fond) — `<video autoPlay muted loop playsInline>` en `object-cover absolute inset-0`
  2. **Moitié haute-gauche de l'image** — `clip-path: polygon(0 0, 100% 0, 100% calc(50% - tan(18°)*50%), 0 calc(50% + tan(18°)*50%))` avec `transform: translate(-x, -y)` animé
  3. **Moitié basse-droite de l'image** — clip-path complémentaire avec `transform: translate(+x, +y)` animé
  4. **Texte "Ton futur appartement, Notre Mission !"** — placé sur la moitié haute (suit son mouvement) OU restant fixe au centre avec fade-out (à choisir, je propose : **suit la moitié haute** pour cohérence cinématique)
- **Logique scroll** :
  - `useScroll({ target: ref, offset: ["start start", "end end"] })`
  - `useTransform(scrollYProgress, [0, 0.7], [0, 100])` → `%` de séparation
  - `useTransform(scrollYProgress, [0, 0.5], [1, 0])` → opacité du texte qui fade
- **Mobile (≤768px)** :
  - Wrapper `h-screen` (pas de 250vh pour éviter scroll-jank iOS)
  - Animation déclenchée par `useInView` → one-shot de 1.8s avec easing `[0.65, 0, 0.35, 1]`
  - Pas de scroll-bind (trop saccadé sur Safari iOS)

### 3. `src/components/public-site/sections/HeroSection.tsx` (modifié)
- Remplacer le `ScrollExpansionHero` actuel par `<DiagonalSplitReveal>` qui contient :
  - L'image actuelle du Hero (à identifier dans le composant existant — probablement `villa.jpg` ou similaire)
  - La vidéo MP4 en arrière-plan
  - Le texte "Ton futur appartement, Notre Mission !" en overlay
- **Conserver intacts** :
  - Le bandeau "Un logiciel propulsé par Immo-rama.ch" (au-dessus du Hero)
  - Le header avec logo + boutons (au-dessus, position fixe)
  - L'indicateur "FAITES DÉFILER POUR DÉCOUVRIR" en bas (intégré dans le composant)

## 🎨 Détails de l'effet diagonale 18°

```
Angle = 18°
tan(18°) ≈ 0.3249

Coupe diagonale partant de :
  - Bord gauche à y = 50% + (largeur × tan(18°))/2 ≈ 50% + 16.2%
  - Bord droit  à y = 50% - (largeur × tan(18°))/2 ≈ 50% - 16.2%

Clip-path moitié haute :
  polygon(0 0, 100% 0, 100% 33.8%, 0 66.2%)

Clip-path moitié basse :
  polygon(0 66.2%, 100% 33.8%, 100% 100%, 0 100%)

Translation finale (à scrollProgress = 0.7) :
  Moitié haute : translate(-12vw, -25vh)
  Moitié basse : translate(+12vw, +25vh)
```

## 📱 Comportement responsive

| Device | Hauteur wrapper | Mode | Durée |
|---|---|---|---|
| **Desktop ≥1024px** | `250vh` | Scroll-bind progressif | Suit le scroll |
| **Tablette 768-1024px** | `200vh` | Scroll-bind progressif | Suit le scroll |
| **Mobile <768px** | `100vh` | Auto one-shot via `useInView` | 1.8s avec easing |

## 🎬 Performance & qualité

- Vidéo : `<video preload="metadata" autoplay muted loop playsInline>` → léger sur la première vue, joue dès l'apparition
- Image : `loading="eager" fetchPriority="high"` (déjà LCP)
- `will-change: transform, clip-path` sur les 2 moitiés pour activer le compositing GPU
- Respect de `prefers-reduced-motion` : si activé, on affiche directement la vidéo sans l'image (skip de l'animation)
- Texte conserve son styling actuel (police serif italique blanche, ombre)

## ❓ Une dernière micro-décision

Pendant la séparation, le **texte "Ton futur appartement, Notre Mission !"** doit-il :

- **(A) Suivre la moitié haute** de l'image (se sépare visuellement avec elle, plus cinématique) ← **recommandé**
- **(B) Rester fixe au centre** et faire un fade-out à mi-parcours

Si tu ne précises pas, je pars sur **(A)** car c'est l'effet Macoloc/Apple le plus impactant.

## ✅ Résultat attendu

À l'arrivée sur la landing : image villa + texte centré (état actuel inchangé). Dès qu'on scrolle, l'image se fend en biais à 18° et s'écarte progressivement, révélant la vidéo MP4 du smart home qui joue en arrière-plan. Sur mobile, l'effet se déclenche automatiquement quand le hero entre dans le viewport.
