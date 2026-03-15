

## Fix: Augmenter la limite de requetes a 15000 dans toute l'app

### Probleme
Supabase retourne par defaut un maximum de 1000 lignes par requete. Plusieurs pages chargent des donnees sans `.limit()` explicite, ce qui tronque silencieusement les resultats au-dela de 1000 lignes. Les tables `offres` et `visites` depassent deja 1000 lignes.

### Fichiers a modifier

Les fichiers ci-dessous contiennent des requetes qui chargent toutes les lignes d'une table sans limite explicite. J'ajouterai `.limit(15000)` a chaque requete concernee.

**Pages Admin (priorite haute - gros volumes):**

| Fichier | Requetes a limiter |
|---|---|
| `src/pages/admin/OffresEnvoyees.tsx` | `offres` (l.264-267), `visites` in offre_ids (l.275-279) |
| `src/pages/admin/Candidatures.tsx` | `candidatures` (l.171-178) |
| `src/pages/admin/Assignations.tsx` | `clients` (l.77-80), `profiles` (l.87-90), `client_agents` (l.98-100) |
| `src/pages/admin/Clients.tsx` | `clients` (implicite), `profiles` (l.135-138), `client_candidates` (l.151-154), `offres` today (l.198-202) |
| `src/pages/admin/AgentDetail.tsx` | `offres` (l.113-116), `transactions` (l.120-123), `visites` (l.127-130) |
| `src/pages/admin/ClientDetail.tsx` | `offres` (l.264-268) |
| `src/pages/admin/Calendrier.tsx` | Deja corrige a 5000 → passer a 15000 |
| `src/pages/admin/Coursiers.tsx` | Deja limite a 100/50 → OK |
| `src/pages/admin/Rappels.tsx` | Deja limite a 500 → OK |

**Pages Agent:**

| Fichier | Requetes a limiter |
|---|---|
| `src/pages/agent/Dashboard.tsx` | `offres` par agent (l.92-96) |
| `src/pages/agent/Carte.tsx` | `visites` par agent (l.38-43) |

**Pages Client:**

| Fichier | Requetes a limiter |
|---|---|
| `src/pages/client/OffresRecues.tsx` | `offres` par client (l.194-210), `visites` par client (l.256-259) |
| `src/pages/client/Dashboard.tsx` | `offres` par client, `visites` par client |
| `src/pages/client/Carte.tsx` | `visites` par client |

**Components:**

| Fichier | Requetes a limiter |
|---|---|
| `src/components/admin/ClientActivityStats.tsx` | `offres`, `visites`, `candidatures` par client |
| `src/components/proprietaire/OffresAchatSection.tsx` | `offres_achat` par immeuble |

**Hooks:**

| Fichier | Requetes a limiter |
|---|---|
| `src/hooks/useAgentGoals.ts` | `offres` par agent (l.98-103), `visites` par agent (l.141-146) |

### Approche technique

Pour chaque requete listee, ajouter `.limit(15000)` juste avant l'appel terminal. Les requetes qui utilisent deja `{ count: 'exact', head: true }` (comptage seul) ou `.single()` / `.maybeSingle()` ne sont pas concernees.

Environ 25-30 requetes a modifier dans ~15 fichiers.

