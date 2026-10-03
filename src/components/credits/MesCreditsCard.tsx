import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';

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
  // Compte en essai : jours réels restants de l'essai, plafonnés à 3 (jamais 90).
  const mandatDays = trialLeft !== null || credits.mandat_statut === 'essai'
    ? Math.min(TRIAL_DAYS, trialLeft ?? credits.coins_mandat)
    : credits.coins_mandat;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Mes crédits</h3>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-muted/50 p-3">🎟️ Crédits visite : <b>{credits.coins_visite} visite{credits.coins_visite > 1 ? 's' : ''}</b></div>
        <div className="rounded-xl bg-muted/50 p-3">📄 Crédit mandat : <b>{mandatDays} jour{mandatDays > 1 ? 's' : ''} restant{mandatDays > 1 ? 's' : ''}</b></div>
        <div className="rounded-xl bg-muted/50 p-3">📨 Postulations : <b>illimité</b></div>
      </div>
    </div>
  );
}
