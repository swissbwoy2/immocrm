

# Rendu compact par defaut (equivalent 2x "petit A" sur Safari)

## Contexte
Sur iOS Safari, chaque appui sur le petit "A" reduit la taille d'environ 85%. Deux appuis = ~72% de la taille originale. L'objectif est d'obtenir ce rendu compact directement a 100% de zoom.

## Changements dans `src/components/landing/HeroSection.tsx`

Un seul fichier modifie. Toutes les reductions concernent uniquement les classes mobiles (sans prefixe `md:`).

| Element | Actuel (mobile) | Nouveau (mobile) |
|---------|-----------------|-------------------|
| Section padding | `py-8` | `py-4` |
| Badge N1 | `text-xs`, `px-3 py-1.5` | `text-[10px]`, `px-2 py-1` |
| Crown icon | `h-4 w-4` | `h-3 w-3` |
| Logo | `h-16` | `h-10` |
| Logo margin | `mb-2` | `mb-1` |
| Slogan | `text-base` | `text-sm` |
| Slogan margin | `mb-3` | `mb-1.5` |
| Selecteur location/achat | `py-2.5 px-3` | `py-2 px-2` |
| Selecteur icons | `h-5 w-5` | `h-4 w-4` |
| Selecteur texte | (base ~14px) | `text-xs` |
| Selecteur margin | `mb-3` | `mb-2` |
| Titre H1 | `text-xl` | `text-base` |
| Sous-titre | `text-base` | `text-sm` |
| Tech line | `text-sm` | `text-xs` |
| Paragraphe empathique | `text-sm`, `mb-4` | `text-xs`, `mb-2` |
| Promise box | `text-base`, `h-6 w-6`, `px-4 py-3` | `text-sm`, `h-5 w-5`, `px-3 py-2` |
| Promise margin | `mb-4` | `mb-3` |
| CTA principal | `text-base px-8 py-5` | `text-sm px-6 py-4` |
| CTA icons | `h-6 w-6` | `h-5 w-5` |
| Sans engagement | `text-sm` | `text-xs` |
| CTAs secondaires | `text-sm px-6 py-4` | `text-xs px-4 py-3` |
| CTAs gap | `gap-4` | `gap-2` |
| Trust block | `mt-8` | `mt-4` |
| Login link | `mt-4` | `mt-2` |

## Impact
- Aucun changement sur desktop/tablette (classes `md:` et `lg:` inchangees)
- Le hero entier tient dans l'ecran mobile a 100% de zoom, comme sur ta capture
- Complexite faible : uniquement du Tailwind CSS dans un seul fichier

