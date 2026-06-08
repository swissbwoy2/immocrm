## Diagnostic

Le site recharge ou « change d'URL tout seul » sur plusieurs pages à cause de **trois mécanismes globaux** qui se déclenchent en arrière-plan, indépendamment du clic utilisateur :

### 1. `useAppVersionCheck` (cause principale — `src/hooks/useAppVersionCheck.ts`)
Monté dans `AppContent` → tourne sur **toutes les pages**. Il fait :
- Toutes les **2 minutes**, lit `app_config.app_version` dans la base.
- Écoute aussi un canal realtime `app-updates` (broadcast `force-refresh`).
- Compare avec `localStorage` et **`VITE_APP_BUILD_ID`**.
- Si différent → `caches.delete(...)`, `serviceWorker.unregister(...)`, puis **`window.location.reload()`**.

Problèmes concrets :
- En dev/preview, `VITE_APP_BUILD_ID` vaut `'dev'` ou change à chaque build → recharge en boucle.
- Le garde `hasRefreshed` se ré-initialise après chaque reload → pas de protection cross-reload.
- Aucun throttle de sécurité (contrairement à `handleStaleChunk` qui a 30 s).
- Toute mise à jour de `app_config.app_version` (même mineure) force le reload de **tous les utilisateurs connectés** en pleine saisie.

Symptôme côté utilisateur : la page « saute », l'URL repart à la racine si on était dans un état non-URL, ou un formulaire à moitié rempli disparaît.

### 2. `HomePage` — redirection auth (`src/pages/public-site/HomePage.tsx` l.37-54)
Si tu es connecté et que tu visites `/` (par ex. via le logo header), le `useEffect` redirige immédiatement vers `/admin`, `/agent`, `/client` ou `/apporteur`. C'est volontaire mais le `useEffect` se redéclenche à chaque refresh de token (toutes les heures), à chaque changement d'objet `user` ou `userRole` retourné par Supabase. Tant qu'on est sur `/`, ça « repart » sans cesse.

### 3. `handleStaleChunk` (`src/main.tsx` l.60-74)
Sur erreur de chargement de chunk lazy (ils sont nombreux sur HomePage : `DossierAnalyseForm`, `PricingSection`, etc.), il déclenche aussi `window.location.reload()`. Throttle 30 s, donc moins probable, mais s'ajoute au bruit si le réseau est instable.

### Ce qui n'est PAS la cause
- Les `scrollIntoView` du Hero (action utilisateur uniquement).
- Les animations framer-motion vues dans le replay (visuel, pas de navigation).
- Les `<Navigate>` de `ProtectedRoute` (uniquement sur routes privées + déclenchent une fois).

---

## Plan de correction

### A. Durcir `useAppVersionCheck` (cible n°1)
Fichier : `src/hooks/useAppVersionCheck.ts`
1. **Bypass complet en dev** : si `BUILD_VERSION === 'dev'` ou `import.meta.env.DEV`, ne rien faire (`return` au début du `useEffect`).
2. **Throttle global cross-reload** via `sessionStorage` (clé `__app_version_reload_at`) : refuser tout reload si < 5 min depuis le dernier.
3. **Confirmation utilisateur au lieu d'un reload brutal** : remplacer le `window.location.reload()` automatique par un toast Sonner non-bloquant « Nouvelle version disponible — recharger » avec un bouton. Le polling continue, mais l'utilisateur garde la main (recommandation déjà alignée avec la règle PWA mémorisée « Avoid SKIP_WAITING to prevent background session loss »).
4. **Ne pas reload pendant saisie** : si `document.activeElement` est un `INPUT/TEXTAREA/SELECT/[contenteditable]`, différer (reprogrammer dans 60 s).
5. Garder le broadcast realtime mais le passer aussi par le toast (pas de reload silencieux).

### B. Stabiliser la redirection HomePage
Fichier : `src/pages/public-site/HomePage.tsx`
- Ajouter un `useRef` `hasRedirected` pour ne déclencher `navigate(...)` qu'une seule fois par montage, même si l'objet `user` change (token refresh).
- Garder `replace: true`.

### C. Renforcer `handleStaleChunk`
Fichier : `src/main.tsx`
- Passer le throttle de 30 s → 5 min via `sessionStorage`.
- Logguer en `console.warn` l'URL avant reload pour faciliter le diagnostic.

### D. Vérification
1. Ouvrir `/` connecté → redirection unique vers le dashboard, plus de re-déclenchement après refresh de token.
2. Rester 5 min sur n'importe quelle page → aucun reload involontaire (toast si nouvelle version).
3. Mettre à jour `app_config.app_version` manuellement → un toast apparaît, pas de reload imposé.
4. Vérifier que la console n'affiche plus de boucle « New build detected ».

## Hors périmètre
- Aucun changement de design ou de UI sections.
- Pas de modification du système d'auth / RLS / Supabase.
- Le composant `ProtectedRoute` n'est pas touché (comportement correct).
- La logique de scroll des CTA Hero/CTA mobile n'est pas modifiée.

Confirme et je passe en build pour appliquer A → B → C.
