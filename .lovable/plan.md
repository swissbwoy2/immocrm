## 🎯 Objectif

Ajouter une section **"Notre application"** entre `HeroSection` et `PricingSection` sur la page d'accueil (`/`), inspirée du showcase spatial 21st.dev partagé : un **mockup iPhone 15 Pro premium en 3D/CSS** contenant une **vidéo du dashboard client** qui défile en scrub au scroll, avec un **CTA "Créer mon compte maintenant"** vers `/nouveau-mandat`.

---

## 🎨 Design (inspiré de l'exemple Spatial Showcase)

**Layout** : iPhone à gauche, contenu textuel à droite (stack vertical sur mobile, iPhone au-dessus).

**Esthétique premium reprise du modèle 21st.dev** :
- Fond avec **radial gradient animé** (or/ambre subtil pour cohérence Logisorama, pas bleu/vert)
- **Anneaux orbitaux** en rotation lente autour de l'iPhone (`border-dashed`, animation 20s linear infinite)
- **Glow/halo gradient** derrière l'iPhone avec effet de pulsation douce
- **Float animation** verticale légère (`y: [-10, 10, -10]` sur 6s) sur le mockup
- **Texte avec gradient** `from-white to-zinc-400` sur le titre
- **Stat badge** "● En direct" sous l'iPhone avec point pulsant doré
- **Feature bars** animées (3 métriques : Mandats actifs, Visites planifiées, Documents validés) avec barres de progression qui se remplissent à l'apparition

**Cohérence brand Logisorama** : palette or `hsl(45 100% 50%)` / fond sombre `slate-950` au lieu du noir pur, en gardant le vibe "spatial premium".

---

## 📱 iPhone Mockup 3D (CSS pur, pas de lib externe)

Création de `src/components/public-site/IPhoneMockup3D.tsx` :

- **Structure réaliste iPhone 15 Pro** : 
  - Frame extérieur titanium (`bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900`) avec rounded-[3rem]
  - Reflet latéral (`bg-gradient-to-r` overlay) pour effet métal brossé
  - Dynamic Island au top (capsule noire 100×30px, centrée)
  - Bouton volume + power en SVG sur les côtés
  - Bezel intérieur noir + écran avec rounded-[2.5rem]
- **Inner screen** : `<video>` ou `<children>` configurable via props
- **Perspective CSS** : `transform: perspective(1000px) rotateY(-8deg) rotateX(2deg)` pour effet 3D subtil (désactivé sur mobile pour perf)
- **Reflet écran** : pseudo-élément `::before` avec `bg-gradient-to-br from-white/10 to-transparent`
- Dimensions : `w-[280px] h-[580px]` desktop, `w-[240px] h-[500px]` mobile

---

## 🎬 Section AppShowcaseSection

Création de `src/components/public-site/sections/AppShowcaseSection.tsx` :

**Architecture scrub scroll** (réutilise le pattern éprouvé de `DiagonalSplitReveal`) :
- Wrapper `<section ref={trackRef}>` avec `height: 200vh` (desktop) / `140vh` (mobile)
- `<div className="sticky top-0 h-screen">` contenant le layout 2 colonnes
- `useScroll({ target: trackRef, offset: ['start start', 'end end'] })`
- `useSpring(scrollYProgress, { stiffness: 100, damping: 30 })` pour smoothing
- `useMotionValueEvent(smoothProgress, 'change', p => video.currentTime = p * Math.min(SCRUB_DURATION, video.duration))`
- `SCRUB_DURATION = 10` secondes
- **Amorçage iOS identique à `DiagonalSplitReveal`** : listener `touchstart`/`pointerdown` qui fait `play() → pause() → currentTime = 0` pour débloquer le seek sur Safari mobile
- **Fallback autoplay loop muted** si `readyState < 2` après 1s

**Vidéo** : `<video ref={videoRef} src="/videos/dashboard-client.mp4" muted playsInline preload="metadata" webkit-playsinline />` placée DANS l'écran de l'iPhone.

**Colonne droite (texte + CTA)** :
- Eyebrow : "L'APPLICATION" (uppercase, tracking large, doré)
- Titre H2 : **"Pilotez toute votre recherche depuis votre poche"** (gradient white → zinc-400)
- Sous-titre : "Mandats, visites, documents, messagerie — tout est synchronisé en temps réel sur iPhone, Android et web."
- 3 bullet points avec icônes Lucide (Smartphone / Bell / Lock) — bénéfices clés
- Feature bars animées avec stats (style identique à l'exemple) :
  - Mandats actifs : 100%
  - Notifications instantanées : 98%
  - Sécurité bancaire : 100%
- **CTA principal** : `<Button onClick={() => navigate('/nouveau-mandat')}>` — variant doré premium, taille XL avec icône `ArrowRight`, texte "Créer mon compte maintenant"
- **Sous-CTA discret** : "✓ Sans engagement · ✓ Activation immédiate"

---

## 🔌 Intégration HomePage

Dans `src/pages/public-site/HomePage.tsx` — insertion **entre `<HeroSection />` et `<Suspense><PricingSection /></Suspense>`** :

```tsx
<HeroSection />

<Suspense fallback={null}>
  <AppShowcaseSection />     {/* ← NOUVEAU */}
</Suspense>

<Suspense fallback={null}>
  <PricingSection />
</Suspense>
```

→ Lazy-load via `lazy(() => import('@/components/public-site/sections/AppShowcaseSection'))` pour ne pas alourdir le bundle initial.
→ Export ajouté dans `src/components/public-site/sections/index.ts`.

---

## 📦 Asset vidéo requis

⚠️ **Tu devras m'uploader le fichier `dashboard-client.mp4`** (capture d'écran vidéo de ton dashboard client en train de défiler). Recommandations :
- Format : MP4 H.264, ratio **9:19.5** (proportion iPhone) ou crop équivalent
- Durée : **~10 secondes** (correspond exactement à `SCRUB_DURATION`)
- Poids cible : <3 MB (compression handbrake/ffmpeg, bitrate ~1.5 Mbps suffit pour un écran iPhone mockup)
- Résolution : 540×1170 max (inutile au-delà pour la taille d'affichage)
- Sans audio (sera muted de toute façon)

Une fois uploadé, je le placerai dans `/public/videos/dashboard-client.mp4`.

**En attendant le fichier** : la section affichera un placeholder dégradé doré animé dans l'iPhone pour ne pas bloquer l'intégration.

---

## ✅ Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `src/components/public-site/IPhoneMockup3D.tsx` | **Créé** — mockup iPhone 15 Pro CSS pur |
| `src/components/public-site/sections/AppShowcaseSection.tsx` | **Créé** — section complète avec scrub scroll |
| `src/components/public-site/sections/index.ts` | **Modifié** — export ajouté |
| `src/pages/public-site/HomePage.tsx` | **Modifié** — insertion lazy-loaded entre Hero et Pricing |
| `/public/videos/dashboard-client.mp4` | **À uploader par toi** après approbation |

---

## 🚫 Hors scope

- Pas de vraie 3D WebGL/Three.js (CSS 3D suffit, perf mobile préservée, pas de poids supplémentaire)
- Pas de switcher multi-produits (l'exemple 21st en avait un — non pertinent ici, on a un seul écran à montrer)
- Pas de modification du Hero ni du Pricing existants
