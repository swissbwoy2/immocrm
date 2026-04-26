## Objectif
Refondre l’étape d’upload des documents pour qu’elle ressemble réellement à votre référence : de vraies zones d’upload visuelles, avec aperçu, état validé, et un traitement spécial recto/verso pour la pièce d’identité et le permis de séjour.

## Ce qui sera changé
1. Remplacer la liste actuelle de lignes + bouton « Charger » dans `MandatFormStep6.tsx` par une structure type Macoloc :
   - titre principal + sous-texte
   - sous-sections de documents
   - grandes zones d’upload encadrées
   - aperçu du fichier après upload
   - état visuel validé
   - actions claires: Photo, Fichier, supprimer

2. Créer un composant d’upload plus riche pour les formulaires publics, réutilisable, qui gère :
   - zone vide avec bordure pointillée
   - glisser-déposer / clic
   - bouton fichier
   - bouton photo
   - aperçu image/PDF
   - état chargé / validé / suppression

3. Traiter séparément les documents d’identité selon le besoin réel :
   - `piece_identite`: bloc avec deux cases obligatoires `Recto` + `Verso`
   - `permis_sejour`: bloc avec deux cases obligatoires `Recto` + `Verso`
   - affichage conditionnel selon `type_permis` choisi à l’étape 1
   - si profil suisse/autre sans permis de séjour: on affiche la pièce d’identité
   - si permis B/C/F/N: on affiche le permis de séjour

4. Conserver votre logique métier existante autant que possible :
   - pas de changement backend obligatoire
   - on garde `documents_uploades` côté mandat
   - au moment de sauvegarder, les deux faces seront regroupées proprement pour rester compatibles avec le reste de l’app

## Structure visée
```text
Documents à fournir
Sous-texte explicatif

Documents administratifs
- Extrait des poursuites → 1 grande zone d’upload
- 3 fiches de salaire → 1 grande zone multi-fichiers ou 3 zones harmonisées

Identité
- Carte d’identité (recto) / Permis de séjour (recto)
- Carte d’identité (verso) / Permis de séjour (verso)
Chaque case:
  aperçu
  bouton Photo
  bouton Fichier
  bouton supprimer
  état validé
```

## Fichiers concernés
- `src/components/mandat/MandatFormStep6.tsx`
- `src/components/scanner/DocumentUploadField.tsx`
- `src/components/scanner/UniversalDocumentScanner.tsx`
- `src/hooks/useNativeCamera.ts` (si ajustement UX nécessaire)
- éventuellement un nouveau composant dédié du type `PremiumDocumentUploadCard.tsx`

## Détails techniques
- Le composant actuel `DocumentUploadField` sait déjà gérer le recto/verso, mais son UI est trop minimale. Je vais le faire évoluer vers une présentation par cartes, avec aperçu et actions séparées.
- Pour l’identité/permis, je ne vais pas me contenter d’un seul fichier fusionné visible en bloc: l’interface montrera bien les deux faces séparément, comme sur votre screenshot.
- Pour rester compatible avec le reste de l’application, la persistance restera mappée vers les types de documents existants (`piece_identite`, `permis_sejour`, `fiche_salaire`, `extrait_poursuites`).
- Je vérifierai aussi les écrans qui relisent ces documents (`client/Documents`, calculs de complétude, chance indicator) afin d’éviter de casser les stats existantes.

## Résultat attendu
Après implémentation, l’étape documents ne sera plus une simple liste avec bouton « Charger ». Elle ressemblera à votre référence :
- zones d’upload visuelles
- preview immédiate
- workflow photo/fichier
- recto/verso explicite pour identité et permis de séjour
- rendu premium avec vos couleurs Logisorama, mais structuré comme Macoloc.