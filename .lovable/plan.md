# Activation manuelle du compte d'Oriane Dulymbois

## Pourquoi pas un simple UPDATE SQL ?

J'ai d'abord tenté un `UPDATE auth.users` direct → refusé : `permission denied for schema auth`. Lovable Cloud bloque toute écriture directe dans le schéma `auth` (par design, c'est protégé). La seule voie autorisée est l'API admin Supabase, accessible uniquement depuis une edge function avec la `SERVICE_ROLE_KEY`.

## Plan

### 1. Créer une edge function `admin-set-user-password`

Nouvelle fonction (`supabase/functions/admin-set-user-password/index.ts`) qui :
- Vérifie que l'appelant est authentifié **et** a le rôle `admin` via `has_role()` (sinon 403).
- Reçoit `{ email, password }` en POST.
- Utilise `supabase.auth.admin.updateUserById()` avec `password` + `email_confirm: true` → définit le mot de passe et confirme l'email en une opération.
- Retourne `{ ok: true, user_id, email }`.

C'est réutilisable pour tous les futurs cas similaires (un agent qui ne reçoit pas son invitation).

### 2. L'appeler une fois pour Oriane

Appel via `supabase--curl_edge_functions` avec ta session admin :
```
POST /admin-set-user-password
{ "email": "dulymbois@immo-rama.ch", "password": "Esparcette51024." }
```

### 3. Résultat

Oriane se connecte sur https://logisorama.ch avec :
- **Email :** `dulymbois@immo-rama.ch`
- **Mot de passe :** `Esparcette51024.`

## Sécurité

- La fonction est verrouillée par `has_role(auth.uid(), 'admin')` côté serveur → seul un admin connecté peut l'appeler.
- Conseille à Oriane de changer son mot de passe dès la 1ʳᵉ connexion (le mot de passe a circulé en clair).

Aucun changement de schéma, aucun changement d'UI. Une seule edge function créée + un appel ponctuel.
