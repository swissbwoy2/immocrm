## Objectif

Arrêter l'auto-confirmation des RDV créés via `/rendez-vous`. Tout nouveau RDV (bureau ou téléphonique) arrive en `en_attente`, et c'est l'admin qui déclenche manuellement la confirmation + l'envoi de l'invitation ICS au prospect.

## Changements

### 1. Formulaire public `/rendez-vous` (`src/pages/RendezVousBureau.tsx`)
- Insert : remplacer `status: 'confirme'` par `status: 'en_attente'`.
- Ne plus envoyer l'ICS au prospect à la soumission (supprimer/skipper l'appel `send-calendar-invite` côté public).
- Adapter l'écran de confirmation : "Votre demande a bien été enregistrée. Vous recevrez un email de confirmation avec l'invitation calendrier dès que notre équipe aura validé le créneau."
- Garder l'appel à `notify-admin-new-phone-appointment` (l'admin doit être notifié immédiatement).

### 2. Détail RDV admin (`src/components/calendar/PhoneAppointmentDetailDialog.tsx`)
- Ajouter un bouton **"Confirmer le RDV et envoyer l'invitation"** visible uniquement si `status === 'en_attente'`.
- Action du bouton :
  1. `UPDATE lead_phone_appointments SET status='confirme', confirmed_at=now(), confirmed_by=auth.uid(), ics_sent_at=now() WHERE id=...`
  2. Appel `send-calendar-invite` avec titre/description/location adaptés selon `appointment_type` (bureau → adresse Crissier, téléphonique → numéro du prospect).
  3. Toast succès + refresh.
- Garder le bouton "Annuler le RDV" existant.
- Badge "En attente" déjà présent reste tel quel.

### 3. Calendrier admin (`src/pages/admin/Calendrier.tsx`)
- Aucun changement de logique. Les RDV `en_attente` apparaîtront déjà avec leur badge "En attente" via le dialog. Optionnel : style visuel légèrement atténué (opacité) pour les `en_attente` — à confirmer si souhaité.

## Hors scope
- Pas de changement à `/analyse-dossier` (déjà en `en_attente`).
- Pas de modification du flow `confirmed_by` / colonnes existantes (déjà présentes dans la table).
- Pas de notification automatique au prospect en cas d'annulation (comportement actuel conservé).

## Fichiers touchés
- `src/pages/RendezVousBureau.tsx`
- `src/components/calendar/PhoneAppointmentDetailDialog.tsx`
