import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { CandidatureWorkflowInteractive } from '@/components/CandidatureWorkflowInteractive';
import { 
  MapPin, 
  Home, 
  Maximize, 
  Building, 
  Calendar, 
  KeyRound, 
  User, 
  Phone, 
  MessageSquare,
  Layers,
  Send,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  CalendarDays,
  FileText,
  CreditCard,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Image,
  Video,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PremiumAgentOffreDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
  onStatusChange?: (offreId: string, newStatus: string) => void;
  onResend?: () => void;
}

const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ElementType;
  step: number;
}> = {
  envoyee: { label: 'Envoyée', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: Send, step: 1 },
  vue: { label: 'Vue', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', icon: Eye, step: 2 },
  interesse: { label: 'Intéressé', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: TrendingUp, step: 3 },
  visite_planifiee: { label: 'Visite planifiée', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', icon: Calendar, step: 4 },
  visite_effectuee: { label: 'Visite effectuée', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/30', icon: CheckCircle, step: 5 },
  candidature_deposee: { label: 'Candidature déposée', color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30', icon: FileText, step: 6 },
  acceptee: { label: 'Acceptée', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: CheckCircle, step: 7 },
  refusee: { label: 'Refusée', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: XCircle, step: 0 },
};

const TIMELINE_STEPS = [
  { step: 1, label: 'Envoyée' },
  { step: 2, label: 'Vue' },
  { step: 3, label: 'Intéressé' },
  { step: 4, label: 'Visite' },
  { step: 5, label: 'Candidature' },
  { step: 6, label: 'Acceptée' },
];

export function PremiumAgentOffreDetailsDialog({ 
  open, 
  onOpenChange, 
  offre,
  onStatusChange,
  onResend
}: PremiumAgentOffreDetailsDialogProps) {
  const [visite, setVisite] = useState<any>(null);
  const [candidature, setCandidature] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && offre) {
      loadRelatedData();
    }
  }, [open, offre]);

  const loadRelatedData = async () => {
    if (!offre) return;
    setLoading(true);

    try {
      // Load visite
      const { data: visiteData } = await supabase
        .from('visites')
        .select('*')
        .eq('offre_id', offre.id)
        .maybeSingle();
      setVisite(visiteData);

      // Load candidature
      const { data: candidatureData } = await supabase
        .from('candidatures')
        .select('*')
        .eq('offre_id', offre.id)
        .maybeSingle();
      setCandidature(candidatureData);

      // Load transaction
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('offre_id', offre.id)
        .maybeSingle();
      setTransaction(transactionData);
    } catch (error) {
      console.error('Error loading related data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!offre) return null;

  const statusConfig = STATUS_CONFIG[offre.statut] || STATUS_CONFIG.envoyee;
  const StatusIcon = statusConfig.icon;
  const currentStep = statusConfig.step;

  const InfoRow = ({ icon: Icon, label, value, href }: { icon: any; label: string; value: string | null | undefined; href?: string }) => {
    if (!value) return null;
    const content = (
      <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          <p className={cn("text-sm font-medium", href && "text-primary hover:underline")}>{value}</p>
        </div>
      </div>
    );
    
    if (href) {
      return <a href={href} className="block">{content}</a>;
    }
    return content;
  };

  const getRecommandationInfo = (recommandation: string | null) => {
    if (!recommandation) return null;
    const config = {
      recommande: { icon: ThumbsUp, label: 'Recommandé', color: 'text-green-600', bg: 'bg-green-500/10' },
      neutre: { icon: Minus, label: 'Neutre', color: 'text-amber-600', bg: 'bg-amber-500/10' },
      deconseille: { icon: ThumbsDown, label: 'Déconseillé', color: 'text-red-600', bg: 'bg-red-500/10' }
    }[recommandation];
    return config;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Premium Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6 border-b border-border/50">
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-4 right-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-4 left-10 w-16 h-16 bg-accent/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <DialogHeader className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Offre envoyée</span>
                </div>
                <DialogTitle className="text-xl font-bold line-clamp-2 leading-tight">
                  {offre.adresse}
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{offre.clients?.profiles?.prenom} {offre.clients?.profiles?.nom}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(new Date(offre.date_envoi), "dd MMM yyyy", { locale: fr })}</span>
                  </div>
                </div>
              </div>
              <Badge 
                className={cn(
                  "shrink-0 font-semibold shadow-lg transition-all",
                  statusConfig.bgColor,
                  statusConfig.color,
                  statusConfig.borderColor,
                  "border"
                )}
              >
                <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                {statusConfig.label}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[calc(90vh-220px)]">
          <div className="p-6 space-y-6">
            {/* Prix Premium */}
            <div className="relative overflow-hidden p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-accent/10 rounded-2xl border border-primary/20">
              <div className="absolute top-2 right-2">
                <Sparkles className="h-5 w-5 text-primary/40" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  CHF {Number(offre.prix).toLocaleString('fr-CH')}
                </div>
                <div className="text-sm text-muted-foreground mt-1">par mois</div>
              </div>
            </div>

            {/* Progress Timeline */}
            {offre.statut !== 'refusee' && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Progression
                </h4>
                <div className="flex items-center gap-1 p-3 bg-muted/30 rounded-xl">
                  {TIMELINE_STEPS.map((step, i) => (
                    <div key={step.step} className="flex items-center flex-1">
                      <div className="relative flex-1">
                        <div 
                          className={cn(
                            "h-2 rounded-full transition-all duration-500",
                            currentStep >= step.step 
                              ? "bg-gradient-to-r from-primary to-primary/80" 
                              : "bg-muted"
                          )}
                        />
                        {currentStep === step.step && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary whitespace-nowrap">
                            {step.label}
                          </div>
                        )}
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && <div className="w-1" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidature Workflow */}
            {candidature && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Workflow Candidature
                </h4>
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <CandidatureWorkflowInteractive
                    currentStatut={candidature.statut}
                    candidature={candidature}
                    onProgressWorkflow={async () => {}}
                    onChooseDate={() => {}}
                  />
                </div>
              </div>
            )}

            {/* Caractéristiques */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                Caractéristiques
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="group p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    {offre.pieces || '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">pièces</div>
                </div>
                <div className="group p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 hover:shadow-lg hover:shadow-green-500/10 transition-all">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                    {offre.surface || '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">m²</div>
                </div>
                <div className="group p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    {offre.etage || '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">étage</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <InfoRow icon={Building} label="Type de bien" value={offre.type_bien} />
                <InfoRow icon={Calendar} label="Disponibilité" value={offre.disponibilite} />
              </div>
            </div>

            {/* Section Visite */}
            {visite && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Visite associée
                    {visite.est_deleguee && (
                      <Badge variant="outline" className="text-xs">Déléguée</Badge>
                    )}
                  </h4>
                  <div className={cn(
                    "p-4 rounded-xl border transition-all",
                    visite.statut === 'effectuee' 
                      ? "bg-green-500/10 border-green-500/30" 
                      : visite.statut === 'confirmee'
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-muted/30 border-border/50"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(visite.date_visite), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <Badge variant={visite.statut === 'effectuee' ? 'default' : 'secondary'}>
                        {visite.statut === 'effectuee' ? 'Effectuée' : visite.statut === 'confirmee' ? 'Confirmée' : 'Planifiée'}
                      </Badge>
                    </div>

                    {/* Feedback si visite effectuée */}
                    {visite.statut === 'effectuee' && visite.feedback_agent && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
                        {visite.recommandation_agent && (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const info = getRecommandationInfo(visite.recommandation_agent);
                              if (!info) return null;
                              const Icon = info.icon;
                              return (
                                <Badge className={cn(info.bg, info.color, "border-0")}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {info.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        )}
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {visite.feedback_agent}
                          </p>
                        </div>

                        {/* Médias */}
                        {visite.medias && Array.isArray(visite.medias) && visite.medias.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {visite.medias.map((media: any, index: number) => (
                              <a
                                key={index}
                                href={media.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors"
                              >
                                {media.type?.startsWith('image') ? (
                                  <img src={media.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Video className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Section Transaction */}
            {transaction && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Transaction
                    <Badge variant={transaction.statut === 'cloturee' ? 'default' : 'secondary'} className="text-xs">
                      {transaction.statut === 'cloturee' ? 'Clôturée' : 'En cours'}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                      <div className="text-xs text-muted-foreground">Commission totale</div>
                      <div className="text-xl font-bold text-primary">
                        CHF {Number(transaction.commission_totale).toLocaleString('fr-CH')}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="text-xs text-muted-foreground">Part agent</div>
                      <div className="text-xl font-bold">
                        CHF {Number(transaction.part_agent).toLocaleString('fr-CH')}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Description */}
            {offre.description && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {offre.description}
                  </p>
                </div>
              </>
            )}

            {/* Informations pratiques */}
            {(offre.code_immeuble || offre.concierge_nom || offre.locataire_nom) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Informations pratiques
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={KeyRound} label="Code immeuble" value={offre.code_immeuble} />
                    
                    {offre.concierge_nom && (
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Concierge
                        </div>
                        <p className="text-sm font-medium">{offre.concierge_nom}</p>
                        {offre.concierge_tel && (
                          <a 
                            href={`tel:${offre.concierge_tel}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {offre.concierge_tel}
                          </a>
                        )}
                      </div>
                    )}

                    {offre.locataire_nom && (
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Locataire actuel
                        </div>
                        <p className="text-sm font-medium">{offre.locataire_nom}</p>
                        {offre.locataire_tel && (
                          <a 
                            href={`tel:${offre.locataire_tel}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {offre.locataire_tel}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Commentaires */}
            {offre.commentaires && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Vos commentaires
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted/30 rounded-xl border border-border/50">
                    {offre.commentaires}
                  </p>
                </div>
              </>
            )}

            {/* Lien vers l'annonce */}
            {offre.lien_annonce && offre.lien_annonce.trim() && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Annonce originale</h4>
                  <LinkPreviewCard url={offre.lien_annonce} showInline />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-muted/30 border-t border-border/50">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Fermer
            </Button>
            {onResend && (
              <Button
                onClick={onResend}
                className="flex-1 gap-2"
              >
                <Send className="h-4 w-4" />
                Renvoyer
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
