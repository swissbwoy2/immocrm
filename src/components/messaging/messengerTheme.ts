import type { CSSProperties } from 'react';

/**
 * Neutralise, sur l'élément qui porte `.imr-chat`, les anciennes couleurs mobiles
 * (vert « WhatsApp » forcé sous 1024 px dans src/index.css) : la messagerie reprend
 * les tokens de l'app (primary, muted, background…). On garde la classe `.imr-chat`
 * pour son garde-fou anti débordement horizontal.
 */
export const IMR_CHAT_NEUTRAL_STYLE = {
  '--primary': 'inherit',
  '--primary-foreground': 'inherit',
  '--whatsapp-green': 'var(--primary)',
  '--whatsapp-green-dark': 'var(--primary)',
  '--whatsapp-green-darker': 'var(--primary)',
  '--whatsapp-bubble-out': 'var(--primary)',
  '--whatsapp-bubble-in': 'var(--muted)',
  '--whatsapp-bg': 'var(--background)',
  '--whatsapp-tick': 'var(--primary-foreground)',
  '--chat-primary': 'var(--primary)',
  '--chat-primary-light': 'var(--primary)',
  '--chat-accent': 'var(--primary)',
  '--chat-bg': 'var(--background)',
  '--chat-bubble-in': 'var(--muted)',
  '--chat-bubble-out': 'var(--primary)',
  '--chat-ink': 'var(--foreground)',
  '--chat-muted': 'var(--muted-foreground)',
} as CSSProperties;
