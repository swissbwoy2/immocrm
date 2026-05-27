## Ce que je vais faire

Permettre à l'admin et à l'agent assigné de déclencher une demande de remboursement (ou annulation simple) pour un client, sans avoir besoin du token email envoyé au client.

### 1. Edge function `mandate-renewal-action` — nouveau mode "staff"

Ajouter un 4ème chemin d'authentification à côté de token / client_id-owner / webhook-trust :

- Si le body contient `triggered_by: "staff"` + `client_id` + un header `Authorization` valide :
  - Vérifier via `getClaims` que l'appelant est connecté
  - Autoriser si l'appelant est **admin** (via `has_role`) OU **l'agent assigné** (via `clients.agent_id` ↔ `agents.user_id`, ou table `client_agents` pour co-assignation)
  - Sinon → 403
- Les actions `cancel` et `cancel_with_refund` deviennent autorisées par ce chemin (en plus de pause/resume si besoin futur)
- La logique d'éligibilité reste identique (jour ≥ 80 + raison ≠ « trouvé seul »)
- `triggered_by` enregistré dans `mandate_renewal_actions` = `"admin"` ou `"agent"` selon le rôle
- Notifications adaptées : le client reçoit toujours son email/notif de confirmation ; l'admin/agent qui déclenche reçoit un toast côté front, pas de notif redondante

### 2. UI — bouton dans la fiche client (admin + agent)

Dans `src/pages/admin/ClientDetail.tsx` et `src/pages/agent/ClientDetail.tsx`, dans la carte « Contrat de mandat » (ou juste en-dessous de la progression du mandat) :

- Bouton **« Demander le remboursement pour le client »**
  - Visible uniquement si `statut === 'actif'` et `refund_status !== 'pending' && refund_status !== 'processed'`
  - Désactivé avec tooltip si `daysSinceSignature < 80` (avec message « disponible à partir du 80ème jour »)
- Bouton secondaire **« Annuler le mandat (sans remboursement) »** (toujours visible si actif)
- Clic → ouvre un Dialog réutilisant `CancellationReasonForm` (déjà en place pour le client)
- Submit → `supabase.functions.invoke('mandate-renewal-action', { body: { triggered_by: 'staff', client_id, action: 'cancel_with_refund' | 'cancel', cancellation_reason } })`
- Toast de succès + refresh des données client

### 3. Hors scope

- Pas de migration DB
- Pas de modification de la logique d'éligibilité
- Pas de nouvelle notification pour staff (ils voient le toast et la fiche client mise à jour)
