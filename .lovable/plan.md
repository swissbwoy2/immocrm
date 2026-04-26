# Réparation du bouton "Essayer la démo"

## Diagnostic
La page `/demo` affiche **"Failed to send a request to the Edge Function"** car :
- Aucun log n'existe pour la fonction `demo-login` → elle n'a **jamais été invoquée avec succès** côté serveur.
- Le compte démo est bien présent en base (`info@immo-rama.ch`, id `2e50b7d0-…`), donc le backend SQL est OK.
- Conclusion : l'edge function `demo-login` n'est pas (ou mal) déployée.

## Plan d'action

### 1. Forcer le déploiement de `demo-login`
- Redéployer explicitement la fonction via `supabase--deploy_edge_functions(["demo-login"])`.
- Vérifier que `verify_jwt = false` est bien implicite (les fonctions Lovable Cloud sont publiques par défaut).

### 2. Tester immédiatement la fonction
- Appeler `demo-login` via `supabase--curl_edge_functions` avec un body vide.
- Vérifier qu'on récupère bien `{ access_token, refresh_token }`.
- Si erreur, lire les logs (`supabase--edge_function_logs`) et corriger.

### 3. Renforcer la robustesse du frontend `/demo`
- Améliorer le message d'erreur dans `src/pages/Demo.tsx` pour afficher la vraie cause (status HTTP + message serveur) au lieu d'un simple "Failed to fetch".
- Ajouter un bouton "Réessayer" en cas d'échec.

### 4. Vérifier le rename d'email (optionnel mais cohérent)
- Si l'admin API `updateUserById` échoue silencieusement, exécuter la migration SQL pour renommer manuellement `info@immo-rama.ch` → `demo@immo-rama.ch` dans `auth.users` + `auth.identities` (déjà couvert dans la migration précédente, à re-vérifier).

### 5. Validation end-to-end
- Recharger `/demo`, vérifier la redirection vers `/client`, puis vérifier que la bannière démo s'affiche bien et que l'utilisateur est bien `demo@immo-rama.ch`.

## Fichiers impactés
- `supabase/functions/demo-login/index.ts` (potentiellement aucun changement, juste redéploiement)
- `src/pages/Demo.tsx` (meilleur affichage d'erreur)
- Migration SQL si rename email à refaire manuellement

## Risques
- Si le rename d'email casse l'identité Supabase, on rollback en gardant `info@immo-rama.ch` (la fonction marche dans les deux cas, le frontend ne montre pas l'email).
