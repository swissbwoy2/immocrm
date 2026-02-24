import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  MapPin, Calendar, Square, Home, FileText, ThumbsUp, ThumbsDown, 
  PartyPopper, AlertTriangle, Clock, Check, Key, Star, Mail, MapPinned, Sparkles,
  FileSignature, Building2, CalendarCheck, AlertCircle, ChevronDown, ChevronUp,
  MessageSquare, User, Phone, FileStack, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PremiumPageHeader, PremiumEmptyState } from "@/components/premium";
import { PremiumCandidatureKPIs } from "@/components/premium/PremiumCandidatureKPIs";
import { PremiumCandidatureCard } from "@/components/premium/PremiumCandidatureCard";
import { PremiumWorkflowTimeline } from "@/components/premium/PremiumWorkflowTimeline";
import { PremiumStatusCard } from "@/components/premium/PremiumStatusCard";
import { PremiumCelebrationCard } from "@/components/premium/PremiumCelebrationCard";
import { FloatingParticles } from "@/components/messaging/FloatingParticles";

const WORKFLOW_STATUTS = {
  envoyee: { label: 'Offre envoyée', color: 'secondary', step: 1 },
  vue: { label: 'Offre vue', color: 'outline', step: 1 },
  interesse: { label: 'Intéressé', color: 'default', step: 2 },
  visite_planifiee: { label: 'Visite planifiée', color: 'default', step: 3 },
  visite_effectuee: { label: 'Visite effectuée', color: 'default', step: 4 },
  candidature_deposee: { label: 'Candidature déposée', color: 'default', step: 5 },
  en_attente: { label: 'En attente réponse', color: 'secondary', step: 6 },
  acceptee: { label: '🎉 Acceptée', color: 'default', step: 7 },
  refusee: { label: 'Refusée', color: 'destructive', step: 0 },
  bail_conclu: { label: 'Bail conclu', color: 'default', step: 8 },
  attente_bail: { label: 'Attente bail régie', color: 'secondary', step: 9 },
  bail_recu: { label: 'Bail reçu - Choisir date', color: 'default', step: 10 },
  signature_planifiee: { label: 'Signature planifiée', color: 'default', step: 11 },
  signature_effectuee: { label: 'Bail signé', color: 'default', step: 12 },
  etat_lieux_fixe: { label: 'État des lieux fixé', color: 'default', step: 13 },
  cles_remises: { label: '🔑 Clés remises', color: 'default', step: 14 },
};

const getStatutLabel = (statut: string) => {
  return WORKFLOW_STATUTS[statut as keyof typeof WORKFLOW_STATUTS]?.label || statut;
};

const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
  const config = WORKFLOW_STATUTS[statut as keyof typeof WORKFLOW_STATUTS];
  return (config?.color as any) || 'secondary';
};

interface DateProposee {
  date: string;
  lieu: string;
}

