## Contexte

Aujourd'hui, quand un client demande un remboursement via `mandate-renewal-action` (action `cancel_with_refund`) :
- ✅ L'éligibilité est **déjà validée côté serveur** (jamais ≥ 80 jours + raison ≠ "trouvé seul")
- ✅ Une notification **push** est créée pour les admins et le client
- ❌ **Aucun email** n'est envoyé ni à toi ni au client
- ❌ Tu n'as donc rien reçu pour la demande de Meless Marie-Christ Esmel

Note : en base, aucune demande de remboursement de "Meless" n'a été enregistrée via le flux — elle t'a probablement contacté en direct. La signature date du 23 février 2026 → ~93 jours, donc **elle serait éligible** si elle passait par l'app.

## Ce que je vais faire

### 1. Email admin instantané lors d'une demande de remboursement

Dans `supabase/functions/mandate-renewal-action/index.ts`, après le `notifyAdmins(...)` du cas `refundEligible = true` :
- Récupérer tous les admins avec leur email
- Envoyer un email via `send-notification-email` à chaque admin avec :
  - Sujet : `💰 Demande de remboursement — {Prénom Nom}`
  - Corps : nom du client, jours écoulés, date de fin officielle, date de traitement prévue (fin + 30j), lien vers la fiche client admin

### 2. Email de confirmation au client (si éligible)

Toujours dans le même bloc, envoyer au client :
- Sujet : `✅ Votre demande de remboursement est confirmée`
- Corps : confirmation que le remboursement est éligible, rappel qu'il restera servi jusqu'au jour 90, traitement sous 30 jours après cette date, montant non précisé (la logique de calcul reste à ta main)

### 3. Email "annulation enregistrée" au client (si non éligible)

Pour `cancel` simple ou `cancel_with_refund` non éligible : email court de confirmation d'annulation, sans promesse de remboursement.

### 4. Validation automatique = déjà faite

Aucun changement nécessaire — la fonction calcule déjà `refundEligible` strictement côté serveur (jamais confiance au client). Le passage en `refund_status = 'pending'` est automatique dès qu'une demande éligible arrive.

## Détails techniques

- Réutilisation de l'edge function existante `send-notification-email` (déjà câblée Resend + templates)
- Pas de migration DB nécessaire — toutes les colonnes (`refund_status`, `refund_requested_at`, `refund_eligible`) existent déjà
- Pas de nouveau composant front
- Idempotence : les emails sont envoyés une seule fois car le token de mandat est marqué `used_at` à la même étape

## Hors scope

- Traitement automatique du virement bancaire de remboursement (reste manuel)
- Email pour le cas de Meless rétroactivement — je peux te générer un mail à la main si tu veux, mais cette demande n'a pas transité par le flux normal
