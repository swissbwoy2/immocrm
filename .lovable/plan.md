
# Adaptation du formulaire de mandat pour les locaux commerciaux

## Concept

Quand un client sélectionne **"Local commercial"** comme type de bien, le formulaire doit s'adapter avec :
1. Une question : **"Louez-vous en nom propre ou au nom d'une société ?"**
2. Des champs différents selon la réponse

## Logique conditionnelle

### Si "En nom propre" (personne physique)
→ On garde les champs actuels :
- Profession
- Employeur
- **Revenu mensuel net** (personnel)
- Date d'engagement

### Si "Au nom d'une société"
→ On remplace par des champs entreprise :
- **Raison sociale** de l'entreprise
- **Numéro IDE** (CHE-xxx.xxx.xxx)
- **Chiffre d'affaires annuel** ou budget locatif mensuel
- **Activité / Type d'exploitation** (Bureau, Commerce, Restaurant, Atelier, etc.)
- **Nombre d'employés** (optionnel)

## Champs spécifiques au local commercial (dans les deux cas)

Remplacer les questions résidentielles par :
- **Surface souhaitée (m²)** - au lieu de "nombre de pièces"
- **Type d'affectation** (Bureau, Commerce, Artisanat, Restauration, Stockage)
- **Étage souhaité** (Rez-de-chaussée, Étages, Sous-sol, Peu importe)
- **Besoins spécifiques** :
  - Vitrine / visibilité rue
  - Accès livraison / quai
  - Parking / places de parc
  - Terrasse (pour restauration)
  - Extraction / ventilation

## Champs à masquer pour "Local commercial"

Ces questions n'ont pas de sens pour un commerce :
- ❌ "Combien de personnes occuperaient le bien ?"
- ❌ "Avez-vous des animaux ?"
- ❌ "Pratiquez-vous un instrument de musique ?"
- ❌ Questions sur les poursuites/curatelle (sauf si en nom propre)

## Modifications techniques

### 1. Mise à jour des types (`types.ts`)

Ajouter de nouveaux champs au `MandatFormData` :
```typescript
// Commercial
location_type: 'personnel' | 'societe' | null; // null = pas commercial
raison_sociale: string;
numero_ide: string;
chiffre_affaires: number;
type_exploitation: string;
nombre_employes: number;
surface_souhaitee: number;
etage_souhaite: string;
affectation_commerciale: string;
besoins_commerciaux: string[]; // vitrine, livraison, parking, etc.
```

Ajouter les constantes :
```typescript
export const TYPES_EXPLOITATION = [
  'Bureau', 'Commerce de détail', 'Restaurant / Bar', 
  'Salon (coiffure, beauté, etc.)', 'Atelier artisanal', 
  'Stockage / Entrepôt', 'Cabinet médical', 'Autre'
];

export const AFFECTATIONS_COMMERCIALES = [
  'Bureaux', 'Commerce', 'Artisanat', 'Restauration', 
  'Industriel léger', 'Stockage'
];

export const ETAGES_COMMERCIAUX = [
  'Rez-de-chaussée uniquement', 'Étages acceptés', 
  'Sous-sol accepté', 'Peu importe'
];

export const BESOINS_COMMERCIAUX = [
  { value: 'vitrine', label: 'Vitrine / Visibilité rue' },
  { value: 'livraison', label: 'Accès livraison / Quai de déchargement' },
  { value: 'parking', label: 'Parking / Places de parc' },
  { value: 'terrasse', label: 'Terrasse (restauration)' },
  { value: 'extraction', label: 'Extraction / Ventilation' },
  { value: 'entree_privee', label: 'Entrée indépendante' },
];
```

### 2. Modification de MandatFormStep3.tsx

Ajouter une condition pour détecter `type_bien === 'Local commercial'` :

```typescript
const isCommercial = data.type_bien === 'Local commercial';
const isPersonnel = data.location_type === 'personnel';
const isSociete = data.location_type === 'societe';
```

**Si commercial**, afficher d'abord :
- RadioGroup : "Location en nom propre" vs "Au nom d'une société"

**Si en nom propre** → garder profession, employeur, revenu mensuel
**Si société** → afficher raison sociale, IDE, CA, type exploitation

### 3. Modification de MandatFormStep4.tsx

Remplacer conditionnellement :
- "Nombre de pièces" → "Surface souhaitée (m²)"
- "Nombre d'occupants" → masquer ou remplacer par "Nombre d'employés"
- Ajouter les sélecteurs pour affectation, étage, besoins

### 4. Calcul de viabilité adapté

Pour les locaux commerciaux au nom d'une société :
- Ne pas utiliser la règle du tiers des revenus personnels
- Afficher un message neutre : "Notre équipe évaluera votre dossier"

Pour les locaux commerciaux en nom propre :
- Garder la logique actuelle du 1/3 des revenus

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/mandat/types.ts` | Ajouter champs commerciaux + constantes |
| `src/components/mandat/MandatFormStep3.tsx` | Logique conditionnelle personne/société |
| `src/components/mandat/MandatFormStep4.tsx` | Champs spécifiques commerciaux (surface, étage, besoins) |
| `src/components/mandat/MandatFormStep5.tsx` | Adapter les questions (masquer animaux, musique si commercial) |

## Résultat attendu

Un formulaire intelligent qui :
- Détecte automatiquement quand le client cherche un local commercial
- Pose les bonnes questions selon qu'il loue en nom propre ou via société
- Collecte les informations pertinentes (surface, affectation, besoins)
- Garde le revenu mensuel pour les locations personnelles
- Affiche des calculs de viabilité adaptés au contexte
