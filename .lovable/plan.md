## Objectif

Le bouton du template WhatsApp doit ouvrir une page de prise de RDV au bureau de Crissier (au lieu de la home), basculer l'envoi sur le template Meta v2 (`logisorama_location_rdv_crissier_v2`), afficher en temps réel les créneaux déjà occupés (cohérence avec "Dossier analyse"), envoyer un email de confirmation avec ICS, et déclencher des rappels automatiques **24h / 3h / 1h / 30 min avant** le RDV par email + WhatsApp.

## Constat (existant à réutiliser)

- `src/lib/phoneSlots.ts` — déjà "AU BUREAU" Crissier, à ajuster (fin après-midi 16h30 → 16h00).
- Table `lead_phone_appointments` — colonnes `slot_start, slot_end, status, prospect_*, ics_sent_at, reminder_24h_sent_at` déjà présentes. ✅ on étend.
- `DossierAnalyseSection` (landing) + `PhoneSlotPicker` — écrivent déjà dans cette table. ✅ source partagée.
- `send-phone-appointment-reminders` — gère déjà le rappel email 24h (avec ICS). ✅ on étend pour 3h/1h/30min.
- `send-calendar-invite` — envoie mail + ICS pour la confirmation immédiate. ✅
- `send-whatsapp-notification` — entry point WhatsApp. ✅
- `send-followup-whatsapp` — bascule sur la clé v2 + nouvelle URL bouton.

## Ce que je vais faire

### 1. Ajuster les créneaux bureau
- `phoneSlots.ts` : `AFTERNOON_END_HOUR = 16, AFTERNOON_END_MIN = 0`. Plages finales : 08h30→12h00 et 13h30→16h00, slots 30 min, lun–sam, Europe/Zurich.
- Vérifier l'orthographe d'adresse partout : "Chemin de l'Esparcette 5, 1023 Crissier" (à confirmer avec toi : Esparsette ou Esparcette ?).

### 2. Créer la page publique `/rendez-vous`
- Nouvelle page `src/pages/RendezVousBureau.tsx` (route publique, sans login).
- Sélecteur jour (chips horizontaux 21 jours hors dimanche) + grille slots matin / après-midi.
- **Cohérence avec dossier analyse** : `select slot_start, slot_end from lead_phone_appointments where status in ('pending','confirme') and slot_start >= now()` via une vue publique `public_booked_slots` (n'expose que dates, jamais d'email/téléphone). Slots occupés grisés.
- Formulaire : prénom, nom, email, téléphone, message (optionnel).
- Capture UTM (`utm_source=whatsapp_v2`).
- Submit → insert dans `lead_phone_appointments` (`source_form='whatsapp_rdv_crissier'`, `status='confirme'`) + upsert lead léger.
- Anti-doublon : re-check du slot juste avant insert.

