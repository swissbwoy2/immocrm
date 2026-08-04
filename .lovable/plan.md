# Session longue durée (365 jours) avec renouvellement automatique sécurisé

Objectif : un utilisateur qui se connecte reste connecté pendant un an, sans reconnexion, avec un renouvellement de jeton automatique et sécurisé (rotation des refresh tokens).

## Ce qui change

### 1. Configuration d'authentification (backend)
- Durée de vie du jeton d'accès : 1 heure (renouvelé automatiquement en arrière-plan).
- Refresh token : rotation activée, pas d'expiration par inactivité, boîte de temps de session portée à 365 jours.
- Aucune déconnexion forcée tant que l'utilisateur revient au moins une fois dans l'année.

### 2. Client d'authentification
- Persistance de la session activée avec détection du renouvellement au retour d'onglet/app (`persistSession`, `autoRefreshToken`, reprise du refresh à la reprise de visibilité).
- Sur mobile (Capacitor), relancer explicitement le rafraîchissement quand l'app repasse au premier plan, car les timers sont gelés en arrière-plan.

### 3. Robustesse anti-déconnexion accidentelle
- Renforcer la logique de « période de grâce » déjà présente dans le contexte d'authentification : ne jamais vider la session sur une erreur réseau, seulement quand le serveur confirme l'invalidité du refresh token.
- Ne déconnecter que sur : déconnexion volontaire, refresh token révoqué/expiré confirmé, changement de mot de passe.
- Retirer la déconnexion automatique déclenchée par la barrière d'erreur applicative (elle éjecte l'utilisateur sur un simple bug d'affichage) : remplacer par un rechargement de page.

### 4. Sécurité conservée
- Rotation des refresh tokens : un jeton volé devient invalide dès la première réutilisation.
- Déconnexion globale toujours disponible (bouton « Se déconnecter »), qui invalide toutes les sessions de l'appareil.
- Sur les rôles administrateur/agent, la session longue reste couverte par les mêmes contrôles RLS côté base.

## Détails techniques

- `configure_auth` / paramètres du projet : `jwt_expiry = 3600`, `refresh_token_rotation_enabled = true`, `security_refresh_token_reuse_interval = 10`, `sessions.timebox = 8760h` (365 j), pas d'`inactivity_timeout`.
- `src/contexts/AuthContext.tsx` : conserver `pendingClearRef`, ajouter un `refreshSession()` sur `visibilitychange`/`resume` et allonger la fenêtre de vérification avant nettoyage.
- `src/components/ErrorBoundary.tsx` : supprimer l'appel `supabase.auth.signOut()`.
- `src/integrations/supabase/client.ts` est auto-généré : aucune modification.

## Limites

- Une session ne peut pas survivre à un effacement des données du navigateur ni à une navigation privée.
- Sur iOS Safari (web), le stockage local peut être purgé après ~7 jours d'inactivité totale ; l'app native Capacitor n'est pas concernée.
