# Inbox WhatsApp — réception des messages d'inconnus (non-clients)

## Problème actuel

Quand un numéro inconnu (pas dans `clients`/`profiles`) écrit sur WhatsApp Logisorama, le webhook log "Incoming WA from unknown phone" puis **jette le message**. Tu ne vois rien et ne peux pas répondre. C'est exactement ce qui s'est passé avec +41762441006.

## Objectif

**N'importe qui doit pouvoir contacter Logisorama sur WhatsApp**, et le message doit apparaître dans l'inbox avec possibilité de répondre dans la fenêtre 24h Meta.

## Plan

### 1. Nouvelle table `whatsapp_unknown_conversations` (migration)
```
- id (uuid)
- phone_e164 (text, unique)
- display_name (text, nullable — récupéré du push name WhatsApp si dispo)
- last_message_at (timestamptz)
- created_at (timestamptz)
- assigned_to_client_id (uuid, nullable — si on convertit plus tard en client)
- status: 'nouveau' | 'en_cours' | 'archive'
```

Et `whatsapp_unknown_messages` :
```
- id, conversation_id (FK), direction ('in'|'out'), content, created_at, read, meta_message_id
```

RLS : admin et tous les agents peuvent voir/écrire (boîte partagée, comme un standard téléphonique).

### 2. Webhook `whatsapp-webhook` — branche "unknown"
Au lieu de `continue`, quand `profile` est introuvable :
- Upsert dans `whatsapp_unknown_conversations` (par `phone_e164`)
- Insert le message inbound dans `whatsapp_unknown_messages` (`direction='in'`, `read=false`)
- Push notif aux admins + déclenchement du template `staff_client_inbound` avec le numéro brut comme nom
- Récupérer le `profile.name` envoyé par Meta (`contacts[0].profile.name`) pour pré-remplir `display_name`

### 3. Inbox WhatsApp — onglet "Inconnus"
Ajouter un toggle/onglet en haut de la liste : **Clients** | **Inconnus** (badge rouge si nouveau).
- Onglet Inconnus : liste des `whatsapp_unknown_conversations` triées par `last_message_at`
- Clic ouvre la même vue conversation à droite
- Bouton "Convertir en client" → ouvre un dialog rapide (prénom/nom/téléphone/email) qui crée un `client` lead + lie la conversation

### 4. Réponse WhatsApp aux inconnus — `wa-reply-text` étendu
Accepter `unknown_conversation_id` en alternative à `conversation_id`. Même logique de fenêtre 24h, mais lit/écrit dans `whatsapp_unknown_messages`.

### 5. Compteur unread (sidebar)
Le hook `useWhatsAppUnreadCount` somme désormais : messages `clients` + `whatsapp_unknown_messages` non lus.

## Hors scope
- Anti-spam (rate-limiting par numéro inconnu) — à voir si abus
- Auto-réponse de bienvenue (peut être ajouté en suite)
- Migration des messages déjà jetés (logs uniquement, pas en base — perdus)

## Note importante
Le message du +41762441006 que tu viens d'envoyer est **déjà perdu** (jeté avant cette mise à jour). Après déploiement, refais un test depuis ce numéro pour valider.
