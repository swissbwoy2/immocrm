## Ce qui manque aujourd’hui
La refonte précédente n’a changé que le chrome externe du formulaire.
Le rendu n’est pas encore “comme Macoloc” parce que :
- les composants de pas internes gardent encore leurs anciens en-têtes premium (icône, titre centré, serif, séparateur)
- certains pas gardent des blocs décoratifs non présents dans la référence (anneaux de progression, cartes luxe, effets beam)
- `FormulaireVendeurComplet.tsx` garde encore beaucoup de markup de section ancien directement dans la page
- le shell a été simplifié, mais pas le contenu réel des cartes

## Plan d’implémentation
1. Reprendre la structure Macoloc comme base unique pour tous les formulaires publics :
   - header très simple
   - bannière image + texte
   - bloc progression compact
   - stepper horizontal discret
   - une seule carte de contenu sobre
   - navigation collée en bas de carte

2. Nettoyer les composants premium trop “luxe” qui empêchent le rendu de ressembler à la référence :
   - alléger `PremiumFormCard`
   - simplifier `PremiumProgressBlock`
   - simplifier `PremiumStepIndicator`
   - ajuster `PremiumGuaranteeBanner` pour qu’elle suive la même densité visuelle que les screenshots

3. Refondre les pas du formulaire locataire (`src/components/mandat/MandatFormStep1.tsx` à `MandatFormStep7.tsx`) pour supprimer :
   - badges d’icône centrés
   - titres serif décoratifs
   - séparateurs décoratifs
   - blocs de progression internes non demandés
   et les remplacer par une structure plus proche Macoloc :
   - titre aligné à gauche
   - sous-texte court
   - champs groupés en grille sobre
   - sections internes fines avec séparateurs simples

4. Harmoniser les champs eux-mêmes pour coller à la direction Macoloc tout en gardant vos couleurs :
   - labels plus lisibles
   - bordures plus fines
   - focus plus net
   - hauteur et espacements homogènes
   - moins d’effets glass/beam dans les zones de saisie

5. Refondre les formulaires non locataires pour qu’ils utilisent exactement la même logique de composition :
   - `src/pages/FormulaireVendeurComplet.tsx`
   - `src/pages/FormulaireRelouer.tsx`
   - `src/pages/FormulaireConstruireRenover.tsx`
   - `src/pages/MandatV3.tsx`
   - `src/pages/NouveauMandat.tsx`

6. Pour `FormulaireVendeurComplet.tsx`, déplacer la logique visuelle encore codée dans `renderStepContent()` vers une présentation plus uniforme afin d’éviter que ce formulaire reste différent des autres.

7. Faire une passe finale d’alignement visuel sur la référence :
   - largeur de conteneur
   - marges verticales
   - taille des titres
   - densité des champs
   - aspect des blocs upload / documents
   - position et style des boutons “Précédent / Continuer”

8. Vérifier route par route dans le preview que les 5 formulaires ont bien changé en profondeur, pas seulement la bannière.

## Fichiers principalement concernés
- `src/components/forms-premium/PremiumFormCard.tsx`
- `src/components/forms-premium/PremiumProgressBlock.tsx`
- `src/components/forms-premium/PremiumStepIndicator.tsx`
- `src/components/forms-premium/PremiumGuaranteeBanner.tsx`
- `src/components/forms-premium/PremiumInput.tsx`
- `src/components/forms-premium/PremiumSelect.tsx`
- `src/components/mandat/MandatFormStep1.tsx` à `MandatFormStep7.tsx`
- `src/pages/NouveauMandat.tsx`
- `src/pages/MandatV3.tsx`
- `src/pages/FormulaireVendeurComplet.tsx`
- `src/pages/FormulaireRelouer.tsx`
- `src/pages/FormulaireConstruireRenover.tsx`

## Détails techniques
Objectif visuel : garder l’identité Logisorama (palette sombre + accents de marque) mais adopter la hiérarchie Macoloc : sobre, plate, lisible, compacte, structurée.

Concrètement, j’appliquerai cette règle :
```text
Macoloc = structure + rythme + hiérarchie
Logisorama = couleurs + contenus + champs + branding
```

Je ne toucherai pas à la logique métier ni aux validations, seulement à la structure et au rendu des formulaires.