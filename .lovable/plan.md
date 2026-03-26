

## Ne pas charger la barre tant que le client n'est pas activé

### Problème
Actuellement, la barre de progression utilise `date_ajout || created_at` pour tous les clients, même ceux qui n'ont pas encore été activés par l'admin. Résultat : des clients en attente d'activation voient leur compteur J+ tourner depuis leur création dans le système.

### Logique métier
- `invite-client` (activation admin) définit `date_ajout = now()` et `statut = 'actif'`
- Tant que le client n'a pas `statut = 'actif'` (ou un statut post-activation comme `reloge`, `stoppe`, `suspendu`), la barre ne doit pas progresser

### Modifications

#### 1. `src/pages/admin/Clients.tsx`
- Avant de calculer `daysElapsed`, vérifier si le client a un statut activé (`actif`, `reloge`, `stoppe`, `suspendu`)
- Si le statut est `en_attente` ou null/undefined (pas encore activé) :
  - Afficher la barre à 0% avec un badge "⏳ En attente d'activation"
  - Ne pas afficher de compteur J+
- Sinon : comportement actuel (calcul depuis `date_ajout`)

#### 2. `src/pages/admin/ClientDetail.tsx`
- Même logique : si client non activé, afficher "En attente d'activation" au lieu de la barre de progression
- Masquer les boutons Suspendre/Stopper pour les clients non activés (pas pertinent)

#### 3. `src/pages/admin/Mandats.tsx`
- Même vérification : exclure les clients non activés des compteurs "Nouveaux", "Critiques", "Expirés"

#### 4. `src/pages/admin/Dashboard.tsx`
- Ne compter que les clients avec `statut` activé dans les KPIs (clients actifs, critiques, expirés)

### Aucune migration nécessaire
Le champ `statut` existe déjà. Il suffit de conditionner l'affichage de la barre au statut du client.

