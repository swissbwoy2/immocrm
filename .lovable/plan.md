

# Lot 4 — En attente de connexion admin

## Situation actuelle
- Le preview montre la landing page publique (non connecté)
- Le `curl_edge_functions` transmet automatiquement le token de la session browser
- Sans session authentifiée, toutes les Edge Functions protégées retournent 401

## Ce qui sera exécuté dès connexion confirmée

### Étape 1 — Recette live (13 fonctions, 14 cas)
1. `renovation-create-project` → 201 + id projet test
2. `renovation-create-upload` → 200 + signed URL
3. `renovation-register-upload` → 201 + file_id + job_id
4. `renovation-analyze-file` → 200
5. `renovation-create-quote` (x2 devis) → 200
6. `renovation-analyze-quote` → 200
7. `renovation-compare-quotes` → 200
8. `renovation-update-progress` → 200
9. `renovation-generate-alerts` x2 → idempotent
10. `renovation-close-project` (bloqué) → 400
11. `renovation-close-project` (ok) → 200
12. `renovation-generate-final-report` x2 → cache au 2e
13. `renovation-dispatch-notifications` x2 → idempotent
14. `renovation-get-history` → entries[]

### Étape 2 — Cleanup SQL
Suppression ciblée du projet test et données liées.

### Étape 3 — Handover PDF
Génération de `/mnt/documents/handover-renovation-intelligente.pdf` (~15 pages, branding Logisorama, orienté exploitation).

## Action requise
**Connectez-vous dans le preview** avec `admin@immo-rama.ch`, puis confirmez "c'est fait". J'exécute immédiatement les 3 étapes.

