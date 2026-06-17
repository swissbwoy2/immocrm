## Problème

Les champs de remplissage de `/nouveau-mandat` utilisent toujours les couleurs **dorées sur fond sombre** héritées du thème Premium (`bg-[hsl(30_15%_9%/0.6)]`, `text-[hsl(40_20%_88%)]`, labels `text-[hsl(40_20%_45%)]`, placeholder transparent). Sur la nouvelle carte claire `bg-card/60`, ça donne des **rectangles bruns illisibles** (visible sur la capture : "E-mail", "Téléphone", "Prénom", "Nom de famille", "Jour", "Mois", "Année").

## Cause

`MandatFormStep1`...`MandatFormStep7` importent `PremiumInput`, `PremiumSelect`, `PremiumTextarea`, `PremiumRadioGroup`, `PremiumCheckbox`, `PremiumDocumentDropzone` — composants au design sombre/doré, non sémantiques. Le shell est passé en clair, mais pas les champs.

## Plan

### 1. Nouveaux composants champs "Landing" (tokens sémantiques)

Créer dans `src/components/forms-premium/` :

- `LandingInput.tsx` — même API que `PremiumInput` mais : `bg-background` / `border-border`, focus `border-primary` + `ring-primary/20`, label flottant `text-muted-foreground` → `text-primary` quand floated, input `text-foreground`, icône check `text-primary`.
- `LandingSelect.tsx` — variante claire de `PremiumSelect`.
- `LandingTextarea.tsx` — variante claire de `PremiumTextarea`.
- `LandingRadioGroup.tsx` — cartes radio `bg-card border-border`, sélectionnée `border-primary bg-primary/5`.
- `LandingCheckbox.tsx` — `border-border` / coché `bg-primary border-primary`.
- `LandingDocumentDropzone.tsx` — variante claire (`bg-muted/30`, `border-dashed border-border`, hover `border-primary`).

Aucun `text-white`, `bg-black` ou `hsl()` en dur — uniquement `background`, `foreground`, `card`, `border`, `muted`, `muted-foreground`, `primary`, `destructive`.

### 2. Remplacer dans `MandatFormStep1-7`

Substitution 1:1 des imports `Premium*` → `Landing*`. API identique, aucun changement de props/logique métier.

### 3. Corriger l'autocomplete adresse dans `MandatFormStep1`

Remplacer le `className` codé en dur (`bg-[hsl(30_15%_9%/0.6)]`...) par les tokens : `bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20`.

### 4. Aucun autre formulaire impacté

`MandatV3`, `FormulaireVendeurComplet`, `FormulaireRelouer`, `FormulaireConstruireRenover`, `QuickLeadForm` continuent d'utiliser les `Premium*` (thème sombre conservé). Les composants `Premium*` ne sont **pas modifiés**.

## Fichiers

**Créés :** `LandingInput.tsx`, `LandingSelect.tsx`, `LandingTextarea.tsx`, `LandingRadioGroup.tsx`, `LandingCheckbox.tsx`, `LandingDocumentDropzone.tsx`.

**Modifiés :** `MandatFormStep1.tsx` → `MandatFormStep7.tsx` (imports + correction className autocomplete adresse dans Step1).
