## Correction : recto/verso uniquement pour pièce d'identité et permis de séjour

### Contexte
Lors de la dernière implémentation, j'ai marqué `true` pour TOUS les types de documents dans `DOCUMENT_REQUIRES_RECTO_VERSO`. C'est une erreur. Tu veux uniquement :

- **Recto + verso obligatoire** : `piece_identite`, `permis_sejour`
- **Tous les autres** (`permis_conduire`, `fiche_salaire`, `extrait_poursuites`, `attestation_employeur`, `bail`, `autre`) : un seul fichier suffit, mais le bouton "Scanner" reste dispo pour produire un PDF propre.

### Changement à faire

**1 seul fichier modifié : `src/config/documentTypes.ts`**

```ts
export const DOCUMENT_REQUIRES_RECTO_VERSO: Record<DocumentType, boolean> = {
  piece_identite: true,      // ✅ recto + verso
  permis_sejour: true,       // ✅ recto + verso
  permis_conduire: false,    // ❌ un seul fichier
  fiche_salaire: false,      // ❌ un seul fichier
  extrait_poursuites: false, // ❌ un seul fichier
  attestation_employeur: false,
  bail: false,
  autre: false,
};
```

### Comportement résultant

Le composant `DocumentUploadField` (déjà construit) gère déjà les deux cas automatiquement via `requiresRectoVerso(type)` :

- **Pour `piece_identite` / `permis_sejour`** :
  - Bouton "Scanner" → guide l'utilisateur "Page 1 (recto)" puis "Page 2 (verso)" → fusion PDF
  - Bouton "Téléverser" → exige 2 fichiers, les fusionne en PDF
  - Bandeau d'avertissement "Recto et verso obligatoires"

- **Pour tous les autres documents** :
  - Bouton "Scanner" → capture une seule page → PDF propre
  - Bouton "Téléverser" → un seul fichier accepté
  - Pas de bandeau d'avertissement, pas de blocage

### Périmètre

- **Modifié (1)** : `src/config/documentTypes.ts` (changer 6 valeurs `true` → `false`)
- **Aucun autre fichier impacté** : la logique du composant universel ne change pas, elle lit déjà la config.
- **Aucune migration DB**.

### Étape suivante (à confirmer après cette correction)

Une fois cette correction validée, je peux enchaîner l'intégration de `DocumentUploadField` dans les fichiers d'upload restants (déjà listés dans le plan précédent : `client/Documents.tsx`, `CandidateDocumentsSection.tsx`, `agent/ClientDetail.tsx`, `admin/ClientDetail.tsx`, etc.) pour que partout dans l'app on ait le bouton "Scanner".
