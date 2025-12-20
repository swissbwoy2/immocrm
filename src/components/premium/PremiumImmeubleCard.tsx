import { Building2, MapPin, Users, TrendingUp, Home, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PremiumImmeubleCardProps {
  immeuble: {
    id: string;
    nom: string;
    adresse: string;
    code_postal?: string;
    ville?: string;
    type_bien?: string;
    nb_unites?: number;
    etat_locatif_annuel?: number;
    taux_vacance?: number;
    statut?: string;
    surface_totale?: number;
  };
  lotsCount?: number;
  locatairesCount?: number;
  ticketsCount?: number;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const getStatutConfig = (statut?: string) => {
  switch (statut) {
    case 'gere':
      return { label: 'Géré', variant: 'default' as const, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
    case 'en_vente':
      return { label: 'En vente', variant: 'secondary' as const, color: 'bg-blue-500/10 text-blue-600 border-blue-200' };
    case 'en_location':
      return { label: 'En location', variant: 'secondary' as const, color: 'bg-purple-500/10 text-purple-600 border-purple-200' };
    case 'vendu':
      return { label: 'Vendu', variant: 'outline' as const, color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
    case 'vacant':
      return { label: 'Vacant', variant: 'destructive' as const, color: 'bg-orange-500/10 text-orange-600 border-orange-200' };
    default:
      return { label: 'Non défini', variant: 'outline' as const, color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
  }
};

const getTypeBienIcon = (type?: string) => {
  switch (type) {
    case 'immeuble':
      return Building2;
    case 'appartement':
    case 'maison':
      return Home;
    default:
      return Building2;
  }
};

export function PremiumImmeubleCard({
  immeuble,
  lotsCount = 0,
  locatairesCount = 0,
  ticketsCount = 0,
  onView,
  onEdit,
  onDelete,
  className
}: PremiumImmeubleCardProps) {
  const statutConfig = getStatutConfig(immeuble.statut);
  const TypeIcon = getTypeBienIcon(immeuble.type_bien);
  
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'CHF 0';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border border-border/50 hover:border-primary/30",
        className
      )}
      onClick={onView}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <TypeIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {immeuble.nom}
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">
                  {immeuble.adresse}
                  {immeuble.code_postal && `, ${immeuble.code_postal}`}
                  {immeuble.ville && ` ${immeuble.ville}`}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", statutConfig.color)}>
              {statutConfig.label}
            </Badge>
            
            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                      <Eye className="w-4 h-4 mr-2" />
                      Voir détails
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2.5 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-foreground">{lotsCount}</div>
            <div className="text-xs text-muted-foreground">Lots</div>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-foreground">{locatairesCount}</div>
            <div className="text-xs text-muted-foreground">Locataires</div>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-foreground">{ticketsCount}</div>
            <div className="text-xs text-muted-foreground">Tickets</div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium">{formatCurrency(immeuble.etat_locatif_annuel)}/an</span>
          </div>
          
          {immeuble.taux_vacance !== undefined && (
            <div className={cn(
              "text-xs px-2 py-1 rounded-full",
              immeuble.taux_vacance > 10 
                ? "bg-destructive/10 text-destructive" 
                : "bg-emerald-500/10 text-emerald-600"
            )}>
              {immeuble.taux_vacance}% vacance
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
