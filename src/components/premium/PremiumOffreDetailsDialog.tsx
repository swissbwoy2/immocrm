import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  MapPin, 
  Home, 
  Square, 
  Calendar, 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Info, 
  FileCheck,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { ChanceIndicator } from "@/components/ChanceIndicator";
import { CandidatureWorkflowInteractive } from "@/components/CandidatureWorkflowInteractive";
import { calculateChances } from "@/utils/chanceCalculator";

interface PremiumOffreDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
  candidatures: any[];
  clientData: any;
  documentsStats: Record<string, any>;
  visites: any[];
  onProgressWorkflow: (nextStatut: string, candidatureId: string) => Promise<void>;
  onPlanVisit: (offre: any) => void;
  onPostulerDirect: (offre: any) => void;
  formatStatutOffre: (statut: string) => { label: string; variant: any };
}

export function PremiumOffreDetailsDialog({
  open,
  onOpenChange,
  offre,
  candidatures,
  clientData,
  documentsStats,
  visites,
  onProgressWorkflow,
  onPlanVisit,
  onPostulerDirect,
  formatStatutOffre
}: PremiumOffreDetailsDialogProps) {
  if (!offre) return null;

  const candidature = candidatures.find(c => c.offre_id === offre.id);
  const showWorkflow = ['candidature_deposee', 'en_attente', 'acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(candidature?.statut || offre.statut);
  const effectiveStatut = candidature?.statut || offre.statut;
  const statutInfo = formatStatutOffre(offre.statut);

  const showChances = ['interesse', 'visite_planifiee', 'visite_effectuee', 'candidature_deposee'].includes(offre.statut);

  const characteristics = [
    { icon: Home, label: 'Pièces', value: offre.pieces },
    { icon: Square, label: 'Surface', value: `${offre.surface} m²` },
    { icon: MapPin, label: 'Étage', value: offre.etage },
    offre.type_bien && { icon: Building2, label: 'Type', value: offre.type_bien },
    offre.disponibilite && { icon: Calendar, label: 'Disponibilité', value: offre.disponibilite }
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border-border/30 shadow-2xl shadow-primary/5">
        {/* Premium Header */}
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <span className="flex items-center gap-2">
              Détails de l'offre
              <Sparkles className="h-4 w-4 text-primary/60 animate-pulse" />
            </span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Informations complètes sur le bien proposé
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-2">
          {/* Address & Price Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/60 via-muted/30 to-transparent backdrop-blur-sm border border-border/40 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="text-xl font-semibold">{offre.adresse}</h3>
                </div>
                <Badge 
                  variant={statutInfo.variant} 
                  className={cn(
                    "mt-2 px-3 py-1 text-xs font-medium shadow-sm",
                    statutInfo.variant === 'success' && "bg-success/15 text-success border-success/30",
                    statutInfo.variant === 'warning' && "bg-warning/15 text-warning border-warning/30",
                    statutInfo.variant === 'destructive' && "bg-destructive/15 text-destructive border-destructive/30"
                  )}
                >
                  {statutInfo.label}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                  CHF {offre.prix.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">par mois</p>
              </div>
            </div>
          </div>

          {/* Workflow Section */}
          {showWorkflow && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent border border-primary/10 shadow-lg">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Suivi de votre candidature
              </h4>
              <CandidatureWorkflowInteractive 
                currentStatut={effectiveStatut}
                candidature={candidature}
                onProgressWorkflow={onProgressWorkflow}
              />
            </div>
          )}

          {/* Characteristics */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/50 via-muted/20 to-transparent backdrop-blur-sm border border-border/30">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Star className="h-4 w-4 text-amber-500" />
              </div>
              Caractéristiques
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {characteristics.map((item: any, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border/20 hover:bg-background/80 hover:border-border/40 hover:shadow-md transition-all duration-300 group"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 group-hover:scale-110 transition-transform">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {offre.description && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                Description
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed p-4 rounded-xl bg-muted/30 border border-border/20">
                {offre.description}
              </p>
            </div>
          )}

          {/* Practical Information */}
          {(offre.code_immeuble || offre.concierge_nom || offre.locataire_nom) && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/50 via-muted/20 to-transparent backdrop-blur-sm border border-border/30 animate-fade-in">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Info className="h-4 w-4 text-blue-500" />
                </div>
                Informations pratiques
              </h4>
              <div className="space-y-1">
                {offre.code_immeuble && (
                  <div className="flex justify-between p-3 rounded-lg hover:bg-background/50 transition-colors">
                    <span className="text-sm text-muted-foreground">Code immeuble</span>
                    <span className="text-sm font-medium">{offre.code_immeuble}</span>
                  </div>
                )}
                {offre.concierge_nom && (
                  <div className="flex justify-between p-3 rounded-lg hover:bg-background/50 transition-colors">
                    <span className="text-sm text-muted-foreground">Concierge</span>
                    <span className="text-sm font-medium">{offre.concierge_nom} - {offre.concierge_tel}</span>
                  </div>
                )}
                {offre.locataire_nom && (
                  <div className="flex justify-between p-3 rounded-lg hover:bg-background/50 transition-colors">
                    <span className="text-sm text-muted-foreground">Locataire actuel</span>
                    <span className="text-sm font-medium">{offre.locataire_nom} - {offre.locataire_tel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agent Comments */}
          {offre.commentaires && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-lg shadow-amber-500/5 animate-fade-in">
              <h4 className="font-semibold mb-2 text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15">
                  <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Commentaires de l'agent
              </h4>
              <p className="text-sm text-amber-700/80 dark:text-amber-300/80 leading-relaxed">{offre.commentaires}</p>
            </div>
          )}

          {/* Link Preview */}
          {offre.lien_annonce && (
            <div className="pt-4 border-t border-border/30 animate-fade-in">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-lg">🔗</span>
                Annonce originale
              </h4>
              <LinkPreviewCard url={offre.lien_annonce} />
            </div>
          )}

          {/* Chances Section */}
          {showChances && (
            <div className="pt-4 border-t border-border/30 animate-fade-in">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Vos chances
              </h4>
              <ChanceIndicator
                {...calculateChances(
                  offre,
                  clientData,
                  documentsStats[offre.id] || documentsStats['global'] || {
                    fiche_salaire: 0,
                    extrait_poursuites: 0,
                    piece_identite: 0,
                    permis_sejour: 0
                  },
                  visites
                )}
              />
            </div>
          )}
        </div>

        {/* Premium Footer */}
        <DialogFooter className="flex-shrink-0 pt-5 mt-2 border-t border-border/30 gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="hover:bg-muted/50"
          >
            Fermer
          </Button>
          {(offre.statut === 'envoyee' || offre.statut === 'vue' || offre.statut === 'interesse') && (
            <Button 
              onClick={() => {
                onOpenChange(false);
                onPlanVisit(offre);
              }}
              className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Planifier une visite
            </Button>
          )}
          {offre.statut === 'visite_effectuee' && (
            <Button 
              className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={() => {
                onOpenChange(false);
                onPostulerDirect(offre);
              }}
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Déposer ma candidature
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
