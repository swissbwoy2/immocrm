## Deux problèmes distincts

### Problème 1 — "Nous aidons" coupé par le header

Dans `HomePage.tsx`, `DossierAnalyseSection` est la **première section** et n'a aucun offset top. Le header est `fixed` avec `top: calc(36px + safe-area)` + bannière "Un logiciel propulsé par Immo-rama.ch" (36px) + header (~60px) = **~100px** masqués au-dessus du contenu.

Résultat : le mot **"Nous aidons"** (taille normale) est caché derrière le header fixe ; seul **"nos clients"** (en text-9xl) dépasse vers le bas et reste visible.

**Fix** — `src/components/public-site/sections/DossierAnalyseSection.tsx` ligne 22 :
- Remplacer `py-12 md:py-20` par `pt-32 md:pt-36 pb-12 md:pb-20`
  (≈128px top mobile / ≈144px desktop pour dégager les ~100px de header fixe + un peu d'air)

### Problème 2 — Widget Google Avis (Elfsight) n'affiche pas les avis

Dans `src/components/public-site/sections/SocialProofSection.tsx` ligne 26 :
```tsx
<div className="elfsight-app-6edfc233-2b60-465a-9be1-9b16cf306e85" />
```

Le widget WhatsApp qui fonctionne utilise `data-elfsight-app-lazy` ; celui des avis ne l'a pas, donc le script Elfsight (`elfsightcdn.com/platform.js`, chargé `async` dans `index.html` ligne 137) peut ne pas le détecter au bon moment (race entre `async` script et React render).

**Fix** — `SocialProofSection.tsx` ligne 26 :
- Ajouter l'attribut : `<div className="elfsight-app-6edfc233-2b60-465a-9be1-9b16cf306e85" data-elfsight-app-lazy />`
- Idem dans `src/components/landing/SocialProofBar.tsx` ligne 20 pour cohérence.

Si après ce fix le widget reste vide, le problème vient de la config côté dashboard Elfsight (widget non publié, source Google Place non liée, ou plan expiré) — pas du code. Dans ce cas il faudra se connecter au compte Elfsight pour vérifier l'app `6edfc233-2b60-465a-9be1-9b16cf306e85`.

## Hors scope

- Pas de modification de la bannière top, du contenu, ni du Hero.
- Pas de changement de taille du `text-9xl` "nos clients" (tu l'as voulu ultra présent).
