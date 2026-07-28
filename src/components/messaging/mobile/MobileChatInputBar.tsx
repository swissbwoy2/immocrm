import { PremiumChatInput } from "@/components/messaging/PremiumChatInput";

/**
 * Mobile-friendly composer wrapper. Delegates entirely to PremiumChatInput
 * (send-on-Enter, Shift+Enter newline, spinner, attachments, always-visible
 * green Send FAB). Visual polish is applied via the `.imr-chat` CSS scope
 * in `src/index.css` so behaviour stays identical on desktop.
 */
export const MobileChatInputBar = PremiumChatInput;
