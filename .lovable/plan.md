## Objectif

1. S'assurer que le client reçoit **email + notification in-app** quand l'admin ou l'agent déclenche l'annulation/remboursement, avec un message adapté (« un agent/administrateur a effectué la demande pour vous »).
2. Garder le message actuel quand c'est le client lui-même qui déclenche (« Nous avons bien reçu votre demande… »).
3. Ajouter un bouton **"Tester l'email d'annulation"** côté admin pour prévisualiser/recevoir l'email réel.

## 1. Edge function `mandate-renewal-action` — messages différenciés

Dans le bloc `cancel` / `cancel_with_refund`, adapter `clientMsg` selon `staffTrust` :

- **Si `staffTrust` (admin ou agent)** et `refundEligible` :
  > « Un{e} {administrateur·trice|agent·e} a effectué une demande de remboursement pour votre compte. Votre mandat reste actif jusqu'au {officialEnd}. Le remboursement sera traité sous 30 jours (au plus tard le {refundProcessDate}). Vous recevrez un email dès que le virement sera émis. »
- **Si `staffTrust`** et annulation simple :
  > « Un{e} {administrateur·trice|agent·e} a annulé votre mandat de recherche pour votre compte. »
- **Si client lui-même** : message actuel inchangé (« Votre demande de remboursement a été validée automatiquement… »).

Le `notify()` actuel insère déjà la notification + déclenche l'email via `send-notification-email` → rien d'autre à changer côté envoi. Juste le contenu du message à brancher sur `staffTrust`.

Titre adapté aussi : `"💰 Remboursement initié pour vous"` vs `"✅ Remboursement confirmé"`.

## 2. Bouton de test « Aperçu email annulation »

Sur `src/pages/admin/ClientDetail.tsx`, à côté des boutons annulation existants, ajouter un bouton **outline** « Tester l'email d'annulation ». Au clic :

- Insère une notification de type `mandate_cancelled` directement dans la table `notifications` ciblant l'admin connecté (pas le client) avec un message d'exemple représentatif des deux scénarios (staff + remboursement éligible).
- Appelle ensuite `supabase.functions.invoke('send-notification-email', { body: { notification_id } })` → l'admin reçoit le vrai email tel qu'il sera envoyé au client.
- Toast « Email de test envoyé à votre adresse ».

Pas d'edge function dédiée ; on réutilise la chaîne `notifications` + `send-notification-email` existante. Visible uniquement pour le rôle admin.

## 3. Hors scope

- Pas de migration DB.
- Pas de changement de la logique d'éligibilité.
- Pas de nouveau template email — on s'appuie sur le rendu générique de `send-notification-email` (type `mandate_cancelled` → icône ✅, couleur verte déjà mappées).
- Pas de bouton de test côté agent.

## Détails techniques

- Le label rôle injecté : `staffTrust.role === "admin" ? "administrateur" : "agent"`.
- Title alternatif côté `notify()` : passé en argument depuis le bloc cancel selon `staffTrust`.
- Bouton de test : `clientId` n'est pas nécessaire — on injecte la notif sur `auth.uid()` de l'admin courant via `supabase.auth.getUser()`.
