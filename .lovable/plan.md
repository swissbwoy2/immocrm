

## Filtre par nombre de pieces - Pages Admin et Agent "Biens en vente"

### Probleme
Les pages `/admin/biens-vente` et `/agent/biens-vente` n'ont pas de filtre par nombre de pieces. Il faut pouvoir cliquer sur "2 pieces" et ne voir que les biens avec exactement 2 pieces.

### Solution
Ajouter un Select "Nombre de pieces" dans la barre de filtres existante (a cote du filtre Statut), avec des valeurs exactes incluant les demi-pieces suisses.

### Fichiers a modifier

**1. `src/pages/admin/BiensEnVente.tsx`**
- Ajouter un state `piecesFilter` (defaut: `'all'`)
- Ajouter un Select avec les options : Tous, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5+
- Ajouter la condition dans `filteredImmeubles` :
  - `'all'` -> pas de filtre
  - `'5+'` -> `nombre_pieces >= 5`
  - sinon -> `nombre_pieces === Number(piecesFilter)`

**2. `src/pages/agent/BiensEnVente.tsx`**
- Meme modification identique

### Details techniques

Les deux fichiers suivent exactement le meme pattern. Dans chaque fichier :

1. Ajouter le state :
```text
const [piecesFilter, setPiecesFilter] = useState<string>('all');
```

2. Ajouter le Select apres celui du statut :
```text
<Select value={piecesFilter} onValueChange={setPiecesFilter}>
  <SelectTrigger className="w-full sm:w-48">
    <SelectValue placeholder="Pieces" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Toutes les pieces</SelectItem>
    <SelectItem value="1">1 piece</SelectItem>
    <SelectItem value="1.5">1.5 pieces</SelectItem>
    <SelectItem value="2">2 pieces</SelectItem>
    <SelectItem value="2.5">2.5 pieces</SelectItem>
    <SelectItem value="3">3 pieces</SelectItem>
    <SelectItem value="3.5">3.5 pieces</SelectItem>
    <SelectItem value="4">4 pieces</SelectItem>
    <SelectItem value="4.5">4.5 pieces</SelectItem>
    <SelectItem value="5">5 pieces</SelectItem>
    <SelectItem value="5+">5+ pieces</SelectItem>
  </SelectContent>
</Select>
```

3. Modifier le filtre :
```text
const matchesPieces = piecesFilter === 'all'
  ? true
  : piecesFilter === '5+'
    ? i.nombre_pieces >= 5
    : i.nombre_pieces === Number(piecesFilter);
return matchesSearch && matchesStatut && matchesPieces;
```

Aucune modification de base de donnees necessaire. Le champ `nombre_pieces` existe deja dans la table `immeubles`.
