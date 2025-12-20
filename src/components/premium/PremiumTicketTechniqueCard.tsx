import { Wrench, Clock, AlertTriangle, CheckCircle, User, Building2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PremiumTicketTechniqueCardProps {
  ticket: {
    id: string;
    numero_ticket?: string;
    titre: string;
    description?: string;
    priorite?: string;
    categorie?: string;
    statut?: string;
    created_at?: string;
    fournisseur_nom?: string;
    montant_devis?: number;
    montant_facture?: number;
  };
  immeubleName?: string;
  lotReference?: string;
  locataireName?: string;
  onClick?: () => void;
  className?: string;
}

const getPrioriteConfig = (priorite?: string) => {
  switch (priorite) {
    case 'urgente':
      return { label: 'Urgent', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle };
    case 'haute':
      return { label: 'Haute', color: 'bg-orange-500 text-white', icon: AlertTriangle };
    case 'normale':
      return { label: 'Normale', color: 'bg-blue-500 text-white', icon: Clock };
    case 'basse':
      return { label: 'Basse', color: 'bg-muted text-muted-foreground', icon: Clock };
    default:
      return { label: 'Non définie', color: 'bg-muted text-muted-foreground', icon: Clock };
  }
};

const getStatutConfig = (statut?: string) => {
  switch (statut) {
    case 'nouveau':
      return { label: 'Nouveau', color: 'bg-blue-500/10 text-blue-600 border-blue-200' };
    case 'en_cours':
      return { label: 'En cours', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' };
    case 'en_attente_devis':
      return { label: 'Attente devis', color: 'bg-purple-500/10 text-purple-600 border-purple-200' };
    case 'devis_accepte':
      return { label: 'Devis accepté', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' };
    case 'travaux_planifies':
      return { label: 'Planifié', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200' };
    case 'en_travaux':
      return { label: 'En travaux', color: 'bg-orange-500/10 text-orange-600 border-orange-200' };
    case 'a_verifier':
      return { label: 'À vérifier', color: 'bg-amber-500/10 text-amber-600 border-amber-200' };
    case 'resolu':
      return { label: 'Résolu', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
    case 'clos':
      return { label: 'Clos', color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
    case 'annule':
      return { label: 'Annulé', color: 'bg-destructive/10 text-destructive border-destructive/20' };
    default:
      return { label: 'Non défini', color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
  }
};

const getCategorieIcon = (categorie?: string) => {
  // Could be expanded with more specific icons
  return Wrench;
};

export function PremiumTicketTechniqueCard({
  ticket,
  immeubleName,
  lotReference,
  locataireName,
  onClick,
  className
}: PremiumTicketTechniqueCardProps) {
  const prioriteConfig = getPrioriteConfig(ticket.priorite);
  const statutConfig = getStatutConfig(ticket.statut);
  const CategorieIcon = getCategorieIcon(ticket.categorie);
  const PrioriteIcon = prioriteConfig.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-CH', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border border-border/50 hover:border-primary/30",
        ticket.priorite === 'urgente' && "border-l-4 border-l-destructive",
        ticket.priorite === 'haute' && "border-l-4 border-l-orange-500",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              ticket.priorite === 'urgente' ? "bg-destructive/10" : "bg-primary/10"
            )}>
              <CategorieIcon className={cn(
                "w-5 h-5",
                ticket.priorite === 'urgente' ? "text-destructive" : "text-primary"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {ticket.numero_ticket && (
                  <span className="text-xs font-mono text-muted-foreground">#{ticket.numero_ticket}</span>
                )}
                <Badge className={cn("text-xs", prioriteConfig.color)}>
                  <PrioriteIcon className="w-3 h-3 mr-1" />
                  {prioriteConfig.label}
                </Badge>
              </div>
              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors mt-1 line-clamp-1">
                {ticket.titre}
              </h4>
            </div>
          </div>
          
          <Badge className={cn("text-xs shrink-0", statutConfig.color)}>
            {statutConfig.label}
          </Badge>
        </div>

        {/* Description */}
        {ticket.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {ticket.description}
          </p>
        )}

        {/* Location & Locataire */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
          {immeubleName && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {immeubleName}
              {lotReference && ` - Lot ${lotReference}`}
            </span>
          )}
          {locataireName && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {locataireName}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(ticket.created_at)}
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            {ticket.fournisseur_nom && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {ticket.fournisseur_nom}
              </span>
            )}
            {(ticket.montant_devis || ticket.montant_facture) && (
              <span className="font-medium">
                {formatCurrency(ticket.montant_facture || ticket.montant_devis)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
