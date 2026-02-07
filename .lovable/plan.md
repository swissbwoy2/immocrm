

# Adapter la FAQ au mode Location / Achat

## Probleme identifie

La section FAQ de la landing page affiche uniquement des questions/reponses liees a la **location** (300 CHF, bail, 3 mois, loyer...), meme quand le visiteur a selectionne **"Je cherche a acheter"**. C'est incoherent avec le reste de la page qui s'adapte dynamiquement (Hero, Garantie, Differenciation...).

## Solution

Creer deux jeux de FAQ distincts et afficher le bon en fonction du contexte `SearchType`, exactement comme le font deja les autres sections.

## Contenu des FAQ Achat (nouvelles)

| # | Question | Reponse (resume) |
|---|----------|-------------------|
| 1 | Combien ca coute exactement ? | Acompte 2'500 CHF, commission 1% du prix d'achat, acompte deduit de la commission |
| 2 | Dois-je signer un contrat ? | Oui, mandat de recherche de 6 mois (vs 3 mois location) |
| 3 | Comment fonctionne la garantie remboursement ? | 6 mois sans bien trouve = remboursement integral des 2'500 CHF |
| 4 | Que se passe-t-il si je trouve moi-meme ? | Aucune commission due si pas de lien avec nos recherches |
| 5 | Dans quels cantons etes-vous actifs ? | Identique : toute la Suisse romande |
| 6 | Combien de temps pour trouver en moyenne ? | 3 a 8 semaines, mandat de 6 mois |
| 7 | Comment ca marche concretement ? | Formulaire, mandat, acompte 2'500 CHF, recherche off-market + negociation |
| 8 | Comment travaillez-vous pour moi ? | Chasseur immobilier dedie, recherche, negociation, accompagnement notaire |
| 9 | Comment fonctionne la delegation de visite ? | Identique mais adapte : si le bien est achete, commission 1% |

## Modifications techniques

### Fichier modifie : `src/components/landing/FAQSection.tsx`

1. **Importer** `useSearchType` depuis `@/contexts/SearchTypeContext`
2. **Creer** un second tableau `faqItemsAchat` avec les 9 questions adaptees a l'achat
3. **Renommer** le tableau actuel en `faqItemsLocation`
4. **Dans le composant**, utiliser `const { isAchat } = useSearchType()` pour selectionner le bon tableau : `const items = isAchat ? faqItemsAchat : faqItemsLocation`
5. **Reset** les items ouverts quand le mode change (via `useEffect` sur `isAchat`)

Aucun autre fichier n'est modifie. Le pattern est identique a `GuaranteeSection` et `DifferentiationSection`.

