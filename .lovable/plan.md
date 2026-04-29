# Ajouter la vidéo "Bienvenue sur Logisorama" au Chapitre 1

## Objectif

Intégrer le fichier `Bienvenue_sur_Logisorama.mp4` (uploadé) comme vidéo de présentation dans le chapitre 1 de la formation agent.

## Étapes

1. **Créer le bucket de stockage** `formation-videos` dans Lovable Cloud
   - Bucket public (lecture libre par les agents connectés)
   - Politique RLS : lecture pour tous les utilisateurs authentifiés, écriture admin uniquement
   - Limite par fichier : 100 MB (vidéos courtes)

2. **Uploader la vidéo** dans le bucket
   - Copier `user-uploads://Bienvenue_sur_Logisorama.mp4` → upload vers `formation-videos/01-bienvenue.mp4`
   - URL publique stable obtenue via Storage

3. **Brancher la vidéo dans le chapitre 1**
   - Éditer `src/features/formation/content/index.ts`
   - Bloc `video` du chapitre `01-bienvenue` : ajouter `src` pointant vers l'URL publique du bucket
   - Mettre à jour la durée réelle (à détecter à l'upload)

## Composant existant déjà prêt

`VideoBlock.tsx` gère déjà le cas avec/sans `src` :
- sans `src` → placeholder "Vidéo bientôt disponible"
- avec `src` → lecteur `<video controls>` natif 16:9

Aucune modification du composant n'est nécessaire — il suffit de remplir le champ `src`.

## Pour les futures vidéos

Une fois le bucket créé, vous pourrez uploader d'autres vidéos chapitre par chapitre simplement en me les envoyant — je les ajouterai au bloc `video` du chapitre concerné, sans nouvelle migration.

## Fichiers modifiés

- Migration SQL : création bucket `formation-videos` + policies
- `src/features/formation/content/index.ts` : ajout de `src` au bloc vidéo du chapitre 1

Approuvez pour que je crée le bucket, uploade la vidéo et branche le chapitre.
