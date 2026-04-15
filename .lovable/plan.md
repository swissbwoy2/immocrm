

# Génération du PDF de livraison — Module Rénovation Intelligente

## Objectif
Générer un PDF premium professionnel à partir du contenu de livraison fourni, au format A4 avec branding Logisorama.

## Réalisation technique

**Script Python** avec `reportlab` (Platypus) :
- Format A4, marges 2cm
- Page de garde : "Logisorama by Immo-rama.ch", module, date, statut, IDE CHE-442.303.796
- 12 sections numérotées avec titres bleu foncé
- Tableaux pour : statuts par lot (section 2), tables livrées (section 5), Edge Functions (section 7)
- Listes à puces avec checkmarks ✓
- Pied de page : numéro de page + "Confidentiel"
- Police Helvetica (built-in reportlab)

**Output** : `/mnt/documents/livraison-renovation-intelligente.pdf`

## QA obligatoire
- Conversion PDF → images via `pdftoppm`
- Inspection visuelle de chaque page
- Correction si texte coupé, tableaux désalignés ou mise en page cassée

## Étapes
1. Écrire le script Python complet dans `/tmp/gen_livraison.py`
2. Installer reportlab si nécessaire
3. Exécuter le script
4. QA visuelle sur toutes les pages
5. Livrer l'artifact final

