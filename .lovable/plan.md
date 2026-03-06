

## Plan — Intégrer les gains coursier dans la fiche de salaire

### Problème
Guy Whilter est un coursier avec `mode_remuneration = 'commission'`. Le système cherche ses gains dans la table `transactions` (via `agents`), mais un coursier n'est pas un agent — ses gains viennent de la table `visites` (5 CHF par visite terminée). Résultat : le champ "Total commissions" affiche 0 CHF et est grisé, alors qu'il a 60 CHF de gains (12 visites).

### Solution

**1. Ajouter un mode de rémunération `coursier`** dans `src/lib/swissPayroll.ts` :
- Ajouter `'coursier'` au type `ModeRemuneration`
- Ajouter le label `'Coursier'` dans `MODE_REMUNERATION_LABELS`

**2. Mettre à jour la DB** : changer le `mode_remuneration` de Guy Whilter de `'commission'` à `'coursier'` via migration.

**3. Modifier `FicheSalaireDialog.tsx`** :
- Ajouter une query dédiée qui récupère les visites terminées (`statut_coursier = 'termine'`) pour le mois/année sélectionné, via la table `coursiers` (liée par `user_id`)
- Afficher la liste des missions (adresse, date, 5 CHF chacune) comme pour les commissions
- Le total des gains coursier alimente `salaire_base`
- Traiter le mode `coursier` comme `commission` pour les déductions sociales

**4. Mettre à jour `EmployeDialog.tsx`** : ajouter l'option "Coursier" dans le select de mode de rémunération.

### Fichiers modifiés
| Fichier | Action |
|---------|--------|
| `src/lib/swissPayroll.ts` | Ajouter type + label `coursier` |
| `src/components/salaires/FicheSalaireDialog.tsx` | Query visites + affichage missions coursier |
| `src/components/salaires/EmployeDialog.tsx` | Option "Coursier" dans le select |
| Migration SQL | `UPDATE employes SET mode_remuneration = 'coursier' WHERE id = '3ab93bdd-...'` |

