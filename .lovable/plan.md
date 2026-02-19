
# Problème : Création du dossier complet échoue — Documents non téléchargeables

## Cause racine identifiée

La base de données contient deux formats d'URL pour les documents :

| Format | Exemple | Count |
|---|---|---|
| URL complète (http) | `https://ydljsdscdnqrqnjvqela.supabase.co/storage/v1/object/public/client-documents/mandat/1770895042936_identite.jpg` | 210 docs |
| Chemin relatif | `mandat/1770895042936_identite.jpg` | 413 docs |
| Data URL (base64) | `data:image/jpeg;base64,...` | 2 docs |

La fonction `downloadFileAsBlob` dans `src/utils/pdfMerger.ts` traite les URLs `http` via un `fetch()` direct. Mais Supabase bloque ce type de requête cross-origin depuis le navigateur (CORS), ce qui fait que **tous les documents stockés avec une URL complète retournent une erreur**, et donc aucun document ne peut être inclus dans le dossier fusionné.

## Flux du problème

```text
downloadFileAsBlob(doc) avec doc.url = "https://ydljsdscdnqrqnjvqela.supabase.co/..."
  → url.startsWith('http') → true
  → fetch(doc.url) 
  → CORS Error / 403 Forbidden
  → returns null
  → document skipped
  → successCount = 0
  → throw DocumentProcessingError("Aucun document n'a pu être traité")
```

## Solution : Convertir les URLs complètes en chemins relatifs avant téléchargement

Modifier `downloadFileAsBlob` dans `src/utils/pdfMerger.ts` pour **extraire le chemin relatif** depuis les URLs complètes Supabase et utiliser le SDK Supabase pour télécharger, au lieu du `fetch()` direct.

La logique `getStoragePath()` existe déjà dans `src/lib/documentUtils.ts` — il faut l'utiliser (ou la dupliquer) dans `pdfMerger.ts`.

### Modification de `downloadFileAsBlob`

```typescript
// AVANT (problème)
if (doc.url.startsWith('http')) {
  const response = await fetch(doc.url);  // ❌ CORS / 403
  return await response.blob();
}

// APRÈS (correction)
if (doc.url.startsWith('http')) {
  // Extraire le chemin relatif depuis l'URL Supabase
  let storagePath = doc.url;
  if (doc.url.includes('/client-documents/')) {
    storagePath = doc.url.split('/client-documents/')[1].split('?')[0];
  } else if (doc.url.includes('/storage/v1/object/')) {
    const match = doc.url.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/([^?]+)/);
    if (match) storagePath = match[1];
  }
  
  // Utiliser le SDK Supabase pour télécharger
  const { data, error } = await supabase.storage
    .from('client-documents')
    .download(storagePath);
  
  if (error) {
    // Fallback: essayer une URL signée
    const { data: signedData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(storagePath, 60);
    if (signedData?.signedUrl) {
      const response = await fetch(signedData.signedUrl);
      if (response.ok) return await response.blob();
    }
    return null;
  }
  return data;
}
```

## Fichier impacté

| Fichier | Changement |
|---|---|
| `src/utils/pdfMerger.ts` | Modifier `downloadFileAsBlob` pour extraire le chemin relatif des URLs complètes Supabase et utiliser le SDK au lieu de `fetch()` direct |

## Résultat attendu

Après correction, les 5 documents JPG d'Alicem Demir (et de tous les clients dont les URLs sont complètes) seront correctement téléchargés via le SDK Supabase, et le dossier complet sera créé avec succès.
