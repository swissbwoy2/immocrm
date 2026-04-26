## 🎯 Objectif

Corriger 2 bugs du composant `DiagonalSplitReveal` :
1. **Desktop/Tablette** : la vidéo n'est jamais révélée à 100% — les moitiés ne s'écartent pas assez
2. **Mobile** : aucune animation visible — `useInView` se déclenche au mount avant que l'utilisateur ne voie quoi que ce soit

---

## 🔧 Changements techniques

### Fichier modifié
`src/components/public-site/DiagonalSplitReveal.tsx` (uniquement)

---

### 🖥️ Correctif Desktop / Tablette — Révélation totale + zoom vidéo

**Avant** (incomplet) :
```tsx
const topX = useTransform(smoothProgress, [0, 0.7], ['0vw', '-14vw']);
const topY = useTransform(smoothProgress, [0, 0.7], ['0vh', '-30vh']);
const videoScale = useTransform(smoothProgress, [0, 0.7], [1.08, 1]);
```

**Après** (révélation totale + zoom cinéma) :
```tsx
// Déplacement massif : les 2 moitiés sortent COMPLÈTEMENT de l'écran
const topX = useTransform(smoothProgress, [0, 0.85], ['0vw', '-65vw']);
const topY = useTransform(smoothProgress, [0, 0.85], ['0vh', '-110vh']);
const bottomX = useTransform(smoothProgress, [0, 0.85], ['0vw', '65vw']);
const bottomY = useTransform(smoothProgress, [0, 0.85], ['0vh', '110vh']);

// Vidéo : démarre légèrement zoomée, finit zoomée pour effet "respiration cinéma"
const videoScale = useTransform(smoothProgress, [0, 0.5, 1], [1.12, 1.0, 1.05]);

// Titre disparaît un peu plus tard pour rester lisible plus longtemps
const titleOpacity = useTransform(smoothProgress, [0, 0.55], [1, 0]);
```

**Piste de scroll** : passe de `250vh` à `220vh` desktop / `180vh` tablette (animation plus rapide, moins de scroll requis).

---

### 📱 Correctif Mobile — Déclenchement au scroll utilisateur

**Problème actuel** : `useInView` avec `amount: 0.4` se déclenche dès le mount car la section fait `h-screen` (toujours dans le viewport). L'animation joue avant que l'utilisateur ne soit prêt.

**Solution** : remplacer `useInView` par un **listener scroll natif** qui déclenche l'animation **uniquement** après un scroll de l'utilisateur (≥ 40px) :

```tsx
const [hasScrolled, setHasScrolled] = useState(false);

useEffect(() => {
  if (!isMobile) return;
  let triggered = false;
  const onScroll = () => {
    if (!triggered && window.scrollY > 40) {
      triggered = true;
      setHasScrolled(true);
      window.removeEventListener('scroll', onScroll);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, [isMobile]);
```

**Animation mobile mise à jour** (one-shot mais avec amplitude totale) :
```tsx
animate={hasScrolled ? { x: '-60vw', y: '-95vh' } : { x: 0, y: 0 }}
// bottom : { x: '60vw', y: '95vh' }
transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
```

**Indicateur visuel** : le scroll hint (la petite souris animée en bas) reste visible **tant que l'utilisateur n'a pas scrollé** → invitation claire à l'action. Disparaît avec une transition opacity 0.4s dès que l'animation démarre.

---

### 🎬 Bonus qualité (mineurs)

- **`will-change`** déjà présent ✅ (rien à changer)
- **`preload="auto"`** sur la vidéo (au lieu de `metadata`) pour qu'elle soit prête à jouer dès la révélation
- **Fallback `prefersReducedMotion`** : affiche directement la vidéo sans image par-dessus (pas d'animation)

---

## 📋 Fichiers touchés

| Fichier | Action |
|---|---|
| `src/components/public-site/DiagonalSplitReveal.tsx` | Modifié (logique animation + mobile trigger) |

**Aucun autre fichier impacté.** `HeroSection.tsx` n'a pas besoin de changement — l'API du composant reste identique.

---

## ✅ Résultat attendu

- **Desktop/Tablette** : en scrollant, l'image se sépare en 2 le long de la diagonale 18° → les deux moitiés sortent **complètement** de l'écran → la vidéo est révélée à 100% avec un léger effet de zoom cinéma
- **Mobile** : au premier scroll de l'utilisateur (≥ 40px), animation 1.6s déclenchée → image splitée disparaît hors écran → vidéo révélée plein écran
- **Scroll hint mobile** : reste visible tant que l'utilisateur n'a pas scrollé, puis fade out