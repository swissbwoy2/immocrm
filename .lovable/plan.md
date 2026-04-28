## Suppression complète de la fonctionnalité Matching AI

Inventaire des références (vérifié) :

| Élément | État |
|---|---|
| Edge Function `ai-matching` | À supprimer (déployée) |
| Page `src/pages/agent/MatchingAI.tsx` | À supprimer |
| Route `/agent/matching-ai` dans `src/App.tsx` (ligne 115 + 351) | À retirer |
| Entrée menu "Matching AI" dans `src/components/AppSidebar.tsx` (ligne 156) | À retirer |
| Table `ai_matches` (23 lignes, dernière activité 2026-01-05) | À supprimer (DROP TABLE) |
| Mémoire `mem://features/matching-ai-system-v4-link-extraction-and-resource-optimization` | À retirer de l'index |

Vérifications faites :
- Aucun trigger DB n'appelle `ai-matching` (vérifié dans `information_schema.triggers`).
- Aucune ligne de `ai_matches` n'a été convertie en offre (`converted_to_offre_id` toujours NULL).
- `types.ts` se régénère automatiquement après le DROP TABLE.
- Le cron `sync-imap-emails-every-5-minutes` n'invoque PAS `ai-matching` — il est indépendant et reste en place.

### Étapes

**1. Frontend**
- Supprimer `src/pages/agent/MatchingAI.tsx`.
- Dans `src/App.tsx` : retirer l'import lazy ligne 115 et la route ligne 351.
- Dans `src/components/AppSidebar.tsx` : retirer l'entrée "Matching AI" ligne 156.

**2. Edge Function**
- Supprimer le dossier `supabase/functions/ai-matching/`.
- Appeler `supabase--delete_edge_functions(["ai-matching"])` pour la dé-déployer.

**3. Base de données (migration)**
```sql
DROP TABLE IF EXISTS public.ai_matches CASCADE;
```
Le CASCADE supprime les FK (`agent_id`, `client_id`, `email_id`, `converted_to_offre_id`) sans toucher aux tables parentes.

**4. Mémoire**
- Retirer la ligne `[Matching AI Extraction]` de `mem://index.md`.
- Supprimer `mem://features/matching-ai-system-v4-link-extraction-and-resource-optimization`.

### Hors-scope (intact)

- `received_emails` (sync IMAP continue normalement).
- `ai_agent_*`, `ai_relocation_*`, `renovation_ai_*` (autres systèmes AI sans rapport).
- Le cron IMAP toutes les 5 min (problème séparé, non traité ici).

### Risque

Nul — aucune dépendance live, page jamais utilisée par un workflow tiers, table sans conversion en offre.
