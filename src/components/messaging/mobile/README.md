# Mobile messaging primitives

The Immo-rama mobile chat visual layer is applied via the `.imr-chat` scope on
`MessagingLayout`'s root element (see `src/components/MessagingLayout.tsx`) and
scoped CSS overrides in `src/index.css` (media `(max-width: 1023px)`).

This keeps 100% of the existing state, handlers and message-specific rendering
(offer card + candidature buttons, video player, compte-rendu, tabs, stories,
send handler) in the three role pages while restyling the mobile surface with
the Immo palette (green `hsl(158 55% 38%)`, sky-blue `hsl(200 70% 45%)`).

Extractable primitives (thin wrappers used inside the scope) live here:

- `MobileChatInputBar.tsx` — wraps `PremiumChatInput` and applies mobile spacing.
- `MobileConversationHeader.tsx` — sticky mobile chat header with back arrow.

Desktop rendering is strictly unchanged: the CSS overrides only trigger under
`(max-width: 1023px)`.
