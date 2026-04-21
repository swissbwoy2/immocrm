

# Plan : corriger le crash qui persiste uniquement sur le site publié

## Diagnostic confirmé

Le problème actuel publié n’est plus le même que l’erreur notifications.

Les derniers logs montrent :

```text
Error creating WebGL context.
Page URL: https://logisorama.ch/
```

Et le HTML publié de `https://logisorama.ch` affiche directement l’ErrorBoundary avec cette erreur.

Conclusion : le site publié plante sur la page d’accueil publique `/`, avant ou pendant la redirection automatique vers `/admin`, `/agent` ou `/client`.

C’est pour ça que :
- en preview, ça fonctionne ;
- en publié, certains utilisateurs restent bloqués ;
- le problème touche plusieurs rôles ;
- l’erreur vient du rendu 3D/WebGL de la homepage, pas du dashboard lui-même.

Les composants concernés sont :

```text
src/pages/public-site/HomePage.tsx
src/components/public-site/3d/TravelingGoldKey3D.tsx
src/components/public-site/3d/Scene3DWrapper.tsx
src/components/public-site/3d/SwissGlobe3D.tsx
src/components/public-site/3d/GoldKey3D.tsx
```

La page d’accueil charge actuellement plusieurs scènes `@react-three/fiber` / Three.js. Sur certains navigateurs ou environnements publiés, WebGL ne peut pas être créé, ce qui déclenche :

```text
THREE.WebGLRenderer: Error creating WebGL context
```

## Correctif prioritaire

### 1. Désactiver WebGL/3D critique sur la homepage publiée

Fichier :

```text
src/pages/public-site/HomePage.tsx
```

Retirer ou désactiver temporairement :

```tsx
<TravelingGoldKey3D />
```

Objectif : empêcher la homepage `/` de planter avant la redirection des utilisateurs connectés.

Remplacer par une animation CSS/HTML légère si nécessaire, sans WebGL.

### 2. Sécuriser tous les wrappers 3D

Fichier :

```text
src/components/public-site/3d/Scene3DWrapper.tsx
```

Ajouter une détection WebGL avant de rendre `<Canvas>` :

- créer une fonction `canUseWebGL()`;
- tenter `canvas.getContext('webgl') || canvas.getContext('experimental-webgl')`;
- si WebGL indisponible, afficher le `fallback`;
- ne jamais rendre `<Canvas>` si le contexte WebGL ne peut pas être créé.

### 3. Ajouter un ErrorBoundary local autour des scènes 3D

Créer un composant léger :

```text
src/components/public-site/3d/WebGLErrorBoundary.tsx
```

Il doit :
- attraper les erreurs WebGL ;
- afficher un fallback statique ;
- éviter que l’ErrorBoundary global fasse tomber toute l’application.

Puis l’utiliser autour des scènes 3D restantes :

```text
CoverageSection.tsx
CloserSection.tsx
```

### 4. Corriger la stratégie PWA publiée

Le fichier actuel contient encore :

```ts
skipWaiting: true
clientsClaim: true
```

dans :

```text
vite.config.ts
```

C’est contraire à la règle projet mémorisée : éviter `SKIP_WAITING` pour ne pas casser les sessions et servir des bundles incohérents.

À modifier :

- supprimer `skipWaiting: true`;
- supprimer `clientsClaim: true`;
- conserver `cleanupOutdatedCaches`;
- garder le check de mise à jour dans `src/main.tsx`;
- étendre la détection preview pour inclure aussi `lovableproject.com`, pas seulement `id-preview--`.

### 5. Stabiliser définitivement les notifications

Même si les nouveaux logs ne montrent plus d’erreur notifications après 17:07, il faut compléter le hotfix :

Fichier :

```text
src/hooks/useNotifications.ts
```

Option la plus sûre pour restaurer l’accès :
- désactiver temporairement le realtime notifications ;
- garder uniquement le chargement classique `.select()` ;
- garder `markAsRead`, `markAllAsRead`, `markTypeAsRead`, `deleteNotification`.

Cela garantit que les dashboards ne peuvent plus tomber à cause de Realtime.

Ensuite, dans une deuxième étape, le realtime pourra être réactivé proprement avec une seule source centralisée.

### 6. Éviter le passage par `/` après connexion

Fichiers :

```text
src/pages/Login.tsx
src/contexts/AuthContext.tsx
src/components/ProtectedRoute.tsx
```

Vérifier que les utilisateurs connectés vont directement vers :

```text
/admin
/agent
/client
/proprietaire
/apporteur
/coursier
/closeur
```

et ne repassent pas inutilement par `/`, car `/` contient la homepage publique.

## Validation

Après implémentation :

1. `https://logisorama.ch/` ne doit plus afficher `Error creating WebGL context`.
2. `https://logisorama.ch/login` reste accessible.
3. Connexion admin redirige vers `/admin`.
4. Connexion agent redirige vers `/agent`.
5. Connexion client redirige vers `/client`.
6. Plus aucun nouveau log :

```text
Error creating WebGL context
```

7. Plus aucun nouveau log :

```text
cannot add postgres_changes callbacks after subscribe()
```

8. Le site publié doit être mis à jour via le bouton Publish/Update, car les changements frontend ne vont pas automatiquement en production.

## Fichiers à modifier

```text
src/pages/public-site/HomePage.tsx
src/components/public-site/3d/Scene3DWrapper.tsx
src/components/public-site/3d/WebGLErrorBoundary.tsx
src/components/public-site/sections/CoverageSection.tsx
src/components/public-site/sections/CloserSection.tsx
src/hooks/useNotifications.ts
src/main.tsx
vite.config.ts
```

## Résultat attendu

Le site publié ne dépendra plus de WebGL pour charger l’application. Même si WebGL est bloqué ou indisponible chez un utilisateur, la homepage restera visible, la redirection auth fonctionnera, et les dashboards admin/agent/client seront accessibles.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>
<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>

