# Rôle « Candidat » — Phase 1 (fondations)

## Constats importants
- La connexion lit **un seul rôle** par utilisateur. Avec un double rôle (candidat + client), elle échouerait aujourd'hui → il faut d'abord la rendre compatible multi-rôles, sinon l'utilisateur serait bloqué sur « Rôle non reconnu ».
- `candidatures_location` n'a **aucun lien vers un compte** (seulement email/nom) → ajout d'une colonne `user_id` (nullable) + rattachement par email du compte.
- `formulaires_location` contient les **modèles PDF des régies**, pas les demandes des personnes → aucune policy candidat dessus (ce serait lui ouvrir des données internes). La « demande de location » sera stockée dans `candidatures_location` (profil de demande sans lot) .
- Statuts existants : `candidatures` = en_attente / refusee / signature_effectuee / bail_conclu / cles_remises ; aucun « retenu ». → nouvelle valeur texte **`retenu_bailleur`** (colonnes texte, rien d'existant ne casse).

## 1) Base de données (une migration)
- `app_role` += `candidat`.
- `candidatures_location` : colonne `user_id uuid` (nullable) + index ; `lot_id` rendu utilisable sans lot pour la demande générale (si NOT NULL, on garde la demande sur une ligne dédiée avec `lot_id` null autorisé — vérifié avant migration).
- Fonction `is_candidat_owner_email(email)` (SECURITY DEFINER, plpgsql) comparant à l'email du compte.
- Policies ciblées rôle `candidat` uniquement :
  - `candidatures` : SELECT de ses lignes (via `clients.user_id = auth.uid()`).
  - `candidatures_location` : SELECT/INSERT/UPDATE où `user_id = auth.uid()` ou email = email du compte ; un trigger empêche le candidat de modifier `statut`, `score_dossier`, `note_agent`, `motif_refus`.
  - `documents` : SELECT/INSERT de ses propres pièces (user lié), sans élargir les autres rôles.
  - `user_roles` : fonction RPC `activate_candidat_searches()` (SECURITY DEFINER) qui ajoute `client` seulement si l'appelant est candidat — pas d'INSERT libre dans `user_roles` (évite l'élévation de privilèges) ; crée aussi la fiche `clients` minimale si absente.

## 2) Connexion multi-rôles
- Lecture de **tous** les rôles ; rôle actif = choix mémorisé (sélecteur) sinon priorité existante (admin > agent > … > client > candidat). Les comptes à rôle unique se comportent exactement comme avant.
- `userRoles[]` exposé ; accès aux routes autorisé si l'un des rôles correspond.

## 3) Espace candidat
- `/candidat` : bienvenue, résumé (nb candidatures, en cours, retenues), bouton « Activer mes recherches », lien vers la demande de location.
- `/candidat/candidatures` : liste unifiée (candidatures + candidatures_location), cartes adresse / statut lisible / date / état du dossier, filtres réutilisés de « Mes candidatures ».
- `/candidat/demande` : formulaire sans pièces (identité, adresse actuelle, permis, emploi, revenus, occupants, date d'entrée, motif).
- Section « Mes pièces » visible **uniquement** si une candidature est `retenu_bailleur` ; sinon message : « Vos documents vous seront demandés uniquement si votre dossier est retenu par un propriétaire. »
- Menu latéral + barre mobile dédiés au rôle candidat.

## 4) Candidat → client
- « Activer mes recherches » → RPC, rafraîchit les rôles, bascule sur l'espace client.
- Sélecteur « Espace candidat / Espace client » dans l'en-tête quand les deux rôles existent.

## Hors périmètre (phase 2)
- Inscription publique candidat sur logisorama.ch, action admin « marquer retenu » dans les écrans agent, e-mails.

## Détails techniques
- Fichiers : migration, `AuthContext.tsx`, `ProtectedRoute.tsx`, `App.tsx`, `AppSidebar.tsx`, `MobileBottomNav.tsx`, nouveaux `src/pages/candidat/{Dashboard,Candidatures,Demande}.tsx`, `src/components/RoleSwitcher.tsx`, types régénérés.
- Vérification : tsgo + contrôle qu'un compte admin/agent/client mono-rôle garde son espace.
