import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  PremiumFeedbackCard,
  PremiumCandidatureTimeline
} from '@/components/premium';
import { Users, AlertCircle, CheckCircle, XCircle, MessageSquare, FileSignature, Video, Calendar, MapPin, Clock, Info } from 'lucide-react';
import { VisitVideoDecisionCard } from '@/components/client/VisitVideoDecisionCard';
import { DASH_CARD, DashPage, DashPageHeader, DashEmptyState, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { differenceInDays, differenceInHours } from 'date-fns';
import { toSwissTime, formatSwissDate, formatSwissTime } from '@/lib/dateUtils';
import type { ElementType, ReactNode } from 'react';

// ---- Briques d'affichage locales (rendu sobre, mêmes données que les anciens composants Premium) ----

/** Section de la page : pastille d'icône, titre, compteur, description, contenu. */
function VisiteSection({ title, description, icon: Icon, count, tone = 'primary', layout = 'stack', children }: {
  title: string;
  description?: string;
  icon: ElementType;
  count: number;
  tone?: 'primary' | 'amber' | 'muted';
  layout?: 'stack' | 'grid';
  children: ReactNode;
}) {
  const toneCls = tone === 'amber'
    ? 'bg-amber-500/10 text-amber-600'
    : tone === 'muted'
      ? 'bg-muted text-muted-foreground'
      : 'bg-primary/10 text-primary';
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-start gap-3 px-0.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneCls}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            {title}
            <DashBadge tone="muted">{count}</DashBadge>
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className={layout === 'grid' ? 'grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'grid gap-3'}>
        {children}
      </div>
    </section>
  );
}

const VISITE_VARIANTS = {
  pending: {
    badge: 'En attente',
    tone: 'warning' as const,
    message: 'Votre agent va bientôt confirmer cette demande',
    icon: Clock,
  },
  confirmed: {
    badge: 'Confirmée',
    tone: 'primary' as const,
    message: 'Votre agent effectuera la visite et vous partagera son feedback',
    icon: Info,
  },
  refused: {
    badge: 'Non disponible',
    tone: 'danger' as const,
    message: "Votre agent n'était pas disponible pour cette visite",
    icon: XCircle,
  },
};

/** Carte d'une visite déléguée (adresse, date, caractéristiques, compte à rebours, message). */
function VisiteDelegueCard({ visite, variant }: { visite: any; variant: 'pending' | 'confirmed' | 'refused' }) {
  const config = VISITE_VARIANTS[variant];
  const MessageIcon = config.icon;

  const getCountdown = () => {
    if (variant !== 'confirmed' || !visite.date_visite) return null;
    const visitDate = new Date(visite.date_visite);
    const now = new Date();
    const daysLeft = differenceInDays(visitDate, now);
    const hoursLeft = differenceInHours(visitDate, now);
    if (daysLeft > 0) {
      return { text: `Dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`, urgent: daysLeft <= 2 };
    } else if (hoursLeft > 0) {
      return { text: `Dans ${hoursLeft}h`, urgent: true };
    } else if (hoursLeft === 0) {
      return { text: "Aujourd'hui!", urgent: true };
    }
    return null;
  };
  const countdown = getCountdown();

  const specs = [
    visite.offres?.pieces ? `${visite.offres.pieces} pièces` : null,
    visite.offres?.surface ? `${visite.offres.surface} m²` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-base font-semibold text-foreground">{visite.adresse}</h3>
        </div>
        <span className="shrink-0">
          <DashBadge tone={config.tone}>{config.badge}</DashBadge>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {variant === 'confirmed' && visite.date_visite ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatSwissDate(visite.date_visite, 'EEEE d MMMM')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatSwissTime(visite.date_visite)}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Demandée le {formatSwissDate(visite.created_at, 'd MMM yyyy')}
          </span>
        )}
      </div>

      {visite.offres && (specs || visite.offres.prix) && (
        <p className="mt-2 text-sm text-foreground">
          {specs}
          {specs && visite.offres.prix ? ' · ' : ''}
          {visite.offres.prix && (
            <span className="font-semibold">CHF {visite.offres.prix.toLocaleString()}/mois</span>
          )}
        </p>
      )}

      {countdown && (
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            countdown.urgent ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-primary/10 text-primary'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {countdown.text}
        </span>
      )}

      <p className="mt-3 flex items-start gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <MessageIcon className="mt-px h-3.5 w-3.5 shrink-0" />
        {config.message}
      </p>
    </div>
  );
}

