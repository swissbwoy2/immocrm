## Objectif

1. Vérifier le mapping de tous les templates WA "candidatures".
2. Test automatique d'envoi pour chaque template (vérifie `meta_message_id`).
3. Tracer toutes les erreurs Meta (132001 etc.) avec contexte candidacy.
4. Notification interne admin lorsqu'un envoi WA échoue.
5. Réponse à la question : comment voir/recevoir les messages WhatsApp client.

## Constat

Les 16 templates sont déjà mappés vers `logisorama_*` en `fr`, tous `is_active=true`. Les logs (`whatsapp_notification_logs`) capturent déjà `status`, `error_message`, `meta_message_id`. Il manque : (a) un script de test automatisé, (b) le contexte "candidacy_id" dans les logs, (c) une alerte admin sur échec, (d) une vue lisible.

## Plan

### 1. Test E2E automatique (Edge Function `wa-test-all-templates`)
Nouvelle Edge Function qui :
- Boucle sur les 16 `template_key` actifs.
- Envoie chacun à un numéro de test (ex. Titan `+41795912937`) avec données fictives plausibles.
- Lit `whatsapp_notification_logs` après chaque envoi → vérifie `status='sent'` + `meta_message_id` non null.
- Retourne un rapport JSON `{ template_key, ok, meta_message_id, error }[]` + résumé.
- Déclenchable depuis `/admin` via un bouton "Tester tous les templates WA".

### 2. Contexte candidacy dans les logs
- Ajouter colonne `context_ref text` + `context_type text` dans `whatsapp_notification_logs` (ex. `context_type='candidature'`, `context_ref=<candidature_id>`).
- Mettre à jour `_shared/wa-helpers.ts` (`callSendWhatsApp`) + `send-whatsapp-notification` pour propager `context_type` / `context_ref` depuis chaque caller candidature (`wa-send-application-accepted`, `wa-send-candidature-demandee`, `wa-send-candidature-refus`, `wa-notify-agent-candidature`).

### 3. Notification admin sur échec
- Trigger SQL `AFTER INSERT OR UPDATE ON whatsapp_notification_logs` : si `status='failed'`, créer une notification interne pour tous les admins (titre `🚨 Échec WhatsApp <template_key>`, message contenant le code Meta + `context_ref`) via `create_notification`.
- Lien direct vers la nouvelle page "Suivi WhatsApp".

### 4. Page Admin "Suivi WhatsApp" (`/admin/whatsapp-logs`)
- Tableau filtrable : date, template, status, recipient, error_message, context.
- Bouton "Relancer test global".
- Compteurs : envoyés / livrés / lus / échoués (24h, 7j).

### 5. Recevoir les messages clients

**Réponse claire** : Tout est déjà en place côté backend.
- Webhook Meta `whatsapp-webhook` reçoit chaque message client.
- Le message est inséré dans `messages` (préfixé `📱 [WhatsApp]`) dans la conversation `client ↔ agent` correspondante.
- L'agent peut donc répondre depuis `/agent/messagerie` → la réponse part automatiquement en WA via le trigger qu'on vient d'installer.
- Forward additionnel WA vers l'agent et l'admin (numéro `WHATSAPP_ADMIN_PHONE`).

**Vue dédiée à ajouter** (optionnelle, dans le plan) : page `/admin/whatsapp-conversations` qui filtre les `messages` contenant `[WhatsApp]` ou regroupe par conversation avec un badge "WA". Permet de voir tout l'historique WhatsApp en un coup d'œil sans changer d'app.

## Détails techniques

- Migration : 2 colonnes + 1 trigger + 1 fonction.
- Nouvelle Edge Function : `wa-test-all-templates` (admin only via `verify_jwt` + role check).
- 4 Edge Functions modifiées pour ajouter `context_ref`.
- 2 nouvelles pages React (logs + conversations WA), branchées dans `AdminLayout`.

## Hors scope

- Pas de modification des templates Meta.
- Pas de changement schéma `messages`.
- Pas d'envoi WA depuis la page logs (lecture seule).
