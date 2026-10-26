import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, Clock, MapPin, Home,
  Maximize, User, Phone, KeyRound, CalendarCheck, Check, X, FileCheck, Eye, EyeOff, ThumbsUp, Users,
  Loader2, Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { VisitVideoDecisionCard, submitVisitVideoDecision } from '@/components/client/VisitVideoDecisionCard';
import { DASH_CARD, DashBadge, DashEmptyState, DashPage, DashPageHeader, DashSection } from '@/components/client/dashboard/DashPrimitives';

/** Tuile d'information du bien (pièces, surface, étage…). */
function InfoTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function Visites() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [submittingVisiteId, setSubmittingVisiteId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle URL parameter for auto-expanding visite
  useEffect(() => {
    const visiteId = searchParams.get('visiteId');
    if (visiteId && visites.length > 0) {
      const visite = visites.find(v => v.id === visiteId);
      if (visite) {
        // Auto-expand this card
        setExpandedCards(prev => new Set([...prev, visiteId]));
        // Scroll to the card
        setTimeout(() => {
          const cardElement = cardRefs.current.get(visiteId);
          if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [searchParams, visites]);

  useEffect(() => {
    loadVisites();
    markTypeAsRead('new_visit');
    markTypeAsRead('visit_reminder');
    
    const channel = supabase
      .channel('visites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visites',
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

      if (!clientData) {
        console.log('No client data found');
        return;
      }

      const { data: visitesData, error } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('client_id', clientData.id)
        .order('date_visite', { ascending: true });

      if (error) throw error;

      setVisites(visitesData || []);
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CH', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  const marquerVisiteEffectuee = async (visite: any) => {
    try {
      const { error: visiteError } = await supabase
        .from('visites')
        .update({ statut: 'effectuee' })
        .eq('id', visite.id);

      if (visiteError) {
        console.error('Error updating visite:', visiteError);
        throw visiteError;
      }

      // Mark client confirmation timestamp (unified across delegated/physical visits)
      await supabase
        .from('visites')
        .update({ client_confirme_visite_at: new Date().toISOString() })
        .eq('id', visite.id);

      if (visite.offre_id) {
        const { error: offreError } = await supabase
          .from('offres')
          .update({ statut: 'visite_effectuee' })
          .eq('id', visite.offre_id);

        if (offreError) {
          console.error('Error updating offre:', offreError);
        }
      }

      if (visite.offres) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, agent_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (clientData?.agent_id) {
          let { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', clientData.id)
            .eq('agent_id', clientData.agent_id)
            .maybeSingle();

          if (!conv) {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({
                client_id: clientData.id,
                agent_id: clientData.agent_id,
                subject: 'Messages'
              })
              .select()
              .maybeSingle();
            conv = newConv;
          }

          if (conv) {
            const messageContent = `✅ **Visite effectuée !**\n\n🏠 Bien visité:\n📍 ${visite.offres.adresse}\n💰 ${visite.offres.prix?.toLocaleString()} CHF/mois\n\n📝 **Prêt à postuler ?**\nSi ce bien vous intéresse, vous pouvez maintenant déposer votre candidature depuis la page "Offres Reçues".\n\n👉 Cliquez sur "Demander l'aide de l'agent" pour que votre agent postule pour vous.`;

            await supabase.from('messages').insert({
              conversation_id: conv.id,
              sender_id: user?.id,
              sender_type: 'client',
              content: messageContent,
              offre_id: visite.offre_id
            });
          }
        }
      }

      toast({
        title: 'Succès',
        description: 'La visite a été marquée comme effectuée'
      });

      await loadVisites();
    } catch (error) {
      console.error('Error updating visite:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la visite',
        variant: 'destructive'
      });
    }
  };

  const accepterOffre = async (visite: any) => {
    try {
      await supabase
        .from('offres')
        .update({ statut: 'interesse' })
        .eq('id', visite.offre_id);

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id && visite.offres) {
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('agent_id', clientData.agent_id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: clientData.id,
              agent_id: clientData.agent_id,
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: `✅ **Le client est intéressé par l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n💰 Loyer: ${visite.offres.prix.toLocaleString()} CHF/mois\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`,
            offre_id: visite.offre_id
          });
        }
      }

      toast({
        title: '✅ Offre acceptée',
        description: 'Votre agent a été notifié de votre intérêt'
      });

      await loadVisites();
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter l\'offre',
        variant: 'destructive'
      });
    }
  };

  const refuserOffre = async (visite: any) => {
    try {
      await supabase
        .from('offres')
        .update({ statut: 'refusee' })
        .eq('id', visite.offre_id);

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientData?.agent_id && visite.offres) {
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('agent_id', clientData.agent_id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: clientData.id,
              agent_id: clientData.agent_id,
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: `❌ **Le client a refusé l'offre suite à la visite**\n\n🏠 Adresse: ${visite.offres.adresse}\n📅 Visite effectuée le: ${formatDate(visite.date_visite)}`,
            offre_id: visite.offre_id
          });
        }
      }

      toast({
        title: 'Offre refusée',
        description: 'Votre agent a été notifié'
      });

      await loadVisites();
    } catch (error) {
      console.error('Error refusing offer:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de refuser l\'offre',
        variant: 'destructive'
      });
    }
  };

  const deposerCandidature = async (visite: any) => {
    if (!user || submittingVisiteId) return;
    setSubmittingVisiteId(visite.id);
    try {
      await submitVisitVideoDecision({
        user,
        visiteId: visite.id,
        offreId: visite.offre_id ?? null,
        agentIdHint: visite.agent_id ?? null,
        address: visite.adresse || visite.offres?.adresse || '',
        choice: 'souhaite_postuler',
      });
      toast({
        title: 'Demande enregistrée et transmise à l\'équipe',
        description: 'Votre demande de candidature a été transmise à votre agent.',
      });
      await loadVisites();
    } catch (error: any) {
      console.error('[Visites] deposerCandidature error:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de transmettre votre demande de candidature',
        variant: 'destructive',
      });
    } finally {
      setSubmittingVisiteId(null);
    }
  };

  if (loading) {
    return (
      <DashPage>
        <div role="status" aria-label="Chargement des visites">
          <div className="h-8 w-44 rounded-full bg-muted/60" />
          <div className="mt-2 h-4 w-56 rounded-full bg-muted/50" />
          <div className="mt-6 h-28 rounded-2xl bg-muted/40" />
        </div>
      </DashPage>
    );
  }

  const now = new Date();
  const visitesAVenir = visites.filter(v => new Date(v.date_visite) >= now && v.statut === 'planifiee');
  const visitesPassees = visites.filter(v => new Date(v.date_visite) < now || v.statut !== 'planifiee');

  const renderVisiteCard = (visite: any) => {
    const isExpanded = expandedCards.has(visite.id);
    const isPast = new Date(visite.date_visite) < now || visite.statut !== 'planifiee';

    return (
      <div
        key={visite.id}
        ref={(el) => {
          if (el) cardRefs.current.set(visite.id, el);
        }}
        className={`${DASH_CARD} p-4 md:p-5 ${isPast ? 'opacity-90' : ''}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {visite.offres && (
            <div className="flex items-center justify-between gap-2 sm:order-2 sm:flex-col sm:items-end">
              <div className="text-left sm:text-right">
                <p className="text-[15px] font-semibold text-foreground">
                  {visite.offres.prix?.toLocaleString('fr-CH')} CHF
                </p>
                <p className="text-xs text-muted-foreground">/mois</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="touch-target h-10 w-10 shrink-0 rounded-full"
                onClick={() => toggleCardExpanded(visite.id)}
              >
                {isExpanded ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          )}

          <div className="min-w-0 flex-1 sm:order-1">
            <h3 className="mb-2 text-base font-semibold leading-snug text-foreground">
              {visite.adresse}
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {visite.statut === 'effectuee' ? (
                <DashBadge tone="success">
                  <Check className="mr-1 h-3 w-3" />
                  Effectuée
                </DashBadge>
              ) : (
                <DashBadge tone="primary">
                  <CalendarCheck className="mr-1 h-3 w-3" />
                  Planifiée
                </DashBadge>
              )}
              {visite.est_deleguee && (
                <DashBadge tone="muted">
                  <Users className="mr-1 h-3 w-3" />
                  Déléguée
                </DashBadge>
              )}
              {visite.recommandation_agent && (
                <DashBadge tone="success">
                  <ThumbsUp className="mr-1 h-3 w-3" />
                  Recommandé
                </DashBadge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatShortDate(visite.date_visite)}</span>
          <Clock className="ml-auto h-4 w-4 text-muted-foreground sm:ml-3" />
          <span>
            {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-5">
            <VisitLiveButton visiteId={visite.id} size="default" className="w-full rounded-full" />

            <VisitVideoDecisionCard visite={visite} onUpdated={loadVisites} />

            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-sm font-medium capitalize text-foreground">
                {formatDate(visite.date_visite)}
              </p>
            </div>

            {visite.offres && (
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                {visite.offres.pieces && <InfoTile icon={Home} label="Pièces" value={visite.offres.pieces} />}
                {visite.offres.surface && <InfoTile icon={Maximize} label="Surface" value={`${visite.offres.surface} m²`} />}
                {visite.offres.etage && <InfoTile icon={MapPin} label="Étage" value={visite.offres.etage} />}
                {visite.offres.disponibilite && <InfoTile icon={Calendar} label="Disponible" value={visite.offres.disponibilite} />}
              </div>
            )}

            {visite.offres && (visite.offres.code_immeuble || visite.offres.concierge_nom || visite.offres.locataire_nom) && (
              <div>
                <h4 className="mb-3 text-base font-semibold text-foreground">
                  Informations pratiques
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {visite.offres.code_immeuble && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Code</p>
                        <p className="text-sm font-semibold text-foreground">{visite.offres.code_immeuble}</p>
                      </div>
                    </div>
                  )}

                  {visite.offres.concierge_nom && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Concierge</p>
                        <p className="truncate text-sm font-medium text-foreground">{visite.offres.concierge_nom}</p>
                        {visite.offres.concierge_tel && (
                          <div className="mt-1 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${visite.offres.concierge_tel}`} className="truncate text-xs text-primary hover:underline">
                              {visite.offres.concierge_tel}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {visite.offres.locataire_nom && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Locataire actuel</p>
                        <p className="truncate text-sm font-medium text-foreground">{visite.offres.locataire_nom}</p>
                        {visite.offres.locataire_tel && (
                          <div className="mt-1 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${visite.offres.locataire_tel}`} className="truncate text-xs text-primary hover:underline">
                              {visite.offres.locataire_tel}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {visite.recommandation_agent && (
              <div className="rounded-xl bg-emerald-500/10 p-4">
                <p className="flex items-start gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <ThumbsUp className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {visite.recommandation_agent}
                </p>
              </div>
            )}

            {visite.notes && (
              <div className="rounded-xl bg-amber-500/10 p-4">
                <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {visite.notes}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {visite.statut === 'planifiee' && visite.offres?.statut !== 'visite_effectuee' && (
                <Button
                  onClick={() => marquerVisiteEffectuee(visite)}
                  className="touch-target w-full rounded-full"
                  size="lg"
                >
                  <Check className="mr-2 h-5 w-5" />
                  Marquer comme effectuée
                </Button>
              )}

              {(visite.statut === 'effectuee' || visite.offres?.statut === 'visite_effectuee') &&
               visite.offres?.statut !== 'interesse' &&
               visite.offres?.statut !== 'refusee' &&
               visite.offres?.statut !== 'candidature_deposee' && (
                <div className="space-y-3 rounded-xl border border-border/70 p-4">
                  <p className="text-center text-sm font-medium text-foreground">
                    Souhaitez-vous donner suite ?
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      size="lg"
                      className="touch-target w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => accepterOffre(visite)}
                    >
                      <Check className="mr-2 h-5 w-5" />
                      Intéressé
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="touch-target w-full rounded-full"
                      disabled={submittingVisiteId === visite.id}
                      onClick={() => deposerCandidature(visite)}
                    >
                      {submittingVisiteId === visite.id ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <FileCheck className="mr-2 h-5 w-5" />
                      )}
                      Déposer candidature
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="touch-target w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => refuserOffre(visite)}
                    >
                      <X className="mr-2 h-5 w-5" />
                      Refuser
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/client/offres-recues')}
                  className="flex-1 rounded-full"
                >
                  Voir l'offre
                </Button>
                {visite.offres?.lien_annonce && (
                  <LinkPreviewCard url={visite.offres.lien_annonce} />
                )}
              </div>
            </div>
          </div>
        )}

        {!isExpanded && visite.statut === 'planifiee' && (
          <div className="mt-3">
            <Button
              onClick={() => marquerVisiteEffectuee(visite)}
              className="w-full rounded-full"
              size="sm"
            >
              <Check className="mr-2 h-4 w-4" />
              Marquer effectuée
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashPage className="pb-safe">
      <DashPageHeader
        title="Mes visites"
        subtitle={`${visites.length} visite${visites.length > 1 ? 's' : ''} au total`}
      />

      <div className="space-y-8">
        {/* Section Visites à venir */}
        {visitesAVenir.length > 0 && (
          <DashSection title="À venir" action={<DashBadge tone="primary">{visitesAVenir.length}</DashBadge>}>
            <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visitesAVenir.map((visite) => renderVisiteCard(visite))}
            </div>
          </DashSection>
        )}

        {/* Section Visites passées */}
        {visitesPassees.length > 0 && (
          <DashSection title="Passées" action={<DashBadge tone="muted">{visitesPassees.length}</DashBadge>}>
            <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visitesPassees.map((visite) => renderVisiteCard(visite))}
            </div>
          </DashSection>
        )}

        {/* État vide */}
        {visites.length === 0 && (
          <DashEmptyState
            icon={Calendar}
            title="Aucune visite planifiée"
            description="Vous n'avez pas de visite programmée pour le moment."
            action={
              <Button onClick={() => navigate('/client/offres-recues')} className="rounded-full">
                Voir mes offres
              </Button>
            }
          />
        )}
      </div>
    </DashPage>
  );
}
