## Objectif
Rendre le scroll-scrub de la vidéo Hero (`DiagonalSplitReveal`) moins sensible sur **mobile, tablette ET desktop**, pour que la vidéo de 10s avance plus progressivement.

## Cause
Les pistes de scroll actuelles sont trop courtes : un petit swipe/scroll consomme une grande part des 10 secondes.
- Mobile : `140vh`
- Tablette : `180vh`
- Desktop : `220vh`

## Changement proposé
Dans `src/components/public-site/DiagonalSplitReveal.tsx`, augmenter `trackHeight` partout :

| Device | Avant | Après |
|---|---|---|
| Mobile | 140vh | **340vh** (~2.4x plus long) |
| Tablette | 180vh | **360vh** (2x plus long) |
| Desktop | 220vh | **380vh** (~1.7x plus long) |

## Ce qui ne change pas
- `SCRUB_DURATION = 10s` (durée vidéo balayée inchangée)
- Logique de spring (`stiffness: 120, damping: 30`)
- Logique iOS unlock, clip-paths, titre, scroll hint
- Section "Notre application" (autoplay, inchangée)

## Résultat attendu
Sur les 3 formats, il faudra scroller nettement plus longtemps pour parcourir les 10 secondes de vidéo → sensation plus douce et cinématographique, pas d'avance brutale au moindre swipe.

**Fichier modifié :** `src/components/public-site/DiagonalSplitReveal.tsx` (1 ligne)
