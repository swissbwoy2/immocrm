

# Fix : Eliminer le double init Meta Pixel

## Objectif
Supprimer le warning "Multiple pixels with conflicting versions" en garantissant un seul `fbq('init')` dans toute l'application.

## 3 modifications

### 1. `src/lib/meta-pixel.ts` -- Guard global sur `window`

Remplacer le guard module-scoped `let isInitialized = false` par `(window as any).__META_PIXEL_INIT`. Ce flag survit meme si Vite duplique le module (code-splitting, HMR).

- Supprimer `let isInitialized = false` (ligne 3)
- Remplacer `if (isInitialized) return` par `if ((window as any).__META_PIXEL_INIT) return`
- Remplacer `isInitialized = true` par `(window as any).__META_PIXEL_INIT = true`

### 2. `src/pages/InscriptionValidee.tsx` -- Events only

- Remplacer l'import `{ initMetaPixel, trackMetaEventWithRetry }` par `{ trackMetaEventWithRetry }` uniquement
- Supprimer l'appel `initMetaPixel(true)` dans le useEffect
- Le reste (setTimeout 2000ms, sessionStorage guard, trackMetaEventWithRetry, clearTimeout) reste identique

### 3. `src/pages/Test24hActive.tsx` -- Events only + delai 2000ms

- Remplacer l'import `{ initMetaPixel, trackMetaEventWithRetry }` par `{ trackMetaEventWithRetry }` uniquement
- Supprimer l'appel `initMetaPixel(true)` dans le useEffect
- Ajouter un `setTimeout` de 2000ms autour du `trackMetaEventWithRetry('CompleteRegistration')` et du `sessionStorage.setItem`
- Ajouter le cleanup `return () => clearTimeout(timeout)`

### 4. `vite.config.ts` -- Dedupe React (bonus)

Ajouter `dedupe: ["react", "react-dom", "react/jsx-runtime"]` dans le bloc `resolve` existant pour eviter toute duplication de modules par le bundler.

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/lib/meta-pixel.ts` | Guard `window.__META_PIXEL_INIT` remplace `let isInitialized` |
| `src/pages/InscriptionValidee.tsx` | Suppression `initMetaPixel(true)`, garde setTimeout 2000ms |
| `src/pages/Test24hActive.tsx` | Suppression `initMetaPixel(true)`, ajout setTimeout 2000ms |
| `vite.config.ts` | Ajout `resolve.dedupe` |

## Resultat attendu

- Un seul `fbq('init', '1270471197464641')` (via MetaPixelProvider)
- Disparition du warning "Multiple pixels with conflicting versions"
- Events Lead et CompleteRegistration envoyes apres 2 secondes de delai

