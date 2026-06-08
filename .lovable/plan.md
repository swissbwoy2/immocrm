## Problème identifié

Le formulaire `/rendez-vous` (`src/pages/RendezVousBureau.tsx`) force tous les RDV en "bureau Crissier" via `source_form: 'rdv_bureau_crissier'`. Mais le calendrier admin (`src/pages/admin/Calendrier.tsx` ligne 181) affiche **systématiquement** tous les `lead_phone_appointments` comme `📞 RDV téléphonique` (event_type `rdv_telephonique`), peu importe la source. D'où le bug : chaque RDV au bureau apparaît comme téléphonique côté admin.

## Solution

### 1. Base de données
Ajouter une colonne `appointment_type` à `lead_phone_appointments` :
- valeurs : `'bureau'` | `'telephonique'`
- défaut : `'telephonique'` (rétrocompat avec analyse_dossier existants)
- backfill : tous les enregistrements `source_form = 'rdv_bureau_crissier'` → `'bureau'`, le reste → `'telephonique'`

### 2. Formulaire `/rendez-vous` (`src/pages/RendezVousBureau.tsx`)
Ajouter un sélecteur (2 cartes/boutons) **Type de rendez-vous** :
- 📍 **Au bureau** (Crissier) — affichage actuel avec adresse + plan
- 📞 **Téléphonique** — masquer le bloc adresse, adapter texte de confirmation

Logique :
- Insérer `appointment_type` dans `lead_phone_appointments`
- Pour téléphonique : titre ICS = "RDV téléphonique Logisorama", description sans adresse bureau, `location` vide
- Pour bureau : comportement actuel inchangé

### 3. Calendrier admin (`src/pages/admin/Calendrier.tsx` ligne 179-189)
Discriminer selon `appt.appointment_type` :
- `bureau` → titre `🏢 RDV bureau — {nom}`, event_type `rendez_vous` (vert), description avec adresse bureau
- `telephonique` → titre `📞 RDV téléphonique — {nom}`, event_type `rdv_telephonique` (actuel)

### 4. Détail RDV admin (`src/components/calendar/PhoneAppointmentDetailDialog.tsx`)
Adapter le titre et les labels selon `appointment_type` (badge "Au bureau" vs "Téléphonique").

### 5. Notification admin
Passer `appointment_type` au edge function `notify-admin-new-phone-appointment` pour que l'email/WhatsApp indique le bon type (changement minimal côté payload uniquement, l'edge function affichera la valeur reçue).

## Fichiers touchés
- migration : `lead_phone_appointments.appointment_type` + backfill
- `src/pages/RendezVousBureau.tsx` — sélecteur + insert + UI conditionnelle
- `src/pages/admin/Calendrier.tsx` — discrimination event_type/titre
- `src/components/calendar/PhoneAppointmentDetailDialog.tsx` — affichage badge type
- (option) edge function `notify-admin-new-phone-appointment` — afficher type dans notif

## Hors scope
- Pas de changement au flow `/analyse-dossier` (reste téléphonique par défaut)
- Pas de modif des autres event_types du calendrier
