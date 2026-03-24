

## Déductions de base fixes + barème impôt source selon situation familiale

### Constat

D'après la fiche salaire Pereira Tavares (février 2026), les taux de déduction sont **toujours les mêmes** pour tous les employés :

| Déduction | Taux |
|---|---|
| AVS/AI/APG | 5.3% |
| AC | 1.1% |
| LPCFam VD | 0.06% |
| ANP | 1.2% |
| IJM | 0.8% |

Seul l'**impôt à la source** varie selon la situation familiale de l'employé (ex: Pereira = 8.93%, barème selon état civil + enfants).

### Modifications

#### 1. `src/lib/swissPayroll.ts` — Rendre les taux non modifiables
- Les taux sont déjà corrects dans `DEFAULT_EMPLOYEE_RATES`, pas de changement nécessaire.

#### 2. `src/components/salaires/FicheSalaireDialog.tsx` — Verrouiller les déductions
- Rendre les champs AVS, AC, AANP, IJM, LPCFam en **lecture seule** (grisés, non éditables)
- Ils sont toujours pré-remplis avec les valeurs par défaut
- Seul le champ **Impôt à la source** reste éditable (pour les permis B/F/N/L)

#### 3. `src/components/salaires/EmployeDialog.tsx` — Améliorer le sélecteur de barème
- Remplacer le select actuel `bareme_impot_source` par un sélecteur plus clair basé sur la **situation familiale** :
  - **A0** : Célibataire sans enfant
  - **A1** : Célibataire avec 1 enfant
  - **A2** : Célibataire avec 2 enfants
  - **B0** : Marié, 1 seul revenu, sans enfant
  - **B1** : Marié, 1 seul revenu, 1 enfant
  - **B2** : Marié, 1 seul revenu, 2 enfants
  - **B3** : Marié, 1 seul revenu, 3 enfants
  - **C0** : Marié, 2 revenus, sans enfant
  - **C1** : Marié, 2 revenus, 1 enfant
  - **C2** : Marié, 2 revenus, 2 enfants
  - **H1** : Famille monoparentale avec 1 enfant
  - **H2** : Famille monoparentale avec 2 enfants
  - **D** : Revenu accessoire
- Afficher ce sélecteur **pour tous les permis soumis** (B, F, N, L), avec une description claire

#### 4. `src/components/salaires/FicheSalaireDialog.tsx` — Auto-afficher le barème
- Quand un employé avec permis B est sélectionné, afficher automatiquement son barème dans la section impôt source
- Le taux reste à saisir manuellement (car il dépend du salaire annualisé dans les tables cantonales)

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/salaires/FicheSalaireDialog.tsx` | Champs déductions en readonly + affichage barème |
| `src/components/salaires/EmployeDialog.tsx` | Sélecteur barème amélioré avec descriptions claires |
| `src/lib/swissPayroll.ts` | Étendre `BAREMES_IMPOT_SOURCE` si nécessaire (déjà quasi complet) |

