

## Afficher les acomptes dans les Transactions admin + gestion des ristournes

### Problème
Les acomptes de 300 CHF payés à l'activation du mandat ne sont pas visibles dans la page Transactions admin. Ils ne sont suivis que dans `demandes_mandat`. Des clients comme Pedro, Tiago et Bintou ont payé leur acompte mais arrêté leur recherche — ces montants doivent apparaître comme revenus acquis. De plus, il faut pouvoir ristourner l'acompte après 3 mois sans succès (comme pour El Hadi).

### Solution

#### 1. Nouvelle table `acomptes` (migration SQL)
Créer une table dédiée pour centraliser le suivi des acomptes :

| Colonne | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `client_id` | UUID | FK vers clients |
| `agent_id` | UUID | FK vers agents (nullable) |
| `montant` | NUMERIC | 300 CHF par défaut |
| `date_paiement` | TIMESTAMPTZ | Date de paiement de l'acompte |
| `statut` | TEXT | `paye`, `acquis`, `ristourne` |
| `date_ristourne` | TIMESTAMPTZ | Date du remboursement (si applicable) |
| `notes` | TEXT | Notes libres |
| `demande_mandat_id` | UUID | FK vers demandes_mandat |
| `created_at` | TIMESTAMPTZ | Auto |

+ RLS policies pour admin uniquement
+ Migration de rattrapage : insérer les acomptes existants depuis `demandes_mandat` (clients avec `date_paiement` renseignée)

#### 2. `src/pages/admin/Transactions.tsx` — Ajouter section Acomptes
- Charger les acomptes depuis la nouvelle table
- Ajouter des KPIs en haut :
  - **Acomptes encaissés** : total des acomptes payés
  - **Acomptes acquis** : ceux des clients ayant arrêté sans ristourne
  - **Ristournes** : total remboursé
- Ajouter un onglet/section "Acomptes" listant chaque acompte avec :
  - Nom du client + agent
  - Date de paiement
  - Statut (Payé / Acquis / Ristourné)
  - Bouton **"Ristourner"** : passe le statut à `ristourne` avec date

#### 3. Bouton Ristourne
- Dialog de confirmation avec sélection de date
- Met à jour `statut = 'ristourne'` et `date_ristourne`
- Logique métier : proposé automatiquement si le mandat a expiré (3 mois écoulés) sans renouvellement et sans bail signé

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| Nouvelle migration SQL | Table `acomptes` + RLS + rattrapage données |
| `src/pages/admin/Transactions.tsx` | Section acomptes avec KPIs, liste et bouton ristourne |

