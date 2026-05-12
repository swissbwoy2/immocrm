## Constat

Sur `/admin/assignations`, dès qu'on assigne plusieurs agents :
- Le bloc "Clients assignés par agent" **duplique chaque client** sous chaque agent → un client co-assigné à 3 agents apparaît 3 fois, ce qui donne l'impression d'un fouillis.
- Il n'y a aucune recherche, aucun filtre et aucun tri → impossible de retrouver rapidement un client précis.
- Pour retirer un seul co-agent, il faut passer par "Modifier", reconfigurer la sélection et sauvegarder. Aucun bouton direct par chip d'agent.
- Le bouton "Retirer" enlève **tous** les agents d'un coup, ce qui n'est presque jamais ce qu'on veut.
- L'agent principal n'est pas visuellement distinct du co-agent dans la liste.

## Plan

### 1. Vue centrée sur le client (au lieu de regroupée par agent)
Refondre le bloc "Clients assignés par agent" en une **liste unique de clients assignés**, chaque client apparaissant **une seule fois** avec :
- Nom + email + date d'ajout
- Chip de l'**agent principal** (badge plein, icône ⭐) — un seul
- Chips des **co-agents** (badge contour, % commission affiché) — chacun avec un petit **×** pour le retirer en un clic
- Bouton **+ Co-agent** qui ouvre un mini-popover pour ajouter rapidement un co-agent (avec son %), sans rouvrir le gros dialog
- Bouton **Modifier** (édition complète, comme aujourd'hui)
- Bouton **Désassigner tout** (avec confirmation, comportement actuel de "Retirer")
- Bouton **Définir comme principal** au survol d'un chip co-agent (promotion en 1 clic)

### 2. Barre de recherche + filtres + tri
Au-dessus de la liste :
- Champ recherche (nom, email, téléphone)
- Filtre par agent (sélecteur "Tous les agents" / agent X) → ne montre que les clients où cet agent est impliqué (principal ou co)
- Filtre statut : *Tous · Mono-agent · Multi-agents (co-assignés)*
- Tri : *Plus récents · Plus anciens · Nom A→Z*

### 3. Compteur clarifié dans les KPI
- "Clients assignés" reste tel quel
- Ajouter un 3ᵉ KPI **"Co-assignés"** = nombre de clients ayant ≥ 2 agents, pour que tu vois en un coup d'œil le volume de dossiers partagés.

### 4. Actions rapides par chip d'agent
Sur chaque chip co-agent dans la carte client :
- `×` → confirme + supprime uniquement cette ligne `client_agents` (et décrémente le compteur de cet agent, archive la conversation, notifie l'agent retiré)
- Survol → bouton "Promouvoir principal" qui swap `is_primary` (bascule l'ancien principal en co-agent et met à jour `clients.agent_id` pour la cohérence)

### 5. Garder le formulaire d'assignation existant
Le bloc "Assigner des clients" en haut (mode simple + mode masse) reste tel quel — il fonctionne déjà bien.

## Détails techniques

Fichier modifié : **`src/pages/admin/Assignations.tsx`** uniquement (refonte de la section liste, lignes 858-949 + ajout des handlers).

Nouveaux handlers (mêmes tables, mêmes RPC qu'aujourd'hui) :
- `handleRemoveSingleAgent(clientId, agentId)` — `delete from client_agents where client_id=… and agent_id=…` + `decrement_agent_clients` + archive conversation + notif. Si l'agent retiré était principal et qu'il reste des co-agents, promouvoir automatiquement le 1ᵉʳ co-agent en principal et resync `clients.agent_id`.
- `handlePromoteToPrimary(clientId, agentId)` — passe l'ancien `is_primary=false`, met le nouveau à `true`, met à jour `clients.agent_id` + `commission_split`.
- `handleQuickAddCoAgent(clientId, agentId, split)` — insert simple dans `client_agents` + `increment_agent_clients` + désarchive la conversation.

Conserve la règle mémoire **"Always keep client_agents and clients.agent_id in sync for co-assignments"** : à chaque suppression/promotion, on resync `clients.agent_id` avec le `is_primary=true` courant (ou `null` si plus aucun agent).

Aucune migration DB. Aucun changement d'Edge Function. Aucune modif des autres pages.

## Question ouverte

Souhaites-tu que la **vue groupée par agent** actuelle reste accessible via un toggle (👤 Par client / 👥 Par agent), au cas où tu veuilles parfois voir le portefeuille complet d'un agent d'un seul bloc ? Ou on la remplace définitivement par la vue par client + filtre par agent ?