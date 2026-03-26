

## Figer la barre de progression et ajouter des boutons de gestion de statut (Clients admin)

### Problème
Dans `/admin/clients` (liste) et `/admin/clients/:id` (détail), la barre de progression et le compteur J+ continuent d'avancer même pour les clients relogés, stoppés ou suspendus. De plus, il n'y a pas de boutons d'action pour changer le statut d'un client (stopper, suspendre, marquer relogé). La page Mandats a déjà cette logique — il faut l'étendre aux pages Clients.

### Solution

#### 1. `src/pages/admin/Clients.tsx` — Figer la barre + badges statut

- **Calcul figé** : Quand `client.statut` est `reloge`, `stoppe` ou `suspendu`, utiliser `client.updated_at` (ou date de changement de statut) comme `endDate` dans `calculateDaysElapsed` pour figer le compteur J+
- **Couleur de la barre** : emerald pour relogé, amber pour suspendu, rouge pour stoppé (même logique que Mandats)
- **Badge statut** sur la carte : afficher un badge ✅ Relogé / ⏸️ Suspendu / ⛔ Stoppé comme dans Mandats
- **Ajouter `stoppe` et `suspendu`** aux `statutOptions` et `statutLabels` pour le filtrage

#### 2. `src/pages/admin/ClientDetail.tsx` — Figer la barre + boutons d'action

- **Étendre la logique de freeze** : Actuellement seul le statut `reloge` (via candidature) fige la barre. Ajouter `stoppe` et `suspendu` : si `client.statut` est l'un de ces deux, figer la barre avec la même UI que relogé (avec couleur différente)
- **Ajouter 3 boutons d'action** dans la zone des boutons existants :
  - **Suspendre** (⏸️ amber) : met `statut = 'suspendu'`
  - **Stopper** (⛔ destructive) : met `statut = 'stoppe'`  
  - **Réactiver** (🔄 vert) : remet `statut = 'actif'` (visible uniquement si suspendu/stoppé)
- Chaque bouton avec un dialog de confirmation
- Mise à jour via `supabase.from('clients').update({ statut })` + toast de succès

#### 3. Ajout d'un champ `date_changement_statut` (migration SQL)

- Ajouter une colonne `date_changement_statut TIMESTAMPTZ` à la table `clients` pour enregistrer précisément quand le statut a changé (utilisé comme `endDate` pour figer le compteur)
- Migration de rattrapage : pour les clients déjà `reloge`/`stoppe`/`suspendu`, remplir avec `updated_at`

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| Nouvelle migration SQL | Ajout colonne `date_changement_statut` + rattrapage |
| `src/pages/admin/Clients.tsx` | Figer barre/J+ pour statuts spéciaux, badges, filtres étendus |
| `src/pages/admin/ClientDetail.tsx` | Figer barre pour stoppe/suspendu, boutons Suspendre/Stopper/Réactiver |

