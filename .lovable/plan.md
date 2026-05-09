## Objectif
1. Joindre un fichier `.ics` à **chaque** rappel email (24h, 3h, 1h, 30 min).
2. Activer WhatsApp dès que Meta approuve `logisorama_rdv_bureau_rappel`.

## 1. ICS à chaque rappel — modification de `send-phone-appointment-reminders`

Avant l'appel Resend HTML actuel, on invoque `send-calendar-invite` (déjà utilisé par `confirm-phone-appointment`) avec :

```
title       = "Rappel : RDV au bureau Logisorama"
description = <intro du tier> + adresse complète
location    = "Chemin de l'Esparsette 5, 1023 Crissier"
start_date  = appt.slot_start
end_date    = appt.slot_end
recipient_email = appt.prospect_email
```

Résultat utilisateur :
- À chaque rappel, l'email Resend HTML actuel arrive ✅
- Et **en parallèle**, un email avec pièce jointe `.ics` arrive (l'app calendrier propose d'ajouter/mettre à jour l'événement)

Le marquage `*_sent_at` reste basé sur le succès de l'email Resend principal (ICS = best-effort, on log les erreurs mais on ne re-tente pas).

## 2. WhatsApp — aucune modif code

Le code envoie déjà :
- `template_key = 'rdv_bureau_rappel'`
- `variables = [firstName, waHoraire(timeStr)]`

Mappings `waHoraire` actuels (rien à changer) :
- 24h → `demain à 10h00`
- 3h → `dans environ 3 heures (10h00)`
- 1h → `dans 1 heure (10h00)`
- 30m → `dans 30 minutes (10h00)`

Dès que Meta approuve `logisorama_rdv_bureau_rappel`, **le prochain cron (toutes les 5 min)** enverra automatiquement les 4 rappels WhatsApp. Aucun déploiement requis.

## 3. Test final
Après déploiement de l'edge function modifiée, on remet le RDV test à T+30 min, on relance la fonction, et on vérifie :
- ✅ 1 email HTML Resend
- ✅ 1 email avec pièce jointe `.ics`
- ✅ 1 message WhatsApp template (si Meta a déjà approuvé)

## Hors scope
- Pas de changement sur `confirm-phone-appointment` (déjà OK).
- Pas de changement de template Meta (laisse Meta valider).
- Pas de changement sur le format de date/heure (déjà `Europe/Zurich`).
