# Persistance de connexion robuste et vérifiable

## Constat confirmé

- Le client d’authentification conserve actuellement la session dans `localStorage`, avec `persistSession: true` et `autoRefreshToken: true`. Ce stockage survit à la fermeture des onglets et de Chrome. La clé par défaut, dérivée du projet, est stable.
- La bibliothèque d’authentification installée utilise déjà le Web Locks API de Chrome pour sérialiser ses opérations entre onglets.
- Le contexte applicatif ajoute néanmoins plusieurs appels explicites à `refreshSession()` (`focus`, `visibilitychange`, retour en ligne et timer), sans « single flight » applicatif.
- Défaut critique confirmé dans `AuthContext.tsx` : après trois tentatives sans session, le code efface l’état local même si les réponses sont des timeouts, erreurs réseau ou erreurs serveur 5xx. Seul un refus définitif 4xx devrait autoriser ce nettoyage.
- Les journaux disponibles autour de l’incident montrent une rotation réussie du refresh token sur `logisorama.ch` (`token_revoked`, puis `token_refreshed`, statut 200), et non un rejet. Ils ne permettent donc pas d’attribuer la redirection observée à un token révoqué. Il faudra vérifier si l’automatisation a réellement réutilisé le même répertoire de profil Chrome et la même origine canonique.
- Un cookie `HttpOnly` ne peut pas être créé ni renouvelé par cette application React côté navigateur. Il faudrait un backend d’authentification même-origine/BFF, absent de l’architecture actuelle. Le mécanisme compatible est donc le stockage persistant du SDK dans `localStorage`; le mot de passe n’y est jamais enregistré.

## Correctif

### 1. État d’initialisation fiable

- Transformer `AuthContext` en contrôle d’amorçage explicite : conserver `loading=true` pendant la lecture de la session persistante et la tentative silencieuse de récupération.
- Ne rendre les routes protégées décisionnelles qu’après la fin réelle de ce contrôle.
- Conserver la session connue et l’interface de chargement pendant une indisponibilité réseau au démarrage, puis reprendre automatiquement le contrôle au retour en ligne.

### 2. Rafraîchissement unique et résilient

- Centraliser tout refresh explicite dans une fonction « single flight » : un seul Promise partagé par onglet, en complément du verrou multi-onglets déjà fourni par le SDK.
- Faire passer le timer, `visibilitychange`, `focus`, `online` et la récupération après événement de session nul par cette fonction unique.
- Jusqu’à trois tentatives avec délai progressif pour les erreurs réseau, timeouts, 429 et 5xx.
- Ne jamais effacer la session persistante après ces erreurs temporaires ; garder l’état en attente et réessayer au retour réseau/prochain réveil.
- Ne nettoyer la session que pour une déconnexion manuelle ou une réponse d’authentification définitive indiquant un refresh token absent, invalide, révoqué ou refusé.

### 3. Stockage et domaine

- Documenter et contrôler au démarrage la clé de stockage persistante réellement utilisée, sans jamais journaliser son contenu.
- Conserver le stockage `localStorage` du SDK : persistant après fermeture complète de Chrome et compatible avec la rotation sécurisée des refresh tokens.
- Ajouter une redirection très précoce de `www.logisorama.ch` vers `https://logisorama.ch`, en conservant chemin, paramètres et fragment, afin d’éviter deux stockages d’origine distincts.
- Ne pas ajouter `credentials: "include"` aux appels du SDK : cette authentification transmet les jetons par en-tête et non par cookie. L’option ne serait utile que pour un futur backend même-origine à cookies.

### 4. Routes protégées et déconnexions

- Renforcer `ProtectedRoute` pour afficher le chargement tant que l’authentification est en cours de récupération et ne rediriger qu’après un verdict définitif.
- Auditer les appels `signOut()` restants et conserver uniquement ceux liés à une action utilisateur explicite, à une suppression de compte, à une réinitialisation de mot de passe ou à un rejet métier volontaire lors d’une connexion dédiée.
- Aucun timeout, 500, perte réseau, suspension d’application ou erreur d’affichage ne déclenchera de déconnexion.

## Fichiers prévus

- `src/contexts/AuthContext.tsx` — machine d’état d’amorçage, classification des erreurs, retries et single flight.
- `src/components/ProtectedRoute.tsx` — attente du verdict définitif avant redirection.
- `src/main.tsx` — normalisation précoce du domaine `www` vers le domaine canonique.
- Tests ciblés d’authentification à ajouter selon la structure de test disponible, sans enregistrer de secret.

Le client auto-généré `src/integrations/supabase/client.ts` ne sera pas modifié ; sa configuration persistante existante sera utilisée comme source d’autorité.

## Validation obligatoire

1. **Persistance navigateur** : avec un profil Chromium persistant authentifié, fermer toutes les pages et le navigateur, relancer le même profil et ouvrir directement `/admin`; vérifier le tableau de bord sans passage par `/login`.
2. **Expiration simulée** : rendre le jeton d’accès expiré tout en conservant le refresh token, relancer l’app et confirmer le renouvellement silencieux.
3. **Hors ligne** : ouvrir `/admin` hors connexion, vérifier l’absence de nettoyage, rétablir le réseau et confirmer la reprise automatique.
4. **Erreur 500/timeout** : intercepter le refresh avec trois réponses temporaires, confirmer l’absence de redirection et la conservation du stockage.
5. **Multi-onglets** : ouvrir plusieurs onglets et déclencher simultanément timer/visibilité; confirmer un seul refresh actif et aucune rotation conflictuelle.
6. **Révocation réelle** : révoquer le refresh token de la session de test, confirmer que le refus définitif mène à `/login`.
7. **Confidentialité** : inspecter console, requêtes et code pour confirmer qu’aucun mot de passe ni refresh token n’est journalisé.
8. **24 heures et plusieurs jours** : fournir les vérifications immédiates et la procédure reproductible; les durées réelles ne peuvent être déclarées réussies qu’après leur écoulement dans le même profil Chrome persistant.

## Limite incontournable

Un profil Chrome neuf, invité, éphémère ou lancé avec un autre `--user-data-dir` ne contient ni session ni refresh token. Aucun correctif du site ne peut reconstituer cette authentification. La tâche automatique devra impérativement réutiliser un profil Chrome persistant, ou utiliser une authentification/API dédiée conçue pour l’automatisation.

## Rapport final

Après implémentation, le rapport indiquera la cause démontrée (en distinguant défaut applicatif et profil d’automatisation), les fichiers réellement modifiés, le stockage retenu, le résultat individuel de chaque test exécutable, les tests longue durée restant à observer, ainsi que les confirmations suivantes : aucun mot de passe stocké, aucun token journalisé, refresh tokens toujours rotatifs et révocables.