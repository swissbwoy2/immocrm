

# Lot 3 — Recette fonctionnelle : exécution

## Prérequis : connexion admin requise

Le test de connectivité montre que vous n'êtes pas actuellement connecté dans le preview. Les 5 Edge Functions ont `verify_jwt = true`, donc **vous devez vous connecter avec votre compte admin (`admin@immo-rama.ch`) dans le preview avant que je puisse exécuter la recette**.

## Plan d'exécution dès connexion confirmée

### Étape 1 — Seed SQL via `psql` (pas de migration)

Insertion avec UUIDs déterministes dans cet ordre :

| Table | UUID | Données clés |
|---|---|---|
| `renovation_projects` | `aaaaaaaa-0000-0000-0000-000000000001` | status=`completed`, immeuble_id=`8116a135-5b1c-4972-859b-187792ab7f70`, created_by=admin |
| `renovation_milestones` | `aaaaaaaa-0000-0000-0000-000000000002` | status=`completed`, project_id=ci-dessus |
| `renovation_budget_lines` | `aaaaaaaa-0000-0000-0000-000000000003` | estimated=50000, paid=45000 |
| `renovation_incidents` | `aaaaaaaa-0000-0000-0000-000000000004` | severity=`critical`, status=`reported`, is_blocking=true |
| `renovation_reservations` | `aaaaaaaa-0000-0000-0000-000000000005` | is_blocking=true, status=`identified` |
| `renovation_warranties` | `aaaaaaaa-0000-0000-0000-000000000006` | warranty_type=`décennale`, start/end dates |

### Étape 2 — 7 cas de recette séquentiels

Exécution via `curl_edge_functions` (JWT automatique si connecté) :

1. **Cas 1** : POST `renovation-close-project` → attendu 400 + incident critique
2. **Cas 2** : UPDATE incident → resolved, POST close → attendu 400 + réserve bloquante
3. **Cas 3** : UPDATE réserve → resolved, POST close → attendu 200 + `closed: true`
4. **Cas 4** : Seed projet #2, 2× POST `renovation-generate-alerts` → vérif idempotence
5. **Cas 5** : 2× POST `renovation-dispatch-notifications` → vérif pas de doublon
6. **Cas 6** : POST `renovation-generate-final-report` × 2 → vérif cache
7. **Cas 7** : POST `renovation-get-history` en admin → historique complet

Pour 7B/7C (propriétaire/company_user), vérification SQL du filtrage dans le code Edge Function (pas de compte séparé disponible pour test live).

### Étape 3 — Vérifications complémentaires

Requêtes SQL pour confirmer triggers audit, absence d'accès company_user, journalisation `warranties_not_applicable`.

### Étape 4 — Cleanup SQL

Suppression ciblée dans l'ordre inverse des FK de toutes les données `aaaaaaaa-*`.

---

## Action requise

**Connectez-vous dans le preview** avec `admin@immo-rama.ch`, puis confirmez **"c'est fait"**. J'exécuterai immédiatement le seed + les 7 cas + cleanup avec résultats détaillés par cas.

