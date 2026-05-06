# Module WhatsApp Notifications — Lot 1 (Cœur)

## Objectif
Mettre en place le socle WhatsApp Cloud API pour Logisorama : consentement client, envoi sécurisé via Edge Function, webhook de statut, logs complets, et 3 déclencheurs critiques (nouvelle offre, rappel visite 24h, message agent important). Les lots suivants (documents, candidatures, UIs admin/agent avancées) viendront après validation de cette base.

## Périmètre Lot 1

### 1. Base de données (migration)
Nouvelles tables :
- `whatsapp_message_templates` — catalogue des templates Meta (clé interne, nom Meta, langue `fr`, variables attendues, actif).
- `whatsapp_notification_logs` — un log par envoi : client, agent, type d'évènement, template, téléphone, payload, statut (`queued|sent|delivered|read|failed`), `meta_message_id`, horodatages, message d'erreur.
- `notification_preferences` — préférences par client : `whatsapp_enabled`, `offer_alerts_enabled`, `visit_reminders_enabled`, `agent_messages_enabled`, etc. (les types non utilisés au Lot 1 sont créés dès maintenant pour éviter une 2e migration).

Ajouts sur `profiles` (client) :
- `whatsapp_phone` (text, format E.164)
- `whatsapp_opt_in` (boolean, défaut false)
- `whatsapp_opt_in_date` (timestamptz)
- `whatsapp_opt_in_source` (text — `client_settings`, `agent_assist`, `import`)

RLS :
- Client : lit/modifie ses propres préférences et ses logs.
- Agent : lit préférences + logs des clients qui lui sont assignés (via `clients.agent_id` OU `client_agents`, en suivant la règle Dual Assignment Integrity déjà en mémoire).
- Admin : accès complet.
- Insertion de logs : réservée au service role (Edge Function uniquement).

Seed initial des templates (lignes insert) avec les clés : `new_offer_available`, `visit_reminder_24h`, `agent_message_alert` (les autres clés seront seedées au Lot 2).

### 2. Secrets backend
À demander via `add_secret` après approbation du plan :
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_VERIFY_TOKEN` (pour la vérification du webhook)

`LOGISORAMA_APP_URL` sera codé en dur sur `https://logisorama.ch` (déjà règle Core en mémoire).

### 3. Edge Functions

**`send-whatsapp-notification`** (POST, JWT requis sauf appel service)
- Input : `{ event_type, client_id, variables }`.
- Étapes : récupérer profil + préférences, vérifier `whatsapp_opt_in` ET la préférence du type d'évènement, charger le template actif, normaliser le numéro en E.164, construire le payload Cloud API (`messages` avec `type: "template"` + `components`), POST vers `https://graph.facebook.com/v21.0/{phone_number_id}/messages`, insérer une ligne dans `whatsapp_notification_logs` avec le `meta_message_id` retourné.
- Échec : log `status='failed'` + message d'erreur, retour 200 (ne jamais bloquer l'action métier).
- Validation Zod sur l'input.

**`whatsapp-webhook`** (GET + POST, `verify_jwt = false` dans `supabase/config.toml`)
- GET : challenge Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- POST : parser `entry[].changes[].value.statuses[]` → update `whatsapp_notification_logs` (delivered_at, read_at, failed_at) via `meta_message_id`. Parser `messages[]` entrants → créer un message dans `conversations`/`messages` (table existante) attribué à l'agent du client + notification interne à l'agent.

### 4. Déclencheurs Lot 1 (3)
Branchements dans le code applicatif (pas de triggers SQL, on garde le contrôle TypeScript) :

| Évènement | Source | Template |
|---|---|---|
| Nouvelle offre envoyée au client | `useOffres` / création d'`offre` côté agent | `new_offer_available` |
| Rappel visite 24h | Étendre le cron existant `send-visit-reminders` (déjà cadencé 30 min) pour appeler aussi `send-whatsapp-notification` en plus de l'email | `visit_reminder_24h` |
| Message agent "important" | Toggle "Notifier aussi par WhatsApp" dans l'UI messagerie agent → flag passé à `send-whatsapp-notification` | `agent_message_alert` |

Chaque appel est en `try/catch` non bloquant.

### 5. Interface Client — `Mes notifications`
Nouvelle section dans `/client/parametres` (réutilise les composants premium existants : `Card`, `Switch`, `Input`) :
- Champ téléphone WhatsApp (validation E.164 + format CH).
- Switch global "Notifications WhatsApp".
- Switches par catégorie (offres, visites, messages agent — les autres grisés "Bientôt").
- Texte de réassurance + lien CGU.
- Sauvegarde → update `profiles` + upsert `notification_preferences`.

### 6. Interface Admin — `/admin/whatsapp-notifications`
Page minimale Lot 1 :
- 4 KPI premium : envoyés (24h), livrés, lus, échoués.
- Table des derniers logs (client, type, statut badge, date, erreur).
- Filtre par statut + type d'évènement.
- Bouton "Envoyer un test" (formulaire : numéro + template).

Lien dans le menu admin sous "Configuration".

### 7. Interface Agent (minimal Lot 1)
Sur la fiche client existante, badge `Statut WhatsApp` (Activé / Numéro manquant / Refusé). Le toggle "Notifier par WhatsApp" est ajouté dans la zone de saisie de la messagerie agent-client.

### 8. Sécurité & conformité
- Aucun envoi sans `whatsapp_opt_in = true` ET préférence catégorie active.
- Tokens uniquement côté Edge Function.
- Aucune donnée sensible dans le corps WhatsApp : tous les liens pointent vers l'espace authentifié Logisorama.
- Logs systématiques (audit).
- Webhook signé : vérification `WHATSAPP_VERIFY_TOKEN` (GET) + on log la signature `x-hub-signature-256` (validation HMAC en option Lot 2).

## Hors périmètre (Lot 2 à venir)
Documents manquants/expirés, candidature submitted/status_update, lease_received, keys_handover, rappel visite 2h, vérification numéro par OTP, fallback email automatique sur échec WhatsApp, validation HMAC stricte du webhook, statistiques avancées.

## Détails techniques
- Cloud API version : `v21.0`.
- Langue templates : `fr` (Meta n'expose pas `fr_CH` officiellement).
- Tous les timestamps Edge Function en `Europe/Zurich` (règle Core).
- RLS : `has_role()` en `LANGUAGE plpgsql + SECURITY DEFINER` (règle Core anti-récursion).
- Aucune modification des UX existantes hors les 3 ajouts ciblés (page paramètres client, fiche client agent, page admin nouvelle).

## Étapes de livraison après approbation
1. Migration DB + seed des 3 templates + RLS.
2. Demande des 4 secrets WhatsApp.
3. Edge Functions `send-whatsapp-notification` et `whatsapp-webhook` + `config.toml`.
4. UI client (paramètres), UI admin (page logs/test), UI agent (badge + toggle messagerie).
5. Branchement des 3 déclencheurs.
6. Test end-to-end via le bouton "Envoyer un test" admin.
