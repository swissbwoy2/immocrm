
# Plan urgent : rétablir l’accès aux tableaux de bord pour tous les rôles

## Diagnostic confirmé

Le blocage n’est pas lié à un client précis ni au formulaire `/nouveau-mandat`.

Les logs frontend enregistrés montrent l’erreur globale suivante :

```text
cannot add `postgres_changes` callbacks for realtime:notifications-realtime after `subscribe()`
```

Cette erreur vient du système de notifications temps réel. Comme `AppSidebar` utilise `useNotifications()` dans le layout commun, le crash se produit avant même que le dashboard admin, agent ou client puisse s’afficher.

Résultat : tous les rôles qui passent par le layout connecté peuvent tomber sur la page rouge “Une erreur est survenue”.

Point important : le code local contient déjà une correction partielle avec un nom de canal unique, mais les logs production montrent encore l’ancien canal :

```text
notifications-realtime
```

Donc soit :
1. le correctif précédent n’a pas été publié correctement sur `logisorama.ch`,
2. soit un ancien bundle est encore servi par le cache/PWA,
3. soit il existe encore une autre instance du hook en production qui utilise l’ancien canal.

## Objectif

Rétablir immédiatement l’accès aux dashboards, même si les notifications temps réel sont temporairement dégradées.

La priorité est :

1. dashboard accessible pour admin, agent, client ;
2. zéro crash global causé par les notifications ;
3. notifications consultables en lecture classique ;
4. temps réel réactivable proprement ensuite.

## Correctif à appliquer

### 1. Hotfix immédiat dans `useNotifications`

Fichier :

```text
src/hooks/useNotifications.ts
```

Modifier le hook pour que le système de notifications ne puisse plus jamais faire planter l’application.

Actions :

- Supprimer toute dépendance à un canal statique type `notifications-realtime`.
- Garder le chargement initial des notifications via query classique.
- Encapsuler strictement toute la partie temps réel dans un `try/catch`.
- Ajouter une option de sécurité : si la souscription temps réel échoue, ne rien throw et continuer sans realtime.
- Stabiliser la dépendance `toast` pour éviter des remounts inutiles.
- S’assurer que le cleanup retire bien le canal avant tout nouveau subscribe.

Version prioritaire si urgence maximale : désactiver temporairement la souscription temps réel et garder uniquement le refresh manuel/query initiale. Les dashboards seront accessibles immédiatement.

### 2. Protéger `AppSidebar`

Fichier :

```text
src/components/AppSidebar.tsx
```

Ajouter une protection locale autour de l’usage des notifications :

- Si `useNotifications` retourne une erreur ou des compteurs indisponibles, afficher simplement `0`.
- Ne jamais laisser une erreur notification faire tomber la sidebar.
- Garder le menu et la navigation fonctionnels même sans notifications.

### 3. Protéger `NotificationBell`

Fichier :

```text
src/components/NotificationBell.tsx
```

Ajouter un comportement dégradé :

- si les notifications échouent, afficher la cloche sans badge ;
- ne pas bloquer l’interface ;
- afficher éventuellement “Notifications temporairement indisponibles” uniquement dans le popover.

### 4. Nettoyer le risque PWA/cache

Fichier :

```text
src/main.tsx
```

Comme le domaine `logisorama.ch` semble encore servir un ancien bundle, ajouter une stratégie de récupération plus claire :

- garder l’absence de `SKIP_WAITING` conformément à la règle projet ;
- mais s’assurer que l’app vérifie les mises à jour régulièrement ;
- ajouter un message console clair quand une nouvelle version est disponible ;
- si nécessaire, prévoir une instruction utilisateur temporaire : fermer/réouvrir l’app ou vider le cache si l’ancien bundle persiste.

### 5. Vérifier que la version publiée ne contient plus `notifications-realtime`

Après correction :

- rechercher dans tout le code source `notifications-realtime` ;
- vérifier que le build généré ne contient plus ce nom ;
- publier le correctif ;
- recharger `logisorama.ch` ;
- confirmer que les nouveaux logs ne contiennent plus :

```text
cannot add `postgres_changes` callbacks
```

## Validation

1. Admin peut accéder à `/admin`.
2. Agent peut accéder à `/agent`.
3. Client peut accéder à `/client`.
4. La sidebar s’affiche.
5. La cloche de notifications ne bloque plus l’app.
6. Les notifications existantes restent visibles via chargement classique.
7. Aucun nouveau log `notifications-realtime after subscribe()` dans `error_logs`.
8. Si le temps réel est désactivé temporairement, le refresh manuel ou changement de page récupère quand même les notifications.

## Fichiers concernés

```text
src/hooks/useNotifications.ts          (hotfix principal)
src/components/AppSidebar.tsx          (protection layout)
src/components/NotificationBell.tsx    (mode dégradé)
src/main.tsx                           (vérification cache/PWA si nécessaire)
```

## Priorité d’implémentation

1. Restaurer l’accès dashboard en neutralisant le crash notifications.
2. Publier immédiatement.
3. Vérifier les logs `error_logs`.
4. Réactiver le realtime proprement seulement après stabilisation.

