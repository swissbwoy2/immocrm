# Fix template WhatsApp `rdv_bureau_rappel`

## Diagnostic
- Template Meta `logisorama_rdv_bureau_rappel` (langue `fr`) est désormais **actif** avec 2 variables : `{{1}}` = prénom, `{{2}}` = horaire.
- Logs `whatsapp_notification_logs` :
  - Avant activation : erreur `132001` (template inexistant) → résolu côté Meta.
  - Depuis activation : erreur `131000` « Something went wrong » sur les rappels 24h / 3h / 1h / 30 min.
- Seul changement entre l'ancien format qui passait (`"demain à 11:00"`) et les nouveaux qui échouent : `{{2}}` est devenu `"dans 30 minutes (11:00)"`, `"dans 1 heure (11:00)"`, `"dans environ 3 heures (11:00)"`. Les parenthèses + double information de temps sont la cause la plus probable du rejet silencieux Meta.

## Correction
Normaliser la valeur de `{{2}}` envoyée par les 2 fonctions edge qui appellent ce template, en gardant un format simple « contexte temporel + à HH:MM », sans parenthèses ni ponctuation décorative.

### Fichier 1 : `supabase/functions/send-phone-appointment-reminders/index.ts`
Modifier les `waHoraire` des 4 tiers :
- `24h`  → `"demain à HH:MM"`
- `3h`   → `"dans 3 heures à HH:MM"`
- `1h`   → `"dans 1 heure à HH:MM"`
- `30m`  → `"dans 30 minutes à HH:MM"`

(suppression des parenthèses, du mot "environ", harmonisation avec le format historique qui fonctionnait).

### Fichier 2 : `supabase/functions/confirm-phone-appointment/index.ts`
Le format actuel `"le ${dateStr} à ${timeStr}"` reste valide (pas de parenthèses) → **aucune modification nécessaire**, mais on vérifie que `dateStr`/`timeStr` ne contiennent pas U+202F / U+00A0 (déjà géré par `sanitizeVar` dans `send-whatsapp-notification`).

## Hors périmètre
- Pas de changement DB ni de template Meta.
- Pas de changement de la fonction `send-whatsapp-notification` (sanitize déjà OK).
- Pas de changement du nom de template (`logisorama_rdv_bureau_rappel`) ni de la langue (`fr`).

## Validation
1. Déployer les 2 fonctions edge modifiées (auto).
2. Forcer un envoi test via cron `send-phone-appointment-reminders` ou via insertion d'un RDV proche.
3. Vérifier dans `whatsapp_notification_logs` que les nouvelles entrées passent en `status='sent'` avec un `meta_message_id` non null.
4. Si erreur 131000 persiste : tester variable {{2}} ultra-minimale (`"demain"`) pour isoler — auquel cas le template Meta réel n'a qu'1 variable et il faudra retomber côté code à 1 seul param.
