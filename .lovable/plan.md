## Audit honnête : NON, ce n'est pas à 100%

J'ai vérifié les 16 templates en base, les 15 Edge Functions `wa-*`, les triggers SQL et les flux de notif. Voici les **vrais trous** identifiés. La majorité fonctionne, mais 6 problèmes empêchent un workflow 100% propre.

### ✅ Ce qui est OK

- Les **16 templates Meta sont actifs en base** (welcome, new_offer, proposition_visite, visit_reminder_24h, post_visite, candidature_demandee, candidature_refus, alerte_agent_candidature, alerte_agent_reponse_visite, application_accepted, signature, edl, keys, google_review, mandate_expiring, agent_message).
- Les 15 Edge Functions `wa-send-*` / `wa-notify-agent-*` existent et envoient le bon nombre de variables.
- Les **5 triggers SQL** suivants déclenchent la bonne EF côté client :
  - `trg_wa_proposition_visite` (visites INSERT proposee)
  - `trg_wa_application_accepted` (candidatures.agent_valide_regie)
  - `trg_wa_signature_scheduled` (candidatures.date_signature_choisie)
  - `trg_wa_edl_scheduled` (candidatures.date_etat_lieux)
  - `trg_wa_keys_handover` (candidatures.cles_remises)

### ❌ Les 6 problèmes à corriger

**1. Doublon WhatsApp client/agent (ton bug actuel)**
   `forwardClientReplyToStaff` n'a pas de filtre `excludePhone`. Quand le n° agent = n° client (test ou agent qui se prend lui-même), le message staff est renvoyé au même WhatsApp.

**2. T4 `visit_reminder_24h` jamais envoyé**
   Aucune Edge Function `cron-visit-reminders` ni `wa-send-visit-reminder-24h` n'existe. Le template est en base mais inutile aujourd'hui. → créer `wa-send-visit-reminder-24h` + cron pg_cron quotidien 09:00 Europe/Zurich.

**3. T15/T16 alertes agent non appelées**
   Les EFs `wa-notify-agent-visit-response` et `wa-notify-agent-candidature` existent mais ne sont jamais invoquées. Aujourd'hui le webhook fait un `forwardClientReplyToStaff` direct (T15 inline) ; T16 (`alerte_agent_candidature` côté postulation) n'est envoyé nulle part. → brancher T16 sur le branche `post_visit_apply_yes` du webhook (ou trigger SQL INSERT candidatures).

**4. Cron post-visite & Google review pas planifiés**
   `wa-send-post-visite` (J + 3 h) et `wa-send-google-review` (J+7) sont écrits mais aucun cron pg_cron ne les exécute. → ajouter 2 jobs `cron.schedule(...)` (toutes les 30 min pour post-visite, quotidien 10:00 pour review).

**5. Cron `wa-send-mandate-expiring` à vérifier**
   La fonction existe mais aucun job pg_cron n'apparaît dans la migration. → vérifier/créer cron quotidien.

**6. Notif in-app + email staff incohérente**
   `forwardClientReplyToStaff` crée bien la notif in-app + email pour l'agent assigné + admins (corrigé dans le tour précédent). Mais T16 (candidature) ne passe pas par ce helper aujourd'hui → quand on l'ajoutera (point 3), il faut router la notif in-app/email avec le même `forwardClientReplyToStaff`.

### Plan d'action (un seul lot, idempotent)

1. **`whatsapp-forward-to-staff.ts`** — ajouter `excludePhone?: string` ; skip envoi WA si phone == excludePhone (in-app/email reste envoyé).
2. **`whatsapp-webhook/index.ts`** — passer `excludePhone: phoneE164` aux 7 appels `forwardClientReplyToStaff`.
3. **Brancher T16** : sur `post_visit_apply_yes`, après l'INSERT candidature, appeler `forwardClientReplyToStaff({ templateKey: "alerte_agent_candidature", variables: [...8 vars...], notifTitle: "📨 Nouvelle candidature client", notifLink: "/agent/candidatures" })`.
4. **Créer `wa-send-visit-reminder-24h`** (Edge Function) — boucle sur visites planifiees `date_visite` entre `now+23h` et `now+25h`, envoie T4.
5. **Migration `cron_jobs_whatsapp_lifecycle.sql`** — `cron.schedule` :
   - `wa-post-visite-tick` toutes les 30 min → `wa-send-post-visite`
   - `wa-google-review-daily` quotidien 10:00 → `wa-send-google-review`
   - `wa-visit-reminder-daily` quotidien 09:00 → `wa-send-visit-reminder-24h`
   - `wa-mandate-expiring-daily` quotidien 11:00 → `wa-send-mandate-expiring`
6. **Test fumée** : déclencher chacun des 16 templates (admin tool ou curl direct sur chaque EF) et vérifier `whatsapp_notification_logs.status='sent'`.

### Fichiers touchés

- `supabase/functions/_shared/whatsapp-forward-to-staff.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/wa-send-visit-reminder-24h/index.ts` (nouveau)
- `supabase/migrations/<ts>_wa_cron_jobs.sql`

### Validation finale

Après déploiement, je lancerai un test complet en réel sur un client de test et te listerai les 16 statuts en tableau (sent/failed) — y compris confirmation que la notif in-app + email arrive à Christ pour chaque réponse client.