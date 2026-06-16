# Problème

L'écran "Définir mon mot de passe" affiche **"Auth session missing!"** pour Christelle Miere.

Diagnostic via les logs auth :
- 07:14:06 → lien d'invitation consommé avec succès, session créée
- 07:16:57 → `updateUser({ password })` échoue avec `403 bad_jwt: missing sub claim`

La session JWT a été perdue / corrompue entre l'arrivée sur la page et la soumission du formulaire (probablement navigateur in-app, iOS, ou double consommation du `?code=`).

# Plan

## 1. Débloquer Christelle immédiatement
Lui renvoyer un **nouveau lien d'activation** via `resetPasswordForEmail` (depuis admin), avec consigne :
- Ouvrir le lien **directement dans Safari/Chrome** (pas dans WhatsApp/Mail)
- Définir le mot de passe **sans recharger la page**
- Ne pas fermer l'onglet entre clic et soumission

## 2. Fiabiliser `src/pages/FirstLogin.tsx`

### a) Détection robuste de la perte de session au moment du submit
Si `updateUser` renvoie `Auth session missing` ou `bad_jwt` :
- ne PAS afficher l'erreur brute
- basculer en phase `expired` avec un message dédié : "Votre lien a expiré pendant la saisie. Demandez-en un nouveau ci-dessous." + email pré-rempli si disponible

### b) Empêcher la double consommation du `?code=`
- Après `exchangeCodeForSession`, **nettoyer l'URL** (`window.history.replaceState`) pour retirer `?code=` afin qu'un reload ne tente pas un 2e échange (qui invalide la session existante).

### c) Pré-remplir l'email pour le renvoi
- Après obtention de la session, faire `getUser()` et stocker l'email → l'utiliser dans `handleResendLink` automatiquement si on bascule en `expired`.

### d) Avertissement préventif sur la page
- Petit bandeau discret : "💡 Pour éviter tout souci, définissez votre mot de passe sans recharger ni fermer cette page."

## 3. (Optionnel) Améliorer le template email d'invitation
Ajouter dans le corps de l'email : "Si vous ouvrez ce lien depuis WhatsApp/Mail, copiez-collez-le dans Safari ou Chrome pour éviter les erreurs."

# Fichiers touchés
- `src/pages/FirstLogin.tsx` (logique de robustesse + UI)
- Aucune migration DB nécessaire
- Pas de changement backend

# Action manuelle (hors code)
Renvoyer un nouveau lien à `christellemiere@hotmail.fr` depuis `/admin/clients` après le déploiement.
