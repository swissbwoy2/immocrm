## 🎯 Objectif

1. **Reproduire la logique des extraits de poursuites** pour les **fiches de salaire** : du **25 du mois** jusqu'à action du client, envoyer un rappel **TOUS LES JOURS** (pas de cooldown — quotidien jusqu'à upload de la fiche du mois en cours).
2. **Tester** : extraction IA des extraits de poursuites + envoi des rappels (poursuites & fiches de salaire).

---

## 📊 Contexte technique trouvé

- Fiches de salaire = lignes dans `documents` avec `type_document = 'fiche_salaire'` (216 fiches en base, dernière 2026-04-24)
- Colonnes utiles : `client_id`, `date_upload`, `created_at`
- Aucun système de relance fiche de salaire existant aujourd'hui
- Mémoire `client-document-monthly-verification-system` confirme la fenêtre 25 → 5 du mois suivant

---

## 🔧 1. Nouvelle Edge Function `send-payslip-update-reminders`

**Logique** :
- Pour chaque client actif (`statut in ('actif','en_recherche','en_attente')`)
- **Fenêtre d'activation** : entre le 25 du mois M et le 5 du mois M+1
- Récupérer la fiche la plus récente : `documents` where `type_document='fiche_salaire'` and `client_id=...` order by `date_upload desc limit 1`
- Si la fiche la plus récente est **antérieure au 1er du mois M** (= aucune fiche pour le mois courant) → envoyer rappel
- **Pas de cooldown** : envoi quotidien tant que pas d'upload

**Niveaux de sévérité progressifs** :
| Période | Niveau | Destinataires |
|---|---|---|
| 25-30/31 du mois | 🟡 Rappel doux | Client + Agent |
| 1-3 du mois suivant | 🟠 Rappel insistant | Client + Agent |
| 4-5 du mois suivant | 🔴 URGENT — dossier bientôt incomplet | Client + Agent + Admins |

Notifications + email avec CTA → `/client/documents`.

---

## 🗄️ 2. Migration SQL

- Ajouter `payslip_last_reminder_at TIMESTAMPTZ` sur `clients` (monitoring/debug)
- Index sur `documents(client_id, type_document, date_upload DESC)` si absent

---

## ⏰ 3. Cron quotidien

Programmer via `pg_cron` une exécution **quotidienne à 9h Europe/Zurich** (8h UTC) de `send-payslip-update-reminders`. Utiliser l'outil `insert` (pas migration) car le SQL contient l'URL/clé du projet.

Idéalement aussi : ajouter ou vérifier le cron quotidien pour `send-document-update-reminders` (poursuites) si absent.

---

## ⚙️ 4. Déclaration dans `supabase/config.toml`

```toml
[functions.send-payslip-update-reminders]
verify_jwt = false
```

---

## 🧪 5. TESTS — Phase A : Extraction IA poursuites

- Déployer `extract-poursuites-date`
- Chercher un `document_id` réel d'extrait de poursuites en base
- L'invoquer via `supabase--curl_edge_functions`
- Vérifier que la date extraite est correcte
- Vérifier que `clients.extrait_poursuites_date_emission`, `extraction_method='ai'`, `ai_confidence` sont mis à jour
- Inspecter les logs via `supabase--edge_function_logs`

---

## 🧪 6. TESTS — Phase B : Rappels poursuites

- Invoquer `send-document-update-reminders` manuellement
- Vérifier compteurs `{missing, warning, expired, skipped}`
- Vérifier notifications créées (client/agent/admin selon niveau)
- Vérifier logs (pas d'erreur Resend)

---

## 🧪 7. TESTS — Phase C : Rappels fiches de salaire

- Déployer la nouvelle fonction
- L'invoquer manuellement via `curl_edge_functions`
- Vérifier qu'un client ayant uploadé une fiche aujourd'hui n'est **PAS** notifié
- Vérifier qu'un client sans fiche du mois courant **EST** notifié
- Vérifier les notifications + emails

---

## 🗂️ Récap fichiers

**Créer** :
- `supabase/functions/send-payslip-update-reminders/index.ts`
- Migration SQL (1 colonne + 1 index)

**Modifier** :
- `supabase/config.toml`

**Insert SQL** (data, pas migration) :
- Cron `pg_cron` pour appel quotidien

---

## ❓ À confirmer

**Heure d'exécution** : je propose **9h Europe/Zurich** (matin, le client voit la notif en début de journée). OK ou tu préfères un autre créneau (12h, 18h) ?
