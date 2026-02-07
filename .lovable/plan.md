
# Rapport d'estimation style Popety.io -- Refonte complete

## Vue d'ensemble

Le rapport actuel est un PDF basique de 6 pages. Le template Popety.io fourni comporte **23 pages** avec des sections tres detaillees. Ce plan couvre :
1. L'ajout des champs manquants en base de donnees
2. Un formulaire de saisie complet pour remplir toutes les donnees
3. Un systeme d'upload d'images par section du rapport (cartes, photos aeriennes, maps de bruit, etc.)
4. La reecriture complete de la fonction de generation PDF

---

## Sections du rapport et champs necessaires

### Page 1 -- Couverture
- Titre "RAPPORT D'ESTIMATION"
- Infos agent (nom, adresse, telephone, email) -- **deja disponible via `profiles`**
- Date de creation
- Type de bien + Adresse -- **deja dans `immeubles`**
- **Image** : photo aerienne/couverture (uploadee par l'utilisateur)

### Page 2 -- Carte de localisation
- **Image** : carte du quartier (uploadee par l'utilisateur)

### Page 3 -- Resume
- Estimation du prix (valeur, fourchette basse/haute, prix/m2) -- **deja dans `immeubles`**
- Details du bien (type, pieces, surface, SDB, balcon, volume, parking, terrasse, annees construction/renovation) -- **deja dans `immeubles`**
- Etat du bien -- **deja dans `immeubles.etat_bien`**

### Pages 4-6 -- Marche
**Champs a ajouter :**
- `prix_median_secteur` (numeric) -- prix median du secteur
- `evolution_prix_median_1an` (numeric) -- evolution % sur 1 an
- `nb_biens_comparables` (integer) -- nombre de biens dans l'echantillon
- `nb_nouvelles_annonces` (integer) -- nouvelles annonces recentes
- `donnees_distribution_prix` (jsonb) -- tranches de prix pour graphique
- **Images** : carte de chaleur des prix (uploadee), graphique distribution (uploadee)
- Note : les statistiques existantes (`prix_m2_secteur`, `evolution_prix_secteur`) sont deja dans la table

### Pages 7-8 -- Batiment
- EGID, EGAID, classification -- **deja dans `immeubles`**
- Emprise au sol, nb etages, nb logements -- **deja dans `immeubles`**
- Surface logement, categorie OFS
**Champs a ajouter :**
- `categorie_ofs` (text) -- categorie OFS du batiment
- `classification_ofs` (text) -- classification OFS
- `numero_officiel_batiment` (text) -- numero officiel
- `logements_details` (jsonb) -- liste des logements par etage avec surface, pieces, type
- **Image** : carte du batiment (uploadee)

### Pages 9-10 -- Parcelle
- Numero parcelle, zone affectation, restrictions -- **deja dans `immeubles`**
**Champs a ajouter :**
- `surface_parcelle` (numeric) -- surface totale de la parcelle
- `egrid` (text) -- identifiant EGRID
- `type_parcelle` (text) -- prive, public, etc.
- `plan_affectation_type` (text) -- PQ adopte, date
- `plan_affectation_nom` (text) -- nom du plan
- **Image** : carte de la parcelle avec zones (uploadee)

### Pages 11-12 -- Energie
**Champs a ajouter :**
- `source_energie_chauffage` (text) -- source principale
- `systeme_chauffage_principal` (jsonb) -- generateur, source, date info
- `systeme_eau_chaude` (jsonb) -- generateur, source, date info
- `systeme_chauffage_supplementaire` (jsonb)
- `systeme_eau_chaude_supplementaire` (jsonb)
- `installation_solaire_actuelle` (text)
- `potentiel_solaire_surface_toits` (numeric) -- m2
- `potentiel_solaire_exposition_kwh` (numeric) -- kWh/m2
- `potentiel_solaire_globale` (numeric) -- exposition globale kWh
- `potentiel_solaire_rendement_elec` (numeric) -- kWh
- `potentiel_solaire_rendement_therm` (numeric) -- kWh
- **Image** : carte energetique du batiment (uploadee)

### Pages 13-14 -- Commodites
**Champs a ajouter :**
- `commodites_scores` (jsonb) -- scores par categorie :
  ```json
  {
    "shopping": 91,
    "alimentation": 97,
    "culture_loisirs": 95,
    "restaurants_bars": 93,
    "education": 90,
    "bien_etre": 86,
    "sante": 94,
    "transport": 100,
    "commodites_base": 93
  }
  ```
- `commodites_details` (jsonb) -- items detailles avec distances
- **Image** : carte des commodites (uploadee)

### Page 15 -- Accessibilite
**Champs a ajouter :**
- `accessibilite_data` (jsonb) -- donnees pour marche, velo, voiture (temps d'isochrones)
- **Images** : 3 cartes d'isochrones (marche, velo, voiture) (uploadees)

### Page 16 -- Bruit
**Champs a ajouter :**
- `bruit_routier_jour` (integer) -- dB
- `bruit_routier_nuit` (integer) -- dB
- `bruit_ferroviaire_jour` (integer) -- dB
- `bruit_ferroviaire_nuit` (integer) -- dB
- (les champs `niveau_bruit_jour` et `niveau_bruit_nuit` existent deja pour les max)
- **Images** : 4 cartes de bruit (uploadees)

### Page 17 -- Ensoleillement
**Champs a ajouter :**
- `ensoleillement_data` (jsonb) -- donnees saisonnieres :
  ```json
  {
    "aujourd_hui": { "lever": "07h21", "duree": "12h", "coucher": "19h33" },
    "hiver": { "lever": "08h16", "duree": "8h", "coucher": "16h50" },
    "ete": { "lever": "05h41", "duree": "15h", "coucher": "21h31" }
  }
  ```
- **Images** : 3 cartes d'ensoleillement (uploadees)

### Pages 18-23 -- Permis de construire
**Champs a ajouter :**
- `permis_construire` (jsonb) -- tableau de permis :
  ```json
  [
    {
      "reference": "P-137-53-1-2024-ME",
      "description": "...",
      "nature_travaux": "Construction nouvelle",
      "architecte": "...",
      "date": "01/07/2024",
      "statut": "En traitement a la Camac"
    }
  ]
  ```
- **Image** : carte des permis autour de l'adresse (uploadee)

---

## Plan d'implementation

### Etape 1 -- Migration base de donnees

Ajouter environ 25 nouvelles colonnes a la table `immeubles` pour couvrir toutes les donnees du template. Les champs complexes (logements, commodites, permis, ensoleillement) utilisent le type JSONB pour flexibilite.

### Etape 2 -- Formulaire de saisie (nouveau composant)

Creer un composant `RapportEstimationDataForm.tsx` qui sera accessible depuis l'onglet **Estimation** ou un nouvel onglet dedie. Ce formulaire sera organise en sections repliables (accordeons) :

1. **Marche** -- prix median, evolution, nb biens, nouvelles annonces, distribution
2. **Batiment** -- categorie OFS, classification, logements par etage
3. **Parcelle** -- surface, EGRID, type, plan d'affectation
4. **Energie** -- systemes chauffage/eau chaude (principal + supplementaire), potentiel solaire
5. **Commodites** -- scores par categorie + details avec distances
6. **Accessibilite** -- temps de trajet marche/velo/voiture
7. **Bruit** -- niveaux detailles (routier/ferroviaire, jour/nuit)
8. **Ensoleillement** -- donnees saisonnieres
9. **Permis de construire** -- liste dynamique avec ajout/suppression

### Etape 3 -- Systeme d'upload d'images par section

Creer un composant `RapportEstimationImages.tsx` qui permet d'uploader des images dans le bucket `documents_immeuble` avec un prefixe `rapport-estimation/{immeuble_id}/` et des cles par section :

| Cle | Description |
|-----|-------------|
| `cover` | Photo aerienne de couverture |
| `map_localisation` | Carte de localisation |
| `map_marche` | Carte de chaleur des prix |
| `graph_distribution` | Graphique distribution des prix |
| `map_batiment` | Carte du batiment |
| `map_parcelle` | Carte de la parcelle |
| `map_energie` | Carte energetique |
| `map_commodites` | Carte des commodites |
| `map_accessibilite_marche` | Isochrone marche |
| `map_accessibilite_velo` | Isochrone velo |
| `map_accessibilite_voiture` | Isochrone voiture |
| `map_bruit_routier_jour` | Carte bruit routier jour |
| `map_bruit_routier_nuit` | Carte bruit routier nuit |
| `map_bruit_ferroviaire_jour` | Carte bruit ferroviaire jour |
| `map_bruit_ferroviaire_nuit` | Carte bruit ferroviaire nuit |
| `map_ensoleillement_1` | Ensoleillement aujourd'hui |
| `map_ensoleillement_2` | Ensoleillement hiver |
| `map_ensoleillement_3` | Ensoleillement ete |
| `map_permis` | Carte des permis de construire |

L'utilisateur peut glisser-deposer ou cliquer pour uploader chaque image. Un apercu s'affiche une fois uploadee.

### Etape 4 -- Reecriture de la Edge Function PDF

Reecrire completement `generate-estimation-report-pdf` pour generer un PDF fidele au template Popety.io :

- **En-tete recurrente** : "RAPPORT D'ESTIMATION" + infos agent + logo en haut de chaque page
- **Pied de page** : numero de page + contact Immo-Rama
- **Images integrees** : la fonction telecharge les images depuis le bucket storage et les embed dans le PDF via `pdf-lib`
- **Tableaux structures** : donnees affichees dans des grilles propres
- **Mise en page A4** : respect des marges et sections exactes du template

Le PDF genere suivra exactement l'ordre des 23 pages du template, en omettant les sections pour lesquelles aucune donnee n'a ete saisie.

---

## Details techniques

### Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajout de ~25 colonnes a `immeubles` |
| `src/components/biens-vente/RapportEstimationDataForm.tsx` | Nouveau -- formulaire de saisie complet |
| `src/components/biens-vente/RapportEstimationImages.tsx` | Nouveau -- upload d'images par section |
| `src/components/biens-vente/EstimationModule.tsx` | Ajout d'un lien/bouton vers le formulaire complet |
| `src/pages/admin/BienVenteDetail.tsx` | Integration du nouveau formulaire dans les onglets |
| `src/pages/agent/BienVenteDetail.tsx` | Meme integration cote agent |
| `supabase/functions/generate-estimation-report-pdf/index.ts` | Reecriture complete (~1500+ lignes) |

### Contraintes techniques

- **pdf-lib** avec polices standard (Helvetica) : les accents sont remplaces via `sanitizeText`
- **Images dans le PDF** : taille limitee par la memoire Edge Function (150MB). Les images seront redimensionnees/compressees cote client avant upload
- **JSONB** pour les structures complexes : permet d'evoluer sans migrations supplementaires
- Le PDF s'adapte dynamiquement : les sections sans donnees sont sautees

### Approche en 2 phases

Vu l'ampleur du changement, je recommande de proceder en **2 phases** :

**Phase 1** (cette implementation) :
- Migration DB avec tous les champs
- Formulaire de saisie pour les donnees textuelles/numeriques (sections Marche, Batiment, Parcelle, Energie, Commodites, Bruit, Ensoleillement, Permis)
- Upload d'images par section
- Generation PDF avec les pages principales (Couverture, Resume, Marche, Batiment, Parcelle, Energie, Commodites, Bruit, Ensoleillement, Permis)

**Phase 2** (iteration future si necessaire) :
- Ameliorations visuelles du PDF (graphiques generes par code, barres de progression)
- Accessibilite (cartes d'isochrones)
- Perfectionnement de la mise en page
