## Objectif
Remettre le site public en version claire et lisible, sans brun résiduel, sans cartes/bulles vertes non voulues, avec texte visible partout, et avec un hero mobile correctement cadré.

## Ce que je vais corriger
1. Revenir sur les overrides CSS trop globaux
- Nettoyer `src/index.css` pour supprimer les règles “nuclear” qui recolorent trop d’éléments par simple motif `hsl(...)`.
- Garder uniquement des règles ciblées pour les rares composants qui doivent vraiment être recolorés.
- Éviter que des cartes, badges, formulaires et bulles passent en vert par accident.

2. Corriger les vraies sources des couleurs section par section
- `src/components/public-site/sections/AppShowcaseSection.tsx`
  - Remplacer les couleurs doré/brun codées en dur des barres de progression.
  - Remettre un fond clair propre sur la carte de features.
- `src/components/public-site/sections/BudgetCalcSection.tsx`
  - Corriger le bouton “Calculer mon budget” et les panneaux résultat pour retrouver un contraste net.
  - Supprimer les halos/fonds verts non voulus dans le bloc de droite.
- `src/components/public-site/sections/DossierAnalyseForm.tsx`
  - Remplacer le fond sombre restant.
  - Rendre tous les labels, radios, champs, textes d’aide et CTA parfaitement lisibles.
- `src/components/public-site/sections/GuaranteeSection.tsx`
  - Enlever le fond beige/brun du badge “Garantie 100% remboursé”.
  - Passer sur fond blanc / très léger vert d’eau si nécessaire, avec texte foncé.
- `src/components/public-site/sections/CoverageSection.tsx`
  - Supprimer les fonds verts indésirables dans les bulles/cantons.
  - Garder uniquement les accents bleu-vert demandés, sans aplats parasites.
- `src/components/public-site/sections/HeroSection.tsx`
  - Corriger le cadrage mobile de l’image du split.
  - D’abord via réglage responsive de cadrage (`object-position` / comportement mobile dédié) sans changer le split.

3. Hero mobile
- Je garde le split actuel.
- Je corrige le cadrage mobile avec une version responsive du hero.
- Si l’image source actuelle ne permet pas un bon cadrage en mobile, l’étape suivante sera d’ajouter une version mobile 9:16 dédiée, mais seulement si nécessaire.

4. Vérification
- Vérifier le rendu en mobile et desktop sur les zones signalées :
  - hero
  - barres de progression
  - calculateur
  - formulaire dossier
  - bloc garantie
  - bloc couverture
- Confirmer qu’il ne reste plus de brun, ni de texte illisible, ni de fonds verts injectés par erreur.

## Résultat attendu
- Site 100% clair
- Texte bleu-vert foncé lisible partout
- Plus aucun brun/beige
- Plus aucune bulle/carte verte non voulue
- Hero mobile bien cadré sans casser l’effet split

## Détails techniques
- Fichier principal à assainir : `src/index.css`
- Fichiers à corriger de manière ciblée :
  - `src/components/public-site/sections/HeroSection.tsx`
  - `src/components/public-site/sections/AppShowcaseSection.tsx`
  - `src/components/public-site/sections/BudgetCalcSection.tsx`
  - `src/components/public-site/sections/DossierAnalyseForm.tsx`
  - `src/components/public-site/sections/GuaranteeSection.tsx`
  - `src/components/public-site/sections/CoverageSection.tsx`

## Note de méthode
Je ne vais plus recolorer le site avec des sélecteurs globaux basés sur des fragments `hsl(...)`. Je vais remettre des styles explicites, composant par composant, pour éviter exactement ce type de régression.