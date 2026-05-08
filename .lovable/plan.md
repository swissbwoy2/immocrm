# Plan — 2 fixes WhatsApp critiques

## Bug 1 — Mauvais nom d'agent dans la notification WhatsApp client

**Cause** : Le trigger `notify_client_wa_on_agent_message` (migration `20260508004654`) utilise `conversations.agent_id` comme source de vérité pour le nom de l'agent, **ET** la fonction `wa-send-agent-message` fait `loadAgentName(supabase, agent_id || client?.agent_id)` — donc l'agent_id de la conversation prime.

Confirmé en base sur le client Christ Ramazani (`82515fba`) :
- `clients.agent_id` = `6fe4d48a` (Christ Ramazani) ← le vrai agent assigné
- `conversations.agent_id` = `ed0ca4bb` (Victoria Martins) ← conversation rattachée à l'ancien agent

→ Le template WhatsApp affiche « Votre agent Victoria Martins » au lieu de « Christ Ramazani ».

**Correctif** :
1. Dans le trigger SQL `notify_client_wa_on_agent_message`, lire en priorité `clients.agent_id` (source de vérité projet : « Always keep client_agents and clients.agent_id in sync »). Fallback sur `conversations.agent_id` uniquement si null.
2. Dans `wa-send-agent-message/index.ts`, inverser la priorité : `loadAgentName(supabase, client?.agent_id || agent_id)` — l'agent réel du client prime sur celui passé par la conversation.
3. Optionnel mais utile : aligner la `conversations.agent_id` sur `clients.agent_id` pour les conversations existantes (UPDATE one-shot).

## Bug 2 — Victoria ne reçoit aucun WhatsApp quand un client lui répond

**Cause** : Dans `whatsapp-webhook` (ligne 1062), `forwardClientReplyToStaff` est appelé **sans `templateKey`**. Le helper tombe alors dans la branche « free text » via `sendWhatsAppText`, qui n'est livrée par Meta **que si la fenêtre 24h est ouverte côté destinataire** (l'agent). Comme l'agent n'a jamais initié de chat WhatsApp avec le numéro Logisorama, sa fenêtre n'est jamais ouverte → Meta rejette silencieusement (erreur 131047 / 131051).

Vérifications faites :
- `_shared/whatsapp-forward-to-staff.ts` confirme : `if (templateKey) sendTemplateTo else sendWhatsAppText` (texte libre).
- Aucun template HSM staff n'est aujourd'hui passé pour le forward d'un message texte WhatsApp.

**Correctif** :
1. Créer (ou réutiliser) un template Meta utilitaire **`staff_client_inbound`** (FR, UTILITY) avec 3 variables :
   - `{{1}}` = prénom client
   - `{{2}}` = extrait du message (200 char max, U+202F/U+00A0 nettoyés)
   - `{{3}}` = lien `logisorama.ch/agent/whatsapp?conversation={id}`
   
   Body proposé :
   > 📱 *Nouveau message WhatsApp*  
   > {{1}} vient de vous écrire :  
   > « {{2}} »  
   > Répondez ici : {{3}}

2. Insérer le template dans `whatsapp_templates` (statut PENDING jusqu'à validation Meta — à soumettre côté Meta Business Manager par l'utilisateur).
3. Modifier le call dans `whatsapp-webhook/index.ts` pour passer `templateKey: "staff_client_inbound"` + variables. Garder le free text en **second** essai (best-effort) si la fenêtre est ouverte.
4. Logger explicitement `whatsapp_notification_logs` côté forward staff (event_type `staff_client_inbound`) pour debug.

## Détails techniques
- Triggers PL/pgSQL : `LANGUAGE plpgsql + SECURITY DEFINER` (mémoire projet RLS).
- Edge functions : `corsHeaders`, dates Europe/Zurich, sanitisation `replace(/[\u202F\u00A0]/g, ' ')` sur `message_extract`.
- Pas de modification du flux client → conversation (déjà OK).
- Action requise utilisateur : créer le template `staff_client_inbound` dans Meta Business Manager (je fournirai le copy-paste exact dans `docs/whatsapp_templates_logisorama_v3.md`).

## Hors périmètre
- Refonte de l'inbox WhatsApp (déjà livrée).
- Push notifications (en attente des secrets Firebase).

Approuvez pour appliquer les 2 fixes.
