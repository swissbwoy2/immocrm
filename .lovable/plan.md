

# Itineraire intelligent pour les coursiers

## Objectif

Ajouter une fonctionnalite d'optimisation de trajet sur la page Carte des coursiers. L'application detecte la position actuelle du coursier, trie ses visites du jour dans l'ordre optimal (sans aller-retour) et affiche l'itineraire complet sur la carte avec un bouton pour le lancer dans Google Maps.

## Comment ca marche pour le coursier

1. Le coursier ouvre la page **Carte** et clique sur **"Optimiser mon trajet"**
2. L'application demande sa position GPS actuelle
3. Les visites du jour (filtre "Mes missions") sont triees automatiquement dans l'ordre le plus court grace a l'API Google Maps Directions avec `optimizeWaypoints: true` (algorithme TSP integre de Google)
4. La carte affiche le trajet trace avec des marqueurs numerotes (1, 2, 3...)
5. La liste laterale se reordonne avec les temps de trajet estimes entre chaque etape
6. Un bouton **"Lancer l'itineraire"** ouvre Google Maps avec tous les waypoints pre-remplis dans le bon ordre

## Modifications

### Fichier modifie : `src/pages/coursier/Carte.tsx`

**Nouveaux etats** :
- `courierPosition` : position GPS du coursier (lat/lng)
- `optimizedRoute` : resultat du Directions API (trajet optimise)
- `isOptimizing` : etat de chargement pendant le calcul
- `routeOrder` : ordre optimal des missions

**Nouveau bouton "Optimiser mon trajet"** (dans la barre de filtres) :
- Icone `Route` de lucide-react
- Desactive si moins de 2 missions ou si Google Maps pas charge
- Au clic : demande la geolocalisation, puis lance le calcul

**Logique d'optimisation** :
- Utilise `navigator.geolocation.getCurrentPosition()` pour obtenir la position du coursier
- Geocode toutes les adresses des missions (deja fait dans le code actuel)
- Appelle `google.maps.DirectionsService.route()` avec :
  - `origin` = position actuelle du coursier
  - `destination` = derniere mission (ou retour au depart)
  - `waypoints` = toutes les autres missions avec `optimizeWaypoints: true`
  - `travelMode` = DRIVING
- Google renvoie `waypointOrder` qui donne l'ordre optimal

**Affichage du trajet sur la carte** :
- Utilise `google.maps.DirectionsRenderer` pour tracer le parcours
- Marqueurs numerotes (1, 2, 3...) au lieu des marqueurs verts/orange
- Chaque etape montre le temps de trajet depuis l'etape precedente

**Liste laterale reordonnee** :
- Quand le trajet est optimise, la liste se reordonne selon `waypointOrder`
- Chaque carte de mission affiche en plus : "Etape X - ~Y min de trajet"
- Badge de temps de trajet entre chaque mission

**Bouton "Lancer l'itineraire"** :
- Genere une URL Google Maps avec waypoints dans l'ordre optimal
- Format : `https://www.google.com/maps/dir/?api=1&origin=lat,lng&destination=addr&waypoints=addr1|addr2|addr3`
- Ouvre dans un nouvel onglet (ou l'app Google Maps sur mobile)

**Bouton "Reinitialiser"** :
- Permet de revenir a la vue normale (marqueurs simples, pas de trajet)

### Detail technique du calcul

```text
1. Position GPS du coursier -> origin
2. Missions du jour acceptees -> waypoints[]
3. Google Directions API (optimizeWaypoints: true)
   -> waypointOrder = [2, 0, 1] (ordre optimal)
   -> legs[] = durees et distances entre chaque etape
4. Reordonnement de la liste + tracage du trajet
```

L'API Google Maps Directions est deja incluse dans le script charge (`libraries=places,geometry`). Il faudra ajouter `routes` a la liste des libraries chargees dans `useGoogleMapsLoader.ts`.

### Fichier modifie : `src/hooks/useGoogleMapsLoader.ts`

- Ajouter `routes` dans la liste des libraries chargees (ligne du script src) pour que le DirectionsService soit disponible

### Resume des fichiers

| Fichier | Action |
|---------|--------|
| `src/pages/coursier/Carte.tsx` | Modifier - Ajout optimisation de trajet, DirectionsService/Renderer, liste reordonnee, bouton lancer |
| `src/hooks/useGoogleMapsLoader.ts` | Modifier - Ajout library `routes` dans le chargement du script |

### Limites

- Google Maps Directions API supporte max 25 waypoints (largement suffisant pour des visites journalieres)
- La geolocalisation necessite que le coursier autorise l'acces GPS dans son navigateur
- Le trajet est calcule en mode voiture (DRIVING) par defaut

