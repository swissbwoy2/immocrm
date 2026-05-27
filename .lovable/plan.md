# Arrêt automatique du mandat après demande d'annulation/remboursement

## Comportement actuel (à corriger)

Quand un client (ou l'admin/agent pour son compte) déclenche `cancel` ou `cancel_with_refund` :
- `statut` passe **immédiatement à `inactif`** (ligne 330 de `mandate-renewal-action/index.ts`).
- Le client n'apparaît plus comme actif, mais aucune date d'arrêt officiel n'est posée.
- Aucun rendu "mandat gelé" n'est appliqué côté tableau de bord client (le statut `inactif` n'est pas dans la liste des statuts gelés).
- Une action manuelle admin (bouton « Stopper le mandat ») est nécessaire pour passer en `stoppe` et figer proprement le dossier.

## Comportement souhaité

1. Dès qu'une demande de remboursement ou d'annulation est confirmée (email envoyé) :
   - Le mandat **reste actif jusqu'à `mandate_official_end_date`** (les offres continuent d'être envoyées comme aujourd'hui dans le cas remboursement).
   - On marque le dossier comme « arrêt programmé » (champ `cancellation_requested_at` + `cancellation_reason` déjà existants ; refund pose déjà `refund_status='pending'`).
   - **Aucune action admin/agent requise.**
2. À la date `mandate_official_end_date` (passage du cron quotidien) :
   - Le mandat passe automatiquement à `statut = 'stoppe'` + `date_changement_statut = now()`.
   - Une notification est envoyée au client, à l'agent et aux admins (« Mandat stoppé à échéance suite à la demande d'annulation/remboursement »).
   - Une ligne `auto_stopped` est insérée dans `mandate_renewal_actions` pour audit.
3. Tableau de bord client en mode gelé : déjà géré par `mandatDates.ts` et les écrans existants pour `stoppe` (bloc "Mandat gelé", aucune action possible, message inviter à contacter un admin).

## Modifications

### 1. `supabase/functions/mandate-renewal-action/index.ts`
- Sur `cancel` et `cancel_with_refund`, **ne plus** passer `statut` à `inactif`. Garder `statut = 'actif'` jusqu'à la fin.
- Toujours poser :
  - `cancellation_reason`
  - `cancellation_requested_at = now()` (nouveau champ ; voir migration)
  - `refund_eligible`, `refund_status`, `refund_requested_at` comme aujourd'hui pour le cas remboursement.
- Le blocage du renouvellement automatique est déjà assuré par `refund_status IN ('pending','processed')` et le sera aussi par `cancellation_requested_at IS NOT NULL` (cf. cron).

### 2. `supabase/functions/mandate-expiry-reminders/index.ts` (cron quotidien existant)
- Ajouter une étape **avant** le bloc de renouvellement auto : si le client a `cancellation_requested_at IS NOT NULL` (ou `refund_status IN ('pending','processed')`) ET `mandate_official_end_date <= today` :
  - `clients.update({ statut: 'stoppe', date_changement_statut: now() })`
  - Insert `mandate_renewal_actions { action: 'auto_stopped', triggered_by: 'system', metadata: { reason: cancellation_reason, refund_status } }`
  - Notifications in-app : client (`"⏹ Mandat clôturé"`, message expliquant que la demande d'annulation/remboursement a pris effet et l'invitant à contacter l'admin pour toute question), agent, admins.
- Élargir le filtre de la requête initiale pour inclure ces clients (actuellement `eq("statut","actif")` — OK puisqu'on garde `actif` jusqu'à l'arrêt).

### 3. Migration SQL
- Ajouter colonne `clients.cancellation_requested_at timestamptz` (nullable).
- Mettre à jour `mandatDates.ts` : ajouter `cancellation_requested_at` comme cause de `blockRenewal` (sécurité ceinture-bretelles côté front, déjà couvert par `refund_status`/`statut`).

### 4. Cas de Marie (rattrapage manuel)
- Insert / update : si Marie a déjà une demande de remboursement enregistrée et que sa `mandate_official_end_date` est passée → repasser `statut = 'stoppe'`, `date_changement_statut = now()`, créer la ligne d'audit et envoyer la notification. Sera proposé via l'outil d'insertion DB après lecture de son enregistrement.

### 5. Pas de changement front nécessaire pour le dashboard client
- Le mode gelé pour `stoppe` est déjà rendu (`src/pages/admin/ClientDetail.tsx`, `src/utils/mandatDates.ts`, `Mandats.tsx`). Le dashboard client suit la même logique. À vérifier rapidement et ajouter un CTA « Contacter un administrateur » si manquant sur le dashboard client (composant `RelocationClientDashboard` / `PremiumDashboardHeader`).

## Points de vérification après build
- Déclencher `test_staff_email` puis une vraie annulation : confirmer que `statut` reste `actif`, que `cancellation_requested_at` est posé, que les offres continuent d'être envoyées.
- Forcer le cron sur un client dont `mandate_official_end_date` est dans le passé → vérifier passage à `stoppe` + notification.
- Se connecter en tant que client stoppé → confirmer mode gelé du dashboard et absence d'actions.

## Détails techniques
- Aucun nouveau secret requis.
- Pas de nouvelle fonction edge (réutilise `mandate-expiry-reminders` déjà planifiée).
- Aucun changement de schéma destructif (ajout d'une colonne nullable uniquement).
