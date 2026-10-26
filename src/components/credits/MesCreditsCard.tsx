import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { FileText, Send, Ticket } from 'lucide-react';
import type React from 'react';
import { DASH_CARD } from '@/components/client/dashboard/DashPrimitives';

const TRIAL_DAYS = 3;

export function MesCreditsCard() {
  const { credits } = useUserCredits();
  const [trialLeft, setTrialLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!credits?.user_id) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase.from('profiles').select('actif, trial_started_at').eq('id', credits.user_id).maybeSingle();
      const started = (p as any)?.trial_started_at as string | null;
      if (cancelled) return;
      if (p?.actif !== true && started) {
        const ms = new Date(started).getTime() + TRIAL_DAYS * 86400000 - Date.now();
        setTrialLeft(Math.min(TRIAL_DAYS, Math.max(0, Math.ceil(ms / 86400000))));
      } else setTrialLeft(null);
    })();
    return () => { cancelled = true; };
  }, [credits?.user_id]);

  if (!credits) return null;
  const isAucun = credits.mandat_statut === 'aucun';
  const isExpire = credits.mandat_statut === 'expire';
  // Compte en essai : jours réels restants de l'essai, plafonnés à 3 (jamais 90).
  const mandatDays = isAucun || isExpire ? 0 : trialLeft !== null || credits.mandat_statut === 'essai'
    ? Math.min(TRIAL_DAYS, trialLeft ?? credits.coins_mandat)
    : credits.coins_mandat;
  const tiles: { icon: React.ElementType; label: string; value: string }[] = [
    { icon: Ticket, label: 'Crédits visite', value: `${credits.coins_visite} visite${credits.coins_visite > 1 ? 's' : ''}` },
    { icon: FileText, label: 'Crédit mandat', value: isAucun ? 'essai non démarré' : isExpire ? 'essai terminé' : `${mandatDays} jour${mandatDays > 1 ? 's' : ''} restant${mandatDays > 1 ? 's' : ''}` },
    { icon: Send, label: 'Postulations', value: 'illimité' },
  ];
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <h3 className="mb-3 text-base font-semibold text-foreground">Mes crédits</h3>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div key={label} className="imr-lg-glass flex items-center gap-3 rounded-2xl p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs text-muted-foreground">{label}</span>
              <span className="block truncate text-sm font-semibold text-foreground">{value}</span>
            </span>
          </div>
        ))}
      </div>
      {isAucun && <p className="mt-3 text-sm text-muted-foreground">Lancez votre essai gratuit de 3 jours pour que nos agents recherchent pour vous.</p>}
      {isExpire && (
        <p className="mt-3 text-sm text-muted-foreground">
          Votre essai est terminé : les recherches automatiques sont arrêtées. <a href="/nouveau-mandat" className="font-semibold text-primary underline">Activez vos recherches en créant votre compte client</a>.
        </p>
      )}
    </div>
  );
}
