import { FileText, Calendar, User, Building2, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PremiumBailCardProps {
  bail: {
    id: string;
    dateDebut: string;
    dateFin: string | null;
    loyerActuel: number | null;
    totalMensuel: number | null;
    statut: string | null;
    montantGarantie: number | null;
    typeGarantie: string | null;
  };
  lotReference?: string | null;
  immeubleName?: string | null;
  locataireName?: string | null;
  onClick?: () => void;
  className?: string;
}

const getStatutConfig = (statut: string | null) => {
  const configs: Record<string, { label: string; color: string }> = {
    actif: { label: 'Actif', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    resilie: { label: 'Résilié', color: 'bg-red-500/10 text-red-600 border-red-200' },
    expire: { label: 'Expiré', color: 'bg-gray-500/10 text-gray-600 border-gray-200' },
    a_signer: { label: 'À signer', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    a_renouveler: { label: 'À renouveler', color: 'bg-amber-500/10 text-amber-600 border-amber-200' }
  };
  return configs[statut || 'actif'] || configs.actif;
};

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

export function PremiumBailCard({
  bail,
  lotReference,
  immeubleName,
  locataireName,
  onClick,
  className
}: PremiumBailCardProps) {
  const statutConfig = getStatutConfig(bail.statut);
  
  // Check if expiring soon (within 90 days)
  const isExpiringSoon = bail.dateFin && bail.statut === 'actif' && 
    differenceInDays(new Date(bail.dateFin), new Date()) <= 90 &&
    differenceInDays(new Date(bail.dateFin), new Date()) > 0;

  const daysUntilExpiry = bail.dateFin 
    ? differenceInDays(new Date(bail.dateFin), new Date())
    : null;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border border-border/50 hover:border-primary/30",
        isExpiringSoon && "border-l-4 border-l-amber-500",
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
              isExpiringSoon ? "bg-amber-100 dark:bg-amber-900/20" : "bg-primary/10"
            )}>
              <FileText className={cn(
                "w-5 h-5",
                isExpiringSoon ? "text-amber-600" : "text-primary"
              )} />
            </div>
            <div>
              {lotReference && (
                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Lot {lotReference}
                </h4>
              )}
              {immeubleName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {immeubleName}
                </p>
              )}
            </div>
          </div>
          
          <Badge className={cn("text-xs shrink-0", statutConfig.color)}>
            {statutConfig.label}
          </Badge>
        </div>

        {/* Locataire */}
        {locataireName && (
          <div className="flex items-center gap-2 text-sm mb-3 p-2 rounded-lg bg-muted/50">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{locataireName}</span>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Début:</span>
            <span className="ml-1 font-medium">
              {format(new Date(bail.dateDebut), 'dd.MM.yyyy', { locale: fr })}
            </span>
          </div>
          {bail.dateFin && (
            <div>
              <span className="text-muted-foreground">Fin:</span>
              <span className={cn(
                "ml-1 font-medium",
                isExpiringSoon && "text-amber-600"
              )}>
                {format(new Date(bail.dateFin), 'dd.MM.yyyy', { locale: fr })}
              </span>
            </div>
          )}
        </div>

        {/* Expiring warning */}
        {isExpiringSoon && daysUntilExpiry !== null && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>Expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Financial info */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="text-sm">
            <span className="text-muted-foreground">Loyer:</span>
            <span className="ml-1 font-semibold text-primary">
              {formatCurrency(bail.totalMensuel || bail.loyerActuel)}
            </span>
            <span className="text-muted-foreground">/mois</span>
          </div>
          
          {bail.montantGarantie && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              {formatCurrency(bail.montantGarantie)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
