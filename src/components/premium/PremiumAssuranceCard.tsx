import { Shield, Calendar, Building2, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PremiumAssuranceCardProps {
  assurance: {
    id: string;
    typeAssurance: string | null;
    assureur: string;
    numeroPolice: string | null;
    primeAnnuelle: number | null;
    franchise: number | null;
    valeurAssuree: number | null;
    dateDebut: string | null;
    dateFin: string | null;
    dateProchaineEcheance: string | null;
    risquesCouverts: any;
  };
  immeubleName?: string | null;
  onClick?: () => void;
  className?: string;
}

const getTypeAssuranceConfig = (type: string | null) => {
  const configs: Record<string, { label: string; color: string }> = {
    rc_batiment: { label: 'RC Bâtiment', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    incendie: { label: 'Incendie', color: 'bg-red-500/10 text-red-600 border-red-200' },
    degats_eaux: { label: 'Dégâts des eaux', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200' },
    bris_glace: { label: 'Bris de glace', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
    ppi: { label: 'Protection juridique', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
    multirisque: { label: 'Multirisque', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
  };
  return configs[type || ''] || { label: type || 'Non défini', color: 'bg-gray-500/10 text-gray-600 border-gray-200' };
};

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

export function PremiumAssuranceCard({
  assurance,
  immeubleName,
  onClick,
  className
}: PremiumAssuranceCardProps) {
  const typeConfig = getTypeAssuranceConfig(assurance.typeAssurance);
  
  // Check if renewal is coming soon (within 60 days)
  const isRenewalSoon = assurance.dateProchaineEcheance && 
    differenceInDays(new Date(assurance.dateProchaineEcheance), new Date()) <= 60 &&
    differenceInDays(new Date(assurance.dateProchaineEcheance), new Date()) > 0;

  const daysUntilRenewal = assurance.dateProchaineEcheance 
    ? differenceInDays(new Date(assurance.dateProchaineEcheance), new Date())
    : null;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border border-border/50 hover:border-primary/30",
        isRenewalSoon && "border-l-4 border-l-amber-500",
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
              isRenewalSoon ? "bg-amber-100 dark:bg-amber-900/20" : "bg-primary/10"
            )}>
              <Shield className={cn(
                "w-5 h-5",
                isRenewalSoon ? "text-amber-600" : "text-primary"
              )} />
            </div>
            <div>
              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {assurance.assureur}
              </h4>
              {assurance.numeroPolice && (
                <p className="text-xs text-muted-foreground font-mono">
                  Police: {assurance.numeroPolice}
                </p>
              )}
            </div>
          </div>
          
          <Badge className={cn("text-xs shrink-0", typeConfig.color)}>
            {typeConfig.label}
          </Badge>
        </div>

        {/* Immeuble */}
        {immeubleName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Building2 className="w-3.5 h-3.5" />
            {immeubleName}
          </div>
        )}

        {/* Renewal warning */}
        {isRenewalSoon && daysUntilRenewal !== null && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>Échéance dans {daysUntilRenewal} jour{daysUntilRenewal > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Financial info */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Prime annuelle:</span>
            <p className="font-semibold text-primary">{formatCurrency(assurance.primeAnnuelle)}</p>
          </div>
          {assurance.valeurAssuree && (
            <div>
              <span className="text-muted-foreground">Valeur assurée:</span>
              <p className="font-medium">{formatCurrency(assurance.valeurAssuree)}</p>
            </div>
          )}
        </div>

        {assurance.franchise && (
          <div className="text-sm mb-3">
            <span className="text-muted-foreground">Franchise:</span>
            <span className="ml-1">{formatCurrency(assurance.franchise)}</span>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {assurance.dateDebut && (
              <span>Depuis {format(new Date(assurance.dateDebut), 'MMM yyyy', { locale: fr })}</span>
            )}
          </div>
          
          {assurance.dateProchaineEcheance && (
            <span className={cn(isRenewalSoon && "text-amber-600 font-medium")}>
              Échéance: {format(new Date(assurance.dateProchaineEcheance), 'dd.MM.yyyy', { locale: fr })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
