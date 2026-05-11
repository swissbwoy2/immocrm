# Diagnostic RDV bureau + WhatsApp `rdv_bureau_rappel`

## 1. Oui, un client a bien réservé

**Stéphane Botella** — `botellastephane@icloud.com` — `076 228 53 56`
- Réservé le **2026-05-09 15:22** via `/rendez-vous-bureau` (source `whatsapp_rdv_crissier`)
- Créneau : **aujourd'hui 11.05 à 11h00 (Europe/Zurich)**
- Note client : *« il est possible de faire par téléphone ? »*
- `status='confirme'` posé d'office, mais `confirmed_at`, `confirmed_by`, `ics_sent_at` = NULL

## 2. Pourquoi tu n'as reçu ni demande ni demande de confirmation

Le flux `src/pages/RendezVousBureau.tsx` (réservation publique) est cassé côté admin :

- L'insertion se fait **côté client** avec `status: 'confirme'` directement → **il n'y a aucune étape « en attente de confirmation »**, donc aucun email/WA « demande de confirmation » n'est jamais envoyé à l'admin (la fonction `confirm-phone-appointment` ne tourne que sur action manuelle admin).
- La seule notif admin est un `send-calendar-invite` best-effort vers `support@logisorama.ch` avec sujet « Nouveau RDV bureau — … ». Il est lancé sans `await` puis l'utilisateur est redirigé. Si Resend a rejeté ou si le mail est parti en spam, **rien ne te prévient**.
- Aucune notification **WhatsApp** ni **push** n'est envoyée à l'admin à la création.

## 3. Pourquoi `rdv_bureau_rappel` passe en `failed`

Les logs Meta du 10.05 sont sans ambiguïté :

```
(#132001) Template name does not exist in the translation
details: template name (logisorama_rdv_bureau_rappel) does not exist in fr
```

- En base `whatsapp_message_templates` : `template_name_meta = logisorama_rdv_bureau_rappel`, `language = fr`, `is_active = true`.
- Sur **Meta Business Manager**, ce template n'existe pas en langue `fr` (soit jamais soumis/approuvé, soit créé en `fr_FR` / `fr_CH`, soit en statut REJECTED/PAUSED).
- Les erreurs plus récentes (`131000 Something went wrong`) sur 3h/1h/30m sont la conséquence directe : Meta renvoie un message générique quand le template est introuvable/non approuvé.
- C'est pour ça que **Stéphane n'a reçu aucun rappel WhatsApp** (24h, 3h, 1h, 30m → tous `failed`). Les rappels **email** sont eux bien partis (colonnes `reminder_*_sent_at` remplies).

## Plan d'action

### A. Réparer le template Meta (urgent — action manuelle de toi)
1. Aller dans **Meta Business Manager → WhatsApp Manager → Templates**.
2. Vérifier `logisorama_rdv_bureau_rappel` :
   - S'il existe en `fr_FR` ou `fr_CH` → mettre à jour la base : `UPDATE whatsapp_message_templates SET language='fr_FR' WHERE template_key='rdv_bureau_rappel'`.
   - S'il n'existe pas → le créer (catégorie UTILITY, langue `fr`) avec exactement le body :
     ```
     Bonjour {{1}}, petit rappel : ton RDV au bureau Logisorama (Chemin de l'Esparcette 5, 1023 Crissier) est prévu {{2}}. À tout bientôt !
     ```
   - S'il est REJECTED/PAUSED → corriger et resoumettre.
3. Une fois APPROVED, je peux relancer manuellement le rappel pour Stéphane via la fonction `send-whatsapp-notification` (test ciblé).

### B. Notifications admin à la réservation (code, déjà identifié)
Modifier `src/pages/RendezVousBureau.tsx` pour ajouter, juste après l'insertion du RDV :
1. **WhatsApp staff** : `supabase.functions.invoke('send-whatsapp-notification', { template_key: 'staff_new_inbound', recipient_phone_override: '+41…ton numéro', variables: [fullName, horaire, telephone] })`. Réutilise le template staff déjà existant si présent ; sinon, fallback sur un template UTILITY existant (à confirmer avec toi).
2. **Email admin enrichi** : passer le `send-calendar-invite` admin en `await` + ajouter un `Resend` HTML clair (« 🚨 Nouveau RDV bureau — Nom / Téléphone / Heure / Note »). Envoi vers `info@immo-rama.ch` (et pas `support@logisorama.ch` qui est l'expéditeur).
3. **Notif in-app** : insérer une ligne dans `notifications` (type `phone_appointment_new`) pour que la cloche admin sonne.

### C. Workflow « demande de confirmation » (optionnel mais recommandé)
Aujourd'hui chaque RDV est `confirme` automatiquement. Deux options à choisir :
- **Option 1 — garder auto-confirme** : on ajoute simplement les notifs B ci-dessus. C'est ce que je recommande car le créneau est déjà bloqué côté UX.
- **Option 2 — passer en `en_attente`** : insertion avec `status='en_attente'`, l'admin clique dans le calendrier pour déclencher `confirm-phone-appointment` (qui lui envoie déjà email + ICS + WA `rdv_bureau_rappel` au client). Plus contrôlé mais double clic admin obligatoire.

### Hors scope
- Aucune migration DB.
- Pas de modification du flux `confirm-phone-appointment` ni de `send-phone-appointment-reminders`.
- Réparer le template Meta n'est pas faisable côté code (action sur le BM Meta).

## Questions pour toi avant build
1. Pour le **template Meta** `logisorama_rdv_bureau_rappel` : tu veux que je vérifie sa langue exacte sur Meta (et tu me dis ce que tu vois), ou tu préfères le recréer en `fr` ?
2. Pour la **notif WhatsApp admin** à la réservation : quel numéro WA admin utiliser, et tu veux passer par un template existant (lequel ?) ou j'en crée un dédié `staff_new_phone_appointment` ?
3. **Auto-confirme ou en_attente** ? (Option 1 vs 2 ci-dessus)
