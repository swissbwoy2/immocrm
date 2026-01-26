
# Plan : Corriger l'import CSV - Validation des dates et meilleur mapping

## Problèmes identifiés

### 1. Erreur de type DATE
```
invalid input syntax for type date: "1 novembre 2019 si je ne me trompe trompe pas"
```

Les colonnes dans la base de données sont de type `date` (format `YYYY-MM-DD`) :
- `date_naissance`
- `depuis_le`  
- `date_engagement`

Mais le CSV contient du texte libre qui ne peut pas être converti.

### 2. Valeurs 0 ou "non renseigné"
Le code actuel fait :
```typescript
revenus_mensuels: client.revenuMensuel || 0,
budget_max: client.budgetMax || 0,
```

Si le mapping échoue, ces valeurs deviennent 0 au lieu de null.

---

## Solution technique

### Fichier : `src/components/CSVImportDialog.tsx`

#### 1. Ajouter une fonction de parsing de date robuste

```typescript
// Parse various date formats, return null if invalid
function parseDate(value: string): string | null {
  if (!value || value.trim() === '' || value === '-') return null;
  
  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  
  // Format DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = value.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Try to extract any date with regex (day month year in French)
  const frenchMonths: Record<string, string> = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
  };
  
  const frMatch = value.toLowerCase().match(/(\d{1,2})\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s*(\d{4})/);
  if (frMatch) {
    const [_, day, month, year] = frMatch;
    const monthNum = frenchMonths[month];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Date contains text that can't be parsed → return null (store raw text in notes instead)
  console.log(`Could not parse date: "${value}"`);
  return null;
}
```

#### 2. Mettre à jour parseCSV pour utiliser parseDate

```typescript
clients.push({
  // ...
  dateNaissance: parseDate(row['date_naissance']),
  depuisLe: parseDate(row['depuis_le']),
  dateEngagement: parseDate(row['date_engagement']),
  // ...
});
```

#### 3. Corriger handleImport pour éviter les 0

```typescript
client: {
  // Utiliser null au lieu de 0 pour les champs numériques
  revenus_mensuels: client.revenuMensuel ?? null,
  budget_max: client.budgetMax ?? null,
  charges_mensuelles: client.montantCharges ?? null,
  // Les dates doivent être validées
  depuis_le: client.depuisLe || null,
  date_naissance: client.dateNaissance || null,
  date_engagement: client.dateEngagement || null,
}
```

#### 4. Ajouter les mappings manquants

Vérifier quels en-têtes du CSV ne sont pas encore mappés en analysant les logs :

```typescript
const mappings: Record<string, string> = {
  // ... existing mappings ...
  
  // Ajouter les variations très longues
  'linscription_doit_etre_accompagnee_dun_extrait_de_loffice_des_poursuites': 'ignore',
  'lien_de_paiement': 'ignore',
  'liens_de_paiement': 'ignore',
  'lien_de_paiement_de_lacompte_pour_un_logement_a_louer': 'ignore',
  'lien_de_paiement_de_lacompte_pour_un_logement_a_acheter': 'ignore',
};
```

---

## Résumé des modifications

| Modification | Impact |
|--------------|--------|
| Fonction `parseDate()` | Extrait les dates françaises ("1 novembre 2019") en format ISO |
| Texte invalide → null | Les dates non-parsables deviennent null au lieu de crasher |
| Utiliser `??` au lieu de `||` | Les valeurs 0 légitimes seront conservées |
| Ignorer les colonnes inutiles | "Lien de paiement", "L'inscription doit être accompagnée..." → ignorées |

---

## Fichiers à modifier

1. `src/components/CSVImportDialog.tsx`
   - Ajouter fonction `parseDate()`
   - Modifier le mapping pour utiliser parseDate sur les champs date
   - Utiliser `??` au lieu de `||` pour les numériques
   - Ajouter les mappings pour ignorer les colonnes non pertinentes

---

## Test attendu

Après modification, l'import devrait :
1. Convertir "1 novembre 2019 si je ne me trompe pas" → `2019-11-01` (ou null si échec)
2. Ne plus afficher 0 pour les champs non remplis mais null
3. Importer correctement tous les champs du CSV Wix
