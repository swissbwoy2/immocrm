import { Landmark, Calendar, Percent, ArrowDown, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PremiumHypothequeCardProps {
  hypotheque: {
    id: string;
    numero: string | null;
    rang: number | null;
    creancier: string;
    numeroPret: string | null;
    montantInitial: number;
    montantActuel: number | null;
    tauxInteret: number | null;
    typeTaux: string | null;
    dateDebut: string | null;
    dateFin: string | null;
    typeAmortissement: string | null;
    montantAmortissement: number | null;
  };
  immeubleName?: string | null;
  onClick?: () => void;
  className?: string;
}

const getTypeTauxLabel = (type: string | null) => {
  const labels: Record<string, string> = {
    fixe: 'Taux fixe',
    variable: 'Taux variable',
    saron: 'SARON'
  };
  return labels[type || ''] || type || 'Non défini';
};

const getTypeAmortissementLabel = (type: string | null) => {
  const labels: Record<string, string> = {
    direct: 'Direct',
    indirect: 'Indirect (3a)',
    aucun: 'Sans amortissement'
  };
  return labels[type || ''] || type || '-';
};

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

export function PremiumHypothequeCard({
  hypotheque,
  immeubleName,
  onClick,
  className
}: PremiumHypothequeCardProps) {
  const montantRembourse = hypotheque.montantInitial - (hypotheque.montantActuel || hypotheque.montantInitial);
  const pourcentageRembourse = (montantRembourse / hypotheque.montantInitial) * 100;

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
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {hypotheque.creancier}
              </h4>
              {hypotheque.numeroPret && (
                <p className="text-xs text-muted-foreground font-mono">
                  {hypotheque.numeroPret}
                </p>
              )}
            </div>
          </div>
          
          {hypotheque.rang && (
            <Badge variant="outline" className="text-xs shrink-0">
              {hypotheque.rang === 1 ? '1er rang' : `${hypotheque.rang}ème rang`}
            </Badge>
          )}
        </div>

        {/* Immeuble */}
        {immeubleName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Building2 className="w-3.5 h-3.5" />
            {immeubleName}
          </div>
        )}

        {/* Montants */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Capital restant dû:</span>
            <span className="font-bold text-destructive">
              {formatCurrency(hypotheque.montantActuel || hypotheque.montantInitial)}
            </span>
          </div>
          
          {montantRembourse > 0 && (
            <>
              <Progress value={pourcentageRembourse} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Remboursé: {formatCurrency(montantRembourse)}</span>
                <span>{pourcentageRembourse.toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>

        {/* Taux et type */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold">{hypotheque.tauxInteret?.toFixed(2) || '-'}%</span>
            <span className="text-xs text-muted-foreground">
              ({getTypeTauxLabel(hypotheque.typeTaux)})
            </span>
          </div>
          
          {hypotheque.typeAmortissement && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowDown className="w-3.5 h-3.5" />
              <span className="text-xs">{getTypeAmortissementLabel(hypotheque.typeAmortissement)}</span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {hypotheque.dateDebut && (
              <span>Depuis {format(new Date(hypotheque.dateDebut), 'MMM yyyy', { locale: fr })}</span>
            )}
          </div>
          
          {hypotheque.dateFin && (
            <span>Échéance: {format(new Date(hypotheque.dateFin), 'dd.MM.yyyy', { locale: fr })}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
