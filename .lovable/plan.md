## Objectif

Étendre le système de RDV au bureau pour envoyer :
- **Confirmation** : email (déjà OK) + **WhatsApp** (à ajouter)
- **Rappels** : J-24h, H-3h, H-1h, H-30min — chacun envoyé par **email + WhatsApp**

## Ce qui existe déjà

- Table `lead_phone_appointments` contient déjà toutes les colonnes nécessaires :
  - `reminder_24h_sent_at`, `reminder_3h_sent_at`, `reminder_1h_sent_at`, `reminder_30m_sent_at` (email)
  - `wa_reminder_24h_sent_at`, `wa_reminder_3h_sent_at`, `wa_reminder_1h_sent_at`, `wa_reminder_30m_sent_at` (WhatsApp)
- Template WhatsApp Meta `rdv_bureau_rappel` déjà approuvé : 2 variables (prénom, horaire textuel)
- Edge Function `send-phone-appointment-reminders` existe mais ne gère **que le rappel email J-24h**
- Cron actuel : `phone-appointment-reminders-24h` → toutes les heures (insuffisant pour H-30min)

## Modifications

### 1. `confirm-phone-appointment` (ajout WhatsApp confirmation)
Après l'envoi de l'email de confirmation, envoyer aussi un message WhatsApp via `send-whatsapp-notification` en utilisant le template `rdv_bureau_rappel` avec :
- var 1 : prénom du prospect
- var 2 : `"le {dateStr} à {timeStr}"` (date complète, pas un "demain")

### 2. `send-phone-appointment-reminders` (refonte complète)
Nouvelle logique : la fonction parcourt les RDV `confirme` à venir, et pour chaque palier (24h / 3h / 1h / 30min) :
- Calcule la fenêtre temporelle (ex. H-30min = `slot_start` entre now+25min et now+35min)
- Envoie l'email s'il n'a pas déjà été envoyé pour ce palier (`reminder_Xh_sent_at IS NULL`)
- Envoie le WhatsApp via `send-whatsapp-notification` (template `rdv_bureau_rappel`) si `wa_reminder_Xh_sent_at IS NULL`
- Marque les colonnes correspondantes après envoi
- Texte de l'horaire adapté au palier : "demain à HH:MM", "dans 3 heures", "dans 1 heure", "dans 30 minutes"

Email : on conserve le rendu HTML existant, mais le sujet/intro est adapté au palier ("demain", "dans 3h", "dans 1h", "dans 30 min"). Pas de pièce ICS pour les rappels < 24h.

### 3. Cron : passer à toutes les 5 minutes
Recréer le cron `phone-appointment-reminders-24h` (ou le renommer en `phone-appointment-reminders`) avec schedule `*/5 * * * *` pour pouvoir attraper la fenêtre H-30min de manière fiable.

### Sécurité / robustesse
- Normalisation E.164 du `prospect_phone` avant envoi WhatsApp
- Si pas de téléphone valide → on log et on continue (n'empêche pas l'email)
- Idempotence garantie par les colonnes `*_sent_at` (jamais 2 envois pour le même palier)
- Pas de changement de schéma DB (toutes les colonnes existent déjà)

## Détails techniques

```text
Palier   | Fenêtre slot_start                  | Texte horaire WA
---------|-------------------------------------|---------------------------
24h      | now+23h .. now+25h                  | "demain à HH:MM"
3h       | now+2h50  .. now+3h10               | "dans environ 3 heures (HH:MM)"
1h       | now+50min .. now+1h10               | "dans 1 heure (HH:MM)"
30min    | now+25min .. now+35min              | "dans 30 minutes (HH:MM)"
```

Aucune migration SQL applicative (les colonnes sont là). Le seul changement BDD est la mise à jour du schedule pg_cron, fait via `supabase.insert`.
