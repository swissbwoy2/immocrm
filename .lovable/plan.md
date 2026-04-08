
Diagnostic
- Pour Ramadan Zumeraj, les 5 lignes `documents` existent toujours, mais `taille` est encore vide.
- Les 5 fichiers existent réellement dans le stockage et ce sont des `image/jpeg` d’environ 2.6 MB, donc ils ne sont ni supprimés ni à 0 KB.
- L’aperçu “image sur fond noir” montre simplement le vrai fichier stocké : ce sont des photos JPEG, pas des PDFs reconstruits.
- Le correctif précédent n’a donc pas réparé ce client pour deux raisons :
  1. `supabase/functions/backfill-document-sizes/index.ts` ne traite que 20 documents par appel.
  2. `src/pages/admin/ClientDetail.tsx` affiche encore `0 B` quand la taille est absente.

Plan de correction
1. Réparer réellement les anciens documents
- Refaire `backfill-document-sizes` pour traiter tous les documents par lots, ou permettre un mode ciblé par client.
- Renseigner la vraie taille à partir des métadonnées du fichier dans le stockage.
- Ajouter un ciblage direct du client courant pour réparer immédiatement les cas comme Ramadan.

2. Corriger l’affichage trompeur
- Remplacer la logique locale de taille dans `src/pages/admin/ClientDetail.tsx` par le helper partagé, pour ne plus afficher `0 B` quand la taille manque.
- Aligner aussi `src/pages/admin/Documents.tsx`, `src/pages/agent/Documents.tsx` et `src/pages/client/Documents.tsx` pour un comportement unique.

3. Rendre le type de fichier explicite
- Afficher clairement si un document est une photo (`JPEG/PNG`) ou un PDF.
- Ajuster l’aperçu image avec un fond clair et une présentation plus neutre, pour éviter l’impression de “fichier cassé” quand le document stocké est en réalité une photo.

4. Gérer les vrais mauvais documents
- Ajouter une action simple “Remplacer le document” sur les anciens dossiers.
- Point important : si le fichier stocké est réellement une photo sombre ou un mauvais upload, on peut corriger les métadonnées et l’affichage, mais on ne peut pas recréer automatiquement un PDF propre qui n’a jamais été uploadé.

5. Vérification finale
- Tester Ramadan Zumeraj en priorité.
- Confirmer que :
  - les 5 tailles remontent correctement,
  - le `0 B` disparaît,
  - l’aperçu indique bien “photo” ou “PDF”,
  - un remplacement de document fonctionne de bout en bout.

Détails techniques
- Fichiers à modifier :
  - `supabase/functions/backfill-document-sizes/index.ts`
  - `src/pages/admin/ClientDetail.tsx`
  - `src/pages/admin/Documents.tsx`
  - `src/pages/agent/Documents.tsx`
  - `src/pages/client/Documents.tsx`
  - éventuellement `src/lib/documentUtils.ts` pour centraliser formatage + libellé de type
- Aucune migration SQL n’est nécessaire.
- Le flux d’assignation à Carina n’est toujours pas la cause : le problème restant est un mélange de métadonnées non réparées et de fichiers historiques qui sont réellement des images.
