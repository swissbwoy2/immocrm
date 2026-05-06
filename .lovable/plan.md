# Plan final approuvé — 17 templates WhatsApp Logisorama

**Décisions confirmées** :
- Numéro admin : `+41764839199` (stocké en secret `WHATSAPP_ADMIN_PHONE`)
- Lien Google Reviews : `https://g.page/r/CQJCKNAJlouGEAE/review` (déjà câblé côté Meta dans le bouton URL du template #14)
- Forward des réponses clients : Agent assigné + Admin
- Langues EN/FR : on garde les langues telles que validées par Meta, mappées exactement dans la DB

## Mapping final des 17 templates

| # | template_name_meta | Lang | Trigger |
|---|---|---|---|
| 1 | `logisorama_welcome_activation` | en | Admin clic "Activer" |
| 2 | `logisorama_new_offer` ✅ déjà câblé | fr | offres INSERT |
| 3 | `logisorama_proposition_visite_client` | fr | visites INSERT (statut proposee) |
| 4 | `logisorama_alerte_agent_reponse_visite` | fr | webhook (réponse client à #3) |
| 5 | `logisorama_visit_reminder_24h` ✅ déjà câblé | fr | cron J-1 |
| 6 | `logisorama_post_visite_question` | fr | cron 30 min, +2h après visite |
| 7 | `logisorama_candidature_demandee_client` | fr | webhook (Postuler à #6) |
| 8 | `logisorama_candidature_refus_client` | fr | webhook (Refuser à #6) |
| 9 | `logisorama_alerte_agent_candidature` | fr | webhook (Postuler à #6) |
| 10 | `application_accepted` | en | candidatures.agent_valide_regie=true |
| 11 | `logisorama_signature_scheduled` | en | candidatures.date_signature_choisie |
| 12 | `logisorama_etat_des_lieux_scheduled` | en | candidatures.date_etat_lieux |
| 13 | `logisorama_keys_handover` | en | candidatures.cles_remises=true |
| 14 | `logisorama_google_review_request` | en | cron J+3 après cles_remises |
| 15 | `logisorama_mandate_expiring_30d` ✅ déjà câblé | fr | cron J-30 |
| 16 | `logisorama_agent_message` ✅ déjà câblé | fr | messages INSERT |
| 17 | `hello_world` | en | (template Meta de test, ignoré) |

## Livrables techniques

### Migration SQL
- Insert/update des 12 nouveaux templates dans `whatsapp_message_templates` avec `language` exact (en/fr) et `is_active=true`
- Activation `mandate_expiring_30d`
- Colonnes idempotency : `visites.post_visit_question_sent`, `candidatures.cles_recues_confirme`, `candidatures.cles_recues_confirme_at`
- Fonction `trigger_wa_event(fn_name, id_field)` (SECURITY DEFINER) + 5 triggers DB :
  - visites INSERT statut='proposee' → `wa-send-proposition-visite`
  - candidatures UPDATE OF agent_valide_regie → `wa-send-application-accepted`
  - candidatures UPDATE OF date_signature_choisie → `wa-send-signature-scheduled`
  - candidatures UPDATE OF date_etat_lieux → `wa-send-edl-scheduled`
  - candidatures UPDATE OF cles_remises → `wa-send-keys-handover`

### 8 nouvelles edge functions
1. `wa-send-welcome` (invoke depuis UI admin)
2. `wa-send-proposition-visite` (DB trigger)
3. `wa-send-post-visite` (cron 30 min)
4. `wa-send-application-accepted` (DB trigger)
5. `wa-send-signature-scheduled` (DB trigger)
6. `wa-send-edl-scheduled` (DB trigger)
7. `wa-send-keys-handover` (DB trigger)
8. `wa-send-google-review` (cron J+3, 09:00 UTC)

Chacune : récupère l'entité, formate dates en `Europe/Zurich`, invoke `send-whatsapp-notification`, marque le flag idempotency.

### Helper partagé
`supabase/functions/_shared/whatsapp-forward-to-staff.ts`
- `forwardClientReplyToStaff({ supabase, clientId, agentId, summary, templateKey?, variables? })`
- Récupère téléphone WhatsApp agent (`profiles.whatsapp_phone` via `agents.user_id`)
- Si `templateKey` fourni → envoi template à agent ET à `WHATSAPP_ADMIN_PHONE`
- Sinon → `sendWhatsAppText` (fenêtre 24h ouverte par message client)
- Crée `create_notification` in-app à agent + tous les admins

### Patch `whatsapp-webhook/index.ts`
Nouveau dispatcher `handleLifecycleButton` après `handleMandateButton` :

| button_id | Action |
|---|---|
| `visit_propose_yes` / `visit_propose_no` | MAJ visite + envoi #4 à agent + admin |
| `post_visit_postuler` | MAJ candidature + envoi #7 client + #9 agent/admin |
| `post_visit_refuser` | MAJ candidature + envoi #8 client + notif agent |
| `application_validate` | MAJ `client_accepte_conclure=true` + forward staff |
| `application_refuse` | MAJ statut=refusee + forward staff |
| `keys_received` | MAJ `cles_recues_confirme=true` + WA "Bienvenue chez vous !" |
| `keys_not_yet` | Forward urgent agent + admin |
| `review_later` | Log + relance J+10 |

Forward texte libre : étendre la section "Incoming messages" pour envoyer aussi un `sendWhatsAppText` à l'agent et à `WHATSAPP_ADMIN_PHONE` (en plus de l'insert messages + notif interne).

### Patch UI admin
1 endroit : bouton "Activer client" (page admin Clients) → `supabase.functions.invoke('wa-send-welcome', { body: { client_id }})` après passage statut `actif`.

### Cron jobs (via `supabase--insert`)
- `wa-post-visite` — `*/30 * * * *` → scanne visites `statut='effectuee'` depuis 2h sans `post_visit_question_sent`
- `wa-google-review-j3` — `0 9 * * *` → scanne candidatures `cles_remises=true` `cles_remises_at::date = CURRENT_DATE - 3` `avis_google_envoye=false`
- (`wa-mandate-expiring-30d` déjà en place)

### Secret à ajouter
- `WHATSAPP_ADMIN_PHONE` = `+41764839199`

## Workflow de déploiement

1. Migration SQL (registry + colonnes + 5 triggers)
2. Ajout secret `WHATSAPP_ADMIN_PHONE`
3. Helper `_shared/whatsapp-forward-to-staff.ts`
4. 8 edge functions
5. Patch `whatsapp-webhook` (handlers + forward staff)
6. Patch UI admin (invoke welcome)
7. Insertion des 2 cron jobs
8. Tests manuels via `curl_edge_functions` sur 1 client de test

Tout sera livré en une passe après ton approbation finale.