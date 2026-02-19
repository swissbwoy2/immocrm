
# Diagnostic final : Pourquoi la création du dossier échoue toujours

## Cause réelle identifiée

L'URL des 5 documents d'Alicem a ce format :
```
https://...supabase.co/storage/v1/object/public/client-documents/mandat/1770895042936_identite.jpg
```

La fonction `getStoragePath()` (dans `documentUtils.ts`) extrait correctement le chemin relatif `mandat/1770895042936_identite.jpg`. Le problème vient de ce que la fonction `downloadFileAsBlob` dans `pdfMerger.ts` utilise le SDK Supabase `.download()` qui effectue une requête **authentifiée**. Or, la politique RLS `"Allow public read access to mandat folder"` est bien présente mais le SDK `.download()` contourne parfois le bucket public et tombe sous les RLS strictes.

La solution fiable : utiliser **`.createSignedUrl()` puis `fetch()`** exactement comme le font déjà `handlePreview` et `handleDownload` dans `ClientDetail.tsx` et `AdminDocuments.tsx` — qui eux fonctionnent.

## Ce qui fonctionne vs ce qui ne fonctionne pas

| Méthode | Utilisé dans | Résultat |
|---|---|---|
| `createSignedUrl()` + `fetch()` | `handlePreview`, `handleDownload` dans ClientDetail, AdminDocuments | Fonctionne |
| `.download()` SDK direct | `downloadFileAsBlob` dans pdfMerger.ts | Échoue pour les fichiers `mandat/` |

## Solution

Modifier `downloadFileAsBlob` dans `src/utils/pdfMerger.ts` pour **toujours passer par `createSignedUrl()`** pour les chemins de stockage (qu'ils viennent d'une URL complète ou d'un chemin relatif), en réutilisant la même logique que `getStoragePath()`.

### Logique modifiée

```typescript
// Pour TOUTES les URLs (complètes ou relatives), utiliser createSignedUrl
let storagePath: string;

if (doc.url.startsWith('data:')) {
  // data URL → décodage base64 (existant, inchangé)
  ...
} else {
  // URL complète ou chemin relatif → extraire le chemin propre
  storagePath = getStoragePath(doc.url);  // réutiliser la fonction existante
  
  // Créer une URL signée (comme handlePreview/handleDownload)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(storagePath, 300);  // 5 min
  
  if (signedError || !signedData?.signedUrl) {
    console.error(`Document "${doc.nom}": Impossible de créer l'URL signée:`, signedError);
    return null;
  }
  
  const response = await fetch(signedData.signedUrl);
  if (!response.ok) return null;
  return await response.blob();
}
```

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/utils/pdfMerger.ts` | Remplacer l'approche `.download()` SDK par `createSignedUrl()` + `fetch()` pour toutes les URLs storage, en important `getStoragePath` de `documentUtils.ts` |

## Résultat attendu

Après correction, la création du dossier complet d'Alicem (et de tous les clients) fonctionnera car elle utilisera exactement le même mécanisme d'accès aux fichiers que les boutons "Prévisualiser" et "Télécharger" qui fonctionnent déjà.
