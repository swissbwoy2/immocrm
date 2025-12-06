import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MapPin, Calendar, Square, Home, FileText, ThumbsUp, ThumbsDown, 
  PartyPopper, AlertTriangle, Clock, Check, Key, Star, Mail, MapPinned, Sparkles,
  FileSignature, Building2, CalendarCheck, AlertCircle, ChevronDown, ChevronUp,
  MessageSquare, User, Phone, FileStack, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CandidatureWorkflowTimeline } from "@/components/CandidatureWorkflowTimeline";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { useNavigate } from "react-router-dom";

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
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        {/* Animated Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg animate-glow-pulse" />
              <div className="relative p-3 bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/20 rounded-xl">
                <FileStack className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Mes Candidatures
              </h1>
              <p className="text-muted-foreground">Suivez l'état de vos offres et candidatures en temps réel</p>
            </div>
          </div>
        </div>

        {offres.length > 0 ? (
          <div className="grid gap-6">
            {offres.map((offre, index) => {
              const candidature = candidatures.find(c => c.offre_id === offre.id);
              const statut = candidature?.statut || offre.statut;
              const datesProposees = candidature?.dates_signature_proposees as DateProposee[] | null;
              const isExpanded = expandedCards.has(offre.id);

              return (
                <Collapsible key={offre.id} open={isExpanded} onOpenChange={() => toggleCard(offre.id)}>
                  <Card 
                    className={`
                      group relative overflow-hidden backdrop-blur-sm 
                      bg-gradient-to-br from-card/95 to-card/80 
                      border-border/50 shadow-lg
                      transition-all duration-300 hover:shadow-xl hover:border-primary/30
                      animate-fade-in
                      ${statut === 'acceptee' ? 'border-green-500/50 border-2 shadow-green-500/10' : ''}
                    `}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>

                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <CardTitle className="text-lg sm:text-xl break-words">{offre.adresse}</CardTitle>
                              <Badge 
                                variant={getStatutBadgeVariant(statut)} 
                                className={`w-fit ${statut === 'acceptee' ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30' : ''}`}
                              >
                                {getStatutLabel(statut)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span className="truncate">{new Date(offre.date_envoi).toLocaleDateString('fr-CH')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Home className="h-4 w-4 shrink-0" />
                                <span>{offre.pieces} pcs</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Square className="h-4 w-4 shrink-0" />
                                <span>{offre.surface} m²</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:items-start gap-2">
                            <div className="text-left sm:text-right">
                              <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                CHF {offre.prix?.toLocaleString()}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">par mois</p>
                            </div>
                            <div className="p-2 text-muted-foreground shrink-0 transition-transform duration-200">
                              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {isExpanded ? 'Cliquez pour réduire' : 'Cliquez pour voir les détails'}
                        </p>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0 relative z-10">
                        {/* Timeline */}
                        {candidature && (
                          <div className="pb-4 border-b border-border/50">
                            <CandidatureWorkflowTimeline currentStatut={statut} />
                          </div>
                        )}

                        {/* Property details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 backdrop-blur-sm rounded-xl border border-border/30">
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
                        <div className="flex flex-wrap gap-2 pt-2">
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
                          <div className="space-y-3 pt-4 border-t border-border/50">
                            <Button onClick={() => updateStatut(offre.id, 'interesse')} className="w-full group">
                              <ThumbsUp className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                              Je suis intéressé
                            </Button>
                            <Button onClick={() => updateStatut(offre.id, 'refusee')} variant="destructive" className="w-full">
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              Pas intéressé
                            </Button>
                          </div>
                        )}

                        {/* Interested - waiting for visit */}
                        {statut === 'interesse' && (
                          <div className="p-4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              ℹ️ Vous avez marqué cette offre comme intéressante. Votre agent va organiser une visite.
                            </p>
                          </div>
                        )}

                        {/* Visit/Candidature in progress */}
                        {['visite_planifiee', 'visite_effectuee', 'candidature_deposee', 'en_attente'].includes(statut) && (
                          <div className="p-4 bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-xl">
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Votre agent gère activement cette candidature.
                            </p>
                          </div>
                        )}

                        {/* 🎉 ACCEPTED - Celebration + Conclude button */}
                        {statut === 'acceptee' && candidature && (
                          <div className="space-y-4 pt-4 border-t border-border/50">
                            <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-500/20 rounded-xl text-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />
                              <div className="relative">
                                <PartyPopper className="h-12 w-12 mx-auto text-green-500 mb-3 animate-bounce" />
                                <h3 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
                                  🎉 Félicitations ! Votre candidature a été acceptée !
                                </h3>
                                <p className="text-green-600 dark:text-green-400">
                                  Vous pouvez maintenant conclure le bail pour ce logement.
                                </p>
                              </div>
                            </div>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button className="w-full group" size="lg">
                                  <FileSignature className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
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
                          <div className="p-4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Votre agent valide avec la régie. Vous serez notifié dès réception du bail.
                            </p>
                          </div>
                        )}

                        {/* Attente bail */}
                        {statut === 'attente_bail' && (
                          <div className="p-4 bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-xl">
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              En attente de la réception du bail par la régie...
                            </p>
                          </div>
                        )}

                        {/* Bail reçu - Choose signature date */}
                        {statut === 'bail_recu' && datesProposees && datesProposees.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-border/50">
                            <div className="p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-xl">
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
                                className="w-full mt-4" 
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
                          <div className="p-4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl">
                            <h4 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
                              <CalendarCheck className="h-5 w-5" />
                              Signature prévue
                            </h4>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              📅 {candidature?.date_signature_choisie && format(new Date(candidature.date_signature_choisie), 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              📍 {candidature?.lieu_signature || 'Chemin de l\'Esparcette 5, 1023 Crissier'}
                            </p>
                          </div>
                        )}

                        {/* Signature effectuée - waiting for état des lieux */}
                        {statut === 'signature_effectuee' && (
                          <div className="p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-xl">
                            <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              ✅ Bail signé ! En attente de la date de l'état des lieux...
                            </p>
                          </div>
                        )}

                        {/* État des lieux fixé - IMPORTANT ALERT */}
                        {statut === 'etat_lieux_fixe' && (
                          <div className="space-y-4 pt-4 border-t border-border/50">
                            <div className="p-4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl">
                              <h4 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
                                <Key className="h-5 w-5" />
                                État des lieux et remise des clés
                              </h4>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                📅 {candidature?.date_etat_lieux && format(new Date(candidature.date_etat_lieux), 'EEEE dd MMMM yyyy', { locale: fr })}
                                {candidature?.heure_etat_lieux && ` à ${candidature.heure_etat_lieux}`}
                              </p>
                            </div>

                            <div className="p-5 bg-red-500/10 backdrop-blur-sm border-2 border-red-500/30 rounded-xl">
                              <h4 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
                                <AlertCircle className="h-5 w-5" />
                                ⚠️ IMPORTANT - À préparer AVANT l'état des lieux
                              </h4>
                              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                                Pour l'obtention de vos clés à l'état des lieux, il vous faut <strong>impérativement</strong> :
                              </p>
                              <ul className="space-y-2 text-sm text-red-600 dark:text-red-400">
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
                              <p className="text-sm text-red-700 dark:text-red-300 mt-4 font-medium">
                                🚫 Sans l'un de ces éléments, la régie pourrait refuser de vous remettre les clés !
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Clés remises - Recommendation */}
                        {statut === 'cles_remises' && (
                          <div className="space-y-4 pt-4 border-t border-border/50">
                            <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-xl text-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
                              <div className="relative">
                                <Key className="h-12 w-12 mx-auto text-purple-500 mb-3" />
                                <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                                  🔑 Bienvenue chez vous !
                                </h3>
                                <p className="text-purple-600 dark:text-purple-400 mb-4">
                                  Félicitations ! Vous avez reçu les clés de votre nouveau logement.
                                </p>
                                
                                {!candidature?.recommandation_envoyee && (
                                  <div className="space-y-3">
                                    <p className="text-sm text-purple-500 dark:text-purple-400">
                                      Aidez-nous à aider d'autres personnes comme vous !
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                      <Button 
                                        variant="outline" 
                                        onClick={() => {
                                          setCurrentCandidatureId(candidature?.id);
                                          setShowRecommendationDialog(true);
                                        }}
                                        className="border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
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
                                  <p className="text-sm text-green-600 flex items-center justify-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Merci pour vos recommandations !
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Refused */}
                        {statut === 'refusee' && (
                          <div className="p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl">
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                              ❌ Cette candidature a été refusée. Contactez votre agent pour plus d'informations.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <Card className="backdrop-blur-sm bg-gradient-to-br from-card/95 to-card/80 border-border/50">
            <CardContent className="py-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-muted/30 rounded-full blur-xl" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm border border-border/30 rounded-full flex items-center justify-center">
                  <FileStack className="h-10 w-10 text-muted-foreground/50" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Aucune offre reçue</h3>
              <p className="text-muted-foreground">Vous n'avez pas encore reçu d'offres pour le moment</p>
            </CardContent>
          </Card>
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
