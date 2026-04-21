

# Plan : Refondre `/nouveau-mandat` avec le design system forms-premium

## Constat

Claude Code a livré le commit `ed91964` qui couvre Login, FirstLogin, ResetPassword, FormulaireVendeurComplet, FormulaireRelouer, FormulaireConstruireRenover et MandatV3. Mais il a **oublié `/nouveau-mandat`**, qui est pourtant le formulaire le plus important (7 steps, parcours principal de conversion mandataire).

Côté Lovable, j'ai déjà appliqué un **fix d'urgence de lisibilité** (titres dorés, labels lisibles, contraste inputs). Mais le formulaire n'utilise toujours pas les composants `forms-premium` créés par Claude Code (LuxuryFormBackground, FloatingKey3D, PremiumFormShell, PremiumInput, etc.).

## Périmètre du fix

### Fichiers à refondre (10 fichiers)

1. `src/pages/NouveauMandat.tsx` — wrapper page
2. `src/components/mandat/MandatForm.tsx` — orchestrateur stepper
3. `src/components/mandat/MandatFormStep1.tsx` — Informations personnelles
4. `src/components/mandat/MandatFormStep2.tsx` — Type de bien & critères
5. `src/components/mandat/MandatFormStep3.tsx` — Localisation
6. `src/components/mandat/MandatFormStep4.tsx` — Situation professionnelle
7. `src/components/mandat/MandatFormStep5.tsx` — Situation familiale
8. `src/components/mandat/MandatFormStep6.tsx` — Documents
9. `src/components/mandat/MandatFormStep7.tsx` — Signature & CGV
10. `src/components/mandat/SignaturePad.tsx` — habillage premium (border doré + glow)

### Refonte cosmétique uniquement

- Wrapper `NouveauMandat` → `PremiumFormShell` + `LuxuryFormBackground` + `FloatingKey3D`
- `MandatForm` → `PremiumStepIndicator` + `PremiumStepTransition` (AnimatePresence entre steps)
- Tous les `Input` shadcn → `PremiumInput` avec icônes `LuxuryIcons` contextuelles
- Tous les `Select` → `PremiumSelect`
- Tous les `Textarea` → `PremiumTextarea`
- Cards radio (type recherche, type bien, statut civil, statut pro) → `PremiumRadioCard`
- Checkbox CGV → `PremiumCheckboxCard`
- Boutons next/back/submit → `PremiumButton` (variants next, back, submit)
- Titres `h1`/`h2` → font-serif Cormorant + gradient doré (déjà fait côté Lovable, à conserver)
- Récapitulatif final → animations stagger (chaque ligne fade-in + slide-right)
- Zone upload documents (Step 6) → border doré dashed pulsant + thumbnails glow
- SignaturePad → border doré + glow au focus + grid background subtle

## Contraintes strictes (non négociables)

- ZÉRO modification de la logique métier (validation, soumission, redirections)
- ZÉRO modification des textes, labels, placeholders, descriptions
- ZÉRO modification des appels Supabase (`.insert`, `.update`, `.select`)
- ZÉRO modification des edge functions
- Préserver `SearchTypeContext` pour Louer/Acheter
- Préserver `NATIONALITES` constant
- Préserver `MandatRecapitulatif` data structure
- Préserver tous les pixels Meta/TikTok/Google Ads + UTM tracking
- Préserver les ID HTML (#nouveau-mandat-form, etc.)
- Préserver toutes les animations/transitions existantes qui fonctionnent
- Préserver l'isolation `theme-luxury` du wrapper

## Bonus : fix runtime warning ResizeObserver

Pendant la refonte, ajouter un `requestAnimationFrame` autour des appels `observe()` dans le hook resize utilisé par `PremiumStepIndicator` ou `LuxuryFormBackground` pour éviter le warning `ResizeObserver loop completed with undelivered notifications`.

## Validation après refonte

1. Reload `/nouveau-mandat` → background doré animé visible (RetroGrid + particules + meteors)
2. FloatingKey3D visible en bottom-right desktop, absent en mobile
3. PremiumStepIndicator avec gradient doré progressif + AnimatedBeam entre steps
4. Step 1 → tous les champs en PremiumInput avec icônes dorées (Mail, Phone, User, Calendar, Globe, IdCard)
5. Naviguer Step 1 → 2 → 3 → ... → 7 avec transitions cinématiques (fade + slide)
6. Step 7 → SignaturePad premium + récapitulatif animé + bouton submit XL avec glow
7. Mobile 375px → background simplifié, particules désactivées, FloatingKey3D masqué, inputs ≥16px
8. `bun run build` = 0 erreur TypeScript
9. Console preview = 0 erreur runtime, 0 warning React
10. Soumission Step 7 → POST Supabase intact, redirection intacte, pixels intacts

## Prochaine étape

Approuve ce plan → je passe en mode default et je refonds les 10 fichiers du parcours `/nouveau-mandat` avec le design system `forms-premium` créé par Claude Code, pour que ce formulaire bénéficie enfin du même rendu cinématique luxury que les 7 autres déjà refondus dans le commit `ed91964`.

