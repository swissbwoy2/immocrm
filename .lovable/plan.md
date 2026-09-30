# Rôle candidat — Phase 2 : réservation de visite depuis une annonce

## Ce que le visiteur verra
1. Sur la fiche d'une annonce publique : bouton « Réserver une visite / Postuler » (seulement si l'annonce a au moins 1 créneau actif à venir).
2. Une fenêtre liste les 1 à 3 créneaux ; il saisit prénom, nom, e-mail, téléphone et choisit un créneau.
3. Message final : « Votre visite est réservée — vérifiez votre e-mail pour vos identifiants et la confirmation ».
4. E-mail : adresse du bien, date/heure (heure suisse), identifiants (e-mail + mot de passe provisoire, seulement pour un nouveau compte) et bouton vers /candidat.

## Côté admin / agent
- Dans l'écran admin des annonces publiques (détail/édition d'une annonce) : bloc « Créneaux de visite » — ajouter (date + heure, max 3 actifs), activer/désactiver, supprimer, avec le nombre de réservations par créneau.

## Détails techniques
**Base de données (une migration)**
- Nouvelle table `annonce_creneaux` (id, annonce_id → annonces_publiques ON DELETE CASCADE, date_heure timestamptz, actif bool default true, created_at). GRANT : SELECT à anon/authenticated, ALL à service_role. RLS : lecture publique si `actif`, écriture via `has_role(admin|agent)`. Trigger de validation : max 3 créneaux actifs par annonce.
- `candidatures_location` : ajout colonnes nullables `annonce_id` et `creneau_id`. La colonne `lot_id` est aujourd'hui obligatoire ; elle devient facultative (`DROP NOT NULL`) — cette étape vous demandera une confirmation. Aucune donnée existante n'est modifiée.
- Index unique (creneau_id, user_id) pour éviter les doublons de réservation.

**Edge Function `inscription-candidat-visite`** (publique, validation Zod, rate-limit via `consume_edge_rate_limit`)
- Vérifie que le créneau existe, est actif, futur et appartient à l'annonce publiée → sinon « créneau indisponible ».
- Recherche l'utilisateur par e-mail. Absent : `auth.admin.createUser` (email_confirm, mot de passe fort aléatoire 14 car.). Présent : aucun nouveau mot de passe.
- Ajoute le rôle `candidat` si absent (service role, jamais côté client), complète `profiles` (prenom, nom, telephone) sans écraser les valeurs existantes.
- Insère `candidatures_location` (user_id, annonce_id, creneau_id, date_visite = créneau, statut `en_attente`) — aucune ligne `clients`.
- E-mail via le système d'e-mail managé existant (`sendTemplateEmail`) avec un nouveau modèle `candidat-visite-confirmation` ; le mot de passe n'est jamais logué ni renvoyé au navigateur.
- Réponses : `ok` / `slot_unavailable` / `invalid_email` / `already_booked`.

**Frontend**
- `AnnonceDetail.tsx` : bouton + nouveau `ReserverVisiteDialog`.
- Admin annonces : composant `AnnonceCreneauxManager`.
- Espace candidat : `useCandidatCandidatures` lit `date_visite` + adresse de l'annonce liée ; l'Agenda candidat affiche les visites réservées avec date/heure.

**Hors périmètre** : aucun changement pour les autres rôles, RLS candidat inchangée.
