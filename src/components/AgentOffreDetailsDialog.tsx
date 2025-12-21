import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { AddressLink } from '@/components/AddressLink';
import { 
  Home, 
  Maximize, 
  Building, 
  Calendar, 
  KeyRound, 
  User, 
  Phone, 
  MessageSquare,
  Layers
} from 'lucide-react';

interface AgentOffreDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
}

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'Envoyée';
    case 'vue': return 'Vue';
    case 'interesse': return 'Intéressé';
    case 'visite_planifiee': return 'Visite planifiée';
    case 'visite_effectuee': return 'Visite effectuée';
    case 'candidature_deposee': return 'Candidature déposée';
    case 'acceptee': return 'Acceptée';
    case 'refusee': return 'Refusée';
    default: return statut;
  }
};

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'envoyee': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'vue': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'interesse': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'visite_planifiee': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    case 'visite_effectuee': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
    case 'candidature_deposee': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
    case 'acceptee': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'refusee': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function AgentOffreDetailsDialog({ 
  open, 
  onOpenChange, 
  offre 
}: AgentOffreDetailsDialogProps) {
  if (!offre) return null;

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold line-clamp-2">
                <AddressLink 
                  address={offre.adresse}
                  showIcon={false}
                  className="text-lg font-semibold"
                />
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Envoyée le {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
              </p>
            </div>
            <Badge className={`shrink-0 ${getStatutColor(offre.statut)}`}>
              {getStatutLabel(offre.statut)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="px-6 pb-6 space-y-5">
            {/* Prix */}
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  CHF {Number(offre.prix).toLocaleString('fr-CH')}
                </div>
                <div className="text-sm text-muted-foreground">par mois</div>
              </div>
            </div>

            {/* Caractéristiques */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Caractéristiques
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-semibold">{offre.pieces || '-'}</div>
                  <div className="text-xs text-muted-foreground">pièces</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-semibold">{offre.surface || '-'}</div>
                  <div className="text-xs text-muted-foreground">m²</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-semibold">{offre.etage || '-'}</div>
                  <div className="text-xs text-muted-foreground">étage</div>
                </div>
              </div>
              
              <div className="mt-3 space-y-1">
                <InfoRow icon={Building} label="Type de bien" value={offre.type_bien} />
                <InfoRow icon={Calendar} label="Disponibilité" value={offre.disponibilite} />
              </div>
            </div>

            {/* Description */}
            {offre.description && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {offre.description}
                  </p>
                </div>
              </>
            )}

            {/* Informations pratiques */}
            {(offre.code_immeuble || offre.concierge_nom || offre.locataire_nom) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Informations pratiques
                  </h4>
                  <div className="space-y-1">
                    <InfoRow icon={KeyRound} label="Code immeuble" value={offre.code_immeuble} />
                    
                    {offre.concierge_nom && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Concierge
                        </div>
                        <p className="text-sm font-medium">{offre.concierge_nom}</p>
                        {offre.concierge_tel && (
                          <a 
                            href={`tel:${offre.concierge_tel}`}
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {offre.concierge_tel}
                          </a>
                        )}
                      </div>
                    )}

                    {offre.locataire_nom && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Locataire actuel
                        </div>
                        <p className="text-sm font-medium">{offre.locataire_nom}</p>
                        {offre.locataire_tel && (
                          <a 
                            href={`tel:${offre.locataire_tel}`}
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
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
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Vos commentaires
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-muted/50 rounded-lg">
                    {offre.commentaires}
                  </p>
                </div>
              </>
            )}

            {/* Lien vers l'annonce */}
            {offre.lien_annonce && offre.lien_annonce.trim() && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Annonce originale</h4>
                  <LinkPreviewCard url={offre.lien_annonce} showInline />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
