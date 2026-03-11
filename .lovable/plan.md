

## Correction — Permettre la saisie manuelle de la région dans les formulaires client

### Problème
Les formulaires de mandat client (inscription/critères de recherche) utilisent soit un `Select` fermé avec une liste fixe de régions, soit le `GooglePlacesAutocomplete` qui dépend de l'API Google (actuellement en pause). Les clients ne peuvent pas taper manuellement une région comme "Vaud".

### Fichiers à modifier

1. **`src/components/mandat-v3/MandatV3Step2Search.tsx`** (formulaire mandat V3)
   - Remplacer le `Select` pour "Zone / Région" par un `Input` texte libre avec une `datalist` HTML contenant les suggestions REGIONS
   - Le client peut taper librement ou choisir dans la liste

2. **`src/components/mandat/MandatFormStep4.tsx`** (formulaire mandat classique)
   - Le `GooglePlacesAutocomplete` est déjà modifié avec un bouton "Ajouter" mais dépend toujours de Google
   - Ajouter un fallback : si Google n'est pas disponible, afficher un `Input` avec `datalist` des régions prédéfinies pour que le client puisse taper librement

### Approche technique
Utiliser un simple `<Input>` + `<datalist>` natif HTML : le client voit les suggestions mais peut taper n'importe quoi (ex: "Vaud", "Canton de Vaud", etc.). Pas de dépendance API.

