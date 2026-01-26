
# Plan : Corriger l'import CSV pour mapper correctement les en-têtes

## Problème identifié

L'import CSV échoue car les en-têtes du fichier ne correspondent pas aux mappings définis. Trois causes principales :

### 1. BOM (Byte Order Mark) en début de fichier
Le fichier CSV commence par `﻿` (caractère invisible U+FEFF) qui est ajouté par Excel/Windows. Cela corrompt le premier en-tête.

### 2. Tiret Unicode spécial
Le champ `E‑mail` utilise le caractère U+2011 (non-breaking hyphen) au lieu d'un tiret normal `-`.

### 3. Différences de nommage des colonnes
| En-tête CSV | Après normalisation | Mapping attendu | Résultat |
|-------------|---------------------|-----------------|----------|
| `E‑mail` | `e-mail` (si tiret normalisé) | `e-mail` | ✅ OK |
| `Prénom` | `prenom` | `prenom` | ✅ OK |
| `Nom de famille` | `nom_de_famille` | `nom_de_famille` | ✅ OK |
| `Gérance ou propriétaire actuel(le)` | `gerance_ou_proprietaire_actuelle` | `gerance_ou_proprietaire_actuelle` | ⚠️ parenthèses non gérées |

---

## Solution technique

### Fichier : `src/components/CSVImportDialog.tsx`

#### 1. Supprimer le BOM en début de fichier

```typescript
function parseCSV(csvText: string): ParsedCSVData {
  // Remove BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split('\n').filter(line => line.trim());
  // ...
}
```

#### 2. Améliorer la normalisation des en-têtes

```typescript
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D\u2011]/g, '-') // Ajouter U+2011
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '') // Supprimer les parenthèses
    .replace(/[^a-z0-9_-]/g, '')
    .trim();
}
```

#### 3. Ajouter les mappings manquants

```typescript
const mappings: Record<string, string> = {
  // Email variations - ajouter plus de variantes
  'e-mail': 'email',
  'email': 'email',
  'e_mail': 'email',
  
  // Gérance - corriger pour (le) supprimé
  'gerance_ou_proprietaire_actuel': 'gerance_actuelle',
  'gerance_ou_proprietaire_actuelle': 'gerance_actuelle',
  
  // Ajouter les colonnes manquantes du Wix form
  'lu__approuve': 'lu_approuve',
  'signature': 'signature',
  
  // ... (autres mappings existants)
};
```

#### 4. Ajouter un fallback partiel matching

Pour les en-têtes qui ne matchent pas exactement, chercher une correspondance partielle :

```typescript
function mapHeaderToField(header: string): string {
  const normalized = normalizeHeader(header);
  
  // Direct match
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Partial match fallback
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log(`Partial match: "${normalized}" → "${value}"`);
      return value;
    }
  }
  
  return normalized;
}
```

---

## Résumé des modifications

| Modification | Impact |
|--------------|--------|
| Suppression du BOM | Le premier champ sera correctement lu |
| Normalisation U+2011 | `E‑mail` → `email` fonctionnera |
| Suppression des parenthèses | `actuel(le)` → `actuelle` |
| Mappings supplémentaires | Meilleure compatibilité Wix |
| Fallback partiel | Plus de robustesse |

---

## Fichiers impactés

1. `src/components/CSVImportDialog.tsx` - Corrections du parser CSV

---

## Test attendu

Après modification, l'import du fichier `Mandat_de_recherche_3.csv` devrait :
1. Détecter correctement les 45 colonnes
2. Mapper Email, Prénom, Nom, Téléphone sans erreur
3. Remplir tous les champs du formulaire mandat
