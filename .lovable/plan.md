
# Diagnostic réel : Les fichiers d'Alicem n'existent plus dans le stockage

## Cause racine confirmée

Les 5 fichiers d'Alicem Demir sont enregistrés en base de données, mais **physiquement absents du bucket `client-documents`** :

Les URLs en base :
- `mandat/1770895042936_identite.jpg`
- `mandat/1770895005526_salaire3.jpg`
- `mandat/1770894983989_salaire1.jpg`
- `mandat/1770894958603_salaire2.jpg`
- `mandat/1770894728508_poursuites.jpg`

Résultat de la requête directe sur `storage.objects` pour ces fichiers : **0 résultats**.

C'est pour ça que `createSignedUrl()` échoue : Supabase ne peut pas créer une URL signée pour un fichier qui n'existe pas dans le stockage. Le code est correct — il n'y a plus rien à télécharger.

## Pourquoi les fichiers ont disparu ?

Ces fichiers ont été uploadés lors du processus de demande de mandat (via l'app mobile du client). Ils sont référencés dans `demandes_mandat.documents_uploades`. Il est probable qu'une **purge ou migration** ait supprimé les fichiers du bucket `mandat/` sans mettre à jour la table `documents`.

## Ce que le code peut faire vs ce qu'il ne peut pas faire

| Situation | Possible ? |
|---|---|
| Télécharger un fichier qui existe dans le storage | ✅ Oui (code corrigé) |
| Télécharger un fichier qui n'existe plus dans le storage | ❌ Impossible |
| Afficher un fichier fantôme (URL morte) | ❌ Impossible |

## Solutions possibles

Il y a **deux approches** :

### Option A — Améliorer le message d'erreur (court terme)
Modifier `pdfMerger.ts` et `MergeDocumentsDialog.tsx` pour indiquer précisément quels fichiers sont introuvables dans le stockage (erreur `Object not found` de Supabase), au lieu du message générique "Aucun document valide n'a pu être traité".

Le message deviendrait : _"5 fichiers introuvables dans le stockage : mandat/1770895042936_identite.jpg, ..."_

### Option B — Détecter et signaler les fichiers fantômes dans l'interface (moyen terme)
Dans `ClientDetail.tsx`, au moment d'afficher les documents, vérifier si chaque fichier existe encore dans le stockage (via `createSignedUrl`) et afficher un badge "⚠️ Fichier manquant" sur les documents dont les fichiers ont disparu. Cela permettra à l'admin de re-uploader les documents manquants.

### Option C — Les deux (recommandé)
Combiner A et B : message d'erreur précis dans la fusion + badge "fichier manquant" dans la liste des documents.

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/utils/pdfMerger.ts` | Distinguer l'erreur "Object not found" (fichier absent du storage) des autres erreurs, avec un message explicite |
| `src/components/MergeDocumentsDialog.tsx` | Afficher la liste précise des fichiers manquants avec un message explicite avant de lancer la fusion |
| `src/components/ClientDocuments.tsx` ou équivalent | Optionnel : badge "fichier manquant" sur les documents dont le stockage est vide |

## Résultat attendu

Après correction, au lieu de l'erreur opaque "Aucun document valide n'a pu être traité", l'utilisateur verra :
_"Impossible de créer le dossier : 5 fichier(s) introuvables dans le stockage. Ces documents doivent être re-uploadés par le client."_

Et dans la liste des documents d'Alicem, chaque document fantôme sera clairement marqué comme inaccessible.
