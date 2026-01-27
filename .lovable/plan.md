
Objectif
- Identifier pourquoi l’autocomplétion Google passe systématiquement en “Mode manuel” en production (tous appareils) et corriger le problème de façon robuste, avec un mécanisme de diagnostic clair si la cause est externe (clé/quotas/adblock/firewall).

Constat (à partir du code et de vos réponses)
- Vous voyez “Toujours en Mode manuel” sur la version publiée, partout (Envoyer une offre + formulaires publics), sur tous appareils.
- Dans le code actuel, “Mode manuel” apparaît uniquement si :
  - `isFallback === true` OU
  - `(!isLoaded && !mapsLoading)` (plus de chargement mais pas de Google chargé).
=> Donc le chargeur Google (`useGoogleMapsLoader`) bascule en fallback (timeout/erreur) ou n’arrive jamais à considérer Google “chargé” en production.
- Le backend “get-google-maps-token” répond bien (clé renvoyée), donc la panne est très probablement au niveau du chargement/exécution du script Google Maps côté navigateur (bloqué, erreur de clé, libraries manquantes, script “stuck”, etc.).
- Actuellement, le loader considère “chargé” sur `script.onload` sans vérifier que `google.maps.places` est réellement disponible, et n’expose pas de cause d’échec (il force `error: null`), ce qui rend le diagnostic difficile.

Hypothèses principales (priorisées)
1) Le script Google Maps est bloqué côté client (adblock/firewall/DNS filtering) ou échoue à s’exécuter correctement en production.
2) La clé Google est restreinte (référents/quotas/APIs) et l’API ne s’initialise pas correctement (cas typique: callback jamais appelé / `gm_authFailure`).
3) Le script est présent dans le DOM mais “cassé” (ancienne tentative), et notre logique “existingScript” attend puis continue sans nettoyer, ce qui peut enfermer en état fallback.
4) Les agents ne sont pas tous sur la dernière version (PWA/cache), donc une partie voit encore l’ancienne logique (timeout plus court, etc.). Même si ça n’explique pas tout, c’est un amplificateur.

Solution proposée (rapide + robuste)
A. Forcer la mise à jour côté production (prérequis)
1) Utiliser le bouton Admin “Forcer la mise à jour pour tous” (page Paramètres admin) après publication, pour que tous les agents chargent bien la dernière version (sinon certains resteront sur une ancienne logique et on ne pourra pas valider le fix).

B. Rendre le chargement Google “déterministe” (callback-based) + auto-réparation
2) Remplacer la logique actuelle de chargement par une logique basée sur `callback=` (et non uniquement `script.onload`), afin de considérer “chargé” uniquement quand l’API est réellement prête.
3) Ajouter une vérification stricte: on ne passe `isLoaded=true` que si `window.google?.maps?.places` est présent (car l’autocomplete dépend de Places).
4) Ajouter une stratégie de retry automatique 1 fois :
   - si échec/timeout/erreur script: supprimer le script Google existant (celui qu’on a injecté), nettoyer les callbacks globaux, reset `globalLoadingPromise`, puis retenter une fois.
   - si le 2e essai échoue: passer en fallback, mais avec une raison explicite.

C. Exposer la cause (diagnostic visible) au lieu de “Mode manuel” opaque
5) Étendre l’état du hook `useGoogleMapsLoader` avec des infos de diagnostic :
   - `stage`: `'idle' | 'token' | 'script' | 'ready' | 'fallback'`
   - `error`: string non-null en cas d’échec (ex: `timeout_script`, `script_error`, `auth_failure`, `places_missing`, `token_error`)
6) Détecter les cas “clé/referrer/billing” via `window.gm_authFailure` (Google déclenche ce callback global quand la clé est refusée). Si déclenché -> `error = 'auth_failure'` + message utilisateur actionnable.
7) Dans `GoogleAddressAutocomplete` et `GooglePlacesAutocomplete`, afficher en fallback un message plus utile :
   - “Google n’a pas pu se charger (raison: …).”
   - Bouton “Réessayer” qui relance proprement le loader (sans `window.location.reload()`), en nettoyant script + callbacks.
   - Option “Copier diagnostic” (texte court) pour que vous puissiez me le coller si ça persiste.

