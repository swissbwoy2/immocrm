## Plan d'exécution Phase A → D (GO confirmé)

> Phase E (création/édition Meta WABA) : à toi en parallèle. Je te livre un récap copier-coller dans la Phase A.

---

### Phase A — Livrables documentaires

**A1.** Réécrire `whatsapp_templates_logisorama_v3.md` complet (T1→T16) :
- Pour chaque template : `template_key`, `template_name_meta`, catégorie, langue, header, body final, footer, boutons (type + payload + titre), tableau mapping variables → SQL, exemple rendu réel.
- Annexes : helpers communs (`fmtPieces`, `fmtPrixCHF`, `fmtDateFR`, `fmtHeureFR`, `fmtDispo`), table des payloads QR → handler webhook, table des Edge Functions → trigger.

**A2.** Créer `whatsapp_meta_waba_copy_paste.md` (récap Meta) :
- Bloc prêt à coller pour chaque T2→T16 nouveau ou modifié (header, body avec `{{n}}`, footer, boutons exacts, catégorie, langue) pour t'éviter de retaper côté Meta Business Manager.

---

### Phase B — Migration SQL (additive, zéro destructif)

Une seule migration regroupant :

**B1. ALTER TABLE `offres`** (colonnes nullables si manquantes) :
- `lien_annonce TEXT`, `regie_nom TEXT`, `contact_concierge TEXT`, `etage TEXT`, `disponibilite_date DATE`
- `nb_pieces NUMERIC(3,1)`, `surface_m2 NUMERIC(6,1)`, `prix_chf NUMERIC(10,2)`, `adresse TEXT` — si absentes uniquement.

**B2. ALTER TABLE `candidatures`** :
- `date_signature TIMESTAMPTZ`, `lieu_signature TEXT`, `date_emmenagement DATE`, `cles_remises_at TIMESTAMPTZ`, `regie_motif_refus TEXT` — si absentes.

**B3. ALTER TABLE `visites`** :
- `etage TEXT` (snapshot pour rappel), déjà : `post_visit_question_sent`, `post_visit_question_sent_at` (vérifier).

**B4. CREATE TABLE `visites_deleguees`** (si absente) :
- `id`, `visite_id`, `client_id`, `agent_id`, `coursier_id` (nullable), `statut` (`a_assigner`/`assignee`/`effectuee`/`annulee`), `cout_chf NUMERIC` default 5, `paye_par` default `agent`, `notes`, `created_at`, `updated_at`. RLS : agent voit ses délégations, coursier voit les siennes, client voit les siennes.

**B5. UPDATE `whatsapp_message_templates`** (data via tool insert après migration) :
- Insert/upsert des 16 lignes (`template_key`, `template_name_meta`, `language='fr'`, `variables_count`, `is_active=true`).
- `hello_world` → `is_active=false`.

**B6. CREATE TABLE `whatsapp_pending_actions`** (si absente) — buffer pour stocker contexte d'un envoi (ex: `refund_eligible_at_send` pour T13, `candidature_id` pour T6/T7/T8, etc.) clé par `meta_message_id`.

---

### Phase C — Edge Functions (16, par lots de 4 + tests entre chaque lot)

**Lot 1 — Onboarding & matching**
1. `wa-send-welcome-activation` (vérifier existence, sinon créer) — 2 vars
2. `wa-send-new-offer` — 9 vars, JOIN `offres` complet
3. `wa-send-proposition-visite` ✏️ enrichir (4 → 8 vars + JOIN offre)
4. `cron-visit-reminders` ✏️ enrichir (4 → 9 vars + JOIN offre + heure)

→ **Test bloc 1** : `curl_edge_functions` sur chaque + lecture logs.

**Lot 2 — Visite & candidature client**
5. `cron-post-visit-question` (rebadge `wa-send-post-visite` si déjà présent) — 7 vars
6. `wa-send-candidature-demandee` (NEW) — 8 vars
7. `wa-send-candidature-refus` (NEW) — 7 vars
8. `wa-send-application-accepted` ✏️ EN→fr + 8 vars

→ **Test bloc 2**.

