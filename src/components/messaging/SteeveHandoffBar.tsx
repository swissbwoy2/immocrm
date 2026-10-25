import { useEffect, useState } from 'react';
import { Bot, Loader2, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSteeveSettings } from '@/hooks/useSteeveSettings';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  conversationId: string | null | undefined;
  className?: string;
}

interface HandlingState {
  conversation_type: string | null;
  handled_by: string;
  handled_by_user: string | null;
}

/**
 * Bandeau « qui répond » d'une conversation client ↔ agent : Steeve ou un humain.
 * - Client : voit qui lui répond.
 * - Agent ou admin : peut prendre la main ou la rendre à Steeve.
 * N'affiche rien tant que Steeve n'est pas activé (app_config.steeve_enabled).
 */
export function SteeveHandoffBar({ conversationId, className }: Props) {
  const { user, userRole } = useAuth();
  const { enabled } = useSteeveSettings(conversationId);
  const { toast } = useToast();
  const [state, setState] = useState<HandlingState | null>(null);
  const [humanLabel, setHumanLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isStaff = userRole === 'admin' || userRole === 'agent';

  // État courant + mises à jour en temps réel (prise en main par un collègue, restitution…)
  useEffect(() => {
    if (!enabled || !conversationId) {
      setState(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('conversations')
      .select('conversation_type, handled_by, handled_by_user')
      .eq('id', conversationId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setState((data as HandlingState) ?? null);
      });

    const channel = supabase
      .channel(`steeve-handoff-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
        (payload: { new: Partial<HandlingState> }) => {
          const row = payload.new || {};
          setState({
            conversation_type: row.conversation_type ?? null,
            handled_by: row.handled_by ?? 'agent',
            handled_by_user: row.handled_by_user ?? null,
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled, conversationId]);

  // Nom et rôle de la personne qui a pris la main
  useEffect(() => {
    const uid = state?.handled_by === 'agent' ? state.handled_by_user : null;
    if (!uid) {
      setHumanLabel(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: prof }, { data: agent }] = await Promise.all([
        supabase.from('profiles').select('prenom').eq('id', uid).maybeSingle(),
        supabase.from('agents').select('id').eq('user_id', uid).maybeSingle(),
      ]);
      if (cancelled) return;
      const prenom = prof?.prenom?.trim();
      const role = agent ? 'agent' : 'équipe Logisorama';
      if (uid === user?.id) setHumanLabel('vous');
      else if (prenom) setHumanLabel(`${prenom} (${role})`);
      else setHumanLabel(agent ? 'votre agent' : 'l’équipe Logisorama');
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.handled_by, state?.handled_by_user, user?.id]);

  if (!enabled || !conversationId || !state || state.conversation_type !== 'client-agent') return null;

  const steeveAnswers = state.handled_by === 'steeve';

  const run = async (fn: 'conversation_take_over' | 'conversation_give_back') => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc(fn, { p_conversation_id: conversationId });
      if (error) throw error;
      const next = (data ?? {}) as { handled_by?: string; handled_by_user?: string | null };
      if (next.handled_by) {
        setState((prev) => (prev ? { ...prev, handled_by: next.handled_by!, handled_by_user: next.handled_by_user ?? null } : prev));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      toast({ title: 'Action impossible', description: message || 'Réessayez dans un instant.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border/70 md:px-4',
        steeveAnswers ? 'bg-primary/5 text-foreground' : 'bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      {steeveAnswers ? <Bot className="h-3.5 w-3.5 shrink-0 text-primary" /> : <UserRound className="h-3.5 w-3.5 shrink-0" />}
      <span className="flex-1 min-w-0 truncate">
        {steeveAnswers
          ? 'Steeve, l’assistant Logisorama, répond dans cette conversation'
          : humanLabel === 'vous'
            ? 'Vous avez pris la main : Steeve ne répond plus ici'
            : humanLabel
              ? `Pris en charge par ${humanLabel}`
              : 'Pris en charge par l’équipe Logisorama'}
      </span>
      {isStaff && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-full px-3 text-xs shrink-0"
          disabled={busy}
          onClick={() => run(steeveAnswers ? 'conversation_take_over' : 'conversation_give_back')}
        >
          {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          {steeveAnswers ? 'Prendre la main' : 'Rendre à Steeve'}
        </Button>
      )}
    </div>
  );
}
