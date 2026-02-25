

## Afficher le compteur de clients filtres

### Ce qui existe deja
- **Admin (`/admin/clients`)** : un compteur anime est deja present ("X clients") avec un badge stylise. Il fonctionne correctement.
- **Agent (`/agent/mes-clients`)** : aucun compteur n'est affiche. Il faut en ajouter un.

### Modifications

**1. `src/pages/agent/MesClients.tsx`**
- Ajouter un compteur entre la zone de tri et la grille de clients (avant le grid, apres le bloc de tri)
- Afficher `sortedClients.length` avec le format "X client(s) trouve(s)"
- Utiliser le meme style que la page Admin : badge avec icone Users, fond `primary/10`, bordure `primary/20`

**2. `src/pages/admin/Clients.tsx`**
- Le compteur existe deja (ligne 651-656). Aucune modification necessaire sauf eventuellement ajouter "trouve(s)" pour clarifier que c'est le resultat filtre.

### Resultat attendu
Quand on selectionne un filtre (ex: "2 pieces"), le compteur se met a jour instantanement pour montrer combien de clients correspondent a la selection.

