import { User, Phone, Mail, Calendar, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface PremiumLocataireImmeubleProps {
  locataire: {
    id: string;
    civilite?: string;
    prenom?: string;
    nom: string;
    email?: string;
    telephone?: string;
    date_entree?: string;
    loyer?: number;
    charges?: number;
    total_mensuel?: number;
    solde_locataire?: number;
    statut?: string;
  };
  lotReference?: string;
  onClick?: () => void;
  className?: string;
}

const getStatutConfig = (statut?: string) => {
  switch (statut) {
    case 'actif':
      return { label: 'Actif', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
    case 'preavis':
      return { label: 'En préavis', color: 'bg-orange-500/10 text-orange-600 border-orange-200' };
    case 'sorti':
      return { label: 'Sorti', color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
    case 'litige':
      return { label: 'Litige', color: 'bg-destructive/10 text-destructive border-destructive/20' };
    default:
      return { label: 'Non défini', color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
  }
};

export function PremiumLocataireImmeuble({
  locataire,
  lotReference,
  onClick,
  className
}: PremiumLocataireImmeubleProps) {
  const statutConfig = getStatutConfig(locataire.statut);
  const initials = `${locataire.prenom?.charAt(0) || ''}${locataire.nom.charAt(0)}`.toUpperCase();
  
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-CH');
  };

  const solde = locataire.solde_locataire || 0;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border border-border/50 hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {locataire.civilite && `${locataire.civilite} `}
                  {locataire.prenom} {locataire.nom}
                </h4>
                {lotReference && (
                  <span className="text-xs text-muted-foreground">Lot {lotReference}</span>
                )}
              </div>
              <Badge className={cn("text-xs shrink-0", statutConfig.color)}>
                {statutConfig.label}
              </Badge>
            </div>

            {/* Contact */}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {locataire.telephone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {locataire.telephone}
                </span>
              )}
              {locataire.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{locataire.email}</span>
                </span>
              )}
            </div>

            {/* Financial summary */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Loyer</span>
                  <div className="font-medium text-sm">{formatCurrency(locataire.total_mensuel)}/mois</div>
                </div>
                {locataire.date_entree && (
                  <div>
                    <span className="text-xs text-muted-foreground">Depuis</span>
                    <div className="text-sm flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(locataire.date_entree)}
                    </div>
                  </div>
                )}
              </div>

              {/* Solde */}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium",
                solde > 0 
                  ? "bg-destructive/10 text-destructive" 
                  : solde < 0 
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
              )}>
                {solde > 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>Doit {formatCurrency(solde)}</span>
                  </>
                ) : solde < 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Crédit {formatCurrency(Math.abs(solde))}</span>
                  </>
                ) : (
                  <span>Solde à jour</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
