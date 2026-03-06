

## Corrections fiche de salaire PDF

### Modifications dans `FicheSalairePDFViewer.tsx`

**1. Corriger les coordonnées de l'agence** (lignes 51-58) :
- Nom : `IMMO-RAMA.CH` (au lieu de "L'agence Immo-Rama")
- Adresse : `Chemin de l'Esparcette 5` (au lieu de Bochet 12)
- Ville : `1023 Crissier` (au lieu de 1024 Ecublens VD)
- Responsable : `Immo-Rama Crissier`
- Ajouter la ligne IDE : `IDE: CHE-442.303.796`

**2. Corriger la date** (ligne 79) : `Crissier, ...` au lieu de `Ecublens VD, ...`

**3. Ajouter le logo** en haut à droite du PDF :
- Charger `src/assets/logo-immo-rama-new.png` via `fetch` + `pdfDoc.embedPng()`
- Le dessiner au-dessus des coordonnées de l'agence, aligné à droite

**4. Améliorer les traits / séparateurs** :
- Ajouter un trait horizontal sous le header (après infos employé + agence) pour séparer proprement du contenu
- Augmenter légèrement l'espacement vertical (`y`) entre le titre et le tableau pour éviter que le texte soit trop serré sur les lignes de séparation

### Fichier concerné
- `src/components/salaires/FicheSalairePDFViewer.tsx`

