import { useState } from 'react';
import { CheckCircle2, Clock, MapPin, FileSignature, Key, Star, XCircle, Building2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CQJCKNAJlouGEAE/review';

interface Candidature {
  id: string;
  statut: string;
  created_at: string;
  avis_google_clicked_at?: string | null;
  offres?: { adresse?: string };
}

interface Props {
  candidature: Candidature;
  index?: number;
}

const STEPS = [
  { key: 'depot', label: 'Candidature déposée', icon: CheckCircle2 },
  { key: 'transmise', label: 'Transmise à la régie', icon: Building2 },
  { key: 'examen', label: 'Régie examine le dossier', icon: Clock },
  { key: 'reponse', label: 'Réponse de la régie', icon: FileSignature },
  { key: 'signature_planifiee', label: 'Date de signature fixée', icon: MapPin },
  { key: 'signature_effectuee', label: 'Bail signé', icon: FileSignature },
  { key: 'etat_lieux', label: 'État des lieux fixé', icon: Key },
  { key: 'cles', label: 'Clés remises 🎉', icon: Key },
];

const STATUT_TO_STEP: Record<string, number> = {
  en_attente: 0,
  acceptee: 1,
  bail_conclu: 1,
  attente_bail: 2,
  bail_recu: 3,
  signature_planifiee: 4,
  signature_effectuee: 5,
  etat_lieux_fixe: 6,
  cles_remises: 7,
  refusee: -1,
};

export function PremiumCandidatureTimeline({ candidature, index = 0 }: Props) {
  const navigate = useNavigate();
  const [clicking, setClicking] = useState(false);
  const currentStep = STATUT_TO_STEP[candidature.statut] ?? 0;
  const isRefused = candidature.statut === 'refusee';
  const isCompleted = candidature.statut === 'cles_remises';

  const handleGoogleReview = async () => {
    setClicking(true);
    try {
      await supabase
        .from('candidatures')
        .update({ avis_google_clicked_at: new Date().toISOString() })
        .eq('id', candidature.id);
    } catch (e) {
      // non-blocking
    }
    window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener');
    setClicking(false);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-5 md:p-6 animate-fade-in',
        'bg-gradient-to-br from-card/95 via-card/90 to-card/80 backdrop-blur-sm',
        'border',
        isRefused
          ? 'border-red-200/60 dark:border-red-800/40'
          : isCompleted
          ? 'border-amber-300/70 dark:border-amber-700/40'
          : 'border-blue-200/50 dark:border-blue-800/30'
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl opacity-50" />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-foreground truncate">{candidature.offres?.adresse || 'Bien'}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidature du {new Date(candidature.created_at).toLocaleDateString('fr-CH')}
            </p>
          </div>
          {isRefused ? (
            <Badge variant="destructive" className="shrink-0">
              <XCircle className="w-3 h-3 mr-1" /> Refusée
            </Badge>
          ) : isCompleted ? (
            <Badge className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Star className="w-3 h-3 mr-1" /> Conclue
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">En cours</Badge>
          )}
        </div>

        {/* Timeline */}
        {!isRefused && (
          <div className="relative pl-2">
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const current = i === currentStep && !isCompleted;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-start gap-3 relative">
                  {/* Vertical line */}
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'absolute left-[14px] top-7 w-px h-full -z-0',
                        i < currentStep ? 'bg-primary/60' : 'bg-border'
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      'relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 mt-0.5',
                      done
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border',
                      current && 'ring-4 ring-primary/20 animate-pulse'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className={cn('flex-1 pb-4', !done && 'opacity-60')}>
                    <p className={cn('text-sm font-medium', current && 'text-primary')}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isRefused && (
          <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/60">
            <p className="text-sm text-red-700 dark:text-red-300">
              La régie n'a pas retenu votre dossier pour ce bien. Continuez vos recherches !
            </p>
          </div>
        )}

        {/* CTA Avis Google */}
        {isCompleted && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-900/30 border border-amber-200/60">
            <div className="flex items-start gap-3 mb-3">
              <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Bienvenue chez vous ! 🎉</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aidez d'autres locataires : laissez un avis Google sur Logisorama.
                </p>
              </div>
            </div>
            <Button
              onClick={handleGoogleReview}
              disabled={clicking}
              size="sm"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            >
              <Star className="w-4 h-4 mr-2" />
              {candidature.avis_google_clicked_at ? 'Merci ! Laisser à nouveau' : 'Laisser un avis Google'}
            </Button>
          </div>
        )}

        {/* Voir détails */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/client/mes-candidatures?candidatureId=${candidature.id}`)}
        >
          Voir le détail <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
