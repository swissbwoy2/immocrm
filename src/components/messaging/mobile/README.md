# Mobile messaging primitives

La messagerie suit le design de l'app (tokens primary / muted / background), sans dégradé ni motif.

- `MessengerSplitLayout` (`../MessengerSplitLayout.tsx`) : ossature commune.
  ≥ 768 px → deux panneaux (liste 340-380 px | conversation) ; < 768 px → `MobileMessenger`.
  Remplit son parent (`h-full`) : pas de calcul de hauteur de viewport (le shell mobile est ancré au viewport dynamique).
- `MobileMessenger.tsx` : un panneau à la fois, en-tête `ChatHeader` (retour, avatar, statut, appels) avec zone sûre iOS,
  glisser vers la droite pour revenir, mode immersif quand une conversation est ouverte.
- `MobileChatInputBar.tsx` : alias de `PremiumChatInput` (zone sûre basse incluse).
- `MobileConversationHeader.tsx` : en-tête mobile simple (non utilisé par les pages actuelles).

La classe `.imr-chat` reste posée pour son garde-fou anti débordement horizontal ; ses anciennes couleurs
mobiles (vert forcé dans `src/index.css`) sont neutralisées par `IMR_CHAT_NEUTRAL_STYLE` (`../messengerTheme.ts`).

Briques de la colonne conversations : `../ConversationListParts.tsx`
(`ConversationListHeader`, `ConversationSearchField`, `ConversationFilterPills`, `ConversationItemsList`,
`ConversationListEmpty`, `ChatEmptyState`).
