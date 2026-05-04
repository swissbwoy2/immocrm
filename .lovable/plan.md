# Pièce d'identité recto/verso non transférée au dossier client (route /nouveau-mandat)

## Cause racine

Le formulaire `/nouveau-mandat` (page `src/pages/NouveauMandat.tsx`, étape `MandatFormStep6`) enregistre dans `documents_uploades` les fichiers avec les types **`piece_identite_recto`**, **`piece_identite_verso`**, **`permis_sejour_recto`**, **`permis_sejour_verso`** (et `salaire1`, `salaire2`, `salaire3`, `poursuites`).

À la soumission, l'edge function **`invite-client`** :

1. Crée le compte client + la ligne `clients`
2. Boucle sur `demandes_mandat.documents_uploades` pour les copier dans la table `documents` via `mapDocumentType()` (ligne 26-35 de `supabase/functions/invite-client/index.ts`) :

```ts
const typeMapping: Record<string, string> = {
  'poursuites': 'extrait_poursuites',
  'salaire1': 'fiche_salaire',
  'salaire2': 'fiche_salaire',
  'salaire3': 'fiche_salaire',
  'identite': 'piece_identite',          // ← legacy unique
};
return typeMapping[formType] || formType; // fallback = type tel quel
```

Aucune entrée pour `piece_identite_recto`, `piece_identite_verso`, `permis_sejour_recto`, `permis_sejour_verso`. Le fallback retourne donc `piece_identite_recto` tel quel et l'INSERT échoue silencieusement à cause du `CHECK CONSTRAINT` sur `documents.type_document` qui accepte uniquement :

```text
fiche_salaire, extrait_poursuites, piece_identite, attestation_domicile,
rc_menage, contrat_travail, attestation_employeur, copie_bail,
attestation_garantie_loyer, dossier_complet, autre
```

L'erreur est uniquement loguée (`console.error('Error transferring document'...)`) sans bloquer l'invitation : le client est créé, l'email part, **mais aucune pièce d'identité n'arrive dans son dossier**.

Vérifié en base : les 4 dernières demandes contiennent bien `permis_sejour_recto` / `permis_sejour_verso` ou `piece_identite_recto` / `piece_identite_verso` dans `documents_uploades`, mais ces types ne sont jamais mappés.

## Plan de correction

### 1. Étendre le mapping dans `invite-client/index.ts`

```ts
const typeMapping: Record<string, string> = {
  'poursuites': 'extrait_poursuites',
  'salaire1': 'fiche_salaire',
  'salaire2': 'fiche_salaire',
  'salaire3': 'fiche_salaire',
  'identite': 'piece_identite',
  'piece_identite_recto': 'piece_identite',
  'piece_identite_verso': 'piece_identite',
  'permis_sejour_recto': 'piece_identite',
  'permis_sejour_verso': 'piece_identite',
};
```

`permis_sejour_*` est rangé dans `piece_identite` (rien d'autre n'est valide côté CHECK et c'est sémantiquement correct : c'est bien une pièce d'identité).

### 2. Préserver la distinction recto/verso dans le nom du fichier

Sans modifier le CHECK (risqué et invasif), on encode l'info recto/verso dans la colonne `nom` lors de l'INSERT pour que les deux entrées coexistent et soient lisibles côté UI :

```ts
const isRecto = doc.type.endsWith('_recto');
const isVerso = doc.type.endsWith('_verso');
const suffix = isRecto ? ' (recto)' : isVerso ? ' (verso)' : '';
const displayName = doc.name.replace(/(\.[^.]+)?$/, (ext) => `${suffix}${ext}`);
```

Cela respecte aussi la déduplication existante (`existingDocKeys` basé sur `nom_type_document`) car les deux noms diffèrent.

### 3. Améliorer la robustesse / observabilité

- Logger explicitement les types non mappés tombant sur un fallback inconnu
- Ajouter un compteur de docs transférés dans la réponse JSON
- Renvoyer un statut `partial_documents_transfer` si au moins un INSERT échoue (le frontend l'ignore aujourd'hui mais utile pour les futures alertes admin)

### 4. Backfill des demandes passées

Les 4+ demandes récentes (`qaisariqbal98@…`, `b.bbeqa1@…`, `khodadaar@…`, `lussner@…`, `bytyqi.bleon@…`) ont des clients créés sans pièces d'identité. Plan :

- Script SQL/edge ponctuel : pour chaque `demandes_mandat` dont l'email correspond à un `clients`, lire `documents_uploades`, filtrer les types `piece_identite_*` / `permis_sejour_*`, et INSERT manuellement dans `documents` avec le mapping corrigé
- Vérifier ensuite côté UI admin que les recto/verso apparaissent bien dans le dossier de chaque client

## Fichiers impactés

- `supabase/functions/invite-client/index.ts` (mapping + nom + logs)
- Aucune migration SQL nécessaire (le CHECK reste tel quel)
- Backfill : peut être exécuté via une simple requête SQL d'`INSERT ... SELECT` au moment de l'application du fix

## Hors scope (pour information)

- Aucune modification de `MandatFormStep6.tsx` : c'est lui la source de vérité du nommage `piece_identite_recto` / `piece_identite_verso` qui sert aussi à la validation côté UI (`validateStep` ligne 91 de `NouveauMandat.tsx`). Le toucher casserait la validation et la progression.
- Le module Mandat V3 (`/mandat-v3`) a son propre flux indépendant et n'est pas concerné.
