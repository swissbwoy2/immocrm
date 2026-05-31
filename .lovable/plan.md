
## Objectif

Générer **un flyer A4 portrait** (1280×1810, PNG haute résolution) qui reprend **exactement** le contenu de l'infographie jointe, mais habillé avec **la direction visuelle de la landing page Logisorama** (palette luxury noir/or, typographie serif élégante) — pas le style bleu marine / vert / sans-serif de l'original.

## Direction visuelle (issue de la landing page)

- **Fond** : noir profond `#0e0c0a` avec subtil mesh doré
- **Or principal** : `#d4a857` (titres, accents, montants, icônes ✓)
- **Or foncé** : `#b8893d` (dégradés CTA)
- **Texte clair** : `#f5f0e0` (corps), `#a89878` (secondaire)
- **Cartes** : noir translucide `#1a1612` avec bordure or 1px à 30 % d'opacité, coins arrondis 16 px
- **Typographie** :
  - Titres → **Playfair Display** (serif, comme la landing)
  - Corps → **Inter** (sans-serif, comme la landing)
- **Icônes** : cercles dorés avec ✓ noir, style identique aux cartes de la landing (Activation / Succès / Garantie)

## Contenu (repris à l'identique de l'image)

1. **En-tête** : `Logisorama.ch` + titre « Grille tarifaire claire et simple » + sous-titre « Comprenez en 30 secondes comment fonctionne notre tarification »
2. **3 cartes principales** :
   - **1. Activation de la recherche** — CHF 300.– / paiement unique / active 90 jours / sans activation pas de recherche
   - **2. Si vous signez un bail** — commission 1 mois de loyer brut / CHF 300 déduits / solde restant + encadré exemple (Loyer 1'800 / Commission 1'800 / Acompte 300 / Solde 1'500)
   - **3. Si aucun logement trouvé après 90 jours** — remboursement 100 % / vous récupérez CHF 300.– / garantie résultat
3. **Schéma ultra simple** : Étape 1 (activez · CHF 300) → Étape 2 (recherche · 90 jours) → Résultat ? → 2 issues (Bail signé / Aucun bail après 90 jours)
4. **Encart « Important »** : si annulation avant 90 jours, acompte non remboursé (avec icône ⚠ dorée)
5. **« À retenir »** : 3 points clés (300 pour démarrer, 1 mois loyer si bail, remboursement après 90 jours)
6. **Bandeau bas CTA** : « Activez votre recherche sur Logisorama.ch » + « Service premium de recherche de logement en Suisse romande »

## Méthode technique

- Génération via `imagegen--generate_image` modèle **`premium`** (texte légible obligatoire pour un flyer)
- Format : **1280 × 1810** (ratio A4 portrait)
- Sortie : `/mnt/documents/flyer-tarification-logisorama.png`
- Prompt détaillé encodant : palette exacte (hex), typographie (Playfair + Inter), structure 3 colonnes + schéma + encart + CTA, tout le texte FR à l'identique
- **QA obligatoire** : relecture visuelle du PNG généré (texte coupé, alignements, fautes, contraste). Si défaut → 2e itération `flyer-tarification-logisorama_v2.png`
- Livraison via `<presentation-artifact>` pour téléchargement direct

## Hors scope

- Pas de modification du code de la landing page
- Pas de nouvelle page web : c'est un **fichier PNG téléchargeable**, pas un composant React
- Pas de version multilingue (FR uniquement, comme l'original)
