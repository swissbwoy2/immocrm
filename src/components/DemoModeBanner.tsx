import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { useIsDemoAccount } from '@/hooks/useIsDemoAccount';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Persistent banner shown across the client space when logged into the demo account.
 * Read-only mode notice + CTA to convert into a real account.
 */
export function DemoModeBanner() {
  const isDemo = useIsDemoAccount();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

  if (!isDemo || hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] w-full border-b border-[hsl(38_45%_48%/0.4)] bg-gradient-to-r from-[hsl(38_45%_44%)] via-[hsl(38_55%_52%)] to-[hsl(28_35%_38%)] text-[hsl(40_35%_98%)] shadow-md"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium">
          🎬 Mode démonstration · Compte fictif en <strong>lecture seule</strong>. Toutes les actions (envoi, upload, modification) sont désactivées.
        </span>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate('/nouveau-mandat');
          }}
          className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider transition hover:bg-white/25"
        >
          Activer mon vrai compte <ArrowRight className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Masquer la bannière"
          className="ml-auto rounded-full p-1 transition hover:bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default DemoModeBanner;
