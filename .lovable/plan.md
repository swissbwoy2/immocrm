

# Lot 4 — Plan d'execution ferme

## Decisions techniques tranchees

1. **verify_jwt** : Les 10 fonctions Lot 1/2 ont `verify_jwt = false` dans config.toml mais font toutes une validation auth manuelle en code. C'est le pattern historique du projet. On ne change PAS le config.toml pour eviter des regressions. On documente cette decision.

2. **Email** : L'infrastructure email existe deja (`notify.logisorama.ch` verifie, `send-notification-email` avec Resend). On etend `renovation-dispatch-notifications` pour appeler `send-notification-email` quand `channel = 'email'`, en reutilisant l'infra existante. Pas de nouvelle Edge Function email.

3. **Monitoring** : Strategie logs applicatifs structures dans les Edge Functions existantes (console.error avec contexte JSON). Pas de table dediee — les logs Deno sont deja consultables via les outils existants. On ajoute des logs structures aux points d'echec critiques.

4. **UX Polish** : Ciblage strict des etats vides, loading, erreurs. Pas de redesign.

---

## A. Plan d'execution

### Etape 1 — Recette live black-box (13 Edge Functions)

**Methode** : `curl_edge_functions` avec session admin connectee dans le preview.

**Prerequis** : Connexion admin dans le preview.

**Cas de test** :
- `renovation-create-project` : creation avec immeuble reel → 201 + id
- `renovation-create-upload` : signed URL pour le projet cree → 200 + token
- `renovation-register-upload` : enregistrement fichier → 200 + file_id + job_id
- `renovation-analyze-file` : analyse du job → 200 (completed ou processing)
- `renovation-create-quote` : creation devis lie au projet → 200
- `renovation-analyze-quote` : analyse du devis → 200
- `renovation-compare-quotes` : necessite 2 devis analyses → 200 ou erreur coherente
- `renovation-update-progress` : update milestone → 200
- `renovation-generate-alerts` : 2 appels consecutifs → idempotent
- `renovation-close-project` : blocage si incident/reserve → 400, puis succes → 200
- `renovation-generate-final-report` : 1er appel → genere, 2e → cache
- `renovation-dispatch-notifications` : 2 appels → idempotent
- `renovation-get-history` : admin → historique complet

**Cleanup** : Suppression du projet de test et donnees liees via psql.

### Etape 2 — Durcissement production

**Corrections** :
- `renovation-score-companies` : pas de verification auth → ajouter auth check
- `renovation-analyze-file` : pas de verification auth → ajouter auth check
- `renovation-analyze-quote` : pas de verification auth → ajouter auth check
- Verifier que `renovation-download-file` valide bien les paths (pas de path traversal)

**RLS** : Verification via linter + inspection manuelle des policies renovation.

**Storage** : Confirmer policies `renovation-private` bucket.

### Etape 3 — Monitoring / observabilite

Ajout de logs structures `console.error(JSON.stringify({...}))` dans les 5 fonctions critiques :
- `renovation-analyze-file` : log echec AI + file_id + job_id
- `renovation-analyze-quote` : log echec AI + quote_id
- `renovation-compare-quotes` : log echec comparaison + quote_ids
- `renovation-generate-final-report` : log echec generation + project_id
- `renovation-dispatch-notifications` : log echec dispatch + alert_id
- `renovation-close-project` : log blocage metier + project_id + reasons

Format : `{ event: "renovation_error", function: "...", project_id: "...", error: "...", context: {...} }`

### Etape 4 — Notifications email

Modifier `renovation-dispatch-notifications` pour :
1. Ajouter `channel: 'email'` en plus de `'in_app'` pour les alertes `critical` et `warning`
2. Apres l'upsert in_app, appeler `send-notification-email` via fetch interne pour chaque destinataire avec email
3. Idempotence : `idempotency_key` separe pour email (`{alert_id}:{recipient}:email`)
4. Toggle : respecter une colonne `email_notifications_enabled` sur le projet (default true)

Templates : reutiliser le template existant de `send-notification-email` avec types renovation.

### Etape 5 — Polish UX

