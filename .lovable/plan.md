## Diagnostic

La carte **"Commissions" affiche 0 CHF** alors qu'il y a 2 affaires conclues en avril (540 + 384.75 = **924.75 CHF**).

**Cause** : le code (`AgentStatsSection.tsx` lignes 75 & 199) ne compte une commission que si `commission_payee = true`. Vérification base de données :

| Date | Montant part agent | commission_payee |
|---|---|---|
| 24 avril 2026 | 540.00 CHF | **false** |
| 21 avril 2026 | 384.75 CHF | **false** |
| 24 mars 2026 | 715.50 CHF | true |
| 24 mars 2026 | 864.00 CHF | true |

Les 2 affaires d'avril ont été conclues mais la commission n'est pas encore marquée comme payée par l'agence → 0 CHF affiché. C'est conforme à la règle métier (`financial-reporting-date-logic`) mais visuellement trompeur.

## Plan de correction

### Fix — Carte "Commissions" enrichie (`src/components/stats/AgentStatsSection.tsx`)

Afficher **deux valeurs** sur la carte commissions :
- Valeur principale : commissions **encaissées** (déjà payées) — logique inchangée
- Sous-titre : commissions **dues** (conclues, en attente de paiement)

Calcul à ajouter :

```ts
const commissionsDues = currentTransactions
  .filter(t => t.statut === 'conclue' && !t.commission_payee)
  .reduce((sum, t) => sum + (t.part_agent || 0), 0);
```

Affichage dans `StatsCard` :
```tsx
<StatsCard
  title="Commissions encaissées"
  value={`${stats.commissionsGagnees.toLocaleString()} CHF`}
  description={commissionsDues > 0 ? `+${commissionsDues.toLocaleString()} CHF en attente` : undefined}
  ...
/>
```

### Résultat attendu

Pour la période contenant avril 2026 :
- **Commissions encaissées** : 0 CHF
- *Sous-titre* : "+925 CHF en attente"

L'agent comprend immédiatement qu'il a 925 CHF à recevoir, et le 0 n'est plus interprété comme un bug.

### Hors-scope

Aucune modification du modèle de données. La règle "commission comptée à la date de paiement" reste intacte (cohérent avec le reporting agence).
