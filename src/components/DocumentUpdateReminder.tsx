import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExtractPoursuitesUploadDialog } from '@/components/ExtractPoursuitesUploadDialog';

type Status = 'missing' | 'valid' | 'warning' | 'expired';

export function DocumentUpdateReminder() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [dateEmission, setDateEmission] = useState<string | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase
      .from('clients') as any)
      .select('id, extrait_poursuites_date_emission, extrait_poursuites_extraction_method')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setClientId(data.id);
      setDateEmission(data.extrait_poursuites_date_emission);
      setExtractionMethod(data.extrait_poursuites_extraction_method);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !clientId) return null;

  // Calcul statut
  let status: Status = 'missing';
  let ageMonths = 0;
  if (dateEmission) {
    const days = (Date.now() - new Date(dateEmission).getTime()) / (1000 * 60 * 60 * 24);
    ageMonths = days / 30;
    if (ageMonths >= 3) status = 'expired';
    else if (ageMonths >= 2) status = 'warning';
    else status = 'valid';
  }

  const styles = {
    missing: {
      border: 'border-amber-500/30 bg-amber-500/10',
      iconBg: 'bg-amber-500/20',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      titleColor: 'text-amber-600 dark:text-amber-400',
      title: '📋 Renseignez la date de votre extrait',
      message: "Aidez-nous à garder votre dossier complet : indiquez la date d'émission de votre extrait de poursuites. L'IA peut la détecter automatiquement.",
    },
    valid: {
      border: 'border-green-500/30 bg-green-500/10',
      iconBg: 'bg-green-500/20',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      titleColor: 'text-green-600 dark:text-green-400',
      title: `✅ Extrait valide`,
      message: dateEmission
        ? `Émis le ${format(new Date(dateEmission), 'd MMMM yyyy', { locale: fr })} — votre dossier est à jour.`
        : '',
    },
    warning: {
      border: 'border-orange-500/30 bg-orange-500/10',
      iconBg: 'bg-orange-500/20',
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      titleColor: 'text-orange-600 dark:text-orange-400',
      title: '🟡 Votre extrait approche les 2 mois',
      message: dateEmission
        ? `Émis le ${format(new Date(dateEmission), 'd MMMM yyyy', { locale: fr })}. ⚠️ Certaines régies n'acceptent que les extraits de moins de 2 mois — anticipez en commandant un nouvel extrait.`
        : '',
    },
    expired: {
      border: 'border-red-500/30 bg-red-500/10',
      iconBg: 'bg-red-500/20',
      icon: <Shield className="w-5 h-5 text-red-600" />,
      titleColor: 'text-red-600 dark:text-red-400',
      title: '🔴 URGENT — Extrait expiré',
      message: dateEmission
        ? `Émis le ${format(new Date(dateEmission), 'd MMMM yyyy', { locale: fr })} (> 3 mois). Votre dossier n'est plus complet — commandez un nouvel extrait immédiatement.`
        : '',
    },
  }[status];

  const buttonLabel =
    status === 'valid' ? 'Mettre à jour' :
    status === 'missing' ? 'Renseigner ma date' :
    'Uploader un nouvel extrait';

  return (
    <>
      <div className={`rounded-xl border p-4 md:p-5 transition-all ${styles.border}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 rounded-full shrink-0 ${styles.iconBg}`}>{styles.icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold ${styles.titleColor}`}>{styles.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{styles.message}</p>
            {extractionMethod === 'ai' && status === 'valid' && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Date détectée par IA
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={status === 'valid' ? 'outline' : 'default'}
            onClick={() => setDialogOpen(true)}
          >
            <Sparkles className="w-4 h-4 mr-1" /> {buttonLabel}
          </Button>
          {status !== 'valid' && (
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a href="https://www.eschkg.ch" target="_blank" rel="noreferrer">
                Commander un extrait (eSchKG)
              </a>
            </Button>
          )}
        </div>
      </div>

      <ExtractPoursuitesUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        onSuccess={loadData}
      />
    </>
  );
}
