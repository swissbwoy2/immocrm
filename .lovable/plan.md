## Objectif

Remplacer l'email interne "staff" actuel (style sobre noir/blanc, celui de la capture) par **l'email réellement envoyé au client**, dans le style des campagnes de suivi Logisorama (fond crème, carte dark `#1c1814`, accents or `#D4A853`, logo Immo-Rama, bouton or). L'admin et l'agent reçoivent ce **même email** en copie — plus aucun mail interne séparé.

## Comportement final

### Email "client" unique (branded Logisorama)

Un seul template HTML construit dans `mandate-renewal-action`, déclinable selon le contexte :

- **Remboursement initié par le staff (admin/agent)**
  - Sujet : `💰 Votre demande de remboursement est en cours — Logisorama`
  - Corps : "Bonjour {Prénom}, suite à votre demande adressée à {un administrateur / votre agent}, nous avons enregistré votre demande de remboursement. Votre mandat reste actif jusqu'au {fin_officielle} et nous continuons à vous envoyer des offres. Le remboursement sera versé sous 30 jours après cette date (au plus tard le {date_virement}). Vous recevrez une confirmation dès que le virement sera émis."
  - CTA or : "Accéder à mon espace" → `https://logisorama.ch/client/dashboard`

- **Remboursement demandé par le client lui-même**
  - Sujet : `✅ Nous avons bien reçu votre demande de remboursement`
  - Corps : "Bonjour {Prénom}, nous confirmons la bonne réception de votre demande. Elle a été automatiquement validée (jour {N} du mandat). Votre mandat reste actif jusqu'au {fin_officielle}. Le remboursement sera traité sous 30 jours (au plus tard le {date_virement})."

- **Annulation sans remboursement** (idem, sujet `Confirmation d'annulation de votre mandat`).

Tous les templates partagent le **même layout campagne-suivi** : fond `#F5F5F0`, carte `linear-gradient(180deg,#1c1814,#231d18)`, bordure or, titre en Georgia serif `#f4ecd8`, paragraphes `#e8dfce`, bouton or VML-compatible, footer Logisorama avec adresse Crissier.

### Destinataires lors d'un envoi réel

- `to` : email du client
- `cc` : `info@immo-rama.ch` + email de l'agent assigné (si présent)
- Un seul envoi Resend, un seul template. Plus d'email "interne" séparé.

### Bouton "Test email"

Le bouton dans `ClientDetail.tsx` envoie ce **même email branded** (variante "remboursement initié par admin", données fictives Jour 82 / fin 2026-05-24) à :
- `info@immo-rama.ch`
- email de l'agent assigné

Avec une bannière `[TEST] Ceci est un aperçu de l'email réellement envoyé au client — aucun mandat n'a été modifié.` insérée tout en haut du corps branded (pas un email séparé). Sujet préfixé `[TEST] `. Aucune écriture en base.

## Fichiers modifiés

1. **`supabase/functions/mandate-renewal-action/index.ts`**
   - Ajouter `buildClientRefundEmail({ variant, clientFirstName, officialEnd, refundDate, daysSinceSignature, originLabel, isTest })` qui retourne `{ subject, html }` au style campagne-suivi (logo, gold CTA, footer).
   - Bloc `cancel/cancel_with_refund` : supprimer l'ancien `sendStaffEmail` interne ; appeler `resend.emails.send({ from: STAFF_FROM, to: [clientEmail], cc: [ADMIN_EMAIL, agentEmail?] , subject, html })`.
   - Mode `test_staff_email` : utiliser `buildClientRefundEmail({ isTest: true })` et envoyer à `[ADMIN_EMAIL, agentEmail]` uniquement.
   - Conserver les notifications in-app existantes (`notify`, `notifyAgent`, `notifyAdmins`).
   - Logs détaillés (to/cc/messageId/erreur Resend).

2. **`src/pages/admin/ClientDetail.tsx`** : aucun changement de logique nécessaire (le bouton appelle déjà `test_staff_email`). Mettre à jour le libellé du toast pour refléter "Aperçu de l'email client envoyé à …".

Aucune migration DB. Aucun nouveau composant front. Aucune dépendance ajoutée.

## Détails techniques

- Le footer du template inclut adresse Crissier + lien `info@immo-rama.ch`, identique aux campagnes.
- Le logo est chargé depuis l'URL publique déjà utilisée dans `send-followup-campaign` (réutilisation de `logoUrl`).
- Pas d'unsubscribe (email transactionnel lié au mandat).
- Resend `cc` accepte un array — on dédoublonne et on filtre les valeurs falsy.
- Déploiement : `mandate-renewal-action`.