## Problème identifié

Sur mobile (iOS Safari surtout), la vidéo reste figée sur fond brun car :

1. **iOS bloque `currentTime = X` tant que la vidéo n'a jamais joué via un geste utilisateur.** Sans amorçage, tous les seeks sont ignorés silencieusement.
2. Le scrub actuel est un **one-shot rAF de 1.6s** déclenché au premier scroll : il ne suit pas réellement le doigt de l'utilisateur, et si l'amorçage iOS échoue, on ne voit rien.
3. `preload="auto"` est peu fiable sur réseau cellulaire iOS — les frames ne sont pas bufferisées au moment du seek.

## Solution — `src/components/public-site/DiagonalSplitReveal.tsx`

### 1. Amorçage iOS (déblocage du seek)
Au tout premier `touchstart` OU `scroll` sur mobile, exécuter une séquence "play() → pause() immédiat" sur `mobileVideoRef`. Cela débloque définitivement `currentTime` pour le reste de la session.

```ts
const unlockVideoForIOS = async (v: HTMLVideoElement) => {
  try {
    v.muted = true;
    await v.play();      // satisfait la policy iOS
    v.pause();           // on reprend le contrôle
    v.currentTime = 0;
  } catch { /* noop */ }
};
```

Brancher cet appel dans le listener `onScroll` mobile existant, AVANT de set `hasScrolled(true)`.

### 2. Preload optimisé mobile
Remplacer `preload="auto"` par `preload="metadata"` + ajouter un `poster` (1ère frame extraite) pour éviter le flash brun pendant le chargement. Optionnel : ajouter `playsInline webkit-playsinline x5-playsinline` pour compat Android WebView.

### 3. Scrub mobile lié au scroll réel (pas one-shot)
Remplacer la logique rAF "one-shot 1.6s" par un vrai binding scroll → currentTime, identique au desktop mais sur une piste plus courte (`140vh` au lieu de `220vh` pour préserver la perf mobile).

Architecture proposée pour le bloc mobile :
- Wrapper `<div ref={expansionRef} style={{ height: '140vh' }}>`
- Sticky inner `100vh` contenant vidéo + image splittée + titre
- Réutiliser `useScroll` + `useMotionValueEvent` (déjà importés) pour mapper `smoothProgress` → `mobileVideoRef.current.currentTime` (cap 7s)
- Le split d'image utilise les mêmes `topX/topY/bottomX/bottomY` (les MotionValues marchent identiquement)

→ Avantage : un seul code path scrub pour desktop ET mobile, plus de divergence rAF.

### 4. Fallback "vidéo pas seekable"
Si après 800ms post-amorçage `v.readyState < 2` (HAVE_CURRENT_DATA), on bascule automatiquement en mode "autoplay loop muted" pour ne JAMAIS laisser l'utilisateur sur fond brun. Log discret en console pour debug.

```ts
setTimeout(() => {
  if (v.readyState < 2) {
    v.loop = true;
    v.play().catch(() => {});
  }
}, 800);
```

### 5. Indicateur visuel pendant le buffering
Si la vidéo charge encore lors du premier scroll, afficher un overlay très subtil (spinner doré 24px en bas à droite) qui disparaît dès `canplay`. Évite la sensation "rien ne se passe".

## Pourquoi ça va marcher

- L'amorçage `play()→pause()` synchrone dans le handler de geste est **la** technique officielle Apple/Google pour débloquer le seek mobile.
- Passer du one-shot rAF au binding scroll réel donne le même feel premium que sur desktop, sans dépendre d'une animation arbitraire.
- Le fallback autoplay loop garantit qu'on n'a JAMAIS un fond brun figé, même si la vidéo n'arrive pas à se charger.

## Hors scope (pour cette itération)

- Génération d'un poster JPG depuis la vidéo (à faire manuellement ou dans un second temps avec ffmpeg).
- Versions WebM/HLS optimisées pour iOS (la MP4 actuelle suffit).
- Modification du composant `HeroSection` parent : tout reste self-contained dans `DiagonalSplitReveal`.