D. Éviter un “faux échec” si l’utilisateur tape avant que Google soit prêt
8) Dans `GoogleAddressAutocomplete`, quand `isLoaded` passe à true et que l’input contient déjà ≥ 3 caractères, relancer automatiquement `fetchPredictions(inputValue)` (sinon il faut retaper, et ça donne l’impression que ça ne marche pas).

Fichiers impactés (code)
1) `src/hooks/useGoogleMapsLoader.ts`
- Refonte du chargeur en “callback-based loader” + retry
- Ajout du diagnostic (`stage`, `error`)
- Ajout d’un helper exporté du module (ex: `resetGoogleMapsLoader()` ou `retryGoogleMapsLoader()`) pour que les composants puissent relancer proprement sans recharger la page.
- Nettoyage robuste :
  - `script.id = 'google-maps-js'` (ou data-attr) pour le retrouver/supprimer
  - `window.gm_authFailure` handler
  - callback unique (ex: `__gmapsInit_<timestamp>`) et suppression après usage
  - timeout dédié au callback (ex: 20-25s) + fallback seulement après retry

2) `src/components/GoogleAddressAutocomplete.tsx`
- Utiliser `error` + `stage` pour afficher un message clair
- Bouton “Réessayer” qui appelle le reset/retry du loader (au lieu de reload)
- Auto-relance des predictions quand Google devient prêt (si texte déjà tapé)
- (Optionnel) bouton “Copier diagnostic”

3) `src/components/GooglePlacesAutocomplete.tsx`
- Même logique UX fallback (raison + retry) car il est utilisé dans plusieurs écrans et peut être concerné aussi.

4) (Procédure) `src/pages/admin/Parametres.tsx` (pas forcément à modifier)
- Utilisation du bouton existant “Forcer la mise à jour pour tous” après publication pour assurer que le fix arrive bien chez les agents.

Tests / Validation
1) En environnement de test (preview)
- Ouvrir une page utilisant `GoogleAddressAutocomplete` (ex: EnvoyerOffre, formulaire vendeur).
- Vérifier :
  - Les suggestions apparaissent.
  - Sélection d’une adresse remplit NPA/ville/canton correctement.
  - Pas de passage en “Mode manuel” si Google charge correctement.
  - Si on simule un blocage (désactiver réseau), on obtient fallback + message d’erreur explicite + “Réessayer”.

2) En production
- Publier.
- Aller dans Admin → Paramètres → cliquer “Forcer la mise à jour pour tous”.
- Demander à 1–2 agents de tester (desktop + mobile). En cas d’échec, récupérer le “diagnostic” affiché et on saura immédiatement si c’est :
  - auth_failure (clé/referrer/billing/API),
  - script_error (bloqué),
  - timeout (réseau lent),
  - places_missing (libraries/API).

Risques / Cas où le code ne peut pas “magiquement” corriger
- Si le script Google est bloqué par un filtre réseau/adblock d’entreprise sur tous les appareils, aucune modification front ne pourra charger Google. Par contre, avec le nouveau diagnostic, on pourra le prouver rapidement et décider (whitelist, désactiver adblock, ou fallback amélioré).
- Si la clé Google est restreinte (référents) et n’autorise pas le domaine publié, le diagnostic remontera `auth_failure` et il faudra ajuster les restrictions côté Google.

Livrable attendu
- Autocomplete Google fonctionne à nouveau en production pour EnvoyerOffre + formulaires.
- Si Google ne peut pas se charger, l’app ne “cache” plus le problème : elle affiche une raison + un bouton de retry, ce qui permet un dépannage immédiat au lieu d’un “Mode manuel” inexpliqué.
