# Rattacher la demande de location à une offre visitée

## Base de données (migration)
- Ajouter `demandes_location_candidat.annonce_id uuid` (peut rester vide), avec un lien vers `annonces_publiques` (ON DELETE SET NULL).
- Aucune règle d'accès modifiée : le candidat ne voit et n'écrit que ses propres lignes.

## Page « Ma demande de location » (seulement src/pages/candidat/Demande.tsx)
- Un menu déroulant « Rattacher ma demande à une offre visitée » en haut du formulaire, au-dessus des étapes.
- Choix proposés : uniquement les `candidatures_location` du candidat avec `annonce_id` et `creneau_id` remplis. Libellé : titre + ville/adresse de l'annonce + date du créneau (heure de Zurich). Si une même annonce apparaît plusieurs fois, on ne la montre qu'une fois.
- Aucune visite réservée : le menu est grisé avec le message « Réservez d'abord une visite sur une annonce pour pouvoir y rattacher votre demande. »
- Si la demande est déjà rattachée à une annonce, ce choix est présélectionné.

## Enregistrement
- Le même enregistrement qu'aujourd'hui (par utilisateur), avec en plus `annonce_id`.
- Si une offre est choisie : mise à jour de la candidature `candidatures_location` qui correspond (même user_id + annonce_id). On y reporte `mandat_data` et les champs à plat déjà repris, seulement pour les colonnes qui existent dans cette table (vérifié avant de coder).
- Si cette mise à jour échoue, la demande reste enregistrée et un message d'avertissement s'affiche.

## Vérification
- tsgo.
