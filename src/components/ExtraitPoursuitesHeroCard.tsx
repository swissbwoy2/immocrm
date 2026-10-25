import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ShieldCheck, Clock, FileWarning, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
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
            Émis le {format(new Date(dateEmission!), 'd MMM yyyy', { locale: fr })} · expire dans {daysUntilExpiry} jours
          </p>
        </div>
      </div>
    );
  }

  const variants = {
    missing: {
      iconCls: 'bg-amber-500/10 text-amber-600',
      Icon: FileWarning,
      title: 'Renseignez votre extrait de poursuites',
      subtitle: "Indiquez la date d'émission de votre extrait — l'IA peut la détecter automatiquement à partir du PDF.",
      ctaLabel: 'Téléverser mon extrait',
      ctaVariant: 'default' as const,
      badge: 'Action requise',
      badgeTone: 'warning' as const,
    },
    warning: {
      iconCls: 'bg-amber-500/10 text-amber-600',
      Icon: Clock,
      title: `Votre extrait expire dans ${daysUntilExpiry} jour${(daysUntilExpiry ?? 0) > 1 ? 's' : ''}`,
      subtitle: `Émis le ${format(new Date(dateEmission!), 'd MMMM yyyy', { locale: fr })} (${ageDays}j). Certaines régies n'acceptent que les extraits de moins de 2 mois — anticipez !`,
      ctaLabel: 'Mettre à jour maintenant',
      ctaVariant: 'default' as const,
      badge: 'À renouveler',
      badgeTone: 'warning' as const,
    },
    expired: {
      iconCls: 'bg-destructive/10 text-destructive',
      Icon: AlertTriangle,
      title: 'Votre extrait de poursuites est expiré',
      subtitle: `Émis le ${format(new Date(dateEmission!), 'd MMMM yyyy', { locale: fr })} (${ageDays}j). Votre dossier n'est plus complet — vos candidatures peuvent être refusées.`,
      ctaLabel: 'Téléverser un nouvel extrait',
      ctaVariant: 'destructive' as const,
      badge: 'URGENT',
      badgeTone: 'danger' as const,
    },
    valid: {
      iconCls: 'bg-emerald-500/10 text-emerald-600',
      Icon: ShieldCheck,
      title: 'Extrait de poursuites valide',
      subtitle: dateEmission
        ? `Émis le ${format(new Date(dateEmission), 'd MMMM yyyy', { locale: fr })} — expire dans ${daysUntilExpiry} jours.`
        : '',
      ctaLabel: 'Mettre à jour',
      ctaVariant: 'outline' as const,
      badge: 'À jour',
      badgeTone: 'success' as const,
    },
  };

  const v = variants[status];
  const Icon = v.Icon;

  return (
    <>
      <div className={cn(DASH_CARD, 'p-4 md:p-5', className)}>
        <div className="flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', v.iconCls)}>
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <DashBadge tone={v.badgeTone}>{v.badge}</DashBadge>
              {status === 'missing' && <DashBadge tone="muted">Détection IA</DashBadge>}
            </div>
            <p className="font-semibold text-foreground">{v.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{v.subtitle}</p>
            <div className="mt-3">
              <Button
                size="sm"
                variant={v.ctaVariant}
                onClick={() => setDialogOpen(true)}
                className="gap-2 rounded-full"
              >
                {v.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
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
