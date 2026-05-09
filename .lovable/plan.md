## Objectif

Sur la landing page (section « Analyse gratuite de ton dossier »), remplacer la réservation d'un **entretien téléphonique** par la réservation d'un **rendez-vous physique au bureau** :

**Adresse** : Chemin de l'Esparsette 5, 1023 Crissier
**Jours** : Lundi → Samedi (fermé le dimanche)
**Horaires** : 08h30 → 12h00 et 13h30 → 16h30
**Durée** : 30 minutes par créneau

## Fichiers modifiés

### 1. `src/lib/phoneSlots.ts` (logique des créneaux)
- Durée passe de 15 → **30 minutes**
- Deux plages horaires : matin `08:30 → 12:00` et après-midi `13:30 → 16:30`
- Exclure les **dimanches** dans `getAvailableDays()`
- Renommer la notion `DayPart` à 2 valeurs : `matin` / `apres-midi` (suppression du `soir`)

### 2. `src/components/landing/PhoneSlotPicker.tsx`
- Mettre à jour `DAY_PARTS` : Matin `08h30 → 12h00`, Après-midi `13h30 → 16h30`
- Ajouter un encart visible avec l'adresse complète + lien Google Maps :
  « 📍 Bureau Logisorama — Chemin de l'Esparsette 5, 1023 Crissier »
- Renommer titres internes (« Choisis ton créneau d'appel » → « Choisis ton créneau au bureau »)

### 3. `src/components/landing/DossierAnalyseSection.tsx`
- Remplacer toutes les mentions « rendez-vous personnalisé » / « entretien téléphonique » par « rendez-vous au bureau »
- Écran de succès : afficher l'adresse + bouton « Itinéraire Google Maps »
- Texte intermédiaire (étape 2) : « Choisis ton créneau de rendez-vous au bureau »
- Commentaires de code mis à jour

### 4. Edge Function `supabase/functions/confirm-phone-appointment/index.ts`
- Email de confirmation : titre « ✅ Rendez-vous au bureau confirmé »
- Remplacer « Notre équipe vous appellera » par « Nous vous accueillons à notre bureau »
- `location` Google Calendar = `Chemin de l'Esparsette 5, 1023 Crissier`
- Ajouter dans le HTML de l'email un bloc adresse + lien Maps + rappel « Merci d'arriver 5 min en avance »

### 5. Edge Function `supabase/functions/download-phone-appointment-ics/index.ts`
- ICS : `SUMMARY` = « Rendez-vous au bureau Logisorama »
- `LOCATION` = `Chemin de l'Esparsette 5, 1023 Crissier`
- `DESCRIPTION` mise à jour (accueil au bureau, pas appel)

### 6. Edge Function `supabase/functions/send-phone-appointment-reminders/index.ts`
- Sujet : « 📍 Rappel : votre rendez-vous au bureau demain »
- ICS et corps email : adresse du bureau au lieu du numéro de téléphone
- Ligne tableau : remplacer « 📞 Numéro » par « 📍 Adresse » avec l'adresse complète

## Hors scope (non touché)

- Schéma DB `lead_phone_appointments` — conservé tel quel (le nom de table reste, seule la sémantique change). Pas de migration nécessaire.
- Section publique `src/components/public-site/sections/DossierAnalyseSection.tsx` — n'utilise pas le PhoneSlotPicker (formulaire simplifié sans créneau), donc aucun changement.
- Adresse e-mail expéditeur, design global, autres landings.

## Vérification post-implémentation

- Ouvrir la landing `/index` mobile (430×777), parcourir le formulaire « Analyse de ton dossier » → étape 2, vérifier :
  - Plages 08h30→12h00 et 13h30→16h30 uniquement
  - Créneaux de 30 min
  - Dimanches absents du calendrier
  - Encart adresse visible
- Soumettre un test → écran de succès affiche l'adresse + lien Maps
