

# Plan : Débloquer Claude Code + corriger les 75+ erreurs TS depuis Lovable

## Contexte

Claude Code est bloqué côté ton Mac (le terminal a perdu son CWD `/Users/ramazani/Desktop/immocrm`). Pendant que tu le redémarres, **je peux corriger les 75+ erreurs TypeScript directement depuis Lovable** — le build est cassé et la preview ne reflète plus aucun changement, donc c'est prioritaire.

Important : `uipro-cli` n'existe pas sur npm public (Claude Code l'a confirmé). On garde la stratégie : design system construit manuellement à partir des skills `ui-ux-pro-max` qui sont déjà chargés en context.

## Action 1 — Côté toi (terminal)

Relance Claude Code depuis le bon dossier :

```bash
cd ~/Desktop/immocrm && claude
```

Si le dossier a bougé, retrouve-le avec :

```bash
find ~ -name "vite.config.ts" -not -path "*/node_modules/*" 2>/dev/null
```

## Action 2 — Côté moi (Lovable, dès ton approbation)

### A. Fix framer-motion v12 strict typing (8 fichiers)

Ajouter `as const` sur les `ease: [...]` arrays et `type: "spring"` strings :

- `src/components/public-site/magic/AnimatedList.tsx` (ligne 13) → `type: "spring" as const`
- `src/components/public-site/sections/CloserSection.tsx` (ligne 120) → `ease: [...] as const`
- `src/components/public-site/sections/CoverageSection.tsx` (ligne 60)
- `src/components/public-site/sections/DifferentiatorSection.tsx` (lignes 117, 150)
- Grep du pattern dans tous les autres fichiers `src/components/public-site/sections/*` et `src/components/public-site/animations/*` pour catch les similaires non listés dans l'erreur tronquée

### B. Fix erreurs Supabase (5 fichiers métier)

Lire `src/integrations/supabase/types.ts` pour chaque table, puis corriger :

- `src/components/AddBienVenteDialog.tsx:558` — table `photos_biens` (colonne `immeuble_id` à vérifier — erreur TS dit qu'elle existe pourtant ; probablement un autre champ excess à virer)
- `src/components/CapturePhotosDialog.tsx:173,188` — table `photos_biens` (idem)
- `src/components/DocumentUpdateReminder.tsx:112,124` — table `client_document_verifications` (typage strict du Record + colonne `client_id`)
- `src/components/biens-vente/rapport-estimation/RapportEstimationDataForm.tsx:155` — table `biens_vente` (typer le Record correctement au lieu de `Record<string, any>`)
- `src/components/proprietaire/AddHypothequeDialog.tsx:83` — table `hypotheques`

L'erreur TS sur ces fichiers indique en fait que TypeScript narrowing échoue sur les Record/objets dynamiques. Solution : typer correctement avec le type Insert généré (`Database['public']['Tables']['xxx']['Insert']`) ou utiliser `as any` localement avec commentaire `// TODO: typer correctement` si le schéma exact est ambigu.

### C. Validation

- Vérifier 0 erreur TS résiduelle
- Vérifier preview Lovable se rafraîchit
- Confirmer que la HomePage `/` affiche le hero v3 ScrollExpandMedia déjà livré

## Hors scope de ce plan (à faire ensuite par Claude Code une fois relancé)

- Phase 1 : Création `TravelingGoldKey3D` (clé 3D voyageuse)
- Phase 2 : Refonte `HowItWorksSection` (scroll horizontal cinématique)
- Phase 3 : Refonte `PartnersSection` (Resolve + FirstCaution dominants)
- Phase 4 : Stylisation des 8 autres sections (Bento, OrbitingCircles, Marquee, etc.)
- Génération `design-system/MASTER.md` manuelle (uipro-cli n'existe pas)

Ces phases nécessitent beaucoup plus de tokens et le 21st.dev MCP côté Claude Code → garder ça pour ta session locale.

## Prochaine étape

Approuve ce plan → je passe en mode default et je corrige immédiatement les 75+ erreurs TS pour débloquer ton build. En parallèle tu relances Claude Code dans le bon dossier pour qu'il enchaîne sur les Phases 1-4.

