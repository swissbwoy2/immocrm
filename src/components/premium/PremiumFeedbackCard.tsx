import { useEffect, useState } from 'react';
import { Calendar, MapPin, Home, Square, ThumbsUp, ThumbsDown, Minus, MessageSquare, ArrowRight, CheckCircle2, Send, X, Play, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Recommandation = 'recommande' | 'neutre' | 'deconseille';

interface MediaItem { url: string; type?: string; name?: string }

interface PremiumFeedbackCardProps {
  visite: {
    id: string;
    adresse: string;
    updated_at: string;
    offre_id?: string | null;
    client_id?: string | null;
    recommandation_agent?: string | null;
    feedback_agent?: string | null;
    feedback_coursier?: string | null;
    medias?: any;
    medias_coursier?: any;
    coursier_id?: string | null;
    client_decision?: string | null;
    client_confirme_visite_at?: string | null;
    offres?: {
      pieces?: number;
      surface?: number;
      prix?: number;
    };
  };
  index?: number;
  className?: string;
  onUpdate?: () => void;
}

const recommandationConfig: Record<Recommandation, {
  icon: typeof ThumbsUp;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  recommande: {
    icon: ThumbsUp,
    label: 'Recommandé',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-green-50/50 dark:from-emerald-950/50 dark:to-green-900/30',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/40'
  },
  neutre: {
    icon: Minus,
    label: 'Avis neutre',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-50/50 dark:from-slate-950/50 dark:to-gray-900/30',
    borderColor: 'border-slate-200/60 dark:border-slate-800/40'
  },
  deconseille: {
    icon: ThumbsDown,
    label: 'Non recommandé',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-50/50 dark:from-red-950/50 dark:to-rose-900/30',
    borderColor: 'border-red-200/60 dark:border-red-800/40'
  }
};

export function PremiumFeedbackCard({
  visite,
  index = 0,
  className,
  onUpdate,
}: PremiumFeedbackCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const recommandation = visite.recommandation_agent as Recommandation | null;
  const config = recommandation ? recommandationConfig[recommandation] : null;
  const Icon = config?.icon;
  const [posting, setPosting] = useState(false);
  const [existingCandidatureId, setExistingCandidatureId] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaItem | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(visite.client_confirme_visite_at ?? null);
  const [confirming, setConfirming] = useState(false);

  const feedbackText = visite.feedback_agent || visite.feedback_coursier || null;
  const visitorLabel = visite.coursier_id ? 'notre coursier mandaté' : 'votre agent';
  const allMedias: MediaItem[] = [
    ...(Array.isArray(visite.medias) ? visite.medias : []),
    ...(Array.isArray(visite.medias_coursier) ? visite.medias_coursier : []),
  ];

  // Check if candidature already exists for this offer/client
  useEffect(() => {
    if (!visite.offre_id || !visite.client_id) return;
    supabase
      .from('candidatures')
      .select('id')
      .eq('offre_id', visite.offre_id)
      .eq('client_id', visite.client_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExistingCandidatureId(data.id);
      });
  }, [visite.offre_id, visite.client_id]);

  const handlePostuler = async () => {
    if (!visite.offre_id || !visite.client_id) {
      toast.error("Offre introuvable");
      return;
    }
    if (existingCandidatureId) {
      navigate(`/client/mes-candidatures?candidatureId=${existingCandidatureId}`);
      return;
    }
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('candidatures')
        .insert({
          offre_id: visite.offre_id,
          client_id: visite.client_id,
          statut: 'en_attente',
          message_client: 'Candidature déposée suite à la visite déléguée',
        })
        .select('id')
        .single();
      if (error) throw error;

      await supabase
        .from('visites')
        .update({ client_decision: 'postule' })
        .eq('id', visite.id);

      toast.success('Candidature déposée — votre agent va la traiter sous 24h');
      setExistingCandidatureId(data.id);
      onUpdate?.();
      navigate(`/client/mes-candidatures?candidatureId=${data.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erreur lors du dépôt de candidature');
    } finally {
      setPosting(false);
    }
  };

  const handleNotInterested = async () => {
    setPosting(true);
    try {
      const { error } = await supabase
        .from('visites')
        .update({ client_decision: 'refuse' })
        .eq('id', visite.id);
      if (error) throw error;
      toast.success('Décision enregistrée');
      onUpdate?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    } finally {
      setPosting(false);
    }
  };

  const handleConfirmVisite = async () => {
    setConfirming(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('visites')
        .update({ client_confirme_visite_at: nowIso })
        .eq('id', visite.id);
      if (error) throw error;
      setConfirmedAt(nowIso);
      toast.success('Merci, compte rendu confirmé');
      onUpdate?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-card/95 via-card/90 to-card/80',
        'backdrop-blur-sm',
        'border border-emerald-200/50 dark:border-emerald-800/30',
        'hover:border-emerald-300/70 dark:hover:border-emerald-700/50',
        'p-5 md:p-6',
        'transition-all duration-300',
        'hover:shadow-lg hover:shadow-emerald-500/10',
        'animate-fade-in',
        className
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl opacity-50" />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <h3 className="font-semibold text-foreground">{visite.adresse}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Visitée le {format(new Date(visite.updated_at), 'd MMMM yyyy', { locale: fr })} · par {visitorLabel}</span>
            </div>
          </div>
          <Badge className="shrink-0 bg-gradient-to-r from-emerald-600 to-green-500 text-white border-0">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Effectuée
          </Badge>
        </div>

        {/* Specs */}
        {visite.offres && (
          <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-border/50">
            {visite.offres.pieces && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-sm">
                <Home className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{visite.offres.pieces} pièces</span>
              </div>
            )}
            {visite.offres.surface && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-sm">
                <Square className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{visite.offres.surface} m²</span>
              </div>
            )}
            {visite.offres.prix && (
              <div className="text-primary font-semibold text-sm">
                CHF {visite.offres.prix.toLocaleString()}/mois
              </div>
            )}
          </div>
        )}

        {/* Recommandation */}
        {config && Icon && (
          <div className={cn('p-4 rounded-xl border', config.bgColor, config.borderColor)}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20 shadow-sm">
                <Icon className={cn('w-5 h-5', config.color)} />
              </div>
              <span className={cn('font-semibold', config.color)}>{config.label} par {visitorLabel}</span>
            </div>
          </div>
        )}

        {/* Feedback texte */}
        {feedbackText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Compte rendu de visite</span>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30 relative overflow-hidden">
              <div className="absolute top-2 left-3 text-4xl text-primary/10 font-serif leading-none">"</div>
              <p className="text-sm text-foreground/90 whitespace-pre-line pl-6">{feedbackText}</p>
            </div>
          </div>
        )}

        {/* Médias (photos + vidéos) */}
        {allMedias.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Photos & vidéos ({allMedias.length})
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {allMedias.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setMediaPreview(m)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group/media hover:border-primary transition-all"
                >
                  {m.type?.startsWith('video') ? (
                    <>
                      <video src={m.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white drop-shadow-lg" />
                      </div>
                    </>
                  ) : (
                    <img src={m.url} alt={m.name || ''} loading="lazy" className="w-full h-full object-cover group-hover/media:scale-105 transition-transform" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 1 — Confirmation lecture du compte rendu */}
        {visite.offre_id && visite.client_id && !existingCandidatureId && visite.client_decision !== 'refuse' && !confirmedAt && (
          <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 dark:from-amber-950/40 dark:to-yellow-900/20 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">Avez-vous bien consulté le compte rendu de la visite ?</p>
                <p className="text-muted-foreground mt-0.5">Confirmez avant de décider de postuler.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleConfirmVisite}
                disabled={confirming}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white"
              >
                {confirming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Oui, j'ai pris connaissance
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2 — Actions Postuler / Pas intéressé (après confirmation) */}
        {visite.offre_id && visite.client_id && !existingCandidatureId && visite.client_decision !== 'refuse' && confirmedAt && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handlePostuler}
              disabled={posting}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Déposer ma candidature
            </Button>
            <Button
              onClick={handleNotInterested}
              disabled={posting}
              variant="ghost"
              className="text-muted-foreground"
            >
              Pas intéressé
            </Button>
          </div>
        )}

        {existingCandidatureId && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/client/mes-candidatures?candidatureId=${existingCandidatureId}`)}
          >
            <span className="flex items-center gap-2">
              Voir ma candidature
              <ArrowRight className="w-4 h-4" />
            </span>
          </Button>
        )}

        {visite.client_decision === 'refuse' && !existingCandidatureId && (
          <div className="text-sm text-center text-muted-foreground italic py-2">
            Vous n'êtes pas intéressé par ce bien
          </div>
        )}
      </div>

      {/* Lightbox preview */}
      {mediaPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setMediaPreview(null)}
        >
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Fermer">
            <X className="w-6 h-6" />
          </button>
          {mediaPreview.type?.startsWith('video') || (mediaPreview as any).mime?.startsWith?.('video') ? (
            <video
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="max-w-full max-h-full rounded-lg bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <source
                src={mediaPreview.url}
                type={(mediaPreview as any).mime || (mediaPreview.type?.startsWith('video/') ? mediaPreview.type : 'video/mp4')}
              />
            </video>
          ) : (
            <img src={mediaPreview.url} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}
