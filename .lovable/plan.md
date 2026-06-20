
# Cause racine du problème "tout est bleu" et correction globale

## Diagnostic (preuves)

`src/index.css` lignes 34-78 : le thème **par défaut** `:root` a `--primary: 217 91% 60%` → **bleu dodger**.
`src/index.css` ligne 142+ : la classe `.theme-luxury` redéfinit `--primary: 158 55% 38%` → **vert Logisorama**.

La **home** (`PublicSiteLayout`) wrappe tout dans `.theme-luxury` → vert.
Le **shell des formulaires** (`LandingFormShell`) **n'ajoute PAS `.theme-luxury`** → toutes les classes `bg-primary` / `text-primary` / `border-primary` / `ring-primary` retombent sur le bleu par défaut. C'est ce qui rend les inputs, focus, badges, progress, boutons, step indicators "bleus".

→ La correction prioritaire est **une seule ligne** : ajouter `theme-luxury` au root de `LandingFormShell`. Tout le reste (inputs, selects, checkbox, step indicator, progress, focus rings…) bascule automatiquement en vert.

S'ajoute à cela un petit lot de couleurs hardcodées (`slate-900`, `emerald-500`, `teal-500`) à remplacer par les tokens du thème.

## 1. Wrapper `theme-luxury` global pour les formulaires

`src/components/forms-premium/LandingFormShell.tsx` :

```diff
- <div className="min-h-screen bg-background">
+ <div className="theme-luxury min-h-screen bg-background text-foreground">
```

Conséquence directe (zéro autre changement requis) :
- inputs focus → ring vert au lieu de bleu
- `LandingStepIndicator`, `LandingProgressBlock`, `LandingGuaranteeBanner` → vert
- `LandingButton variant="next"` (déjà en `from-primary to-primary/90`) → vert
- bordures focus selects, checkboxes, radios → vert
- badges `bg-primary/10 text-primary` → vert

## 2. Top banner du shell — sortir du dark slate

`LandingFormShell.tsx`, bandeau supérieur :

```diff
- className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10"
+ className="bg-[hsl(var(--imr-green-pale))] border-b border-border"
...
- <p className="text-xs sm:text-sm text-slate-300">
+ <p className="text-xs sm:text-sm text-muted-foreground">
```

Lien Immo-rama reste `text-primary hover:text-primary/80` (déjà OK).

## 3. Bouton submit — remplacer emerald/teal par primary

`src/components/forms-premium/LandingButton.tsx`, variant `submit` :

```diff
- 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-[1.02]'
+ 'bg-gradient-to-r from-primary to-[hsl(var(--imr-green-light))] shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02]'
```

## 4. Dropzones — émeraude → primary

`src/components/forms-premium/LandingDocumentDropzone.tsx` :
- `border-emerald-500/50 bg-emerald-50/40` → `border-primary/50 bg-primary/5`
- `bg-emerald-500 text-white` (badge check) → `bg-primary text-primary-foreground`
- `text-emerald-600` → `text-primary`

Même substitution dans `src/components/forms-premium/PremiumDocumentDropzone.tsx`.

## 5. Pages avec emerald/teal hardcodés

`src/pages/RelouerMonAppartement.tsx` :
- Hero gradient text `from-emerald-500 via-emerald-400 to-teal-500` → `from-primary to-[hsl(var(--imr-green-light))]`
- CTA inline emerald → mêmes classes que LandingButton submit (primary gradient)
- Numéros d'étapes `from-emerald-500 to-teal-500` → primary gradient
- `text-emerald-500` (icônes check) → `text-primary`

`src/pages/FormulaireRelouer.tsx` :
- Success card : `bg-emerald-500/15 border-emerald-500/30 text-emerald-500` → `bg-primary/10 border-primary/30 text-primary`

`src/pages/RendezVousBureau.tsx` :
- `border-emerald-500/40 bg-emerald-500/10 text-emerald-200` → `border-primary/40 bg-primary/10 text-primary`

## 6. Audit final

Aucun autre `blue-*`, `sky-*`, `indigo-*`, `cyan-*` dans `src/components/forms-premium/`, `src/components/mandat/`, `src/pages/NouveauMandat.tsx`, `FormulaireRelouer.tsx`, `RendezVousBureau.tsx`, `RelouerMonAppartement.tsx`, `ChasseurAppartement.tsx` (vérifié par grep). Les seuls bleus du projet vivent dans des sections marketing de la home (`DifferentiationSection`, `GuaranteeSection`, etc.) — **hors scope** (pas de formulaire).

Les composants Premium* admin/CRM ne sont **pas modifiés** (ils servent ailleurs).

## 7. Hors scope (non touché)

Auth, Supabase, upload documents, upload photos, signatures, mandate generation, Resend, AbaNinja, validations, routes admin/agent, logique métier des wizards, structure des steps, copy.

## 8. Validation visuelle

Après application, vérifier au browser (route preview) :
- `/nouveau-mandat` : step indicator, progress, inputs focus, bouton suivant/envoyer → tous verts ; top banner pâle
- `/formulaire-relouer` : idem
- `/rendez-vous` : idem
- `/relouer-mon-appartement` : titres, CTA, numéros d'étapes en vert (plus de teal)
- Plus aucun bandeau `slate-900` dans les formulaires publics

## Fichiers modifiés (résumé)

- `src/components/forms-premium/LandingFormShell.tsx` (wrapper + banner)
- `src/components/forms-premium/LandingButton.tsx` (gradient submit)
- `src/components/forms-premium/LandingDocumentDropzone.tsx`
- `src/components/forms-premium/PremiumDocumentDropzone.tsx`
- `src/pages/RelouerMonAppartement.tsx`
- `src/pages/FormulaireRelouer.tsx`
- `src/pages/RendezVousBureau.tsx`