### 3. Email de confirmation + ICS (immédiat)
- Appel `send-calendar-invite` avec `title`, `location` (Chemin de l'Esparcette 5, 1023 Crissier), `start_date/end_date`, `recipient_email`.
- Notification interne admin.
- Marquer `ics_sent_at = now()`.

### 4. Rappels automatiques 24h / 3h / 1h / 30min — Email + WhatsApp
**Étendre la table** `lead_phone_appointments` avec :
- `reminder_3h_sent_at timestamptz`
- `reminder_1h_sent_at timestamptz`
- `reminder_30m_sent_at timestamptz`
- `wa_reminder_24h_sent_at timestamptz`
- `wa_reminder_3h_sent_at timestamptz`
- `wa_reminder_1h_sent_at timestamptz`
- `wa_reminder_30m_sent_at timestamptz`

**Étendre `send-phone-appointment-reminders`** :
- Pour chaque palier (24h, 3h, 1h, 30 min) : sélectionner les RDV `confirme` dont `slot_start` tombe dans la fenêtre cible (± marge cron) ET dont la colonne `reminder_*_sent_at` correspondante est NULL.
- Envoyer **email** (template inline déjà présent) + **WhatsApp** via `send-whatsapp-notification`.
- Marquer la colonne correspondante après succès (idempotent).
- Cron : `pg_cron` toutes les 15 min appelant cette edge function via `pg_net.http_post`.

**Côté WhatsApp — templates** :
- **Hors fenêtre 24h** (rappel 24h) : Meta exige un template UTILITY approuvé. Je propose un nouveau template :
  - Nom : `logisorama_rdv_bureau_rappel`
  - Catégorie UTILITY, langue fr
  - 1 variable `{{1}}` = horaire (ex. "demain à 10h00")
  - Body : "Bonjour, petit rappel : ton RDV au bureau Logisorama (Chemin de l'Esparcette 5, 1023 Crissier) est prévu {{1}}. À tout bientôt !"
  - **Action requise de ta part** : créer ce template dans Gestionnaire WhatsApp + me dire quand il est APPROVED. Sinon les rappels 24h ne partent pas en WhatsApp (l'email part quand même).
- **Dans la fenêtre 24h** (3h, 1h, 30 min) : si le destinataire a échangé avec ton numéro WhatsApp dans les 24h précédentes → message texte libre (pas de template). Sinon il faut quand même utiliser le template UTILITY ci-dessus avec horaire adapté ("dans 3h", "dans 1h", "dans 30 min"). Pour rester safe et fiable, **j'utilise le même template UTILITY pour les 4 paliers** en variant la variable `{{1}}` → un seul template à approuver, pas plusieurs.

### 5. Brancher le template Meta v2 du flow d'invitation
- `UPDATE whatsapp_message_templates SET template_name_meta='logisorama_location_rdv_crissier_v2' WHERE template_key='location_rdv_activation_v2'`.
- `send-followup-whatsapp` : `RDV_BUTTON_URL` → `https://logisorama.ch/rendez-vous?utm_source=whatsapp&utm_medium=business_message&utm_campaign=location_v2`.
- Ajuster le `bodyPreviewText` et le label dans `CampagnesSuivi.tsx`.

### 6. Validation
- Test interne sur +41762441006 → bouton ouvre `/rendez-vous`.
- Réservation bout en bout → mail + ICS reçus, slot grisé partout.
- Forcer un RDV à `slot_start = now()+24h` puis lancer manuellement `send-phone-appointment-reminders` → vérifier l'email + le WhatsApp partent et les colonnes sont bien marquées.

## Détail technique

- **Migration SQL** :
  - ALTER TABLE `lead_phone_appointments` ADD 7 colonnes timestamptz nullable
  - CREATE VIEW `public_booked_slots` (slot_start, slot_end, status) + GRANT SELECT TO anon
  - Ajout policy INSERT publique avec WITH CHECK strict (`status='confirme'`, `source_form='whatsapp_rdv_crissier'`)
- **Cron** : pg_cron toutes les 15 min appelant `send-phone-appointment-reminders` via pg_net (pattern existant projet)
- **Templates Meta à créer/valider de ton côté** :
  1. `logisorama_location_rdv_crissier_v2` (déjà créé selon ton message)
  2. `logisorama_rdv_bureau_rappel` (à créer si pas encore fait — UTILITY, fr, 1 variable horaire)
- **Timezone** : Europe/Zurich strict pour tout (slots, ICS, formatage horaire des rappels).
- **Côté Meta** : confirmer que le bouton du template v2 pointe bien vers `https://logisorama.ch/rendez-vous`.

## Questions avant implémentation

1. Esparsette ou Esparcette ? (les deux orthographes existent dans le code)
2. OK pour créer **un seul template UTILITY** `logisorama_rdv_bureau_rappel` réutilisé pour les 4 paliers (variable horaire dynamique) ?
3. Confirmes-tu que le bouton du template Meta v2 pointe déjà vers `https://logisorama.ch/rendez-vous` ?
