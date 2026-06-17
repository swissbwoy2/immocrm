## Constat

Aujourd'hui `/nouveau-mandat` vit dans un univers visuel totalement différent de la landing :

| | Landing (`/`) | NouveauMandat actuel |
|---|---|---|
| Fond | `bg-background` (clair, semantic tokens) + hero image | `bg-[hsl(30_15%_8%)]` brun très sombre + `LuxuryFormBackground` animé + `FloatingKey3D` |
| Couleurs | tokens (`primary`, `foreground`, `muted-foreground`, `card`) | gold hardcodés (`hsl(38 45% 48%)`, `hsl(40 20% 35%)`…) |
| Navigation | `FloatingNav` (glass blur, CTA emerald) + bandeau "propulsé par Immo-rama" | sticky bar custom logo + compteur step |
| Cartes | `bg-card/60 backdrop-blur` rounded-2xl border `border-border/50` | `PremiumFormCard` (dark gold) |
| Footer | `LandingFooter` complet | barre fixe `bg-[hsl(30_15%_8%/0.95)]` 3 badges |
| Boutons | `from-primary to-primary/90` + CTA emerald | `PremiumButton` (dégradés gold) |
| Typo | identique au reste de l'app (semantic) | identique mais sur fond sombre, contrastes inversés |

→ L'utilisateur veut que le tunnel mandat se fonde dans l'univers de la landing : même fond, mêmes couleurs sémantiques, même nav flottante, même footer, même style de cartes/boutons.

## Objectif

`/nouveau-mandat` doit donner l'impression d'être une étape naturelle de la landing : un visiteur qui clique sur le CTA reste dans le même monde graphique, sans rupture.

## Plan d'implémentation

### 1. Nouveau shell `LandingFormShell` (remplace `PremiumFormShell` sur cette page)

Fichier : `src/components/forms-premium/LandingFormShell.tsx` (nouveau)

- `bg-background` (palette landing, fini le brun sombre)
- Réutilise les composants de la landing :
  - Bandeau haut "Un logiciel propulsé par Immo-rama.ch" (copié-collé du Landing.tsx lignes 89-106)
  - `<FloatingNav />`
  - `<LandingFooter />` en bas de page (lazy)
- Suppression de `LuxuryFormBackground` et `FloatingKey3D` (rupture visuelle avec la landing)
- Suppression de la barre fixe "trust badges" en bas (remplacée par le vrai footer landing)
- Conteneur central : `container mx-auto px-4 max-w-3xl py-10 md:py-16`

### 2. Refonte de l'en-tête de formulaire (hero compact)

Au-dessus du formulaire, un mini-hero dans le langage landing :

- Badge `bg-primary/10 border border-primary/40 rounded-full` avec icône + "Nouveau mandat de recherche"
- Titre `text-3xl md:text-4xl font-bold text-foreground` : "Démarrons votre recherche"
- Sous-titre `text-muted-foreground` rappelant la garantie 90 jours
- `PremiumGuaranteeBanner` repensé en `bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl` (mêmes tokens que les cartes du hero landing)

### 3. Refonte de la progression et des steps

- `PremiumProgressBlock` : nouvelle variante qui utilise `bg-primary` sur la barre, `text-muted-foreground` pour les labels, fond `bg-card/60`
- `PremiumStepIndicator` : pastilles `bg-primary` (active), `bg-muted` (inactives), `text-primary-foreground`/`text-muted-foreground`

Pas de réécriture from scratch : on ajoute une prop `variant="landing"` ou on modifie directement les classes hardcodées vers les tokens.

### 4. Refonte de la carte du formulaire et des boutons

- `PremiumFormCard` → `bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8` (exactement comme les deux cartes du hero landing)
- `PremiumButton` :
  - `variant="next"` / `variant="submit"` → `bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20`
  - `variant="back"` → `variant="ghost"` shadcn avec `text-muted-foreground`
- Suppression de toutes les couleurs hardcodées `hsl(38_45%…)` / `hsl(40_20%…)` → tokens sémantiques

### 5. Mise à jour de `src/pages/NouveauMandat.tsx`

- Remplace `<PremiumFormShell>` par `<LandingFormShell>`
- Ajoute le mini-hero (titre + sous-titre + garantie) au-dessus de `PremiumProgressBlock`
- `container … max-w-2xl` → `max-w-3xl` pour s'aligner sur l'amplitude des cartes landing
- Le footer "Vos recherches seront activées dès réception de l'acompte" reste mais en `text-muted-foreground`
- Aucune modification de la logique métier (steps, validation, submit, edge functions, localStorage)

### 6. Points de vigilance

- Aucun changement sur les composants `MandatFormStep1..7` (déjà neutres niveau couleurs car ils héritent des tokens shadcn)
- Conserver `useUTMParams`, le tracking Meta Pixel `Lead`, la sauvegarde localStorage, le flux `invite-client`
- Vérifier le contraste sur mobile (background clair → s'assurer que les bordures des inputs shadcn restent visibles)
- Garder le bandeau supérieur `pt-env(safe-area-inset-top)` pour les notches iOS

## Détails techniques

Fichiers créés :
- `src/components/forms-premium/LandingFormShell.tsx`

Fichiers modifiés :
- `src/pages/NouveauMandat.tsx` (shell + mini-hero)
- `src/components/forms-premium/PremiumFormCard.tsx` (tokens sémantiques)
- `src/components/forms-premium/PremiumButton.tsx` (tokens sémantiques)
- `src/components/forms-premium/PremiumStepIndicator.tsx` (tokens sémantiques)
- `src/components/forms-premium/PremiumProgressBlock.tsx` (tokens sémantiques)
- `src/components/forms-premium/PremiumGuaranteeBanner.tsx` (style carte landing)

Fichiers retirés de l'arborescence /nouveau-mandat (toujours dispo pour autres pages éventuelles) :
- `LuxuryFormBackground` et `FloatingKey3D` ne sont plus rendus
- L'ancien `PremiumFormShell` reste intouché si utilisé ailleurs (à vérifier rapidement avec `rg`)

Aucune migration DB, aucune modification d'edge function.
