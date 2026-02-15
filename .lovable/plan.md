

# Rapport financier des visites deleguees aux coursiers

## Probleme

Actuellement, il n'y a aucune visibilite financiere cote agent sur le cout des visites deleguees aux coursiers. L'agent est celui qui paie 100% des 5 CHF par visite deleguee, mais aucun KPI ne lui indique combien il doit ce mois-ci. Cote admin, il manque un rapport detaille par agent.

---

## 1. KPI "Solde coursier" dans le tableau de bord agent

**Fichier modifie** : `src/pages/agent/Dashboard.tsx`

Ajouter un nouveau `PremiumKPICard` dans la grille de KPIs existante (apres "Ce mois") :

- **Titre** : "Solde coursier"
- **Valeur** : Nombre de CHF a payer ce mois-ci (visites deleguees avec `statut_coursier = 'termine'` et `paye_coursier = false` du mois en cours)
- **Icone** : `Bike`
- **Variante** : `danger` si solde > 0, sinon `default`
- **Sous-titre** : "CHF (X visite(s))"

La donnee est deja chargee dans l'etat `visites` (toutes les visites de l'agent). Il suffit de filtrer :

```text
visites terminées ce mois + non payées
-> somme de remuneration_coursier (default 5)
```

## 2. Rapport financier admin par agent

**Fichier modifie** : `src/pages/admin/Coursiers.tsx`

Ajouter une nouvelle section "Solde par agent" dans la page admin coursiers :

- Un tableau listant chaque agent ayant des visites deleguees impayees
- Colonnes : Nom de l'agent, Nb visites impayees, Total a payer (CHF)
- Necessiter de joindre les visites avec les agents + profiles pour afficher les noms

La requete existante charge deja les missions avec `statut_coursier` non null. Il faudra enrichir la requete pour inclure `agent_id` et faire un groupement par agent.

Ajouter aussi un KPI global supplementaire : "Solde total agents" (somme de ce que tous les agents doivent aux coursiers).

## 3. Rapport financier cote coursier (existant mais enrichi)

**Fichier modifie** : `src/pages/coursier/Historique.tsx`

Le coursier a deja une page Historique avec les stats paid/unpaid. Ajouter un regroupement par agent pour que le coursier voie qui lui doit combien :

- Section "Solde par agent" : liste des agents avec le montant du aux coursier
- Necessite de joindre `agents` et `profiles` via `agent_id` de la visite

---

## Details techniques

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/agent/Dashboard.tsx` | Ajout KPI "Solde coursier" avec calcul depuis les visites deja chargees |
| `src/pages/admin/Coursiers.tsx` | Ajout section rapport par agent (jointure agents/profiles) + KPI supplementaire |
| `src/pages/coursier/Historique.tsx` | Ajout regroupement par agent pour le solde du |

### Calcul du solde agent (mois en cours)

```typescript
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

const visitesCoursierCeMois = visites.filter(v =>
  v.statut_coursier === 'termine' &&
  !v.paye_coursier &&
  new Date(v.date_visite) >= startOfMonth
);

const soldeCoursier = visitesCoursierCeMois.reduce(
  (sum, v) => sum + (v.remuneration_coursier || 5), 0
);
```

### Enrichissement requete admin

La requete missions dans `Coursiers.tsx` sera enrichie pour inclure les infos agent :

```typescript
supabase.from('visites')
  .select('*, offres(adresse), agents:agent_id(id, user_id, profiles:user_id(prenom, nom))')
  .not('statut_coursier', 'is', null)
```

Cela permettra de grouper les missions impayees par agent et d'afficher le nom de chaque agent.

