# Partage d'agenda entre agents

## Objectif

Permettre à deux agents (ex: Carina ↔ Victoria) de partager mutuellement leur agenda :
1. Carina envoie une **demande de partage** à Victoria depuis son calendrier
2. Victoria reçoit la demande et peut **accepter ou refuser**
3. Une fois acceptée, **chaque agent voit l'agenda de l'autre** dans son propre `/agent/calendrier` (visites, RDV, événements, comptes-rendus)
4. **Accès lecture + écriture complète** : un agent peut créer/modifier/supprimer dans l'agenda partagé comme s'il était le propriétaire
5. Périmètre : **agents uniquement** (pas admin, pas coursier, pas propriétaire)

## Modèle de données

Nouvelle table `public.agent_calendar_shares` :

```text
id (uuid)
requester_agent_id  → agents.id  (celui qui envoie la demande)
recipient_agent_id  → agents.id  (celui qui reçoit)
status              ('pending' | 'accepted' | 'declined' | 'revoked')
created_at, updated_at, accepted_at
UNIQUE (requester_agent_id, recipient_agent_id)
```

Helper SQL `public.get_my_shared_agent_ids()` (SECURITY DEFINER, LANGUAGE plpgsql) qui retourne tous les `agents.id` avec qui l'agent courant a un partage `accepted` (dans les deux sens). Utilisé par les nouvelles RLS pour éviter récursion.

## RLS mises à jour (ajout uniquement, jamais retrait)

Tables impactées : `visites`, `calendar_events`, `visite_comptes_rendus`, `lead_phone_appointments`.

Ajout de policies **SELECT + INSERT + UPDATE + DELETE** pour les agents dont l'`agent_id` (ou owner équivalent) figure dans `get_my_shared_agent_ids()`. Les policies existantes (mine, co-assigné, admin) restent intactes.

Table `agent_calendar_shares` :
- SELECT : si l'agent courant est requester OU recipient
- INSERT : seulement si requester_agent_id = `get_my_agent_id()` et status='pending'
- UPDATE : seulement le recipient peut passer pending→accepted/declined ; les deux peuvent passer accepted→revoked

## Interface utilisateur

**1. Bouton "Partage d'agenda" dans `/agent/calendrier`** (header, à côté des filtres existants) :
- Ouvre un dialog `AgentCalendarShareDialog`
- Liste les partages actifs (avec bouton "Révoquer")
- Liste les demandes reçues en attente (boutons Accepter / Refuser)
- Liste les demandes envoyées en attente
- Champ "Envoyer une demande à…" → Select cherchant parmi les autres agents actifs

**2. Affichage des événements partagés dans le calendrier existant :**
- La fonction `loadData` charge en plus les visites/events/CR/RDV téléphoniques des `shared_agent_ids`
- Chaque événement partagé est marqué `sharedFromAgent: { id, prenom, nom }` et affiché avec un **badge couleur distinct** (ex: liseré violet + tag "Partagé · Victoria")
- Le filtre client existant continue de fonctionner
- Ajout d'un nouveau filtre "Agent : Moi / Tous (partagés inclus) / Victoria / …"

**3. Notification** : un toast + ligne dans la cloche notifications quand une demande arrive ou est acceptée (réutilise `notifications` existante, pas de nouvelle infra).

## Périmètre exclu

- Pas de partage avec admin/coursier/propriétaire
- Pas de granularité (tout ou rien, lecture+écriture)
- Pas de modification du calendrier client (`/client/calendrier`), propriétaire, coursier
- Pas de synchro Google Calendar additionnelle (le partage reste interne Logisorama)
- Pas de migration de données existantes

## Détails techniques

- **Fichiers créés** :
  - `supabase/migrations/<timestamp>_agent_calendar_sharing.sql` (table + GRANTs + RLS + helper)
  - `src/components/agent/calendar/AgentCalendarShareDialog.tsx`
  - `src/hooks/useAgentCalendarShares.ts`
- **Fichiers modifiés** :
  - `src/pages/agent/Calendrier.tsx` : bouton header, chargement étendu, badge "Partagé"
  - `src/components/admin/leads/types.ts` ou équivalent si besoin pour types — non requis a priori
- Le helper `get_my_shared_agent_ids()` est `LANGUAGE plpgsql STABLE SECURITY DEFINER` avec `SET search_path = public` (conforme à la règle anti-récursion du projet)
- Realtime activé sur `agent_calendar_shares` pour rafraîchir le dialog en temps réel
- Aucune dépendance npm ajoutée
