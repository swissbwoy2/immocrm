## Problème

Quand une demande de remboursement / annulation est déclenchée, le client reçoit bien sa notification + email, mais l'admin (`info@immo-rama.ch`) et l'agent en charge ne reçoivent pas l'email. La fonction `mandate-renewal-action` insère bien des notifications in-app pour les admins/agent et appelle `send-notification-email`, mais celle-ci envoie uniquement à `profiles.email` du `user_id` cible. Résultat :
- Si l'utilisateur admin connecté n'a pas `info@immo-rama.ch` comme email dans `profiles`, l'adresse n'est jamais touchée.
- Idem pour l'agent si son email profil n'est pas celui attendu.

## Solution — envoi direct ciblé en plus des notifs in-app

Dans `supabase/functions/mandate-renewal-action/index.ts`, pour les actions `cancel` / `cancel_with_refund` uniquement, **ajouter un envoi email direct via Resend** (en plus du flux notifications existant) vers :

1. **`info@immo-rama.ch`** (constante en dur, adresse admin officielle Logisorama).
2. **L'email du profil de l'agent assigné** au client (lookup `agents.user_id` → `profiles.email`).

Les notifications in-app pour l'agent et les admins restent inchangées (toujours créées via `notifyAgent` / `notifyAdmins`).

### Contenu de l'email staff

Un email unique, sobre, récapitulant :
- Nom complet du client + email
- Type d'action : `Remboursement demandé` ou `Mandat annulé`
- Raison (`reasonLabel`)
- Si remboursement éligible : date de fin officielle du mandat + date limite de traitement du virement
- Origine : `Demande client`, `Initiée par administrateur`, ou `Initiée par agent` (basé sur `staffTrust`)
- Lien vers la fiche client admin

Sujet : `💰 Remboursement à traiter — {Nom Prénom}` ou `❌ Mandat annulé — {Nom Prénom}`.

### Implémentation technique

- Importer `Resend` depuis `https://esm.sh/resend@2.0.0` en tête du fichier.
- Lire `RESEND_API_KEY` depuis `Deno.env`. Si absent, log + skip silencieux (ne bloque pas l'action).
- Ajouter une helper `sendStaffEmail(subject, html, recipients: string[])` qui dédoublonne les destinataires et envoie via `resend.emails.send` avec `from: "Logisorama <support@logisorama.ch>"` (même expéditeur que le reste du système).
- Dans le bloc `cancel`, après les `notifyAgent` / `notifyAdmins` existants, construire `recipients = ["info@immo-rama.ch"]` + l'email de l'agent (récupéré via `agents.user_id` → `profiles.email`) puis appeler le helper.
- Pas de migration DB, pas de changement côté UI, pas de changement de `send-notification-email`.

## Hors scope

- Pas de modification du contenu email client (déjà OK).
- Pas de changement pour les actions `renew`, `pause`, `resume`.
- Pas de nouveau secret à demander : `RESEND_API_KEY` est déjà configuré (utilisé par `send-notification-email`).
- Pas de désactivation du flux notification existant (admins gardent leur notif in-app + email profil si activé).

## Déploiement

Redéploiement de `mandate-renewal-action` après modification.
