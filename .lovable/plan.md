## Objectif

Garantir que les messages échangés via la messagerie interne arrivent bien sur WhatsApp dans les deux sens (agent ↔ client).

## Constat

**Inbound (client WA → agent)** ✅ déjà câblé : `whatsapp-webhook` reçoit le message, l'insère dans `messages` et déclenche `forwardClientReplyToStaff` (WA + notif in-app à l'agent et à l'admin).

**Outbound (agent in-app → client WA)** ❌ cassé : quand un agent envoie un message depuis `/agent/messagerie` (insert dans `messages`), le trigger `notify_on_new_message` ne crée qu'une notification interne. Le template WA `agent_message_alert` (`logisorama_agent_message`, déjà approuvé en FR) n'est jamais envoyé. La fonction `wa-send-agent-message` existe mais n'est appelée nulle part.

## Plan d'action

1. **Câbler le déclencheur outbound** — Étendre `notify_on_new_message` (ou ajouter un trigger sœur) pour appeler `wa-send-agent-message` via `pg_net` quand `sender_type='agent'` et que la conversation a un `client_id`. Variables: prénom client, nom agent, extrait du message (200 char), contexte.
   - Préférence respectée: `agent_messages_enabled` (gérée déjà côté `callSendWhatsApp`).
   - Garde-fou: ne pas notifier si le client est en ligne dans l'app dans les 60 dernières secondes (évite spam) — optionnel, à confirmer.

2. **Test end-to-end automatisé** :
   - **Outbound** : insérer un `messages` avec `sender_type='agent'` dans une conversation de test (Titan) → vérifier `whatsapp_notification_logs` reçoit `agent_message_alert` `status=sent` + arrivée WA réelle.
   - **Inbound** : appeler `whatsapp-webhook` avec un payload entrant simulé depuis le numéro de Titan → vérifier insert dans `messages`, notif agent/admin, et forward WA à l'agent assigné.

3. **Vérifier les statuts Meta** dans `whatsapp_notification_logs` (sent → delivered → read) pour confirmer la livraison côté client.

## Détails techniques

- Trigger : `AFTER INSERT ON public.messages` qui appelle `pg_net.http_post` vers `${supabase_url}/functions/v1/wa-send-agent-message` avec `service_role_key`, payload `{ client_id, agent_id, message_extract, contexte }`.
- Pas de modif du schéma `messages` ni du template Meta (déjà approuvé).
- Pas de changement UI.
- Garder `forwardClientReplyToStaff` tel quel pour l'inbound.

## Hors scope

- Pas de nouveau template Meta.
- Pas d'ajout de pièces jointes WA (texte uniquement, conformément au template existant).
- Pas de changement UI messagerie.
