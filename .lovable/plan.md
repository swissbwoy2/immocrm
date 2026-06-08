## Objectif

Permettre à l'admin d'assigner un rendez-vous (bureau ou téléphonique) à un agent depuis la fiche du RDV, et faire apparaître ce RDV dans le calendrier de l'agent assigné.

## Changements

### 1. Base de données (`lead_phone_appointments`)
Migration : ajouter une colonne `assigned_agent_id uuid references auth.users(id) on delete set null`, index sur `assigned_agent_id`.
RLS : ajouter une policy SELECT permettant à un agent de voir les RDV où `assigned_agent_id = auth.uid()` (en plus des admins déjà autorisés). Idem pour UPDATE limité (au moins lecture + capacité de confirmer/annuler son propre RDV — à confirmer plus bas).

### 2. Dialog admin (`PhoneAppointmentDetailDialog.tsx`)
- Charger la liste des agents actifs (table `agents` / `profiles` avec rôle `agent`).
- Ajouter un `Select` "Agent assigné" affichant l'agent courant, avec option "Non assigné".
- Au changement : `UPDATE lead_phone_appointments SET assigned_agent_id = ...`.
- Afficher le nom de l'agent assigné dans l'en-tête / badge.
- Indication visuelle (badge) si non assigné.

### 3. Calendrier agent (`src/pages/agent/Calendrier.tsx` + hook de normalisation des events)
- Ajouter une source de données : `lead_phone_appointments` où `assigned_agent_id = current_user` et `status in ('en_attente','confirme')`.
- Normaliser comme un évent calendrier (couleur indigo téléphonique / emerald bureau, badge type, titre "RDV bureau — Prénom Nom" ou "RDV tel — ...").
- Au clic : ouvrir `PhoneAppointmentDetailDialog` en mode lecture+actions limitées (voir question ci-dessous).

### 4. Notification (optionnel, à confirmer)
- Lorsque l'admin assigne un RDV à un agent : envoyer une notification in-app (`notifications` table) + éventuellement push à l'agent.

## Questions ouvertes

1. **Agent peut-il confirmer / annuler le RDV qui lui est assigné**, ou seul l'admin garde ces actions ? (par défaut : lecture seule côté agent, admin reste seul à confirmer/annuler).
2. **Notification à l'agent** lors de l'assignation : oui/non ?

## Hors scope
- Pas de changement aux formulaires publics `/rendez-vous` et `/analyse-dossier` (pas d'auto-assignation).
- Pas de réassignation automatique en fonction du lead/agent du lead.

## Fichiers touchés
- Migration SQL (nouvelle)
- `src/components/calendar/PhoneAppointmentDetailDialog.tsx`
- `src/pages/agent/Calendrier.tsx` (+ hook `useNormalizedEvents` ou équivalent)
- Éventuellement `src/pages/admin/Calendrier.tsx` (afficher nom agent dans l'évent)
