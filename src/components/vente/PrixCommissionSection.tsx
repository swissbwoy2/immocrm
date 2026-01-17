import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Users, Building2, Banknote, Eye, EyeOff, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrixCommissionSectionProps {
  prixVendeur: number | null;
  prixCommercial: number | null;
  placesParc?: number;
  placesParcIncluses?: boolean;
  prixPlaceParc?: number;
  tauxAgent?: number; // Default 45%
  tauxAgence?: number; // Default 55%
  variant?: 'compact' | 'full';
  showAgentSplit?: boolean; // Only show to agents/admin
}

export function PrixCommissionSection({
  prixVendeur,
  prixCommercial,
  placesParc = 0,
  placesParcIncluses = true,
  prixPlaceParc = 50000,
  tauxAgent = 45,
  tauxAgence = 55,
  variant = 'full',
  showAgentSplit = true,
}: PrixCommissionSectionProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency: 'CHF', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Calculate values
  const commissionPrevue = prixVendeur && prixCommercial 
    ? prixCommercial - prixVendeur 
    : null;
  
  const partAgent = commissionPrevue 
    ? Math.round(commissionPrevue * (tauxAgent / 100)) 
    : null;
  
  const partAgence = commissionPrevue 
    ? Math.round(commissionPrevue * (tauxAgence / 100)) 
    : null;

  const tauxCommissionEffectif = prixVendeur && commissionPrevue && prixVendeur > 0
    ? ((commissionPrevue / prixVendeur) * 100).toFixed(1)
    : null;

  const prixPlacesTotal = !placesParcIncluses && placesParc > 0 
    ? placesParc * prixPlaceParc 
    : 0;

  if (variant === 'compact') {
    return (
      <div className="p-4 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EyeOff className="h-4 w-4" />
            <span>Prix vendeur</span>
          </div>
          <span className="font-semibold">{formatCurrency(prixVendeur)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>Prix commercial</span>
          </div>
          <span className="font-semibold text-primary">{formatCurrency(prixCommercial)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Commission agence</span>
          <span className="font-bold text-emerald-600">{formatCurrency(commissionPrevue)}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Prix et commission
        </CardTitle>
        <CardDescription>
          Calcul automatique de la marge agence
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Prix vendeur vs commercial */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Prix vendeur (caché)</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(prixVendeur)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Net que le vendeur souhaite recevoir
            </p>
          </div>
          
          <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Prix commercial (affiché)</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(prixCommercial)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Prix visible par les acheteurs
            </p>
          </div>
        </div>

        {/* Places de parc */}
        {placesParc > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {placesParc} place{placesParc > 1 ? 's' : ''} de parking
              </span>
            </div>
            <Badge variant={placesParcIncluses ? "default" : "secondary"}>
              {placesParcIncluses ? 'Incluses' : `En sus: ${formatCurrency(prixPlacesTotal)}`}
            </Badge>
          </div>
        )}

        <Separator />

        {/* Commission */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">Commission agence prévue</p>
              {tauxCommissionEffectif && (
                <p className="text-sm text-muted-foreground">
                  {tauxCommissionEffectif}% du prix vendeur
                </p>
              )}
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              {formatCurrency(commissionPrevue)}
            </p>
          </div>

          {/* Split agent/agence */}
          {showAgentSplit && commissionPrevue && (
            <div className="grid gap-3 md:grid-cols-2 pt-2">
              <div className={cn(
                "p-4 rounded-lg",
                "bg-blue-50 border border-blue-100"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Part agent ({tauxAgent}%)</span>
                </div>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(partAgent)}</p>
              </div>
              
              <div className={cn(
                "p-4 rounded-lg",
                "bg-purple-50 border border-purple-100"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Part agence ({tauxAgence}%)</span>
                </div>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(partAgence)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Note explicative */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <TrendingUp className="h-4 w-4 inline mr-1" />
          La commission est calculée sur la différence entre le prix commercial et le prix vendeur.
          L'acheteur paie le prix commercial, le vendeur reçoit son prix net demandé.
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for real-time preview in forms
interface PrixCommissionPreviewProps {
  prixVendeur: number | null;
  prixCommercial: number | null;
}

export function PrixCommissionPreview({ prixVendeur, prixCommercial }: PrixCommissionPreviewProps) {
  const commission = prixVendeur && prixCommercial ? prixCommercial - prixVendeur : null;
  const partAgent = commission ? Math.round(commission * 0.45) : null;
  const partAgence = commission ? Math.round(commission * 0.55) : null;

  const formatCurrency = (value: number | null) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency: 'CHF', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  if (!prixVendeur || !prixCommercial) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
        Renseignez les deux prix pour voir le calcul de commission
      </div>
    );
  }

  const isValid = prixCommercial >= prixVendeur;

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isValid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
    )}>
      {isValid ? (
        <>
          <p className="text-sm font-medium text-emerald-700 mb-2">
            Commission prévue: {formatCurrency(commission)}
          </p>
          <div className="flex gap-4 text-xs text-emerald-600">
            <span>Agent (45%): {formatCurrency(partAgent)}</span>
            <span>Agence (55%): {formatCurrency(partAgence)}</span>
          </div>
        </>
      ) : (
        <p className="text-sm font-medium text-red-700">
          ⚠️ Le prix commercial doit être supérieur au prix vendeur
        </p>
      )}
    </div>
  );
}
