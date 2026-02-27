

## Corriger la duplication de documents lors de l'assignation/activation d'un client

### Probleme identifie

La fonction `invite-client` est appelee **deux fois** pour le meme client avec les memes documents :

1. **1er appel** : Quand le client remplit le formulaire de mandat (`NouveauMandat.tsx` ligne 321) -- les documents sont inseres dans la table `documents`
2. **2eme appel** : Quand l'admin active le mandat (`DemandesActivation.tsx` ligne 270) -- les memes documents sont inseres **une 2eme fois** car la fonction ne verifie jamais si les documents existent deja

Resultat : les documents apparaissent en double. Si ensuite la migration vers le storage est executee, les doublons obtiennent de nouveaux chemins de stockage. Si Carina supprime les originaux, les doublons pointent vers des fichiers inexistants.

### Correction

**Fichier : `supabase/functions/invite-client/index.ts`**

Avant d'inserer les documents (ligne 406), ajouter une verification :

```text
// Avant la boucle d'insertion des documents :
// 1. Verifier si des documents existent deja pour ce client
const { data: existingDocs } = await supabaseAdmin
  .from('documents')
  .select('nom, type_document')
  .eq('user_id', userId);

const existingDocKeys = new Set(
  (existingDocs || []).map(d => `${d.nom}_${d.type_document}`)
);

// 2. Dans la boucle, skipper si le document existe deja
for (const doc of demandeMandat.documents_uploades) {
  const mappedType = mapDocumentType(doc.type);
  const docKey = `${doc.name}_${mappedType}`;
  
  if (existingDocKeys.has(docKey)) {
    console.log('Document already exists, skipping:', doc.name);
    continue; // Ne pas re-inserer
  }
  
  // ... reste du code d'insertion existant
}
```

Cette verification empeche la creation de doublons en comparant le nom + type du document avant insertion.

### Nettoyage des doublons existants

Apres le deploiement du fix, il faudra nettoyer les doublons actuels dans la base de donnees. On pourra identifier les doublons par `user_id` + `nom` + `type_document` et supprimer les entrees les plus recentes (celles qui ont potentiellement des chemins de stockage invalides).

### Impact
- L'activation d'un mandat ne creera plus de documents en double
- Les re-invitations de clients existants ne dupliqueront plus les fichiers
- Carina (et les autres agents) ne verront plus de fichiers fantomes
