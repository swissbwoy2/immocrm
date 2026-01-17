import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, Calendar, Clock, CheckCircle2, XCircle, 
  MessageSquare, TrendingUp, TrendingDown, ArrowRight 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface OffreAchatCardData {
  id: string;
  acheteur_nom: string | null;
  montant_offre: number;
  date_offre: string;
  date_validite: string | null;
  statut: string;
  conditions: string | null;
  notes?: string | null;
  client?: {
    user_id: string;
    profile?: {
      nom: string | null;
      prenom: string | null;
      email: string | null;
      telephone: string | null;
    };
  } | null;
}

interface PremiumOffreAchatCardProps {
  offre: OffreAchatCardData;
  prixDemande?: number | null;
  prixVendeur?: number | null;      // Prix net vendeur (pour calcul marge - agents only)
  prixCommercial?: number | null;   // Prix affiché aux acheteurs
  onUpdateStatut?: (offreId: string, statut: string) => void;
  isProprietaire?: boolean;
  isAgent?: boolean;                // Afficher les infos de marge
}

const STATUT_CONFIG = {
  nouvelle: { label: 'Nouvelle', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Clock },
  en_negociation: { label: 'En négociation', color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: MessageSquare },
  contre_offre: { label: 'Contre-offre', color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: ArrowRight },
  acceptee: { label: 'Acceptée', color: 'bg-green-500/10 text-green-600 border-green-200', icon: CheckCircle2 },
  refusee: { label: 'Refusée', color: 'bg-red-500/10 text-red-600 border-red-200', icon: XCircle },
  expiree: { label: 'Expirée', color: 'bg-gray-500/10 text-gray-600 border-gray-200', icon: Clock },
};

export function PremiumOffreAchatCard({ 
  offre, 
  prixDemande,
  prixVendeur,
  prixCommercial,
  onUpdateStatut,
  isProprietaire = true,
  isAgent = false
}: PremiumOffreAchatCardProps) {
  const config = STATUT_CONFIG[offre.statut as keyof typeof STATUT_CONFIG] || STATUT_CONFIG.nouvelle;
  const StatusIcon = config.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
  };

  // Pour propriétaire: anonymiser le nom de l'acheteur
  const acheteurName = isProprietaire && !isAgent
    ? (offre.client?.profile 
        ? `${(offre.client.profile.prenom || '')[0] || ''}. ${(offre.client.profile.nom || '')[0] || ''}.` 
        : 'Acheteur')
    : (offre.client?.profile 
        ? `${offre.client.profile.prenom || ''} ${offre.client.profile.nom || ''}`.trim() || 'Acheteur anonyme'
        : offre.acheteur_nom || 'Acheteur anonyme');

  const ecartPrix = prixDemande ? ((offre.montant_offre - prixDemande) / prixDemande) * 100 : null;
  
  // Calcul marge pour agents (offre - prix vendeur)
  const margeAgence = prixVendeur ? offre.montant_offre - prixVendeur : null;
  const commissionPrevue = prixVendeur && prixCommercial ? prixCommercial - prixVendeur : null;
  const pourcentageMarge = margeAgence && commissionPrevue && commissionPrevue > 0
    ? (margeAgence / commissionPrevue) * 100
    : null;
  
  const joursRestants = offre.date_validite 
    ? differenceInDays(new Date(offre.date_validite), new Date()) 
    : null;

  const isExpiringSoon = joursRestants !== null && joursRestants >= 0 && joursRestants <= 3;
  const isExpired = joursRestants !== null && joursRestants < 0;
  
  // Évaluation de l'offre pour les agents
  const getOffreEvaluation = () => {
    if (!margeAgence) return null;
    if (margeAgence >= (commissionPrevue || 0)) return { label: 'Excellente', color: 'text-emerald-600 bg-emerald-50' };
    if (margeAgence > 0) return { label: 'Acceptable', color: 'text-amber-600 bg-amber-50' };
    return { label: 'Insuffisante', color: 'text-red-600 bg-red-50' };
  };
  
  const offreEval = getOffreEvaluation();

  return (
    <Card className={cn(
      "overflow-hidden transition-all hover:shadow-md",
      offre.statut === 'nouvelle' && "border-blue-200 bg-blue-50/30",
      offre.statut === 'acceptee' && "border-green-200 bg-green-50/30"
    )}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Montant principal */}
          <div className="p-6 flex-shrink-0 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-2 mb-2">
              {ecartPrix !== null && (
                ecartPrix >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                )
              )}
              <span className={cn(
                "text-sm font-medium",
                ecartPrix !== null && ecartPrix >= 0 ? "text-emerald-600" : "text-amber-600"
              )}>
                {ecartPrix !== null && (
                  `${ecartPrix >= 0 ? '+' : ''}${ecartPrix.toFixed(1)}%`
                )}
              </span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(offre.montant_offre)}</p>
            {prixDemande && (
              <p className="text-sm text-muted-foreground mt-1">
                vs {formatCurrency(prixDemande)} demandé
              </p>
            )}
          </div>

          {/* Détails */}
          <div className="flex-1 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{acheteurName}</span>
                  {isAgent && offreEval && (
                    <Badge className={cn("text-xs", offreEval.color)}>
                      {offreEval.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(offre.date_offre), 'dd MMM yyyy', { locale: fr })}
                  </span>
                  {offre.date_validite && (
                    <span className={cn(
                      "flex items-center gap-1",
                      isExpiringSoon && "text-amber-600",
                      isExpired && "text-red-600"
                    )}>
                      <Clock className="h-3.5 w-3.5" />
                      {isExpired 
                        ? 'Expirée' 
                        : `Valide ${joursRestants}j`
                      }
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={config.color}>
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
                {config.label}
              </Badge>
            </div>

            {/* Section marge pour agents */}
            {isAgent && prixVendeur && (
              <div className={cn(
                "p-3 rounded-lg border",
                margeAgence && margeAgence > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Marge potentielle</p>
                    <p className={cn(
                      "text-lg font-bold",
                      margeAgence && margeAgence > 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {formatCurrency(margeAgence || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Prix vendeur</p>
                    <p className="font-medium">{formatCurrency(prixVendeur)}</p>
                  </div>
                  {pourcentageMarge !== null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">% commission</p>
                      <p className={cn(
                        "font-medium",
                        pourcentageMarge >= 100 ? "text-emerald-600" : pourcentageMarge > 0 ? "text-amber-600" : "text-red-600"
                      )}>
                        {pourcentageMarge.toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {offre.conditions && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Conditions</p>
                <p className="text-sm">{offre.conditions}</p>
              </div>
            )}

            {/* Actions */}
            {onUpdateStatut && offre.statut === 'nouvelle' && (
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => onUpdateStatut(offre.id, 'en_negociation')}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Négocier
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => onUpdateStatut(offre.id, 'acceptee')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Accepter
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onUpdateStatut(offre.id, 'refusee')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Refuser
                </Button>
              </div>
            )}

            {onUpdateStatut && offre.statut === 'en_negociation' && (
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatut(offre.id, 'contre_offre')}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Contre-offre
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onUpdateStatut(offre.id, 'acceptee')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Accepter
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => onUpdateStatut(offre.id, 'refusee')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Refuser
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
