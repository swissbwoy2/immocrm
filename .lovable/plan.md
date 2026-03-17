

## Plan — Rendre les réactions clients aux offres plus visibles et directes

### Problème actuel

Quand un client réagit à une offre (intéressé, visite planifiée, candidature, etc.), l'agent/admin ne le voit que via :
1. Une notification générique dans la cloche
2. Un message dans la messagerie
3. Le changement de statut dans "Offres envoyées" (qu'il faut aller vérifier manuellement)

Il n'y a **aucun indicateur direct sur le Dashboard** ni de **badge sur le menu "Offres envoyées"** pour signaler qu'une action client est en attente.

### Solution proposée

#### 1. Widget "Réactions clients" sur le Dashboard Agent
Ajouter une nouvelle section prioritaire (avant les dernières offres) qui affiche les offres ayant reçu une réaction récente du client. Filtrer les offres dont le statut a changé (interesse, visite_planifiee, candidature_deposee, etc.) et les afficher avec :
- Le nom du client
- L'adresse du bien
- Le nouveau statut avec un badge coloré
- Un bouton d'action rapide (ouvrir la conversation, voir l'offre)

**Fichier** : `src/pages/agent/Dashboard.tsx`

#### 2. Badge de compteur sur "Offres envoyées" dans la sidebar
Ajouter un `notifKey` pour le menu "Offres envoyées" qui compte les offres avec un statut `interesse`, `visite_planifiee`, `candidature_deposee` ou `demande_postulation` — c'est-à-dire les offres nécessitant une action de l'agent.

**Fichier** : `src/components/AppSidebar.tsx` — changer le `notifKey` de `null` à `'client_interesse'` pour l'item "Offres envoyées"

#### 3. KPI "Réactions en attente" sur le Dashboard
Ajouter un `PremiumKPICard` dédié affichant le nombre d'offres avec une réaction client non traitée (statut = interesse, demande_postulation, candidature_deposee). Cliquable vers `/agent/offres-envoyees?filter=reactions`.

**Fichier** : `src/pages/agent/Dashboard.tsx`

#### 4. Même principe côté Admin Dashboard
Ajouter un KPI et/ou widget similaire sur le dashboard admin pour les offres ayant reçu des réactions clients.

**Fichier** : `src/pages/admin/Dashboard.tsx`

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/agent/Dashboard.tsx` | KPI "Réactions clients" + widget liste des offres avec réactions récentes |
| `src/pages/admin/Dashboard.tsx` | KPI "Réactions clients" pour vue globale admin |
| `src/components/AppSidebar.tsx` | Badge compteur sur "Offres envoyées" (agent + admin) |

### Résultat attendu
- L'agent voit **immédiatement** sur son dashboard quand un client réagit
- Un badge rouge sur "Offres envoyées" dans le menu attire l'attention
- Un KPI dédié donne le nombre de réactions en attente d'action

