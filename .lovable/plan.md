## Problème

Quand un client clique sur "Accepter l'invitation" dans son email, il devrait arriver sur la page **/first-login** pour créer son mot de passe. Au lieu de ça, il est redirigé directement vers **/login**, ce qui le bloque (il n'a pas encore de mot de passe).

## Cause identifiée

La page `src/pages/FirstLogin.tsx` utilise une logique fragile pour détecter la session :

```ts
await new Promise(r => setTimeout(r, 1000));   // attente fixe de 1s
const { data: { session } } = await supabase.auth.getSession();
if (!session) navigate('/login');               // redirige si pas de session
```

Problèmes :
1. **Course de timing** : Le lien Supabase pose le token soit dans le hash (`#access_token=...&type=invite`) soit en query (`?code=...`). Le parsing du hash par supabase-js est asynchrone et peut prendre plus d'1 seconde, surtout sur mobile / réseau lent. Si la session n'est pas encore créée au check, on bascule sur /login.
2. **Token déjà consommé** : Si le user revient sur le lien (rechargement, second clic), le token est consommé une seule fois — l'utilisateur arrive sans session et est jeté vers /login sans message clair.
3. **Pas de listener** : `FirstLogin` ne s'abonne pas à `onAuthStateChange`, donc même si la session arrive 1.2s plus tard, on a déjà redirigé.

## Solution

### 1. Rendre `FirstLogin.tsx` robuste

Remplacer la logique de check par un vrai listener `onAuthStateChange` + parsing manuel du hash/code en fallback :

- S'abonner à `onAuthStateChange` immédiatement à l'arrivée sur la page
- Si l'événement `SIGNED_IN` arrive (avec ou sans `type=invite/recovery`), afficher le formulaire de création de mot de passe
- Lire l'URL : si présence de `?code=` (PKCE), appeler `supabase.auth.exchangeCodeForSession(code)` explicitement
- Donner jusqu'à 5 secondes pour qu'une session apparaisse avant de rediriger
- Si vraiment pas de session après timeout : afficher un message clair "Lien expiré ou déjà utilisé" + bouton "Renvoyer un lien" (au lieu de jeter sur /login en silence)

### 2. Vérifier la configuration Supabase Auth (Site URL & Redirect URLs)

Pour que Supabase accepte de rediriger vers `/first-login`, l'URL doit être dans la **liste des Redirect URLs autorisées**. Si elle ne l'est pas, Supabase ignore `redirectTo` et renvoie sur la **Site URL** (probablement `https://logisorama.ch/`), ce qui peut donner l'impression d'atterrir sur /login.

Vérifier dans **Cloud → Auth Settings** :
- Site URL = `https://logisorama.ch`
- Redirect URLs autorisées contiennent : 
  - `https://logisorama.ch/first-login`
  - `https://immocrm.lovable.app/first-login`
  - `https://*.lovable.app/first-login`

### 3. Bonus : empêcher l'auto-redirect de `/login` si on vient juste d'arriver via un token

Dans `src/pages/Login.tsx`, l'effet auto-redirect actuel envoie tout user connecté sur `/${userRole}` sans état d'attente. Ce n'est pas la cause directe du bug d'invitation, mais on garde le comportement intact.

## Fichiers modifiés

- `src/pages/FirstLogin.tsx` — listener auth + exchangeCodeForSession + UX d'erreur claire
- (Optionnel, à confirmer par toi) Réglages Auth dans Cloud → Settings si besoin

## Détails techniques

```ts
// FirstLogin.tsx (esquisse)
useEffect(() => {
  let resolved = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) { resolved = true; setReady(true); }
  });

  (async () => {
    // PKCE flow: ?code=...
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code).catch(() => {});
    }
    // Implicit flow (#access_token=...) is auto-handled by supabase-js

    // Fallback: si session déjà là
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { resolved = true; setReady(true); return; }

    // Attendre jusqu'à 5s un SIGNED_IN
    setTimeout(() => {
      if (!resolved) setLinkExpired(true); // affiche écran "lien expiré"
    }, 5000);
  })();

  return () => subscription.unsubscribe();
}, []);
```

Si `linkExpired` : afficher une carte "Lien d'invitation expiré ou déjà utilisé" avec un bouton "Demander un nouveau lien" qui appelle `resetPasswordForEmail` ou la fonction `invite-client` côté serveur.
