# Inbox WhatsApp vide + impossibilité de répondre — diagnostic et plan

## Pourquoi tu ne vois aucun message

L'inbox affiche **uniquement les messages entrants WhatsApp** (préfixe `📱 [WhatsApp]` inséré par le webhook `whatsapp-webhook`). En base, **aucun message de ce type n'existe à ce jour** — donc l'écran "Aucun message WhatsApp reçu" est techniquement correct.

Trois causes possibles, classées par probabilité :

1. **Webhook Meta non configuré (le plus probable)** — Dans Meta Business Manager → WhatsApp → Configuration → Webhooks, l'URL `https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/whatsapp-webhook` doit être enregistrée et le champ `messages` coché. Sans ça, Meta ne nous envoie jamais les réponses clients.
2. **Aucun client n'a répondu** depuis l'envoi des templates (les templates sortants fonctionnent mais on ne reçoit que si quelqu'un répond).
3. **Numéro client non reconnu** — le webhook cherche `whatsapp_phone` ou `telephone` au format E.164 (`+41...`). Si ton numéro perso n'est dans aucun client, le message est ignoré.

## Pourquoi tu ne peux pas répondre

Le bouton de l'inbox redirige vers `/admin/messagerie?conversation=...` qui est la **messagerie interne Logisorama** (chat in-app). Elle n'envoie **rien sur WhatsApp**. Pour répondre réellement au client sur WhatsApp depuis Logisorama, il faut un vrai composant de réponse qui appelle `sendWhatsAppText` (fenêtre 24h Meta).

## Plan d'action

### 1. Diagnostic webhook (à faire par toi, sans code)
- Aller dans Meta Business Manager → WhatsApp → Configuration → Webhooks
- Vérifier que l'URL `https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/whatsapp-webhook` est bien enregistrée
- Vérifier que la case **`messages`** est cochée sous "Champs d'abonnement"
- Cliquer sur "Tester" — si erreur, copier-la moi

### 2. Vraie réponse WhatsApp depuis l'inbox (code)
Ajouter un **panneau de conversation latéral** directement dans `WhatsAppInbox.tsx` :

- Au clic sur un message → ouvrir une vue conversation à droite (au lieu de naviguer vers `/messagerie`)
- Affiche les 50 derniers messages WhatsApp de cette conversation (entrants + sortants envoyés via WA)
- Champ de saisie + bouton "Envoyer sur WhatsApp" qui appelle une nouvelle Edge Function `wa-reply-text`
- `wa-reply-text` appelle `sendWhatsAppText(phone, text)` puis insère le message dans `messages` avec préfixe `📱 [WhatsApp →]` et `sender_type='agent'`
- Bandeau d'avertissement si la dernière réponse client date de **plus de 24h** (fenêtre Meta fermée → seuls templates autorisés)
- Marquer automatiquement les messages entrants comme `read=true` à l'ouverture

### 3. (optionnel) Endpoint de test webhook
Petit bouton "Simuler message entrant" en mode admin uniquement, pour valider le flux sans dépendre d'un vrai client.

## Détails techniques

- Nouvelle Edge Function : `supabase/functions/wa-reply-text/index.ts`
  - Body : `{ conversation_id, text }`
  - Récupère le client → son `whatsapp_phone` ou `telephone`
  - Vérifie fenêtre 24h via `messages` les plus récents `sender_type='client'`
  - Appelle `sendWhatsAppText` du shared helper
  - Insère le message sortant en DB
- `WhatsAppInbox.tsx` refactoré en layout 2 colonnes (liste / conversation) sur desktop, drawer sur mobile
- Realtime déjà en place — le panneau écoute aussi les nouveaux messages de la conversation ouverte

## Hors scope
- Coexistence avec l'app WhatsApp Business officielle (process Meta séparé, ~1 semaine)
- Envoi de templates depuis l'inbox (déjà couvert par `/admin/whatsapp-notifications`)
- Pièces jointes média sortantes
