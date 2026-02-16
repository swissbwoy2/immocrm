

# Carte des visites pour Agents et Clients

## Objectif
Ajouter une page "Carte" avec optimisation de trajet intelligent pour les agents et les clients, identique a celle des coursiers.

## Approche technique

Plutot que de dupliquer le code de `src/pages/coursier/Carte.tsx` trois fois, on va extraire la logique commune dans un composant reutilisable, puis creer des pages legeres pour chaque role.

## Modifications

### 1. Nouveau composant : `src/components/maps/VisitesMapView.tsx`

Composant reutilisable qui contient toute la logique de la carte des coursiers :
- Carte Google Maps avec marqueurs
- Bouton "Optimiser mon trajet" avec geolocalisation
- DirectionsRenderer pour le trace de l'itineraire
- Liste laterale reordonnee avec temps de trajet
- Bouton "Lancer l'itineraire" vers Google Maps

**Props** :
- `missions` : tableau de visites (avec `adresse`, `date_visite`, `date_visite_fin`, `statut_coursier` ou `statut`)
- `loading` : boolean
- `title` : titre de la page (ex: "Carte des visites")
- `subtitle` : sous-titre
- `statusField` : champ a utiliser pour le statut (pour adapter les badges)
- `statusConfig` : mapping statut -> couleur/label pour les badges

### 2. Nouvelle page : `src/pages/agent/Carte.tsx`

- Charge les visites de l'agent via `agents.id` -> `visites.agent_id`
- Filtre les visites a venir (futures)
- Filtres : Toutes / Aujourd'hui / Cette semaine
- Passe les donnees au composant `VisitesMapView`

### 3. Nouvelle page : `src/pages/client/Carte.tsx`

- Charge les visites du client via `clients.id` -> `visites.client_id`
- Filtre les visites a venir
- Filtres : Toutes / Aujourd'hui / Cette semaine
- Passe les donnees au composant `VisitesMapView`

### 4. Refactoring : `src/pages/coursier/Carte.tsx`

- Simplifie pour utiliser le nouveau composant `VisitesMapView` au lieu de dupliquer la logique

### 5. Routes : `src/App.tsx`

Ajouter deux nouvelles routes :
- `/agent/carte` -> `AgentCarte` (roles: agent, admin)
- `/client/carte` -> `ClientCarte` (role: client)

### 6. Navigation : `src/components/AppSidebar.tsx`

Ajouter l'entree "Carte" dans les menus :
- **Agent** : entre "Visites" et "Candidatures", icone `MapPin`
- **Client** : entre "Mes visites" et "Calendrier", icone `MapPin`

## Requetes de donnees

**Agent** :
```text
1. agents.id WHERE user_id = current_user
2. visites WHERE agent_id = agent.id AND date_visite >= now()
   -> recupere adresse, date_visite, date_visite_fin, statut
```

**Client** :
```text
1. clients.id WHERE user_id = current_user
2. visites WHERE client_id = client.id AND date_visite >= now()
   -> recupere adresse, date_visite, date_visite_fin, statut
```

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/maps/VisitesMapView.tsx` | Creer - Composant reutilisable carte + optimisation |
| `src/pages/agent/Carte.tsx` | Creer - Page carte agent |
| `src/pages/client/Carte.tsx` | Creer - Page carte client |
| `src/pages/coursier/Carte.tsx` | Modifier - Refactoring pour utiliser VisitesMapView |
| `src/App.tsx` | Modifier - Ajout routes /agent/carte et /client/carte |
| `src/components/AppSidebar.tsx` | Modifier - Ajout entrees menu Carte pour agent et client |

## Resultat pour l'utilisateur

- L'agent voit toutes ses visites planifiees sur une carte et peut optimiser son trajet
- Le client voit ses prochaines visites sur une carte et peut planifier son deplacement
- Le bouton "Optimiser mon trajet" fonctionne de la meme maniere : GPS -> calcul optimal -> trace sur la carte -> lancement dans Google Maps

