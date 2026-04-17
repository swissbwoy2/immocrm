
## Problème

L'utilisateur ne voit ni le hamburger ni les boutons sur le header public à la racine `/`.

## Cause identifiée

Dans `src/components/public-site/PublicSiteHeader.tsx` (ligne ~22) :

```tsx
const handleScroll = () => setIsVisible(window.scrollY > 80);
```

Le header est **caché par défaut** (`isVisible = false`) et n'apparaît qu'après avoir scrollé de plus de 80px (classe `-translate-y-full opacity-0`).

C'est pour cela que sur la capture, on voit la section Instagram mais aucun header — l'utilisateur est probablement en haut de page ou la position de scroll n'a pas déclenché l'affichage.

De plus, dans `HeroSection.tsx` il existe probablement déjà un bouton CTA "Activer ma recherche" intégré au hero, ce qui rend le header caché en haut de page acceptable visuellement, mais cela contredit la demande explicite de l'utilisateur de voir les 2 boutons et le hamburger en permanence.

## Correction proposée

**Fichier unique : `src/components/public-site/PublicSiteHeader.tsx`**

Rendre le header **visible en permanence** dès le chargement de la page :

1. Initialiser `isVisible = true` au lieu de `false`
2. Supprimer la logique `handleScroll` qui cache le header en haut de page
3. Garder l'effet glassmorphism (backdrop-blur) déjà en place

Résultat : le hamburger, le logo, "Mon espace client" et "Activer ma recherche" seront visibles immédiatement, en haut de page comme après scroll, sur desktop et mobile.

## Garanties

- Aucun autre fichier modifié
- Aucun impact sur `/login`, `/nouveau-mandat`, ni le privé
- Comportement responsive déjà en place (icônes seules `< sm`, icône + texte `sm+`) conservé
