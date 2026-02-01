
# Adaptation du formulaire de mandat pour les locaux commerciaux ✅ IMPLÉMENTÉ

## Statut: Terminé

L'adaptation du formulaire de mandat pour les locaux commerciaux a été implémentée avec succès.

## Fonctionnalités implémentées

### 1. Détection automatique du type commercial
- Quand `type_bien === 'Local commercial'`, le formulaire s'adapte automatiquement

### 2. Choix nom propre / société (Step 3)
- RadioGroup pour choisir entre "En nom propre" et "Au nom d'une société"
- **En nom propre**: affiche profession, employeur, revenu mensuel net, date d'engagement
- **Au nom d'une société**: affiche raison sociale, numéro IDE, chiffre d'affaires annuel, type d'exploitation, nombre d'employés

### 3. Questions financières conditionnelles (Step 3)
- Charges extraordinaires, poursuites, curatelle: affichées uniquement si résidentiel OU commercial en nom propre
- Masquées pour les locations commerciales au nom d'une société

### 4. Critères de recherche adaptés (Step 4)
- **Masqué pour commercial**: nombre de personnes, nombre de pièces
- **Ajouté pour commercial**: 
  - Surface souhaitée (m²)
  - Type d'affectation (Bureaux, Commerce, Artisanat, Restauration, etc.)
  - Étage souhaité (Rez-de-chaussée, Étages, Sous-sol, Peu importe)
  - Besoins spécifiques (checkboxes): vitrine, livraison, parking, terrasse, extraction, entrée indépendante

### 5. Questions résidentielles masquées (Step 4)
- Animaux, instrument de musique, véhicules: masqués pour les locaux commerciaux

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/mandat/types.ts` | Nouveaux champs + constantes commerciales |
| `src/components/mandat/CommercialFieldsStep3.tsx` | Nouveau composant pour choix personne/société |
| `src/components/mandat/CommercialSearchFields.tsx` | Nouveau composant pour critères commerciaux |
| `src/components/mandat/MandatFormStep3.tsx` | Logique conditionnelle intégrée |
| `src/components/mandat/MandatFormStep4.tsx` | Champs conditionnels + composant commercial |

## Nouveaux champs dans MandatFormData

```typescript
// Location type
location_type: 'personnel' | 'societe' | null;

// Company fields
raison_sociale: string;
numero_ide: string;
chiffre_affaires: number;
type_exploitation: string;
nombre_employes: number;

// Commercial search criteria
surface_souhaitee: number;
etage_souhaite: string;
affectation_commerciale: string;
besoins_commerciaux: string[];
```

## Nouvelles constantes

- `TYPES_EXPLOITATION`: Bureau, Commerce de détail, Restaurant / Bar, etc.
- `AFFECTATIONS_COMMERCIALES`: Bureaux, Commerce, Artisanat, Restauration, etc.
- `ETAGES_COMMERCIAUX`: Rez-de-chaussée uniquement, Étages acceptés, etc.
- `BESOINS_COMMERCIAUX`: Vitrine, Livraison, Parking, Terrasse, Extraction, Entrée indépendante

## Résultat attendu

Un formulaire intelligent qui :
- Détecte automatiquement quand le client cherche un local commercial
- Pose les bonnes questions selon qu'il loue en nom propre ou via société
- Collecte les informations pertinentes (surface, affectation, besoins)
- Garde le revenu mensuel pour les locations personnelles
- Affiche des calculs de viabilité adaptés au contexte
