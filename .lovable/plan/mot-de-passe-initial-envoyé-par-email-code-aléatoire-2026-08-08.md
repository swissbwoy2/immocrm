# Mot de passe initial envoyé par email (code aléatoire)

## Objectif
À la création d'un compte client, ne plus envoyer un lien vers une page de création de mot de passe.
Le client reçoit directement un **mot de passe provisoire aléatoire** par email, se connecte avec
email + ce mot de passe, puis le change lui-même dans **Paramètres → Changer le mot de passe**
(la carte existe déjà côté client).

Réponse courte : **oui, c'est faisable**, et **non, aucun nouveau build iOS n'est nécessaire** si on
se limite au périmètre ci-dessous (voir section « Build iOS »).

## Ce qui change

1. **Création du compte (fonction `invite-client`)**
   - Au lieu de `inviteUserByEmail` (lien → `/first-login`), on crée l'utilisateur avec
     `admin.createUser({ email, password: <code aléatoire>, email_confirm: true })`.
   - Code généré côté serveur : 10 caractères, alphabet sans ambiguïté (pas de O/0/I/l), jamais journalisé.
   - Marqueur `must_change_password: true` dans les métadonnées utilisateur.
   - Cas « utilisateur déjà existant » : on régénère un nouveau code provisoire et on renvoie le même email
     (au lieu de l'email de réinitialisation actuel).

2. **Email « Vos identifiants de connexion »**
   - Nouveau template email applicatif aux couleurs Logisorama : email de connexion,
     code provisoire bien visible, bouton « Se connecter », rappel de changer le mot de passe
     dans Paramètres.
   - Envoi via l'infrastructure email du projet (domaine `notify.logisorama.ch` déjà configuré).
     L'infrastructure d'emails applicatifs n'existe pas encore dans ce projet : il faut l'initialiser
     (file d'envoi + fonction d'envoi + page de désinscription). C'est une étape technique automatique.

3. **Après la première connexion**
   - Si `must_change_password` est vrai, le client est invité à définir son mot de passe
     (bandeau + redirection douce vers Paramètres). Le marqueur est retiré après changement.
   - La page `/first-login` reste en place pour les invitations déjà envoyées (rétrocompatibilité).

4. **Côté admin**
   - Le texte du dialogue « Créer un compte client » est adapté : « recevra ses identifiants par email »
     au lieu de « définir son mot de passe ».

## Sécurité
- Code aléatoire cryptographique, à usage unique de fait (le client doit le remplacer).
- Jamais renvoyé dans la réponse HTTP de la fonction, jamais dans les logs.
- Aucune modification du login humain existant ni des règles d'accès (RLS).

## Build iOS
Aucun nouveau build iOS requis **pour la partie email + création de compte** : tout se passe côté serveur.
Les seuls changements front sont : le texte du dialogue admin (écran admin) et l'incitation à changer
le mot de passe après première connexion. Comme l'app iOS embarque le front (pas de rechargement distant),
ces deux améliorations d'écran n'apparaîtront dans l'app native qu'au prochain build — mais **le flux
fonctionne sans** : le client peut se connecter avec son code et changer son mot de passe dans Paramètres,
carte déjà présente dans la version publiée.

## Détails techniques
- `supabase/functions/invite-client/index.ts` : remplacement de `inviteUserByEmail` /
  `resetPasswordForEmail` par `admin.createUser` / `admin.updateUserById` + envoi de l'email d'identifiants.
- Initialisation de l'infrastructure d'emails applicatifs + template `client-credentials`.
- `src/components/clients/CreateClientAccountDialog.tsx` : texte mis à jour.
- Détection `must_change_password` au chargement de l'espace client → bandeau vers `/client/parametres`.