**Lot 3 — Bail / EDL / clés / review**
9. `wa-send-signature-scheduled` ✏️ 3 → 10 vars
10. `wa-send-etat-des-lieux` ✏️ enrichir (3 → 9 vars) — déjà existe `wa-send-edl-scheduled`, on garde le nom
11. `wa-send-keys-handover` (NEW) — 7 vars
12. `cron-google-review-J7` (NEW) — 6 vars (cron J+7 post `cles_remises_at`)

→ **Test bloc 3**.

**Lot 4 — Mandat & alertes internes**
13. `wa-send-mandate-expiring` ✏️ 2 → 4 vars (+ COUNT offres + visites)
14. `wa-send-agent-message` (NEW) — 4 vars, trigger sur INSERT `messages` flag `notify_whatsapp`
15. `wa-notify-agent-visit-response` (NEW) — 8 vars, déclenché depuis `whatsapp-webhook` à chaque réponse `visit_propose_*`/`visit_remind_*`
16. `wa-notify-agent-candidature` (NEW) — 8 vars, trigger sur INSERT `candidatures` statut=`a_envoyer`

→ **Test bloc 4** + sweep `edge_function_logs` global.

> Helpers communs partagés via `supabase/functions/_shared/wa-helpers.ts` (NEW) : `fmtPieces`, `fmtPrixCHF`, `fmtDateFR`, `fmtHeureFR`, `fmtDispo`, `loadOffreDetails(supabase, offre_id)`, `loadClientProfile`, `loadAgentName`.

---

### Phase D — `whatsapp-webhook/index.ts` : 13 nouveaux handlers QR

Switch étendu sur `payload` :

| Payload | Action principale |
|---|---|
| `visit_propose_delegate` | `visites.statut='deleguee'` + INSERT `visites_deleguees` + notif coursier (template interne) + ack client |
| `visit_remind_confirm` | `visites.confirmee_at = now()` + ack |
| `visit_remind_delegate` | idem délégation ci-dessus |
| `visit_remind_cancel` | `visites.statut='annulee'` + notif agent (T15) |
| `post_visit_apply_yes` | UPSERT `candidatures` statut=`a_envoyer` + déclenche T6 + T16 |
| `post_visit_apply_maybe` | flag `clients.maybe_followup_at = now()+24h` + notif agent |
| `post_visit_apply_no` | `visites.feedback='refus_client'` + notif agent |
| `candidature_question` | sendText au client + créer ticket message côté agent |
| `application_thanks` | log gratitude + sendText "Merci, on continue à donner le meilleur 💪" |
| `edl_reschedule` | flag `candidatures.edl_reschedule_requested=true` + notif agent |
| `referral_start` | INSERT `apporteur_referrals_pending` + URL parrainage envoyée |
| `agent_message_callback` | notif agent "client demande rappel" + log `agent_callback_requests` |
| `agent_call_client_now` | côté agent (T15) — log call intent, no-op client |
| `agent_dispatch_courier` | côté agent — ouvre flow `visites_deleguees` (notif coursier) |
| `agent_candidature_taken` | `candidatures.assignee_at = now()` + statut `en_preparation` |
| `mandate_renew` / `mandate_cancel_refund` / `mandate_found_alone` | déjà au plan T13 — handlers complets |

Toutes les actions :
- Lookup contexte via `whatsapp_pending_actions` (`meta_message_id` reçu).
- ACK utilisateur via `sendWhatsAppText` (helper existant).
- Log dans `whatsapp_notification_logs` avec `event_type='inbound_button'`.

---

### Ordre d'exécution validé

1. Phase A (markdown × 2) — pas de DB.
2. Phase B (migration unique → demande validation) — j'attends ton OK migration.
3. Phase B5 (insert templates) après migration approuvée.
4. Phase C lot 1 → tests → lot 2 → tests → lot 3 → tests → lot 4 → tests.
5. Phase D (webhook handlers) → test e2e simulant chaque payload via `curl_edge_functions` sur `whatsapp-webhook`.
6. Récap final + checklist Meta WABA à compléter de ton côté.

---

### Tu me confirmes "GO Phase A" et j'enchaîne tout d'une traite.

Si tu veux que je saute le récap Meta (A2) ou que je groupe les 16 EF en un seul lot sans pause de test, dis-le maintenant — sinon j'applique exactement ce plan.