## Objectif

Reproduire le bloc **"Budget locatif indicatif"** de Macoloc dans le formulaire `/nouveau-mandat`, étape **Situation financière** (Step 3). Dès que le client saisit son **revenu mensuel net (CHF)**, un encadré vert/doré apparaît dynamiquement avec :

1. Le **loyer maximum recommandé** (revenu / 3, règle suisse standard)
2. Le **nombre de pièces conseillé** (estimation indicative basée sur le budget)
3. Une **note d'information** rappelant qu'un garant, co-locataire ou revenus complémentaires peuvent augmenter ce budget

---

## Logique de calcul (règle 1/3 suisse)

```ts
const budgetMax = Math.floor(revenus_mensuels / 3);
// Estimation pièces conseillé : ~600 CHF / pièce en moyenne suisse
const piecesConseille = Math.max(1, Math.round((budgetMax / 600) * 2) / 2); // arrondi 0.5
```

Le bloc ne s'affiche que si `revenus_mensuels >= 1000` (évite affichage parasite pendant la saisie).

---

## Modifications

### 1. `src/components/mandat/MandatFormStep3.tsx`

- Insérer un nouveau composant interne `BudgetIndicatifCard` juste **après** le champ "Revenu mensuel net (CHF)" (après la ligne 69)
- Le bloc occupe `md:col-span-2` (pleine largeur de la grille)
- Style aligné avec la charte Logisorama (palette dorée `hsl(38_45%_48%)`) plutôt que vert Macoloc, pour rester cohérent avec le reste du formulaire
- Affichage conditionnel : visible uniquement si `data.revenus_mensuels >= 1000`

### Structure visuelle du bloc

```
┌─────────────────────────────────────────────┐
│ 📈  Budget locatif indicatif                │
│                                             │
│  1'667  CHF / mois                          │
│                                             │
│  🏠  Nombre de pièces conseillé : 2.5 pièces│
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 👥 Vous avez un garant, un co-loca... │  │
│  │    augmenter votre budget.            │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- Bordure dorée `border-[hsl(38_45%_48%/0.4)]`
- Fond légèrement teinté `bg-[hsl(38_45%_48%/0.07)]`
- Montant en gros (`text-3xl font-bold`) couleur dorée
- Icône `TrendingUp` (lucide) pour le titre
- Icône `Home` pour les pièces
- Icône `Users` pour la note d'information
- Note dans un sous-bloc avec fond plus sombre

### Format du montant

Utiliser le séparateur de milliers suisse (apostrophe) : `1'667` via `toLocaleString('fr-CH')`.

---

## Fichier édité

- `src/components/mandat/MandatFormStep3.tsx` (insertion du composant `BudgetIndicatifCard` + appel conditionnel)

Aucun autre fichier impacté. Aucune modification backend ni de schéma de données.