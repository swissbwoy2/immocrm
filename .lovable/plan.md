## Modifications dans `src/components/admin/AgentFinancialProjection.tsx`

### 1. Ajouter une 3ᵉ tuile « Total encaissé »
- `totalEncaisse = totalAgent + totalAgence` (somme des loyers de base, c.-à-d. la commission totale facturée).
- Tuile violette/ambre cohérente avec les deux existantes, icône `Coins` (lucide).
- Sous-titre : « Commission totale facturée par l'agence ».
- Grille passe de `md:grid-cols-2` → `md:grid-cols-3`.

### 2. Tooltips explicatifs sur chaque tuile
Utiliser le composant `Tooltip` de shadcn (`@/components/ui/tooltip`) avec un petit `Info` (lucide) à côté du titre :
- **Commission agent** : « Part versée à l'agent selon son taux personnel (commission_split). »
- **CA agence** : « Part qui reste à l'agence après avoir payé l'agent. Ce n'est pas le total facturé. »
- **Total encaissé** : « Montant total que l'agence facture au client (équivaut à un mois de loyer brut par dossier). Total = Commission agent + Part agence. »

### 3. Mini récapitulatif tabulaire en bas de la section
Sous le bloc « Détail par client » (ou juste avant la note italique), ajouter une petite carte « Récapitulatif » avec un tableau 1 ligne / 3 colonnes :

| Commission agent | Part agence | Total encaissé |
|---|---|---|
| 9 840 CHF (45%) | 12 027 CHF (55%) | 21 867 CHF (100%) |

Affiche aussi le pourcentage moyen pondéré (`totalAgent / totalEncaisse * 100`) entre parenthèses sous chaque montant pour visualiser le partage réel.

### 4. Note italique mise à jour
Préciser : « Total encaissé = somme des loyers bruts (1 mois par dossier). Il se répartit ensuite entre l'agent et l'agence selon le commission_split. »

## Fichiers touchés
- `src/components/admin/AgentFinancialProjection.tsx` uniquement (~40 lignes ajoutées).

Aucune modif DB, aucune autre page.
