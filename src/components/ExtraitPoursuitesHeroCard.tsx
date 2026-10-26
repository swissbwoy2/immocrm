import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ShieldCheck, Clock, FileWarning, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays } from 'date-fns';
import { ExtractPoursuitesUploadDialog } from '@/components/ExtractPoursuitesUploadDialog';
import { cn } from '@/lib/utils';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';

type Status = 'missing' | 'valid' | 'warning' | 'expired';

interface Props {
  /** Si true, affiche aussi le bandeau "valide" (sinon discret/caché). */
  showWhenValid?: boolean;
  className?: string;
}

/**
 * Bandeau "hero" mis en avant sur le dashboard et le dossier client.
 * Affiche en grand le statut de l'extrait de poursuites avec CTA d'action.
 */
export function ExtraitPoursuitesHeroCard({ showWhenValid = false, className }: Props) {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [dateEmission, setDateEmission] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase.from('clients') as any)
      .select('id, extrait_poursuites_date_emission')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setClientId(data.id);
      setDateEmission(data.extrait_poursuites_date_emission);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading || !clientId) return null;

  let status: Status = 'missing';
  let ageDays = 0;
  let daysUntilExpiry: number | null = null;
  if (dateEmission) {
    ageDays = differenceInDays(new Date(), new Date(dateEmission));
    daysUntilExpiry = 90 - ageDays;
    if (ageDays >= 90) status = 'expired';
    else if (ageDays >= 60) status = 'warning';
    else status = 'valid';
  }

  if (status === 'valid' && !showWhenValid) {
    // Mode discret pour valide : carte compacte
    return (
      <div className={cn(DASH_CARD, 'flex items-start gap-3 p-4', className)}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Extrait de poursuites valide</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Émis le {new Date(dateEmission!).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich', day: 'numeric', month: 'long', year: 'numeric' })} · encore {daysUntilExpiry} jours
          </p>
        </div>
      </div>
    );
  }

  const dateFr = (iso: string, long = true) => new Date(iso).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich', day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' });
  const expiredSince = Math.max(0, ageDays - 90);

  const variants = {
    missing: {
      tone: 'warning' as const,
      Icon: FileWarning,
      title: 'Ajoutez votre extrait des poursuites',
      subtitle: "Pièce obligatoire de votre dossier. Déposez le PDF : la date d'émission est détectée automatiquement.",
      ctaLabel: 'Téléverser mon extrait',
      ctaVariant: 'default' as const,
      badge: 'À fournir',
    },
    warning: {
      tone: 'warning' as const,
      Icon: Clock,
      title: `Votre extrait expire dans ${daysUntilExpiry} jour${(daysUntilExpiry ?? 0) > 1 ? 's' : ''}`,
      subtitle: "Certaines régies n'acceptent que les extraits de moins de 2 mois : renouvelez-le maintenant.",
      ctaLabel: 'Renouveler mon extrait',
      ctaVariant: 'default' as const,
      badge: 'À renouveler',
    },
    expired: {
      tone: 'danger' as const,
      Icon: AlertTriangle,
      title: 'Votre extrait des poursuites est expiré',
      subtitle: 'Votre dossier est incomplet : les régies peuvent refuser vos candidatures tant qu’il n’est pas renouvelé.',
      ctaLabel: 'Téléverser un nouvel extrait',
      ctaVariant: 'destructive' as const,
      badge: 'Urgent',
    },
    valid: {
      tone: 'success' as const,
      Icon: ShieldCheck,
      title: 'Extrait des poursuites valide',
      subtitle: '',
      ctaLabel: 'Mettre à jour',
      ctaVariant: 'outline' as const,
      badge: 'À jour',
    },
  };

  const v = variants[status];
  const Icon = v.Icon;
  const iconCls = v.tone === 'danger' ? 'bg-destructive/10 text-destructive' : v.tone === 'warning' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600';
  const barCls = v.tone === 'danger' ? 'bg-destructive' : v.tone === 'warning' ? 'bg-amber-500' : 'bg-emerald-500';
  const used = dateEmission ? Math.min(100, Math.round((ageDays / 90) * 100)) : 0;

  return (
    <>
      <div className={cn(DASH_CARD, 'p-4 md:p-5', className)}>
        <div className="flex items-start gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', iconCls)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[17px] font-semibold leading-tight text-foreground">{v.title}</p>
              <span className="shrink-0"><DashBadge tone={v.tone}>{v.badge}</DashBadge></span>
            </div>
            {v.subtitle && <p className="mt-1 text-sm leading-snug text-muted-foreground">{v.subtitle}</p>}
          </div>
        </div>

        {/* Validité : 3 mois à partir de la date d'émission */}
        {dateEmission && (
          <div className="imr-lg-glass mt-4 rounded-[20px] p-3.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Émis le <span className="font-semibold text-foreground">{dateFr(dateEmission)}</span></span>
              <span className={cn('shrink-0 font-semibold tabular-nums', v.tone === 'danger' ? 'text-destructive' : v.tone === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400')}>
                {status === 'expired' ? `Expiré depuis ${expiredSince} j` : `${daysUntilExpiry} j restants`}
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10" aria-hidden>
              <div className={cn('h-full rounded-full', barCls)} style={{ width: `${used}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Valable 3 mois · conseillé : moins de 2 mois</p>
          </div>
        )}

        <Button
          variant={v.ctaVariant}
          onClick={() => setDialogOpen(true)}
          className="mt-4 h-12 w-full gap-2 sm:w-auto"
        >
          {v.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <ExtractPoursuitesUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        onSuccess={() => { setDialogOpen(false); load(); }}
      />
    </>
  );
}
