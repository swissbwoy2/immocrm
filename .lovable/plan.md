# Refonte visuelle Messagerie → style WhatsApp Inbox

## Objectif
Aligner l'apparence des 4 pages Messagerie sur le look déjà utilisé dans `WhatsAppInbox` (liste à gauche style WhatsApp, bulles vertes/blanches à droite, header conversation, fond discret). **Aucune modification de la logique métier** : realtime, envoi, attachements, templates, multi-canaux, sélection conversation, comptage non-lus, etc. restent identiques.

## Périmètre
- `src/pages/admin/Messagerie.tsx`
- `src/pages/agent/Messagerie.tsx`
- `src/pages/client/Messagerie.tsx`
- `src/pages/proprietaire/Messagerie.tsx`

## Composants visuels réutilisés (déjà existants)
- `src/components/MessagingLayout.tsx` — split panel mobile/desktop (déjà utilisé)
- `src/components/whatsapp/ConversationListItem.tsx` — item liste style WhatsApp
- `src/components/whatsapp/WhatsAppBubble.tsx` — bulles `whatsapp-bubble-out` / `whatsapp-bubble-in`
- `src/components/whatsapp/LeadAvatar.tsx` — avatar coloré

## Nouveaux composants visuels (présentation pure, partagés)
1. **`src/components/whatsapp/WhatsAppConversationList.tsx`**
   - Wrapper liste : header (titre + recherche), filtres optionnels (tabs `all / unread`), scroll, rendu d'items via `ConversationListItem`.
   - Props purement visuelles (items, search, onSearch, activeId, onSelect, onlineMap?).
2. **`src/components/whatsapp/WhatsAppChatHeader.tsx`**
   - Header de conversation : avatar + nom + sous-titre (statut/agent/canal) + boutons d'action (slot `actions` pour réinjecter les boutons existants : pièce jointe, template, etc.).
3. **`src/components/whatsapp/WhatsAppChatBackground.tsx`**
   - Fond du panneau de chat avec la texture/teinte WhatsApp (token `--whatsapp-chat-bg` si dispo, sinon `bg-muted/30` + pattern subtil), pour wrapper la zone des bulles.
4. **`src/components/whatsapp/WhatsAppComposer.tsx`**
   - Barre de saisie style WhatsApp (textarea arrondi, bouton envoi rond vert). Slots pour les actions auxiliaires existantes (attach, template, emoji…).
   - Garde la même API d'envoi : reçoit `value`, `onChange`, `onSend`, `disabled`, `leftActions`, `rightActions`.

Tous ces composants sont **purement présentation** : ils n'appellent pas Supabase, ne touchent pas au state métier.

## Refactor par page (visuel only)
Pour chacune des 4 pages :
- Conserver intégralement : hooks, queries, realtime, état (`selectedConv`, `messages`, `reply`, `sending`, attachments, templates, filtres métier).
- Remplacer le markup de :
  - liste de conversations → `WhatsAppConversationList` + map vers `ConversationListItem`.
  - header conversation → `WhatsAppChatHeader` (slot `actions` = boutons existants).
  - liste de messages → boucle inchangée mais chaque message rendu via `WhatsAppBubble` (mapping `outgoing` selon sender, `read`/`delivered` si dispo). Attachements existants restent affichés via `MessageAttachment` au-dessus/en-dessous de la bulle, sans changer leur logique.
  - composer → `WhatsAppComposer` recevant les boutons attach/template existants comme `leftActions`.
- Layout global = `MessagingLayout` (déjà en place pour la plupart) avec `WhatsAppChatBackground` autour de la zone messages.

## Tokens / couleurs
- Vérifier que `--whatsapp-green`, `--whatsapp-bubble-in`, `--whatsapp-bubble-out`, `--whatsapp-tick` existent dans `index.css` (déjà référencés par `WhatsAppBubble`). Si manquants, les ajouter en HSL côté light + dark, alignés sur la palette WhatsApp officielle, puis whitelister dans `tailwind.config.ts` si utilisés en classes.
- Aucune couleur en dur dans les nouveaux composants : uniquement tokens.

## Hors périmètre (explicitement non touché)
- Schéma DB, RLS, edge functions.
- Logique d'envoi, upload, templates, realtime, comptage non-lus.
- Routes et navigation.
- `WhatsAppInbox` lui-même (sert de référence visuelle).

## Validation
- Build TypeScript OK.
- Vérification visuelle préview sur les 4 rôles (desktop + mobile via `MessagingLayout`).
- Smoke test : ouvrir une conversation, voir bulles correctement orientées (sortantes vertes à droite, entrantes blanches à gauche), envoyer un message, vérifier que l'item de liste se met à jour.
