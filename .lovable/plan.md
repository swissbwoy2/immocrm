## Objectif
Rendre l'**Inbox WhatsApp** accessible et visible pour Christ depuis n'importe où (desktop + iPhone), avec alerte temps réel quand un client répond.

## 1. Sidebar — Ajouter "Inbox WhatsApp" (admin + agent)

Dans la section **COMMUNICATIONS** des sidebars admin et agent, ajouter une nouvelle entrée :

- **Label** : `Inbox WhatsApp`
- **Icône** : `MessageCircle` (couleur verte WhatsApp)
- **Route** : `/admin/whatsapp` (admin) et `/agent/whatsapp` (agent)
- **Badge non-lus** : pastille rouge avec le nombre de messages WhatsApp `read=false` (count temps réel via Supabase realtime sur la table `messages` filtrée `sender_type='client'` + `content ILIKE '📱 [WhatsApp]%'`)
- **Position** : juste sous "Boîte de réception", au-dessus de "WhatsApp" (qui devient "Logs WhatsApp" pour clarifier)

Renommer l'entrée existante `WhatsApp` (qui pointe vers `/admin/whatsapp-notifications`) en **"Logs WhatsApp"** pour éviter la confusion entre l'inbox et les logs.

## 2. Hook partagé `useWhatsAppUnreadCount`

Créer `src/hooks/useWhatsAppUnreadCount.ts` :
- Charge le count initial des messages WhatsApp non lus (scope agent ou admin)
- Souscrit en realtime au canal `messages` pour incrémenter/décrémenter
- Retourne `{ count, loading }`

Utilisé par :
- Le badge sidebar
- Le badge bottom-nav mobile (si présent)

## 3. Notifications push mobile (PWA)

Le projet a déjà un système de push (`usePushNotifications.ts` + edge function `send-push-notification`).

Ajouter dans le webhook WhatsApp existant (`whatsapp-webhook` edge function) : à chaque message client entrant, déclencher un push vers l'admin/agent assigné avec :
- **Titre** : `💬 WhatsApp — {nom client}`
- **Body** : 80 premiers caractères du message
- **URL d'ouverture** : `/admin/whatsapp?conversation={id}` (ou `/agent/whatsapp`)
- **Tag** : `whatsapp-{conversation_id}` pour grouper

Sur iOS PWA, ces notifications apparaissent comme celles de WhatsApp Business App, avec son et badge.

## 4. Test final

1. Envoyer un message WhatsApp depuis un téléphone test vers +41 76 244 10 06
2. Vérifier : badge sidebar passe de 0 à 1 en temps réel ✅
3. Vérifier : notification push reçue sur l'iPhone (PWA Logisorama installée) ✅
4. Cliquer sur la notif → ouvre directement la conversation dans l'inbox ✅
5. Répondre depuis l'inbox → message arrive sur WhatsApp du client ✅

## Hors scope
- Pas d'activation de la coexistence Meta (process séparé côté Business Manager, ~1 semaine)
- Pas de modif du webhook WhatsApp pour la logique entrante (déjà fonctionnelle)
- Pas de refonte de la page inbox elle-même (déjà OK)

## Détails techniques
- Sidebar : modifier les composants sidebar admin/agent (à localiser : probablement `src/components/AppSidebar.tsx` ou similaire)
- Realtime : channel Supabase `whatsapp-unread-{userId}` avec filtre `sender_type=eq.client`
- Push : réutiliser l'infrastructure `web-push` + `push_subscriptions` existante
