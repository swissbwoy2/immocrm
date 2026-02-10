

# Optimisation du HeroSection mobile - Rendu compact

## Probleme
A 100% de zoom sur mobile, les elements du hero (badge, logo, titres, boutons, espacements) sont trop gros. Le contenu important (CTA, garantie) est pousse hors de l'ecran. L'image 2 montre le rendu souhaite : compact, tout visible en un coup d'oeil.

## Solution
Reduire les tailles de police, marges, paddings et dimensions des elements dans `HeroSection.tsx` pour le mobile. Aucun nouveau fichier, aucune nouvelle dependance.

## Changements dans `src/components/landing/HeroSection.tsx`

| Element | Actuel (mobile) | Nouveau (mobile) |
|---------|-----------------|-------------------|
| Badge N1 | `px-5 py-2.5`, texte `text-sm` | `px-3 py-1.5`, texte `text-xs` |
| Logo | `h-24` | `h-16` |
| Slogan "L'immobilier accessible" | `text-lg` | `text-base` |
| Selecteur location/achat | `py-3 px-4` | `py-2.5 px-3` |
| Titre h1 | `text-2xl` | `text-xl` |
| Sous-titre | `text-xl` | `text-base` |
| Tech line | `text-base` | `text-sm` |
| Paragraphe empathique | `text-base`, `mb-6` | `text-sm`, `mb-4` |
| Promise box | `px-5 py-4`, texte `text-lg` | `px-4 py-3`, texte `text-base` |
| CTA principal | `text-lg px-10 py-7` | `text-base px-8 py-5` |
| Espacements generaux | `mb-6`, `mb-4` | `mb-3`, `mb-2` |
| Section padding | `py-12` | `py-8` |
| Crown icon | `h-5 w-5` | `h-4 w-4` |

## Impact
- Un seul fichier modifie : `HeroSection.tsx`
- Pas de changement sur desktop (les classes `md:` et `lg:` restent identiques)
- Le rendu mobile sera compact comme sur l'image 2

## Complexite
Faible - uniquement des ajustements de classes Tailwind CSS.
