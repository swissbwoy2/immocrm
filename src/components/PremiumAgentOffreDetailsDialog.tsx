import { VisitLiveButton } from '@/components/calls/VisitLiveButton';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { estPrixDAchat } from '@/lib/achatOffreActions';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import {
  DETAIL_DIALOG,
  DetailHeader,
  DetailBody,
  KeyFacts,
  DetailSection,
  DetailRow,
  DetailText,
  DetailContact,
  DetailActions,
  chfDetail,
  dateCH,
  dateTimeCH,
} from '@/components/details/DetailPrimitives';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { CandidatureWorkflowInteractive } from '@/components/CandidatureWorkflowInteractive';
import {
  Home,
  Maximize,
  Building,
  Calendar,
  KeyRound,
  User,
  MessageSquare,
  Layers,
  Send,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  FileText,
  CreditCard,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Video,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddressLink } from '@/components/AddressLink';
import { supabase } from '@/integrations/supabase/client';

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
  souhaite_postuler: { label: 'Souhaite postuler', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', icon: TrendingUp, step: 5.4 },
  offre_envisagee: { label: "Offre d'achat envisagée", color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: TrendingUp, step: 5.6 },
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const espace = pathname.startsWith('/admin') ? '/admin' : '/agent';
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
  const statusTone: 'neutral' | 'success' | 'warning' | 'danger' =
    offre.statut === 'refusee' ? 'danger'
      : ['acceptee', 'visite_planifiee', 'visite_effectuee'].includes(offre.statut) ? 'success'
      : ['interesse', 'souhaite_postuler', 'offre_envisagee', 'candidature_deposee'].includes(offre.statut) ? 'warning'
      : 'neutral';
  const StatusIcon = statusConfig.icon;
  const currentStep = statusConfig.step;

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
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Offre envoyée
            </span>
          }
          title={
            <AddressLink
              address={offre.adresse}
              showIcon={false}
              className="text-[19px] font-semibold sm:text-xl"
            />
          }
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {offre.clients?.profiles?.prenom} {offre.clients?.profiles?.nom}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {dateCH(offre.date_envoi, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </span>
          }
          badge={
            <DashBadge tone={statusTone}>
              <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
              {statusConfig.label}
            </DashBadge>
          }
        />

        <DetailBody>
          <KeyFacts
            items={[
              { label: estPrixDAchat(offre.prix) ? 'Prix de vente' : 'Loyer / mois', value: chfDetail(offre.prix) ?? '-', emphasis: true, wide: true },
              { label: 'Pièces', value: offre.pieces || '-', icon: Home },
              { label: 'Surface', value: offre.surface ? `${offre.surface} m²` : '-', icon: Maximize },
              { label: 'Étage', value: offre.etage || '-', icon: Layers },
            ]}
          />

          {/* Progression */}
          {offre.statut !== 'refusee' && (
            <DetailSection title="Progression" icon={TrendingUp}>
              <div className="flex items-center gap-1 pt-5">
                {TIMELINE_STEPS.map((step) => (
                  <div key={step.step} className="relative flex-1">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        currentStep >= step.step ? "bg-primary" : "bg-muted"
                      )}
                    />
                    {currentStep === step.step && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary">
                        {step.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Candidature Workflow */}
          {candidature && (
            <DetailSection title="Workflow candidature" icon={FileText}>
              <CandidatureWorkflowInteractive
                currentStatut={candidature.statut}
                candidature={candidature}
                onProgressWorkflow={async () => {}}
                onChooseDate={() => {}}
              />
            </DetailSection>
          )}

          {/* Caractéristiques & contacts */}
          {(offre.type_bien || offre.disponibilite || offre.contact_gerance || offre.contact_annonceur || offre.contact_visite) && (
            <DetailSection title="Caractéristiques" icon={Home}>
              <DetailRow icon={Building} label="Type de bien" value={offre.type_bien} />
              <DetailRow icon={Calendar} label="Disponibilité" value={offre.disponibilite} />
              <DetailRow icon={Building} label="Contact gérance" value={offre.contact_gerance} />
              <DetailRow icon={Building} label="Contact annonceur" value={offre.contact_annonceur} />
              <DetailRow icon={Calendar} label="Contact visite" value={offre.contact_visite} />
            </DetailSection>
          )}

          {/* Visite associée */}
          {visite && (
            <DetailSection
              title="Visite associée"
              icon={CalendarDays}
              action={
                <div className="flex items-center gap-1.5">
                  {visite.est_deleguee && <DashBadge tone="muted">Déléguée</DashBadge>}
                  <DashBadge tone={visite.statut === 'effectuee' ? 'success' : visite.statut === 'confirmee' ? 'primary' : 'neutral'}>
                    {visite.statut === 'effectuee' ? 'Effectuée' : visite.statut === 'confirmee' ? 'Confirmée' : 'Planifiée'}
                  </DashBadge>
                </div>
              }
            >
              <DetailRow
                icon={Calendar}
                label="Date de la visite"
                value={visite.date_visite ? dateTimeCH(visite.date_visite) : null}
              />
              <div className="mt-2">
                <VisitLiveButton
                  visiteId={visite.id}
                  dateVisite={visite.date_visite}
                  className="w-full rounded-full"
                />
              </div>

              {visite.statut === 'effectuee' && visite.feedback_agent && (
                <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                  {visite.recommandation_agent && (() => {
                    const info = getRecommandationInfo(visite.recommandation_agent);
                    if (!info) return null;
                    const Icon = info.icon;
                    return (
                      <DashBadge tone={visite.recommandation_agent === 'recommande' ? 'success' : visite.recommandation_agent === 'deconseille' ? 'danger' : 'warning'}>
                        <Icon className="mr-1 h-3 w-3" />
                        {info.label}
                      </DashBadge>
                    );
                  })()}
                  <DetailText>{visite.feedback_agent}</DetailText>

                  {visite.medias && Array.isArray(visite.medias) && visite.medias.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {visite.medias.map((media: any, index: number) => (
                        <a
                          key={index}
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted"
                        >
                          {media.type?.startsWith('image') ? (
                            <img src={media.url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Video className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </DetailSection>
          )}

          {/* Transaction */}
          {transaction && (
            <DetailSection
              title="Transaction"
              icon={CreditCard}
              bare
              action={
                <DashBadge tone={transaction.statut === 'cloturee' ? 'success' : 'warning'}>
                  {transaction.statut === 'cloturee' ? 'Clôturée' : 'En cours'}
                </DashBadge>
              }
            >
              <KeyFacts
                columns={3}
                items={[
                  { label: 'Commission totale', value: chfDetail(transaction.commission_totale) ?? '-', emphasis: true },
                  { label: 'Part agent', value: chfDetail(transaction.part_agent) ?? '-' },
                ]}
              />
            </DetailSection>
          )}

          {offre.description && (
            <DetailSection title="Description">
              <DetailText>{offre.description}</DetailText>
            </DetailSection>
          )}

          {(offre.code_immeuble || offre.concierge_nom || offre.locataire_nom) && (
            <DetailSection title="Informations pratiques" icon={Layers}>
              <DetailRow icon={KeyRound} label="Code immeuble" value={offre.code_immeuble} />
              {offre.concierge_nom && (
                <DetailContact icon={User} role="Concierge" name={offre.concierge_nom} phone={offre.concierge_tel} />
              )}
              {offre.locataire_nom && (
                <DetailContact icon={User} role="Locataire actuel" name={offre.locataire_nom} phone={offre.locataire_tel} />
              )}
            </DetailSection>
          )}

          {offre.commentaires && (
            <DetailSection title="Vos commentaires" icon={MessageSquare}>
              <DetailText>{offre.commentaires}</DetailText>
            </DetailSection>
          )}

          {offre.lien_annonce && offre.lien_annonce.trim() && (
            <DetailSection title="Annonce originale" bare>
              <LinkPreviewCard url={offre.lien_annonce} showInline />
            </DetailSection>
          )}
        </DetailBody>

        <DetailActions>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={offre?.client_id && onResend ? 'max-sm:hidden' : undefined}>
            Fermer
          </Button>
          {offre?.client_id && (
            <Button
              variant="outline"
              onClick={() => { onOpenChange(false); navigate(`${espace}/clients/${offre.client_id}`); }}
            >
              {estPrixDAchat(offre.prix) ? "Dossier d'achat du client" : 'Fiche client'}
            </Button>
          )}
          {onResend && (
            <Button onClick={onResend} className="gap-2">
              <Send className="h-4 w-4" />
              Renvoyer
            </Button>
          )}
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}