const MesCandidatures = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { syncEvent } = useGoogleCalendarSync();
  const [searchParams] = useSearchParams();
  const [offres, setOffres] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [recommendationEmails, setRecommendationEmails] = useState(['', '', '', '', '']);
  const [sendingRecommendation, setSendingRecommendation] = useState(false);
  const [currentCandidatureId, setCurrentCandidatureId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showThankYouDialog, setShowThankYouDialog] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle URL parameter for auto-expanding candidature
  useEffect(() => {
    const candidatureId = searchParams.get('candidatureId');
    if (candidatureId && candidatures.length > 0) {
      // Find the offre linked to this candidature
      const candidature = candidatures.find(c => c.id === candidatureId);
      if (candidature) {
        // Auto-expand this card
        setExpandedCards(prev => new Set([...prev, candidature.offre_id]));
        // Scroll to the card
        setTimeout(() => {
          const cardElement = cardRefs.current.get(candidature.offre_id);
          if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [searchParams, candidatures]);

  const toggleCard = (offreId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(offreId)) {
        newSet.delete(offreId);
      } else {
        newSet.add(offreId);
      }
      return newSet;
    });
  };

  // Calculate KPIs
  const kpiData = {
    total: offres.length,
    actives: offres.filter(o => {
      const c = candidatures.find(c => c.offre_id === o.id);
      const s = c?.statut || o.statut;
      return !['refusee', 'cles_remises'].includes(s);
    }).length,
    acceptees: candidatures.filter(c => ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(c.statut)).length,
    clesRemises: candidatures.filter(c => c.statut === 'cles_remises').length,
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) {
        setLoading(false);
        return;
      }

      const { data: offresData } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date_envoi', { ascending: false });

      const { data: candidaturesData } = await supabase
        .from('candidatures')
        .select('*')
        .eq('client_id', clientData.id);

      setOffres(offresData || []);
      setCandidatures(candidaturesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (offreId: string, newStatut: string) => {
    try {
      const offre = offres.find(o => o.id === offreId);
      if (!offre) return;

      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;

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
              subject: 'Messages',
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          const messageContent = newStatut === 'interesse' 
            ? `✅ Je suis intéressé par l'offre : ${offre.adresse} (${offre.prix} CHF/mois)`
            : `❌ Je ne suis pas intéressé par l'offre : ${offre.adresse}`;

          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user?.id,
            sender_type: 'client',
            content: messageContent,
            offre_id: offre.id
          });
        }
      }

      setOffres(prev => prev.map(o => o.id === offreId ? { ...o, statut: newStatut } : o));

      toast({
        title: "Statut mis à jour",
        description: `L'offre a été ${newStatut === 'interesse' ? 'marquée comme intéressante' : 'refusée'}.`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleAccepterConclure = async (candidatureId: string) => {
    try {
      const { error } = await supabase
        .from('candidatures')
        .update({ 
          statut: 'bail_conclu',
          client_accepte_conclure: true,
          client_accepte_conclure_at: new Date().toISOString()
        })
        .eq('id', candidatureId);

      if (error) throw error;

      await loadData();
      toast({ title: "Bail accepté", description: "Votre agent va valider avec la régie." });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleChoisirDate = async (candidatureId: string, dateIndex: number) => {
    try {
      const candidature = candidatures.find(c => c.id === candidatureId);
      const dates = candidature?.dates_signature_proposees as DateProposee[] | null;
      if (!dates || !dates[dateIndex]) return;

      const selectedDate = dates[dateIndex];

      const { error } = await supabase
        .from('candidatures')
        .update({ 
          statut: 'signature_planifiee',
          date_signature_choisie: selectedDate.date,
        })
        .eq('id', candidatureId);

      if (error) throw error;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const offre = offres.find(o => o.id === candidature?.offre_id);

      if (clientData) {
        await supabase.from('calendar_events').insert({
          title: `Signature bail - ${offre?.adresse || 'Bail'}`,
          event_type: 'signature',
          event_date: selectedDate.date,
          description: `Lieu: ${selectedDate.lieu}`,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          created_by: user?.id,
        });

        // Sync to Google Calendar
        if (user) {
          syncEvent(user.id, {
            title: `Signature bail - ${offre?.adresse || 'Bail'}`,
            description: `Lieu: ${selectedDate.lieu}`,
            start: selectedDate.date,
          });
        }
      }

      await loadData();
      toast({ title: "Date choisie", description: "Le rendez-vous a été ajouté à votre agenda." });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleSendRecommendations = async () => {
    const validEmails = recommendationEmails.filter(e => e.trim() && e.includes('@'));
    if (validEmails.length === 0) {
      toast({ title: "Aucun email valide", variant: "destructive" });
      return;
    }

    setSendingRecommendation(true);
    try {
      const { error } = await supabase.functions.invoke('send-recommendation-email', {
        body: { emails: validEmails, userId: user?.id }
      });

      if (error) throw error;

      if (currentCandidatureId) {
        await supabase
          .from('candidatures')
          .update({ 
            recommandation_envoyee: true,
            emails_recommandation: validEmails
          })
          .eq('id', currentCandidatureId);
      }

      setShowRecommendationDialog(false);
      setRecommendationEmails(['', '', '', '', '']);
      await loadData();
      toast({ title: "Recommandations envoyées", description: `${validEmails.length} email(s) envoyé(s)` });
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur d'envoi", variant: "destructive" });
    } finally {
      setSendingRecommendation(false);
    }
  };

  const openGoogleMaps = async (candidatureId?: string) => {
    window.open('https://share.google/rQl4mbAJowzSW2V8m', '_blank');
    
    if (candidatureId) {
      await supabase
        .from('candidatures')
        .update({ avis_google_envoye: true })
        .eq('id', candidatureId);
      
      loadData();
    }
    
    setShowThankYouDialog(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/20 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </div>
        <p className="text-muted-foreground animate-pulse">Chargement de vos candidatures...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative">
      {/* Floating particles background */}
      <FloatingParticles count={15} />
      
      <div className="p-4 md:p-8 relative z-10">
        <PremiumPageHeader
          title="Mes Candidatures"
          subtitle="Suivez l'état de vos offres et candidatures en temps réel"
          icon={FileStack}
          badge="Suivi Premium"
        />

        {/* Premium KPIs */}
        <PremiumCandidatureKPIs data={kpiData} />

        {offres.length > 0 ? (
          <div className="grid gap-6">
            {offres.map((offre, index) => {
              const candidature = candidatures.find(c => c.offre_id === offre.id);
              const statut = candidature?.statut || offre.statut;
              const datesProposees = candidature?.dates_signature_proposees as DateProposee[] | null;
              const isExpanded = expandedCards.has(offre.id);

              return (
                <div 
                  key={offre.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(offre.id, el);
                  }}
                >
                  <PremiumCandidatureCard
                    offre={offre}
                    statut={statut}
                    statutLabel={getStatutLabel(statut)}
                    statutVariant={getStatutBadgeVariant(statut)}
                    isExpanded={isExpanded}
                    onToggle={() => toggleCard(offre.id)}
                    index={index}
                  >
                  <div className="pt-4 space-y-6">
                    {/* Premium Workflow Timeline */}
                    {candidature && (
                      <PremiumWorkflowTimeline currentStatut={statut} />
                    )}

                    {/* Property details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/20 backdrop-blur-sm rounded-xl border border-border/30">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-primary/70" />
                        <span className="text-sm">{offre.pieces} pièces</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 text-primary/70" />
                        <span className="text-sm">{offre.surface} m²</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary/70" />
                        <span className="text-sm">{offre.etage || '-'} étage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary/70" />
                        <span className="text-sm">{offre.type_bien || 'Appartement'}</span>
                      </div>
                    </div>

                    {offre.description && (
                      <p className="text-sm text-muted-foreground">{offre.description}</p>
                    )}

                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-border/50 hover:border-primary/30 hover:bg-primary/5"
                        onClick={(e) => { e.stopPropagation(); navigate('/client/messagerie'); }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contacter mon agent
                      </Button>
                      {offre.lien_annonce && (
                        <LinkPreviewCard url={offre.lien_annonce} />
                      )}
                    </div>

                    {/* WORKFLOW SECTIONS */}
                    
                    {/* Initial offer - Accept/Refuse */}
                    {statut === 'envoyee' && (
                      <div className="space-y-3 pt-4 border-t border-border/30">
                        <Button 
                          onClick={() => updateStatut(offre.id, 'interesse')} 
                          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 group"
                          size="lg"
                        >
                          <ThumbsUp className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                          Je suis intéressé
                        </Button>
                        <Button 
                          onClick={() => updateStatut(offre.id, 'refusee')} 
                          variant="destructive" 
                          className="w-full"
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Pas intéressé
                        </Button>
                      </div>
                    )}

                    {/* Interested - waiting for visit */}
                    {statut === 'interesse' && (
                      <PremiumStatusCard
                        variant="info"
                        title="Offre marquée comme intéressante"
                        description="Votre agent va organiser une visite pour vous."
                      />
                    )}

                    {/* Visit/Candidature in progress */}
                    {['visite_planifiee', 'visite_effectuee', 'candidature_deposee', 'en_attente'].includes(statut) && (
                      <PremiumStatusCard
                        variant="waiting"
                        title="Candidature en cours de traitement"
                        description="Votre agent gère activement cette candidature."
                        icon={Clock}
                      />
                    )}

                    {/* 🎉 ACCEPTED - Celebration + Conclude button */}
                    {statut === 'acceptee' && candidature && (
                      <div className="space-y-4 pt-4 border-t border-border/30">
                        <PremiumCelebrationCard
                          type="accepted"
                          title="🎉 Félicitations !"
                          description="Votre candidature a été acceptée ! Vous pouvez maintenant conclure le bail."
                          icon={PartyPopper}
                        />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 shadow-lg" 
                              size="lg"
                            >
                              <FileSignature className="h-5 w-5 mr-2" />
                              Conclure le bail
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="backdrop-blur-md bg-background/95 border-border/50">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Avertissement important
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-left space-y-3">
                                <p>
                                  En acceptant de conclure ce bail, vous vous engagez à respecter les conditions suivantes :
                                </p>
                                <div className="p-4 bg-amber-500/10 backdrop-blur-sm rounded-xl border border-amber-500/20">
                                  <p className="font-medium text-amber-700 dark:text-amber-300">
                                    ⚠️ Des frais pourront être facturés en cas de désistement par la régie ou le propriétaire 
                                    de l'offre, en alignement avec leurs conditions générales.
                                  </p>
                                </div>
                                <p>Êtes-vous sûr de vouloir continuer ?</p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleAccepterConclure(candidature.id)}>
                                J'accepte et je conclus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}

                    {/* Bail conclu - waiting for régie */}
                    {statut === 'bail_conclu' && (
                      <PremiumStatusCard
                        variant="info"
                        title="Bail en cours de validation"
                        description="Votre agent valide avec la régie. Vous serez notifié dès réception du bail."
                        icon={Building2}
                      />
                    )}

                    {/* Attente bail */}
                    {statut === 'attente_bail' && (
                      <PremiumStatusCard
                        variant="waiting"
                        title="En attente du bail"
                        description="En attente de la réception du bail par la régie..."
                        icon={Clock}
                      />
                    )}

                    {/* Bail reçu - Choose signature date */}
                    {statut === 'bail_recu' && datesProposees && datesProposees.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-border/30">
                        <div className="p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-sm border border-green-500/20 rounded-xl">
                          <h4 className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2 mb-3">
                            <CalendarCheck className="h-5 w-5" />
                            Le bail est prêt ! Choisissez une date de signature :
                          </h4>
                          <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                            📍 Lieu : {candidature?.lieu_signature || 'Chemin de l\'Esparcette 5, 1023 Crissier'}
                          </p>
                          <RadioGroup 
                            value={selectedDateIndex?.toString()} 
                            onValueChange={(val) => setSelectedDateIndex(parseInt(val))}
                            className="space-y-3"
                          >
                            {datesProposees.map((d, idx) => (
                              <div key={idx} className="flex items-center space-x-3 p-3 bg-card/50 backdrop-blur-sm rounded-lg border border-border/30 hover:border-primary/30 transition-colors">
                                <RadioGroupItem value={idx.toString()} id={`date-${idx}`} />
                                <Label htmlFor={`date-${idx}`} className="flex-1 cursor-pointer">
                                  <span className="font-medium">
                                    {format(new Date(d.date), 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                          <Button 
                            className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600" 
                            disabled={selectedDateIndex === null}
                            onClick={() => candidature && selectedDateIndex !== null && handleChoisirDate(candidature.id, selectedDateIndex)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Confirmer cette date
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Signature planifiée */}
                    {statut === 'signature_planifiee' && (
                      <PremiumStatusCard
                        variant="success"
                        title="Signature prévue"
                        icon={CalendarCheck}
                      >
                        <div className="mt-2 text-sm space-y-1">
                          <p>📅 {candidature?.date_signature_choisie && format(new Date(candidature.date_signature_choisie), 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                          <p>📍 {candidature?.lieu_signature || 'Chemin de l\'Esparcette 5, 1023 Crissier'}</p>
                        </div>
                      </PremiumStatusCard>
                    )}

                    {/* Signature effectuée - waiting for état des lieux */}
                    {statut === 'signature_effectuee' && (
                      <PremiumStatusCard
                        variant="success"
                        title="Bail signé !"
                        description="En attente de la date de l'état des lieux..."
                        icon={Check}
                      />
                    )}

                    {/* État des lieux fixé - IMPORTANT ALERT */}
                    {statut === 'etat_lieux_fixe' && (
                      <div className="space-y-4 pt-4 border-t border-border/30">
                        <PremiumStatusCard
                          variant="info"
                          title="État des lieux et remise des clés"
                          icon={Key}
                        >
                          <p className="text-sm mt-2">
                            📅 {candidature?.date_etat_lieux && format(new Date(candidature.date_etat_lieux), 'EEEE dd MMMM yyyy', { locale: fr })}
                            {candidature?.heure_etat_lieux && ` à ${candidature.heure_etat_lieux}`}
                          </p>
                        </PremiumStatusCard>

                        <PremiumStatusCard
                          variant="warning"
                          title="⚠️ IMPORTANT - À préparer AVANT l'état des lieux"
                          icon={AlertCircle}
                        >
                          <div className="mt-3 space-y-2">
                            <p className="text-sm">
                              Pour l'obtention de vos clés à l'état des lieux, il vous faut <strong>impérativement</strong> :
                            </p>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <span>✅ Avoir souscrit une <strong>garantie de loyer</strong></span>
                              </li>
                              <li className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <span>✅ Avoir payé le <strong>premier loyer</strong></span>
                              </li>
                              <li className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <span>✅ Avoir souscrit une <strong>assurance RC</strong> (si vous n'en avez pas déjà une)</span>
                              </li>
                            </ul>
                            <p className="text-sm font-medium mt-3">
                              🚫 Sans l'un de ces éléments, la régie pourrait refuser de vous remettre les clés !
                            </p>
                          </div>
                        </PremiumStatusCard>
                      </div>
                    )}

                    {/* Clés remises - Recommendation */}
                    {statut === 'cles_remises' && (
                      <div className="space-y-4 pt-4 border-t border-border/30">
                        <PremiumCelebrationCard
                          type="keys"
                          title="🔑 Bienvenue chez vous !"
                          description="Félicitations ! Vous avez reçu les clés de votre nouveau logement."
                          icon={Key}
                        >
                          {!candidature?.recommandation_envoyee && (
                            <div className="mt-4 space-y-3">
                              <p className="text-sm text-muted-foreground">
                                Aidez-nous à aider d'autres personnes comme vous !
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setCurrentCandidatureId(candidature?.id);
                                    setShowRecommendationDialog(true);
                                  }}
                                  className="border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10"
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Recommander à 5 amis
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => openGoogleMaps(candidature?.id)}
                                  className="border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                  disabled={candidature?.avis_google_envoye}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  {candidature?.avis_google_envoye ? 'Merci pour votre avis !' : 'Noter sur Google'}
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {candidature?.recommandation_envoyee && (
                            <p className="text-sm text-green-600 flex items-center justify-center gap-2 mt-4">
                              <Sparkles className="h-4 w-4" />
                              Merci pour vos recommandations !
                            </p>
                          )}
                        </PremiumCelebrationCard>
                      </div>
                    )}

                    {/* Refused */}
                    {statut === 'refusee' && (
                      <PremiumStatusCard
                        variant="warning"
                        title="Candidature refusée"
                        description="Cette candidature a été refusée. Contactez votre agent pour plus d'informations."
                      />
                    )}
                  </div>
                </PremiumCandidatureCard>
              </div>
              );
            })}
          </div>
        ) : (
          <PremiumEmptyState
            icon={FileStack}
            title="Aucune offre reçue"
            description="Vous n'avez pas encore reçu d'offres pour le moment"
          />
        )}
      </div>

      {/* Recommendation Dialog */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="max-w-md backdrop-blur-md bg-background/95 border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Recommander Immo-Rama
            </DialogTitle>
            <DialogDescription>
              Partagez votre expérience avec vos proches ! Entrez jusqu'à 5 adresses email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {recommendationEmails.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={email}
                  className="bg-muted/30 border-border/50 focus:border-primary/50"
                  onChange={(e) => {
                    const newEmails = [...recommendationEmails];
                    newEmails[idx] = e.target.value;
                    setRecommendationEmails(newEmails);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommendationDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendRecommendations} disabled={sendingRecommendation}>
              {sendingRecommendation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer les recommandations'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thank You Dialog */}
      <Dialog open={showThankYouDialog} onOpenChange={setShowThankYouDialog}>
        <DialogContent className="max-w-md text-center backdrop-blur-md bg-background/95 border-border/50">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-500/5 backdrop-blur-sm border border-amber-500/20 rounded-full flex items-center justify-center">
                  <Star className="h-8 w-8 text-amber-500" />
                </div>
              </div>
            </div>
            <DialogTitle className="text-2xl">Merci infiniment ! 🙏</DialogTitle>
            <DialogDescription className="text-base mt-4 space-y-3">
              <p>
                Votre avis compte énormément pour nous et aide d'autres personnes 
                à nous faire confiance dans leur recherche de logement.
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                Grâce à vous, nous pouvons continuer à accompagner des familles 
                vers leur nouveau chez-soi !
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={() => setShowThankYouDialog(false)} className="w-full group">
              <Sparkles className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              Avec plaisir !
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MesCandidatures;
