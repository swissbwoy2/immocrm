
Objectif

Corriger le faux problème “les documents se suppriment quand j’assigne un client à Carina”.

Constat sur l’exemple Ramadan Zumeraj

- Les 5 documents existent encore : la liste `documents` renvoie bien 5 lignes avec des URLs valides.
- Le symptôme visible est `taille = null`, donc l’interface affiche `0 B`.
- Le code d’assignation (`src/pages/admin/Assignations.tsx`) ne modifie ni le stockage ni la table `documents`.
- La vraie source est le transfert depuis le mandat : dans `supabase/functions/invite-client/index.ts`, les documents sont insérés sans renseigner `taille`.
- En plus, l’ancien formulaire mandat (`src/components/mandat/MandatFormStep6.tsx`) ne stocke pas la taille dans `documents_uploades`, donc le backend ne peut pas la recopier.

Conclusion

Ce n’est pas la réassignation qui supprime les fichiers. Elle coïncide avec un affichage trompeur : fichiers présents, taille absente, rendu à `0 B`.

Plan d’implémentation

1. Enregistrer la taille dès l’upload du mandat classique
- Étendre `DocumentData` dans `src/components/mandat/types.ts` avec `size?: number`
- Dans `src/components/mandat/MandatFormStep6.tsx`, stocker `file.size` avec `name / url / type`
- Laisser `src/pages/NouveauMandat.tsx` transmettre ce champ dans `documents_uploades`

2. Corriger le transfert vers la table `documents`
- Dans `supabase/functions/invite-client/index.ts`, insérer `taille: doc.size ?? doc.file_size ?? null`
- Garder la compatibilité avec les anciens mandats qui n’ont pas encore cette donnée

3. Corriger l’affichage trompeur `0 B`
- Dans `src/pages/admin/ClientDetail.tsx`, `src/pages/admin/Documents.tsx`, `src/pages/agent/Documents.tsx` et `src/pages/client/Documents.tsx`, ne plus afficher `0 B` quand `taille` est `null`
- Afficher soit rien, soit `Taille non disponible`

4. Réparer les anciens dossiers déjà créés
- Ajouter une routine backend admin pour recalculer `documents.taille` des anciennes lignes à partir des métadonnées réelles du fichier dans le bucket
- Cibler en priorité les documents venant du dossier `mandat/`, comme dans l’exemple Ramadan Zumeraj

5. Vérification
- Tester Ramadan Zumeraj avant/après réassignation à Carina
- Vérifier que le nombre de documents reste identique
- Vérifier que la prévisualisation et le téléchargement fonctionnent
- Vérifier que l’interface n’affiche plus `0 B` par erreur, ou affiche la vraie taille après réparation

Détails techniques

Fichiers principaux :
- `supabase/functions/invite-client/index.ts`
- `src/components/mandat/types.ts`
- `src/components/mandat/MandatFormStep6.tsx`
- `src/pages/NouveauMandat.tsx`
- `src/pages/admin/ClientDetail.tsx`
- `src/pages/admin/Documents.tsx`
- `src/pages/agent/Documents.tsx`
- `src/pages/client/Documents.tsx`

Note importante :
- Je ne toucherais pas au flux d’assignation dans ce correctif
- Je ne changerais pas non plus les règles d’accès du stockage en première passe, car l’exemple montre un problème de métadonnées d’affichage, pas une suppression réelle de fichier

Impact attendu

- Plus de faux signal “document supprimé”
- Les nouveaux documents auront la bonne taille
- Les anciens documents pourront être réparés
- L’assignation à Carina ne sera plus perçue comme la cause
