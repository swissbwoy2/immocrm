
Objectif: arrêter la boucle d’erreurs “Invalid token” / “ça ne marche pas” et remettre le run mission en état stable.

Constat (investigation profonde)
1) Le 401 n’est plus le blocage principal
- Historique des appels edge: v8/v9 = 401, puis v10 = 500.
- Les logs auth montrent des GET /user en 200 au même moment que les runs récents.
- Conclusion: l’auth a progressé; le blocage actuel est ailleurs.

2) Blocage actuel confirmé: mismatch schéma DB vs code
- Le run échoue maintenant avec:
  `Could not find the 'sources_used' column of 'mission_execution_runs'`
- Table réelle `mission_execution_runs`: colonne `sources_searched` (pas `sources_used`).

3) Drift plus large détecté (risques de prochains bugs)
- `ai-relocation-api`:
  - `handleMissionsCreate` insère `name` (colonne inexistante) + fallback `frequency='daily'` (enum invalide).
  - `runAutonomousSearch` lit `criteria.city/rooms`, mais les missions existantes ont souvent `location/min_rooms`.
  - `handleOffersPrepare` utilise `property_result_id` au lieu de `property_result_ids`.
  - `handleVisitsRequest` utilise `preferred_dates/notes` au lieu de `proposed_slots/contact_message`.
- `ai-relocation-webhook` réutilise aussi `sources_used` (même bug potentiel).
- UI:
  - `MissionDetailDrawer` lit des champs non alignés (`sources`, `new_results`, `duplicates_skipped`, etc.).
  - `AgentIADashboard` filtre `mission_execution_runs` par `ai_agent_id` (colonne inexistante).

Plan d’implémentation
Phase 1 — Hotfix immédiat “Run mission”
1) Corriger `sources_used` -> `sources_searched` dans:
   - `supabase/functions/ai-relocation-api/index.ts`
   - `supabase/functions/ai-relocation-webhook/index.ts`
2) Garder la compatibilité des critères existants:
   - ville: `overrides.city || criteria.city || criteria.location || criteria.region_recherche || 'Genève'`
   - pièces: `overrides.rooms || criteria.rooms || criteria.min_rooms || null`
   - type: `criteria.type_bien || criteria.property_type || null`
3) En cas d’échec de run, écrire `error_message` dans `mission_execution_runs` pour debug immédiat.

Phase 2 — Alignement API/back-end (éviter les prochains incidents)
4) `handleMissionsCreate`
   - retirer `name`
   - mapper fréquence vers enum DB (`quotidien|hebdomadaire|manuel`)
5) `handleOffersPrepare`
   - écrire `property_result_ids: [id]` (ou batch direct) au lieu de `property_result_id`
6) `handleVisitsRequest`
   - mapper `preferred_dates -> proposed_slots`
   - mapper `notes -> contact_message`

Phase 3 — Alignement UI (cohérence admin)
7) `MissionDetailDrawer`
   - `allowed_sources` (au lieu de `sources`)
   - `results_new` / `duplicates_detected` (au lieu de `new_results` / `duplicates_skipped`)
   - compteurs mission: `results_found` / `results_retained`
8) `AgentIADashboard`
   - compter les runs via jointure `mission_execution_runs -> search_missions(ai_agent_id)` au lieu de filtrer `ai_agent_id` directement sur `mission_execution_runs`.

Validation (à exécuter après implémentation)
- Test 1: clic ⚡ Run => réponse 200, plus de “Invalid token”.
- Test 2: une ligne créée dans `mission_execution_runs` avec `status`, `sources_searched`, timestamps.
- Test 3: `search_missions.last_run_at` mis à jour.
- Test 4: missions avec anciens snapshots (`location/min_rooms`) utilisent bien la bonne ville/pièces.
- Test 5: UI Missions/Drawer affiche les compteurs réels sans erreurs de colonnes.

Détails techniques
- Aucune migration DB requise pour le hotfix (on aligne le code sur le schéma existant).
- Si souhaité, on peut aussi faire une migration de compatibilité (alias/colonnes), mais ce n’est pas nécessaire pour remettre le run en service rapidement.