Composants modifies (fichiers existants uniquement) :
- `RenovationIncidentsList` : etat vide avec icone + message clair
- `RenovationReservationsList` : idem
- `RenovationWarrantiesTable` : idem
- `RenovationHistoryFeed` : etat vide + loading skeleton
- `RenovationAlertsPanel` : etat "aucune alerte" + badge count
- `RenovationCloseProjectDialog` : loading state + messages erreur clairs
- `RenovationFinalReportCard` : etat loading + etat genere
- `RenovationStatusBadge` : verifier cohérence couleurs pour tous les statuts

### Etape 6 — Documentation handover

Generation d'un PDF `/mnt/documents/handover-renovation-intelligente.pdf` contenant :
- Architecture resumee (tables, Edge Functions, hooks, composants)
- Logique des alertes (7 types, idempotency_key, resolution auto)
- Logique de cloture (RPC + blocages)
- Logique du dossier final (HTML, storage, idempotence)
- Procedure de recette (cas de test reproductibles)
- Procedure de diagnostic (logs, tables a inspecter)
- Points de vigilance securite
- Maintenance future recommandee

---

## B. Backend

**Edge Functions modifiees** :
- `renovation-score-companies` : ajout auth check
- `renovation-analyze-file` : ajout auth check + logs structures
- `renovation-analyze-quote` : ajout auth check + logs structures
- `renovation-dispatch-notifications` : ajout canal email + logs
- `renovation-close-project` : ajout logs structures
- `renovation-generate-final-report` : ajout logs structures
- `renovation-compare-quotes` : ajout logs structures

**Migration SQL** : 1 migration legere
- `ALTER TABLE renovation_projects ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true`

**Pas de** : nouvelle table monitoring, nouveau trigger, nouvelle RPC.

---

## C. Frontend

**Composants modifies** (polish UX uniquement) :
- `RenovationIncidentsList.tsx` — etat vide ameliore
- `RenovationReservationsList.tsx` — etat vide ameliore
- `RenovationWarrantiesTable.tsx` — etat vide ameliore
- `RenovationHistoryFeed.tsx` — loading skeleton + etat vide
- `RenovationAlertsPanel.tsx` — badge count + etat vide
- `RenovationCloseProjectDialog.tsx` — feedback erreur/succes
- `RenovationFinalReportCard.tsx` — loading state

**Pas de** : nouveau composant, nouvelle page, nouveau hook.

---

## D. Recette live

| Cas | Fonction | Test | Resultat attendu |
|-----|----------|------|-------------------|
| 1 | create-project | POST {immeuble_id, title} | 201 + id |
| 2 | create-upload | POST {projectId, fileName, category, mimeType} | 200 + token |
| 3 | register-upload | POST {projectId, storagePath, ...} | 200 |
| 4 | analyze-file | POST {jobId} | 200 |
| 5 | create-quote | POST {projectId, companyId, ...} | 200 |
| 6 | analyze-quote | POST {quoteId} | 200 |
| 7 | compare-quotes | POST {quoteIds, projectId} | 200 ou 400 |
| 8 | update-progress | POST {projectId, milestoneId, status} | 200 |
| 9 | generate-alerts x2 | POST {projectId} x2 | idempotent |
| 10 | close-project (bloque) | POST {projectId} | 400 + reasons |
| 11 | close-project (ok) | POST {projectId} apres resolution | 200 |
| 12 | generate-final-report x2 | POST {projectId} x2 | cache au 2e |
| 13 | dispatch-notifications x2 | POST {projectId} x2 | idempotent |
| 14 | get-history | POST {projectId} | entries[] |

**Cleanup** : suppression projet test + cascades via psql.

---

## E. Documentation

Livrable : `/mnt/documents/handover-renovation-intelligente.pdf`
- ~15 pages, format A4, branding Logisorama
- Oriente exploitation, pas marketing
- Inclut procedures reproductibles

---

## Prerequis pour executer

**Vous devez vous connecter dans le preview avec votre compte admin (`admin@immo-rama.ch`)** avant que je puisse lancer la recette live. Confirmez "c'est fait" et j'execute les 6 etapes sequentiellement.

