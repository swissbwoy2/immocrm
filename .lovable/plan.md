## Objectif

Réduire la consommation Cloud (invocations, stockage DB, egress) en attaquant les 3 sources principales :
1. **183 MB de logs système** (`cron.job_run_details` + `net._http_response`) qui grossissent indéfiniment
2. **Cron 5 min trop agressifs** (`sync-imap-emails`, `send-visit-reminders`) → 576 runs/jour
3. **Tables applicatives sans rétention** (`notifications` 20k lignes / `received_emails` 3.6k lignes / 26 MB)

---

## 1. Cron de purge automatique des tables système

Création d'une fonction SQL `public.purge_system_logs()` (SECURITY DEFINER) qui supprime :
- `cron.job_run_details` → garder **7 jours** (au lieu d'illimité). Économie : ~92 MB → ~10 MB
- `net._http_response` → garder **3 jours**. Économie : ~91 MB → ~5 MB

Planification via `cron.schedule` :
```text
purge-system-logs-daily   →   0 3 * * *   (tous les jours à 03h00 Europe/Zurich)
```

Cette purge tourne **directement en SQL** (pas d'edge function appelée) → 0 invocation, 0 egress.

---

## 2. Réduction de la fréquence des 2 cron jobs

| Job | Avant | Après | Runs/jour avant → après |
|---|---|---|---|
| `sync-imap-emails-every-5-minutes` | `*/5 * * * *` | `*/15 * * * *` | 288 → 96 |
| `send-visit-reminders-job` | `*/5 * * * *` | `*/15 * * * *` | 288 → 96 |

Gain : **−384 invocations/jour** sur ces 2 jobs (−66%).

Justification :
- IMAP : un délai max de 15 min pour recevoir un mail entrant reste largement acceptable
- Rappels visite : la fenêtre de rappel (24h/2h avant) tolère sans souci une granularité de 15 min

Renommage des jobs (`-every-15-minutes`) pour cohérence.

---

## 3. Politique de rétention sur tables applicatives

Ajout dans la même fonction `purge_system_logs()` (renommée `purge_old_data()`) :

**`notifications`** :
- Supprimer les notifications **lues** de plus de **30 jours** (`is_read = true AND read_at < now() - 30d`)
- Supprimer les notifications **non lues** de plus de **90 jours** (anti-bloat sécurité)

**`received_emails`** :
- Garder **90 jours** d'historique IMAP (`created_at < now() - 90d`)
- Si un email est lié à une conversation/lead actif, on garde via une jointure de protection (à confirmer côté usage)

Estimation gain : `notifications` 17 MB → ~5 MB, `received_emails` 26 MB → ~10 MB.

---

## Détails techniques

**Migration SQL** (schéma) — création de la fonction + grants :
```sql
CREATE OR REPLACE FUNCTION public.purge_old_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb := '{}'::jsonb;
BEGIN
  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
  GET DIAGNOSTICS r = ROW_COUNT; -- log par étape...
  DELETE FROM net._http_response WHERE created  < now() - interval '3 days';
  DELETE FROM public.notifications
    WHERE (is_read = true AND read_at < now() - interval '30 days')
       OR (is_read = false AND created_at < now() - interval '90 days');
  DELETE FROM public.received_emails WHERE created_at < now() - interval '90 days';
  RETURN r;
END $$;
```

**Insert SQL** (données — via outil insert, pas migration, car contient l'URL projet) :
- `cron.unschedule('sync-imap-emails-every-5-minutes')` + reschedule en `*/15 * * * *`
- `cron.unschedule('send-visit-reminders-job')` + reschedule en `*/15 * * * *`
- `cron.schedule('purge-old-data-daily', '0 3 * * *', $$ SELECT public.purge_old_data(); $$)`

**Vérification post-déploiement** :
- `SELECT * FROM cron.job` → confirmer les 3 jobs modifiés/créés
- Lancer manuellement `SELECT public.purge_old_data();` pour purge initiale immédiate (libère ~180 MB d'un coup)

---

## Impact attendu

| Métrique | Avant | Après |
|---|---|---|
| Invocations cron/jour | ~730 | ~346 (−53%) |
| Stockage DB | 295 MB | ~100 MB (−66%) |
| Croissance mensuelle | rapide | stable |

Aucun impact fonctionnel : les délais (15 min IMAP, 24h notifications lues, 90j emails) sont conservateurs et ajustables.

---

## Hors scope (à proposer plus tard si besoin)

- Désactivation totale d'un cron (à valider avec toi)
- Archivage des `received_emails` purgés vers Storage avant suppression
- Compression / partitioning de `notifications`

Confirme et je passe en mode build.