
## Constat immédiat

Oui, tu as raison : la sidebar affichée à Cendrine est encore celle du parcours recherche d’appartement.

### Ce que j’ai confirmé dans le code
- `src/components/AppSidebar.tsx` a un menu `case 'client'` 100% statique avec :
  - Offres reçues
  - Annonces
  - Mes visites
  - Carte
  - Calendrier
  - Mes candidatures
- Ce menu ne lit pas `profile.parcours_type`.
- Donc même si `/client` affiche un header “Projet de rénovation”, la navigation latérale reste celle du parcours logement.

## Deuxième problème confirmé

Le dashboard rénovation client actuel n’est pas relié au module de référence complet.

### Ce que j’ai trouvé
- `src/pages/client/Dashboard.tsx` route bien `parcours_type='renovation'` vers `RenovationClientDashboard`.
- Mais `src/pages/client/dashboards/RenovationClientDashboard.tsx` est une version simplifiée :
  - liste de projets
  - empty state
  - 3 cartes raccourcis
- Le module de référence complet existe toujours :
  - `src/features/renovation/pages/RenovationProjectsPage.tsx`
  - `src/features/renovation/pages/RenovationProjectPage.tsx`
  - tous les composants Documents / Devis / Budget / Planning / Entreprises / Incidents / Réserves / Garanties / Historique / Rapport final sont présents
- Mais il n’existe actuellement **aucune route client** du type `/client/renovation` ou `/client/renovation/:id`.

## Cause racine probable pour Cendrine

Il y a 2 causes distinctes :

1. **Sidebar non adaptée**
- purement un problème UI
- la sidebar client n’est pas filtrée par `parcours_type`

2. **Projet non visible**
- ce n’est probablement pas un bug visuel seulement
- la sécurité du module rénovation n’autorise pas automatiquement un “client” à voir un projet
- dans les policies, un utilisateur voit un projet rénovation seulement s’il est :
  - admin/agent
  - créateur du projet
  - membre du projet via `renovation_project_members.user_id = auth.uid()`
  - propriétaire du bien concerné
- donc pour Cendrine, si son projet ne s’affiche pas, il faut très probablement :
  - vérifier qu’elle est bien liée au projet comme membre
  - sinon réparer cette liaison de données

## Plan de correction

### 1. Corriger la sidebar client par parcours
Modifier `src/components/AppSidebar.tsx` pour que le menu client dépende de `profile.parcours_type` :
- `renovation` :
  - Dashboard
  - Mon projet rénovation
  - Messagerie
  - Mes documents
  - Notifications
  - Paramètres
- supprimer pour rénovation :
  - Offres reçues
  - Annonces
  - Mes visites
  - Carte
  - Calendrier
  - Mes candidatures

### 2. Restaurer un vrai accès client au module Rénovation
Au lieu d’une simple carte vide, brancher le client sur le module réel :
- ajouter routes client :
  - `/client/renovation`
  - `/client/renovation/:id`
- réutiliser la page détail existante du module de référence comme base
- l’adapter en **mode lecture seule client**
- afficher les sections demandées :
  - Documents
  - Devis
  - Budget
  - Planning
  - Entreprises
  - Incidents
  - Réserves
  - Garanties
  - Historique
  - Détails
  - Rapport final
- masquer côté client les actions de gestion :
  - création
  - édition budget
  - ajout entreprise
  - signalement si non souhaité
  - clôture
  - génération admin-only

### 3. Transformer le dashboard rénovation client en vraie porte d’entrée
Refondre `RenovationClientDashboard.tsx` pour qu’il :
- charge le projet visible du client
- affiche un résumé premium du projet
- redirige vers `/client/renovation/:id`
- n’affiche plus seulement un empty state générique si le projet existe

### 4. Vérifier et réparer la liaison de données de Cendrine
Audit backend à faire au moment de l’implémentation :
- confirmer que `cendrinecardoso@gmail.com` a bien `parcours_type='renovation'`
- retrouver son `auth user id`
- vérifier s’il existe un projet dans `renovation_projects` correspondant à son dossier
- vérifier s’il existe une ligne dans `renovation_project_members` avec son `user_id`
- si la ligne manque :
  - réparer la donnée
  - ou ajouter un correctif/migration ciblé si le flux de création oublie cette liaison

### 5. Sécuriser l’accès client sans casser le module validé
Ne pas réinventer le module.
Je garderai le module de référence intact et j’ajouterai seulement :
- un accès client lecture seule
- la navigation client adaptée
- la liaison correcte entre client et projet

## Fichiers concernés

- `src/components/AppSidebar.tsx`
- `src/App.tsx`
- `src/pages/client/dashboards/RenovationClientDashboard.tsx`
- probablement une nouvelle page client wrapper pour le détail rénovation
- éventuellement migration / réparation de données si la liaison Cendrine ↔ projet est absente

## Détail technique important

Le vrai point bloquant n’est pas seulement la sidebar.
Même avec une sidebar “Rénovation”, Cendrine ne verra rien tant que son accès au projet n’est pas réellement relié au module via les règles de visibilité existantes.

En clair :
```text
Aujourd’hui
client renovation
  -> /client
  -> mini dashboard simplifié
  -> sidebar logement
  -> aucun accès au détail du vrai module

Après correction
client renovation
  -> /client
  -> dashboard renovation premium
  -> sidebar renovation
  -> /client/renovation/:id
  -> module de référence en lecture seule
  -> projet visible car liaison membre corrigée
```

## Résultat attendu

Après implémentation :
- Cendrine n’aura plus la sidebar “recherche d’appartement”
- elle arrivera sur un dashboard rénovation cohérent
- elle pourra ouvrir son vrai projet rénovation
- elle verra le module complet en lecture seule
- le module admin/agent/propriétaire déjà validé restera intact
