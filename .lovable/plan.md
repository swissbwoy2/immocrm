
# Multi-sélection clients + actions groupées sur `/admin/clients`

## Objectif

Permettre à l'admin de sélectionner plusieurs clients dans la grille `/admin/clients` et d'appliquer une action en lot (supprimer, stopper, suspendre, réactiver, marquer relogé, marquer inactif).

## Constat actuel

`src/pages/admin/Clients.tsx` (1 383 lignes) :
- Grille de cartes clients (`sortedClients.slice(0, displayCount).map(...)` ligne 848).
- Suppression individuelle via `handleDeleteClient` qui appelle l'edge function `delete-client`.
- Suppression globale via `delete-all-clients` (bouton "Tout supprimer" déjà existant).
- Statuts disponibles (ligne 282) : `actif`, `en_attente`, `reloge`, `stoppe`, `suspendu`, `inactif`.
- Pas de mode multi-sélection.

## Correctif

### 1. État de sélection (dans `Clients.tsx`)

Ajouter :
```ts
const [selectionMode, setSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // client.id
const [bulkActionDialog, setBulkActionDialog] = useState<null | 'delete' | 'statut'>(null);
const [bulkStatutValue, setBulkStatutValue] = useState<string>('stoppe');
const [bulkLoading, setBulkLoading] = useState(false);
```

Helpers : `toggleSelect(id)`, `selectAllVisible()`, `clearSelection()`, `exitSelectionMode()` (vide la sélection + sort du mode).

### 2. Toggle mode sélection dans la barre d'actions

À côté du bouton "Tout supprimer" existant, ajouter un bouton :
- **« Sélectionner »** (icône `CheckSquare`) → active `selectionMode`.
- En mode actif, remplacer par **« Annuler »** (icône `X`).

### 3. Carte client : checkbox de sélection

Dans la grille (ligne 847+) :
- Quand `selectionMode === true`, afficher un `<Checkbox>` (shadcn) en haut-gauche de chaque carte (overlay absolute, z-index élevé).
- Le clic sur la carte en mode sélection ne navigue plus vers le détail mais toggle la sélection.
- Le clic ailleurs sur la carte est intercepté avec `stopPropagation` quand on clique la checkbox.
- Les boutons d'action individuels existants (supprimer carte, inviter) sont **désactivés** visuellement en mode sélection.
- Style visuel : carte sélectionnée → `ring-2 ring-primary` + léger `bg-primary/5`.

### 4. Barre d'actions flottante (apparaît en mode sélection)

Composant fixe en bas de viewport (sticky bottom, mobile-friendly, safe-area-inset-bottom) :
```
┌──────────────────────────────────────────────────────┐
│ ✓ 5 sélectionné(s)  [Tout]  [Aucun]  | [Statut ▾] [🗑 Supprimer] [Annuler] │
└──────────────────────────────────────────────────────┘
```

- **Tout** : sélectionne tous les `sortedClients` visibles (`displayCount`).
- **Aucun** : `clearSelection()`.
- **Statut ▾** : ouvre un menu déroulant `DropdownMenu` avec les options (Actif, Stoppé, Suspendu, Relogé, Inactif, En attente). Sélection → ouvre dialog de confirmation.
- **🗑 Supprimer** : ouvre `AlertDialog` de confirmation rouge.
- **Annuler** : sort du mode sélection.

Style : `Card` avec `shadow-2xl border-primary/30`, `backdrop-blur`, animé (slide-up via framer-motion).

### 5. Dialogs de confirmation

**Suppression groupée** (`AlertDialog`) :
- Titre : « Supprimer N client(s) ? »
- Description : action irréversible, suppression du compte auth, des candidatures, des documents.
- Confirmation → boucle parallèle (Promise.all par batch de 5) sur l'edge function existante `delete-client` (un appel par `user_id`). Toast de progression (« 3/5 supprimés… »), puis toast final.
- Recharge `loadData()` à la fin.

**Changement de statut groupé** (`AlertDialog`) :
- Titre : « Passer N client(s) au statut "X" ? »
- Description adaptée au statut (ex. « Stoppé : le suivi de mandat est gelé, l'acompte est conservé »).
- Confirmation → `supabase.from('clients').update({ statut: bulkStatutValue, date_changement_statut: new Date().toISOString() }).in('id', [...selectedIds])`.
- Si `statut = 'actif'` après gel → ne pas réinitialiser `date_ajout` (rester cohérent avec le suivi mandat existant — voir mémoire `mandate-progress-tracking`).
- Toast récapitulatif, `loadData()`, `exitSelectionMode()`.

### 6. UX détails

- Le compteur existant « N client(s) trouvé(s) » devient « N affiché(s) · M sélectionné(s) » en mode sélection.
- Le mode sélection est **automatiquement désactivé** si la liste filtrée change (changement de filtre/recherche) pour éviter une sélection incohérente → `useEffect` qui appelle `clearSelection()` quand `sortedClients` change de longueur de manière significative (optionnel, à valider par l'usage).
- Sur mobile (viewport ≤ 640px), la barre flottante reste lisible : actions principales (Supprimer, Statut) + menu `⋯` pour le reste.
- Empêcher la sélection de plus de 50 clients en une fois (garde-fou anti-erreur) — toast d'avertissement au-delà.

### 7. Aucun changement DB / Edge Function

- Réutilisation des edge functions existantes :
  - `delete-client` (un appel par client, pas de batch côté serveur — suffisant pour ≤ 50 clients).
- Update statut directement via le client Supabase (RLS admin déjà en place sur `clients`).

## Fichiers touchés

```text
[MOD] src/pages/admin/Clients.tsx
      - states: selectionMode, selectedIds, bulkActionDialog, bulkStatutValue, bulkLoading
      - helpers: toggleSelect, selectAllVisible, clearSelection, exitSelectionMode
      - bouton "Sélectionner / Annuler" dans la barre d'actions
      - <Checkbox> overlay sur chaque carte en mode sélection
      - intercept onClick carte pour toggle au lieu de naviguer
      - barre d'actions flottante sticky bottom
      - AlertDialog suppression groupée (boucle delete-client)
      - AlertDialog changement statut groupé (update Supabase .in)
      - cleanup auto sélection au changement de filtres
```

Aucun nouveau composant fichier requis (tout intégré dans `Clients.tsx` pour rester cohérent avec l'architecture actuelle de la page). Si la page devient trop lourde, extraction possible dans un second temps vers `src/components/admin/clients/BulkActionsBar.tsx`.

## Validation

1. Sur `/admin/clients`, cliquer **« Sélectionner »** → checkboxes apparaissent sur toutes les cartes.
2. Cliquer 3 cartes → compteur passe à « 3 sélectionné(s) », barre flottante apparaît.
3. Cliquer **« Tout »** → toutes les cartes visibles sélectionnées.
4. Choisir **Statut → Stoppé** → confirmer → les 3 clients passent à `stoppe` (badge mis à jour, suivi de mandat gelé conformément à la mémoire `mandate-progress-tracking`).
5. Resélectionner 2 clients → **🗑 Supprimer** → confirmer → toast progression, les 2 clients disparaissent de la liste après `loadData()`.
6. Cliquer **« Annuler »** → checkboxes disparaissent, comportement clic-vers-détail restauré.
7. Aucun impact sur la suppression individuelle, l'invitation, les filtres ou la recherche.
8. Tester sur mobile (viewport 598px) : barre flottante lisible, actions accessibles.
