## Plan de validation end-to-end des 16 templates WhatsApp v3

Tous les templates sont actifs côté Meta ✅. Les 16 Edge Functions et le webhook sont déployés. Il reste à **valider le bon fonctionnement réel** avant d'activer les flows automatiques en production.

### 1. Vérification des noms de templates (préalable critique)

Comparer les noms exacts côté Meta vs ceux utilisés dans le code :

| Code (template_name) | Meta | Statut |
|---|---|---|
| `logisorama_welcome_activation` | ✅ |  |
| `logisorama_new_offer` | ✅ |  |
| `logisorama_proposition_visite_client` | ✅ |  |
| `logisorama_visit_reminder_24h` | ✅ |  |
| `logisorama_post_visite_question` | ✅ |  |
| `logisorama_candidature_demandee_client` | ✅ |  |
| `logisorama_candidature_refus_client` | ✅ |  |
| `logisorama_application_accepted` | ✅ |  |
| `logisorama_signature_scheduled` | ✅ |  |
| `logisorama_etat_des_lieux_scheduled` | ✅ |  |
| `logisorama_keys_handover` | ✅ |  |
| `logisorama_google_review_request` | ✅ |  |
| `logisorama_mandate_expiring_30d` | ✅ |  |
| `logisorama_agent_message` | ✅ |  |
| `logisorama_alerte_agent_reponse_visite` | ✅ |  |
| `logisorama_alerte_agent_candidature` | ✅ |  |

→ Action : grep dans les 16 functions pour s'assurer que `template_name` correspond exactement (zéro tolérance).

### 2. Smoke tests par lot (curl_edge_functions)

Sur un client test (Christ) avec `+41` réel :

- **Lot A — flux entrée** : `wa-send-welcome`, `wa-send-new-offer`, `wa-send-proposition-visite`
- **Lot B — visite** : `send-visit-reminders` (T-24h), `wa-send-post-visite`
- **Lot C — candidature** : `wa-send-candidature-demandee`, `wa-send-candidature-refus`, `wa-send-application-accepted`
- **Lot D — signature/clés** : `wa-send-signature-scheduled`, `wa-send-edl-scheduled`, `wa-send-keys-handover`, `wa-send-google-review`
- **Lot E — agent/mandat** : `wa-send-mandate-expiring`, `wa-send-agent-message`, `wa-notify-agent-visit-response`, `wa-notify-agent-candidature`

Pour chaque appel : vérifier (a) 200 OK, (b) message reçu sur le téléphone, (c) variables bien interpolées (pas de `{{1}}` brut), (d) pas d'erreur "131008/132000" Meta.

### 3. Test des Quick Reply payloads (webhook)

Cliquer chaque bouton depuis WhatsApp et vérifier dans `whatsapp-webhook` logs que `handleNewQRButtons` route correctement :

- `visit_propose_delegate`, `visit_remind_confirm`, `visit_remind_cancel`
- `post_visit_apply_yes`, `post_visit_apply_no`, `post_visit_apply_maybe`
- `candidature_question`, `application_thanks`
- `edl_reschedule`, `referral_start`
- `agent_message_callback`, `agent_call_client_now`, `agent_dispatch_courier`, `agent_candidature_taken`
- `mandate_renew`

### 4. Activation des CRON et triggers DB

- `wa-send-post-visite` : confirmer cron J+1 actif (pg_cron)
- `wa-send-google-review` : confirmer cron J+7 actif
- `send-visit-reminders` : confirmer cron T-24h actif
- `wa-send-mandate-expiring` : confirmer cron J-30 actif
- Triggers DB pour `wa-notify-agent-*` : vérifier qu'ils sont câblés sur les bons events

### 5. Nettoyage

Supprimer/archiver l'ancien template `nouvelle_offre` (remplacé par `logisorama_new_offer`) — garder `hello_world` (utilisé par Meta pour test).

---

**Tu valides ce plan ?** Je peux ensuite :
- (a) commencer par le **point 1** (audit des `template_name` dans le code), puis
- (b) lancer les smoke tests Lot A→E avec ton numéro,
- (c) finir par vérification cron + triggers.

Dis "GO" ou indique un sous-ensemble (ex: "uniquement points 1+2").