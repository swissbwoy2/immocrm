

# Ajouter le tracking UTM sur le formulaire de mandat (/nouveau-mandat)

## Probleme

Les clients comme Voncicia Ngoma qui arrivent directement sur `/nouveau-mandat` depuis une pub Facebook ne sont pas traces car le formulaire de mandat n'enregistre pas les parametres UTM. Seuls les formulaires de la landing page (QuickLeadForm, DossierAnalyseSection) capturent ces donnees.

## Solution

### 1. Ajouter 5 colonnes UTM a la table `demandes_mandat`

Migration SQL pour ajouter :
- `utm_source` (text, nullable)
- `utm_medium` (text, nullable)
- `utm_campaign` (text, nullable)
- `utm_content` (text, nullable)
- `utm_term` (text, nullable)

### 2. Modifier `src/pages/NouveauMandat.tsx`

- Importer le hook `useUTMParams`
- Appeler `useUTMParams()` dans le composant
- Ajouter les 5 champs UTM dans l'objet `insertData` (ligne ~189) lors de l'insert dans `demandes_mandat`

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajout de 5 colonnes UTM a `demandes_mandat` |
| `src/pages/NouveauMandat.tsx` | Import `useUTMParams` + ajout des UTM dans l'insert |

## Pattern existant

Le meme pattern est deja utilise dans 3 autres formulaires (`QuickLeadForm`, `DossierAnalyseSection`, `FormulaireVendeurComplet`). On reproduit exactement la meme approche pour rester coherent.

