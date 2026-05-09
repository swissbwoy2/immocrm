## Diagnostic

Le test de rappel a marqué les colonnes `*_sent_at` mais rien n'est arrivé :

- **WhatsApp** : le template `rdv_bureau_rappel` est marqué **`is_active = false`** dans `whatsapp_message_templates`. La fonction `send-whatsapp-notification` retourne `{skipped: true, reason: "template_inactive"}` avec un status 200 → notre logique a interprété "pas d'erreur" comme "envoyé".
- **Email** : Resend a probablement répondu 200 (donc on a marqué la colonne), mais on ne logge pas le body de la réponse pour vérifier si l'email a vraiment été accepté ou s'il est en spam.

## Corrections

### 1. Activer le template WhatsApp
```sql
UPDATE whatsapp_message_templates SET is_active = true WHERE template_key = 'rdv_bureau_rappel';
```
(Si Meta a rejeté la traduction fr, on verra l'erreur dans les logs — mais le template a été créé donc on suppose qu'il est approuvé.)

### 2. Durcir la logique de `send-phone-appointment-reminders`
- **WhatsApp** : ne marquer `wa_*_sent_at` QUE si la réponse contient un `meta_message_id` (ou au minimum pas de `skipped` / `error`). Logger le `r.data` pour comprendre.
- **Email** : logger le body de la réponse Resend (qui contient `id` quand OK, `message` quand erreur). Ne marquer `*_sent_at` QUE si le body contient un `id`.

### 3. Reset du RDV test et nouveau tir
- Remettre `slot_start = now() + 30 min`, `reminder_30m_sent_at = NULL`, `wa_reminder_30m_sent_at = NULL`
- Relancer la fonction
- Lire les logs Edge pour confirmer

### 4. Vérification finale
- Lecture de `whatsapp_notification_logs` pour voir si Meta a accepté
- Lecture des logs `send-phone-appointment-reminders` pour voir le body Resend
- Si Meta refuse la fr → activer en `language='en'` ou contacter le support Meta (le template doit être approuvé manuellement dans le Business Manager)

## Hors scope (pour plus tard si besoin)
- Vérifier que le from `support@logisorama.ch` est bien dans le domaine Resend vérifié. Si non, basculer sur `notify.logisorama.ch` (mémoire projet : "Emails use notify.logisorama.ch").
