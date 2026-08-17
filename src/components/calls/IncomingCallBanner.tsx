import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallMode } from '@/lib/livekitCall';

export interface IncomingCall {
  conversationId: string;
  mode: CallMode;
  title: string;
  message: string;
}

interface Props {
  call: IncomingCall;
  accepting?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Bandeau d'appel entrant. « Répondre » rejoint la salle EN PLACE :
 * aucun lien, aucune navigation, aucun rechargement de page.
 */
export function IncomingCallBanner({ call, accepting, onAccept, onDecline }: Props) {
  return (
    <div
      role="dialog"
      aria-label="Appel entrant"
      className="fixed left-1/2 -translate-x-1/2 z-[110] w-[min(420px,calc(100vw-1.5rem))] rounded-2xl border border-white/10 shadow-2xl p-4 text-white animate-in slide-in-from-top-4"
      style={{
        top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        background: 'hsl(158 55% 20%)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          {call.mode === 'audio' ? <Phone className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{call.title}</p>
          {call.message && <p className="text-xs text-white/80 truncate">{call.message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAccept();
          }}
          disabled={accepting}
          className="flex-1 h-11 rounded-full bg-[hsl(158_55%_45%)] hover:bg-[hsl(158_55%_40%)] text-white"
        >
          <Phone className="h-4 w-4 mr-2" />
          {accepting ? 'Connexion…' : 'Répondre'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDecline();
          }}
          className="h-11 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
