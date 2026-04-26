import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ShieldCheck, Clock, Sparkles, FileWarning, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExtractPoursuitesUploadDialog } from '@/components/ExtractPoursuitesUploadDialog';
import { cn } from '@/lib/utils';

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
    // Mode discret pour valide : petit ruban
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3', className)}>
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Extrait de poursuites valide</span>
          <span className="text-muted-foreground ml-2">
            Émis le {format(new Date(dateEmission!), 'd MMM yyyy', { locale: fr })} · expire dans {daysUntilExpiry} jours
          </span>
        </div>
      </div>
    );
  }

  const variants = {
    missing: {
      gradient: 'from-amber-500/20 via-orange-500/10 to-amber-500/5',
      border: 'border-amber-500/40',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-600',
      Icon: FileWarning,
      title: 'Renseignez votre extrait de poursuites',
      subtitle: "Indiquez la date d'émission de votre extrait — l'IA peut la détecter automatiquement à partir du PDF.",
      ctaLabel: 'Téléverser mon extrait',
      ctaVariant: 'default' as const,
      badge: '📋 Action requise',
      badgeColor: 'bg-amber-500 text-white',
    },
    warning: {
      gradient: 'from-orange-500/20 via-amber-500/10 to-orange-500/5',
      border: 'border-orange-500/40',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-600',
      Icon: Clock,
      title: `Votre extrait expire dans ${daysUntilExpiry} jour${(daysUntilExpiry ?? 0) > 1 ? 's' : ''}`,
      subtitle: `Émis le ${format(new Date(dateEmission!), 'd MMMM yyyy', { locale: fr })} (${ageDays}j). ⚠️ Certaines régies n'acceptent que les extraits de moins de 2 mois — anticipez !`,
      ctaLabel: 'Mettre à jour maintenant',
      ctaVariant: 'default' as const,
      badge: '🟡 À renouveler',
      badgeColor: 'bg-orange-500 text-white',
    },
    expired: {
      gradient: 'from-red-500/25 via-rose-500/15 to-red-500/5',
      border: 'border-red-500/50',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-600',
      Icon: AlertTriangle,
      title: 'Votre extrait de poursuites est expiré',
      subtitle: `Émis le ${format(new Date(dateEmission!), 'd MMMM yyyy', { locale: fr })} (${ageDays}j). 🚨 Votre dossier n'est plus complet — vos candidatures peuvent être refusées.`,
      ctaLabel: 'Téléverser un nouvel extrait',
      ctaVariant: 'destructive' as const,
      badge: '🔴 URGENT',
      badgeColor: 'bg-red-600 text-white',
    },
    valid: {
      gradient: 'from-emerald-500/15 via-green-500/8 to-emerald-500/5',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-600',
      Icon: ShieldCheck,
      title: 'Extrait de poursuites valide',
      subtitle: dateEmission
        ? `Émis le ${format(new Date(dateEmission), 'd MMMM yyyy', { locale: fr })} — expire dans ${daysUntilExpiry} jours.`
        : '',
      ctaLabel: 'Mettre à jour',
      ctaVariant: 'outline' as const,
      badge: '✅ À jour',
      badgeColor: 'bg-emerald-500 text-white',
    },
  };

  const v = variants[status];
  const Icon = v.Icon;

  return (
    <>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl shadow-lg',
          'bg-gradient-to-br',
          v.gradient,
          v.border,
          'animate-fade-in',
          className
        )}
      >
        {/* Decorative blur */}
        <div className={cn('absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-40', v.iconBg)} />

        <div className="relative p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Icon */}
          <div className={cn('w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md', v.iconBg)}>
            <Icon className={cn('w-7 h-7 md:w-8 md:h-8', v.iconColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn('inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md', v.badgeColor)}>
                {v.badge}
              </span>
              {status === 'missing' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-700 border border-violet-500/30">
                  <Sparkles className="w-3 h-3" /> Détection IA
                </span>
              )}
            </div>
            <h3 className="text-lg md:text-xl font-bold text-foreground leading-tight">{v.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{v.subtitle}</p>
          </div>

          {/* CTA */}
          <div className="flex md:flex-col gap-2 md:items-end shrink-0">
            <Button
              size="lg"
              variant={v.ctaVariant}
              onClick={() => setDialogOpen(true)}
              className="gap-2 font-semibold shadow-md w-full md:w-auto"
            >
              {v.ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
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
