

# Plan : corriger définitivement l’erreur `client-invite` à la création du mot de passe

## Diagnostic

Le problème vient très probablement du flux d’activation `/first-login`.

Les logs backend montrent deux erreurs liées :

```text
403: User from sub claim in JWT does not exist
PUT /user
```

et parfois :

```text
One-time token not found
Email link is invalid or has expired
GET /verify
```

Ce que ça signifie :

1. Le client clique sur le lien d’invitation.
2. Le lien d’invitation crée normalement une session temporaire pour définir le mot de passe.
3. Mais le navigateur contient parfois une ancienne session cassée/stale d’un utilisateur supprimé ou inexistant.
4. Quand le client entre son mot de passe, `supabase.auth.updateUser({ password })` utilise cette mauvaise session.
5. Résultat : erreur `User from sub claim in JWT does not exist`.

Il y a aussi un deuxième souci : `invite-client` redirige encore en dur vers :

```ts
https://immocrm.lovable.app/first-login
```

Alors que l’utilisateur utilise maintenant surtout :

```text
https://logisorama.ch
```

Cela peut créer des sessions incohérentes entre domaines.

## Correctif à appliquer

### 1. Corriger `invite-client`

Fichier :

```text
supabase/functions/invite-client/index.ts
```

Remplacer les redirections hardcodées :

```ts
redirectTo: 'https://immocrm.lovable.app/first-login'
```

par une détection dynamique du domaine appelant, comme déjà fait dans `resend-agent-invitation` :

```ts
const DEFAULT_APP_URL = "https://logisorama.ch";

const getAppBaseUrl = (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {}
  }

  return DEFAULT_APP_URL;
};
```

Puis :

```ts
const redirectTo = `${getAppBaseUrl(req)}/first-login`;
```

Et utiliser ce `redirectTo` pour :

- `inviteUserByEmail`
- `resetPasswordForEmail`

Résultat : si l’invitation est envoyée depuis `logisorama.ch`, le client revient sur `logisorama.ch/first-login`.

---

### 2. Corriger les CORS de `invite-client`

Toujours dans :

```text
supabase/functions/invite-client/index.ts
```

Remplacer les headers CORS trop courts :

```ts
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

par la version complète déjà utilisée dans d’autres fonctions :

```ts
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

---

### 3. Rendre `/first-login` robuste contre les sessions cassées

Fichier :

```text
src/pages/FirstLogin.tsx
```

Modifier l’initialisation actuelle, qui fait seulement :

```ts
await supabase.auth.getSession()
```

pour faire une vraie validation :

1. Lire les erreurs dans l’URL :
   - `error`
   - `error_code`
   - `error_description`

2. Si le lien est expiré ou invalide :
   - supprimer uniquement la session locale
   - afficher un message clair
   - rediriger vers `/login`

3. Si une session existe :
   - appeler `supabase.auth.getUser()`
   - si `getUser()` retourne `User from sub claim in JWT does not exist` :
     - faire `supabase.auth.signOut({ scope: 'local' })`
     - supprimer les clés locales Supabase `sb-*`
     - afficher : “Session expirée, veuillez demander un nouveau lien”
     - rediriger vers `/login`

4. Ajouter un listener `onAuthStateChange` pour gérer correctement :
   - `PASSWORD_RECOVERY`
   - `SIGNED_IN`

Cela évite que `updateUser({ password })` soit appelé avec une session cassée.

---

### 4. Protéger le bouton “Définir mon mot de passe”

Toujours dans :

```text
src/pages/FirstLogin.tsx
```

Avant d’appeler :

```ts
supabase.auth.updateUser({ password })
```

ajouter :

```ts
const { data: { user }, error: userError } = await supabase.auth.getUser();
```

Si pas de user valide :

- nettoyer la session locale
- afficher un message clair
- ne pas appeler `updateUser`

Résultat : plus de `PUT /user` avec un token invalide.

---

### 5. Harmoniser les renvois d’invitation client

Fichiers concernés :

```text
src/pages/Login.tsx
supabase/functions/invite-client/index.ts
```

Le bouton “Renvoyer l’invitation” côté login utilise déjà :

```ts
redirectTo: `${window.location.origin}/first-login`
```

Il faut garder cette logique côté frontend, mais s’assurer que le flux admin/agent qui appelle `invite-client` utilise aussi le bon domaine via la correction de l’Edge Function.

---

## À faire immédiatement pour le client déjà bloqué

Après le correctif :

1. Renvoyer l’invitation client depuis l’admin/agent.
2. Demander au client d’ouvrir le nouveau lien dans le même navigateur.
3. Si le navigateur était déjà pollué par une ancienne session, le nouveau `/first-login` nettoiera automatiquement la session cassée.
4. Le client pourra définir son mot de passe normalement.

Solution temporaire avant correctif : ouvrir le lien en navigation privée ou vider les données du site `logisorama.ch`.

## Validation

Après implémentation :

1. Envoyer une invitation client depuis le CRM.
2. Vérifier que le lien arrive sur :

```text
https://logisorama.ch/first-login
```

3. Définir le mot de passe.
4. Vérifier qu’il n’y a plus de requête `/user` en erreur 403.
5. Vérifier que le client peut se connecter ensuite depuis `/login`.
6. Tester aussi le cas “renvoi invitation” pour un client déjà existant.
7. Vérifier les logs backend : plus de `User from sub claim in JWT does not exist`.

## Fichiers à modifier

```text
supabase/functions/invite-client/index.ts
src/pages/FirstLogin.tsx
```

Optionnel selon audit final :

```text
src/pages/Login.tsx
```