export default function VisitesDeleguees() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [visites, setVisites] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisiteId, setExpandedVisiteId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    loadVisites();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('visites-deleguees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visites'
        },
        () => {
          loadVisites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadVisites = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('client_id', clientData.id)
        .eq('est_deleguee', true)
        .order('created_at', { ascending: false });

      setVisites(visitesData || []);

      // Load candidatures linked to delegated-visit offers
      const offreIds = (visitesData || []).map(v => v.offre_id).filter(Boolean);
      if (offreIds.length > 0) {
        const { data: candData } = await supabase
          .from('candidatures')
          .select('id, statut, created_at, offre_id, avis_google_clicked_at, offres(adresse)')
          .eq('client_id', clientData.id)
          .in('offre_id', offreIds)
          .order('created_at', { ascending: false });
        setCandidatures(candData || []);
      } else {
        setCandidatures([]);
      }
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle URL params for deep linking
  useEffect(() => {
    const visiteId = searchParams.get('visiteId');
    if (visiteId && visites.length > 0 && !loading) {
      setExpandedVisiteId(visiteId);
      setTimeout(() => {
        cardRefs.current[visiteId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [searchParams, visites, loading]);

  if (loading) {
    return (
      <DashPage>
        <div role="status" aria-label="Chargement des visites déléguées">
          <div className="h-8 w-48 rounded-full bg-muted" />
          <div className="mt-2 h-4 w-64 rounded-full bg-muted/70" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted/50" />
            ))}
          </div>
        </div>
      </DashPage>
    );
  }

  // Séparer les visites par statut
  const visitesEnAttente = visites.filter(v => v.statut === 'planifiee');
  const visitesConfirmees = visites.filter(v => v.statut === 'confirmee');
  const visitesEffectuees = visites.filter(v => v.statut === 'effectuee');
  const visitesRefusees = visites.filter(v => v.statut === 'refusee');
  const visitesAvecVideo = visites.filter(v =>
    Array.isArray(v.medias) &&
    v.medias.some((m: any) =>
      m && m.url && m.shared_to_clients !== false &&
      ((typeof m.mime === 'string' && m.mime.startsWith('video/')) ||
        m.type === 'video' ||
        (typeof m.type === 'string' && m.type.startsWith('video/')) ||
        (typeof m.name === 'string' && /\.(mp4|webm|mov|m4v|ogv|ogg|mkv)$/i.test(m.name)))
    )
  );

  return (
    <DashPage className="space-y-8">
      <DashPageHeader
        title="Visites déléguées"
        subtitle="Suivez les visites que votre agent effectue pour vous"
      />

      {/* État vide global */}
      {visites.length === 0 && (
        <DashEmptyState
          icon={Users}
          title="Vous n'avez pas encore délégué de visites"
          description="Lorsque vous recevez une offre, vous pouvez demander à votre agent d'effectuer la visite pour vous"
          action={
            <Button onClick={() => navigate('/client/offres-recues')} className="rounded-full">
              Voir mes offres
            </Button>
          }
        />
      )}

      {/* Vidéos de visites partagées — décision client */}
      {visitesAvecVideo.length > 0 && (
        <VisiteSection
          title="Vidéos de vos visites"
          description="Visionnez les vidéos partagées par votre agent et indiquez si vous souhaitez postuler"
          icon={Video}
          count={visitesAvecVideo.length}
        >
          {visitesAvecVideo.map((visite) => (
            <VisitVideoDecisionCard key={visite.id} visite={visite} onUpdated={loadVisites} />
          ))}
        </VisiteSection>
      )}

      {/* Visites en attente de confirmation */}
      {visitesEnAttente.length > 0 && (
        <VisiteSection
          title="En attente de confirmation"
          description="Votre agent n'a pas encore confirmé ces demandes de visites"
          icon={AlertCircle}
          tone="amber"
          count={visitesEnAttente.length}
          layout="grid"
        >
          {visitesEnAttente.map((visite) => (
            <VisiteDelegueCard key={visite.id} visite={visite} variant="pending" />
          ))}
        </VisiteSection>
      )}

      {/* Visites confirmées */}
      {visitesConfirmees.length > 0 && (
        <VisiteSection
          title="Visites programmées"
          description="Votre agent va effectuer ces visites pour vous"
          icon={CheckCircle}
          count={visitesConfirmees.length}
          layout="grid"
        >
          {visitesConfirmees.map((visite) => (
            <VisiteDelegueCard key={visite.id} visite={visite} variant="confirmed" />
          ))}
        </VisiteSection>
      )}

      {/* Visites refusées */}
      {visitesRefusees.length > 0 && (
        <VisiteSection
          title="Non disponibles"
          description="Votre agent n'était pas disponible pour ces visites"
          icon={XCircle}
          tone="muted"
          count={visitesRefusees.length}
          layout="grid"
        >
          {visitesRefusees.map((visite) => (
            <VisiteDelegueCard key={visite.id} visite={visite} variant="refused" />
          ))}
        </VisiteSection>
      )}

      {/* Visites effectuées avec feedback */}
      <VisiteSection
        title="Visites effectuées"
        icon={MessageSquare}
        count={visitesEffectuees.length}
      >
        {visitesEffectuees.length > 0 ? (
          visitesEffectuees.map((visite, index) => (
            <PremiumFeedbackCard
              key={visite.id}
              visite={visite}
              index={index}
              onUpdate={loadVisites}
            />
          ))
        ) : (
          <DashEmptyState
            icon={MessageSquare}
            title="Aucune visite effectuée"
            description="Les visites effectuées avec le feedback de votre agent apparaîtront ici"
            action={
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate('/client/offres-recues')}
              >
                Voir mes offres
              </Button>
            }
          />
        )}
      </VisiteSection>

      {/* Suivi des candidatures issues des visites déléguées */}
      {candidatures.length > 0 && (
        <VisiteSection
          title="Suivi de mes candidatures"
          description="De la candidature à la remise des clés"
          icon={FileSignature}
          count={candidatures.length}
          layout="grid"
        >
          {candidatures.map((cand, index) => (
            <PremiumCandidatureTimeline
              key={cand.id}
              candidature={cand}
              index={index}
            />
          ))}
        </VisiteSection>
      )}
    </DashPage>
  );
}
