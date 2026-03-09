

## Plan — Permettre la delegation coursier sans attendre la reponse du client

### Probleme identifie

Deux endroits bloquent la delegation aux coursiers :

1. **Page Admin Coursiers** (`src/pages/admin/Coursiers.tsx`, ligne 36) : La requete des visites eligibles filtre sur `statut = 'planifiee'` uniquement. Les visites avec statut `proposee` (creneaux proposes par l'agent, pas encore confirmes par le client) ou `confirmee` sont exclues.

2. **Page Agent Visites** (`src/pages/agent/Visites.tsx`, lignes 610-613) : Les listes de visites affichees dans les onglets excluent les visites `proposee`. Le bouton "Deleguer a un coursier" n'apparait donc pas pour ces visites.

### Modifications

#### 1. `src/pages/admin/Coursiers.tsx`
- Elargir le filtre des visites eligibles : remplacer `.eq('statut', 'planifiee')` par `.in('statut', ['planifiee', 'confirmee', 'proposee'])` pour inclure toutes les visites futures non annulees/effectuees.

#### 2. `src/pages/agent/Visites.tsx`  
- Ajouter les visites `proposee` dans la liste "Visites a venir" (`visitesAVenir`) pour qu'elles apparaissent avec le bouton de delegation coursier.
- Actuellement la liste exclut les visites proposees — il faut ajouter `v.statut === 'proposee'` dans le filtre.

### Resultat
Les agents et admins pourront deleguer n'importe quelle visite future a un coursier, meme si le client n'a pas encore confirme le creneau. Cela permet de comptabiliser correctement les courses et d'eviter la gestion manuelle/orale.

