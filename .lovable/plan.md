

## Plan — Optimisation performance globale (tous les profils)

### Transversal (tous les profils)

| Fichier | Changement |
|---|---|
| `src/components/PageTransition.tsx` | Supprimer `AnimatePresence` + `motion.div`, remplacer par un simple `<div>`. Gain ~150ms par navigation. |
| `src/components/AppSidebar.tsx` | Envelopper `getMenuForRole(userRole)` dans `useMemo` keyed sur `userRole`. |

---

### Admin Dashboard (`src/pages/admin/Dashboard.tsx`)

**Probleme** : `fetchAllPaginated` sur `offres` et `transactions` telecharge des milliers de lignes.

**Fix** :
- **Offres** : remplacer par `select('*', { count: 'exact', head: true })` — seul le count est utilise dans le dashboard
- **Transactions** : idem count-only pour les stats, + un `select('*').order(...).limit(50)` pour les transactions recentes affichees dans l'UI
- **Clients** : reduire les colonnes a `id, user_id, agent_id, statut, budget_max, date_ajout, created_at, demande_mandat_id, type_recherche, pieces, region_recherche`
- **Paralleliser** : lancer clients + client_agents + transactions + offres en `Promise.all` au lieu de sequentiel

---

### Agent Dashboard (`src/pages/agent/Dashboard.tsx`)

**Probleme** : ~10 requetes sequentielles (agent → clients → profiles → offres → documents → renouvellements → candidatures → transactions → visites → visites deleguees).

**Fix** :
- Apres recuperation de `agentData` et `clientsData`/`profiles`, lancer en `Promise.all` : offres, documents, renouvellements, candidatures, transactions, visites
- **Fusionner les 2 requetes visites** (toutes + deleguees) en une seule requete avec jointures, puis filtrer cote client pour `est_deleguee`
- **Offres** : reduire colonnes de `select('*, clients(user_id)')` a `select('id, date_envoi, adresse, client_id, prix, pieces, surface, source, lien, clients(user_id)')` — seuls les champs utilises par `AgentStatsSection`

---

### Client Dashboard (`src/pages/client/Dashboard.tsx`)

**Probleme** : 5 requetes sequentielles (profile → client → agent → offres → visites → candidatures → documents). Realtime non filtre recharge tout.

**Fix** :
- Apres `clientData`, lancer offres + visites + candidatures + documents en `Promise.all`
- **Realtime scope** : ajouter `filter: 'client_id=eq.${clientData.id}'` a la subscription pour eviter les recharges inutiles
- Reduire colonnes offres a `id, adresse, prix, pieces, surface, date_envoi, source, lien, statut_client`

---

### Proprietaire Dashboard (`src/pages/proprietaire/Dashboard.tsx`)

**Probleme critique** : boucle N+1 — pour chaque immeuble, 2 requetes (lots count + locataires par lot). Un proprio avec 10 immeubles et 50 lots = ~60 requetes.

**Fix** :
- Remplacer la boucle par 2 requetes groupees :
  - `select('*', { count: 'exact' }).in('immeuble_id', immeublesIds)` pour les lots
  - `select('*, lots!inner(immeuble_id)').in('lots.immeuble_id', immeublesIds).eq('statut', 'actif')` pour les locataires
- Lancer immeubles, tickets, projets en `Promise.all`
- Lancer lots + locataires en `Promise.all` apres immeubles

---

### Apporteur Dashboard (`src/pages/apporteur/Dashboard.tsx`)

**Deja optimise** : seulement 2 requetes (apporteur + referrals), scope par user. Pas de changement necessaire.

---

### Coursier Dashboard (`src/pages/coursier/Dashboard.tsx`)

**Deja optimise** : 2 requetes (coursier + visites), scope par coursier. Pas de changement necessaire.

---

### Resume des fichiers modifies

| Fichier | Changement principal | Gain estime |
|---|---|---|
| `PageTransition.tsx` | Supprimer animation | ~150ms/navigation |
| `AppSidebar.tsx` | `useMemo` menu | Re-renders reduits |
| `admin/Dashboard.tsx` | Count-only + `Promise.all` | ~70% plus rapide |
| `agent/Dashboard.tsx` | `Promise.all` + fusion visites + colonnes reduites | ~60% plus rapide |
| `client/Dashboard.tsx` | `Promise.all` + realtime scope | ~50% plus rapide |
| `proprietaire/Dashboard.tsx` | Eliminer boucle N+1 + `Promise.all` | ~80% plus rapide |
| `apporteur/Dashboard.tsx` | Aucun | Deja optimal |
| `coursier/Dashboard.tsx` | Aucun | Deja optimal |

### Ordre d'implementation

1. PageTransition + AppSidebar (transversal, rapide)
2. Admin Dashboard (count-only + parallelisation)
3. Agent Dashboard (parallelisation + fusion visites)
4. Client Dashboard (parallelisation + realtime scope)
5. Proprietaire Dashboard (elimination N+1)

