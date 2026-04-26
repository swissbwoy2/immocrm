import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFloatingMessenger } from '@/hooks/useFloatingMessenger';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export function FloatingMessengerBubble() {
  const { isOpen, toggle, unreadCount, hasNew } = useFloatingMessenger();
  const { tapLight } = useHapticFeedback();

  const handleClick = async () => {
    await tapLight();
    toggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isOpen ? 'Fermer la messagerie' : 'Ouvrir la messagerie'}
      className={cn(
        'fixed z-40 right-4 md:right-6 bottom-4 md:bottom-6',
        'h-14 w-14 rounded-full',
        'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
        'shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40',
        'flex items-center justify-center',
        'transition-all duration-200 active:scale-95',
        'ring-1 ring-primary/20',
      )}
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Pulse ring when new */}
      {hasNew && !isOpen && (
        <span className="absolute inset-0 rounded-full animate-ping bg-primary/40" />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.span
            key="x"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative flex"
          >
            <X className="h-6 w-6" />
          </motion.span>
        ) : (
          <motion.span
            key="msg"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative flex"
          >
            <MessageSquare className="h-6 w-6" />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      {!isOpen && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-background">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
