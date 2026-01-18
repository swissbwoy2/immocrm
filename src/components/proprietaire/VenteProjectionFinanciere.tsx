import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, Calculator, Landmark, PiggyBank, 
  ChevronDown, ChevronUp, Info, AlertTriangle,
  Building2, Calendar, MapPin, ArrowDown, ArrowUp
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  calculateCapitalGainsTax,
  calculateYearsOwned,
  calculateSellerCommission,
  getCantonDisplayName,
  type CommissionMode,
  type TaxCalculationResult,
  CANTON_TAX_CONFIGS
} from '@/utils/swissRealEstateTax';

interface VenteProjectionFinanciereProps {
  // Property data
  canton: string | null;
  prixVendeur: number | null;
  prixCommercial: number | null;
  prixVenteDemande: number | null;
  dateAcquisition: string | null;
  prixAcquisition: number | null;
  travauxPlusValue: number | null;
  commissionMode: CommissionMode | null;
  
  // Optional: for compact display
  variant?: 'compact' | 'full';
}

const AnimatedValue = ({ 
  value, 
  duration = 1000,
  prefix = '',
  suffix = ''
}: { 
  value: number; 
  duration?: number;
  prefix?: string;
  suffix?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useMemo(() => {
    let startTime: number | null = null;
    const startValue = displayValue;
    
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (value - startValue) * easeOutQuart;
      
      setDisplayValue(Math.round(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return (
    <span>
      {prefix}{displayValue.toLocaleString('fr-CH')}{suffix}
    </span>
  );
};

export function VenteProjectionFinanciere({
  canton,
  prixVendeur,
  prixCommercial,
  prixVenteDemande,
  dateAcquisition,
  prixAcquisition,
  travauxPlusValue,
  commissionMode,
  variant = 'full'
}: VenteProjectionFinanciereProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  
  // Calculate years owned
  const yearsOwned = useMemo(() => {
    return calculateYearsOwned(dateAcquisition);
  }, [dateAcquisition]);
  
  // Determine sale price to use
  const prixVenteEstime = prixCommercial || prixVenteDemande || prixVendeur || 0;
  
  // Calculate commission and what seller receives
  const commissionResult = useMemo(() => {
    return calculateSellerCommission(
      commissionMode || 'net_vendeur',
      prixVendeur,
      prixCommercial,
      prixVenteDemande
    );
  }, [commissionMode, prixVendeur, prixCommercial, prixVenteDemande]);
  
  // Calculate capital gain
  const gainBrut = useMemo(() => {
    if (!prixAcquisition) return 0;
    return commissionResult.sellerReceives - prixAcquisition;
  }, [commissionResult.sellerReceives, prixAcquisition]);
  
  // Estimate notary fees (5% in Switzerland)
  const fraisNotaireEstimes = Math.round(prixVenteEstime * 0.05);
  
  // Calculate tax
  const taxResult: TaxCalculationResult | null = useMemo(() => {
    if (!canton || gainBrut <= 0) return null;
    
    return calculateCapitalGainsTax({
      canton: canton,
      gainBrut: gainBrut,
      yearsOwned: yearsOwned,
      travauxPlusValue: travauxPlusValue || 0,
      fraisVente: fraisNotaireEstimes
    });
  }, [canton, gainBrut, yearsOwned, travauxPlusValue, fraisNotaireEstimes]);
  
  // Calculate final net revenue
  const totalCharges = useMemo(() => {
    return (taxResult?.impotEstime || 0) + fraisNotaireEstimes;
  }, [taxResult, fraisNotaireEstimes]);
  
  const revenuNet = useMemo(() => {
    return commissionResult.sellerReceives - totalCharges;
  }, [commissionResult.sellerReceives, totalCharges]);
  
  // Get canton config for display
  const cantonConfig = canton ? CANTON_TAX_CONFIGS[canton] : null;
  
  // Format currency
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency: 'CHF', 
      maximumFractionDigits: 0 
    }).format(value);
  };
  
  // Check if we have enough data
  const hasEnoughData = Boolean(prixAcquisition && canton && (prixVendeur || prixVenteDemande));
  
  if (!hasEnoughData) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background dark:border-amber-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Calculator className="w-5 h-5" />
            Projection financière
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Données insuffisantes
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Pour calculer la projection financière, veuillez renseigner :
              </p>
              <ul className="text-sm text-amber-600 dark:text-amber-400 mt-2 list-disc list-inside space-y-1">
                {!canton && <li>Le canton du bien</li>}
                {!prixAcquisition && <li>Le prix d'acquisition</li>}
                {!dateAcquisition && <li>La date d'acquisition</li>}
                {!prixVendeur && !prixVenteDemande && <li>Le prix de vente souhaité</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'compact') {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background dark:border-emerald-800/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenu net estimé</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(revenuNet)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Impôt estimé</p>
              <p className="text-sm font-medium text-destructive">
                -{formatCurrency(taxResult?.impotEstime || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background dark:border-emerald-800/30 overflow-hidden">
      {/* Decorative gradient bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-green-600" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Calculator className="w-5 h-5" />
            Projection financière après vente
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  <Info className="w-3 h-3 mr-1" />
                  Estimation
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Cette estimation est fournie à titre indicatif uniquement. 
                  Consultez un fiscaliste pour un calcul précis.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Property Info Summary */}
        <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{getCantonDisplayName(canton)}</span>
          </div>
          {dateAcquisition && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{yearsOwned} an{yearsOwned > 1 ? 's' : ''} de possession</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {commissionMode === 'net_vendeur' ? 'Net Vendeur' : 'Commission 3%'}
            </Badge>
          </div>
        </div>
        
        {/* Sale Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Résumé de la vente
          </h4>
          
          <div className="grid gap-2">
            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
              <span className="text-sm text-muted-foreground">Prix de vente (acheteur)</span>
              <span className="font-medium">{formatCurrency(prixVenteEstime)}</span>
            </div>
            
            {commissionMode === 'net_vendeur' ? (
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm text-muted-foreground">Commission agence (marge)</span>
                <span className="text-sm text-emerald-600">
                  Incluse dans le prix acheteur
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm text-muted-foreground">Commission agence (3%)</span>
                <span className="text-destructive">-{formatCurrency(commissionResult.commission)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center p-3 rounded bg-emerald-100 dark:bg-emerald-900/30">
              <span className="font-medium">Vous recevez (brut)</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(commissionResult.sellerReceives)}
              </span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Capital Gain Calculation */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Calcul de la plus-value
              </h4>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3 space-y-2">
            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
              <span className="text-sm text-muted-foreground">Prix d'acquisition</span>
              <span className="font-medium">{formatCurrency(prixAcquisition)}</span>
            </div>
            
            {(travauxPlusValue || 0) > 0 && (
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm text-muted-foreground">Travaux à plus-value (déductibles)</span>
                <span className="text-emerald-600">+{formatCurrency(travauxPlusValue)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
              <span className="text-sm text-muted-foreground">Prix de revente (net vendeur)</span>
              <span className="font-medium">{formatCurrency(commissionResult.sellerReceives)}</span>
            </div>
            
            <div className={`flex justify-between items-center p-3 rounded ${gainBrut >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-destructive/10'}`}>
              <span className="font-medium flex items-center gap-1">
                Plus-value brute
                {gainBrut >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-destructive" />
                )}
              </span>
              <span className={`text-lg font-bold ${gainBrut >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                {formatCurrency(gainBrut)}
              </span>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <Separator />
        
        {/* Tax Calculation */}
        {taxResult && (
          <div className="space-y-3">
            <Collapsible open={showTaxDetails} onOpenChange={setShowTaxDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    Impôt sur le gain immobilier
                  </h4>
                  {showTaxDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3 space-y-3">
                {/* Canton info */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {cantonConfig?.system === 'moniste' ? 'Système moniste' : 'Système dualiste'}
                    </Badge>
                    {cantonConfig?.hasCommunalSurtax && (
                      <Badge variant="outline" className="text-xs">
                        Surtaxe communale
                      </Badge>
                    )}
                  </div>
                  {cantonConfig?.notes && (
                    <p className="text-xs text-muted-foreground">{cantonConfig.notes}</p>
                  )}
                </div>
                
                {/* Tax calculation details */}
                <div className="space-y-2 text-sm">
                  {taxResult.calculationDetails.map((detail, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">{detail.split(':')[0]}</span>
                      {detail.includes(':') && (
                        <span className="font-medium">{detail.split(':')[1]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {taxResult.isExempt ? (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Exonération applicable
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                  {taxResult.exemptionReason}
                </p>
              </div>
            ) : (
              <div className="flex justify-between items-center p-3 rounded bg-destructive/10">
                <div>
                  <span className="font-medium">Impôt estimé</span>
                  <p className="text-xs text-muted-foreground">
                    Taux effectif: {(taxResult.tauxEffectif * 100).toFixed(1)}%
                  </p>
                </div>
                <span className="text-lg font-bold text-destructive">
                  -{formatCurrency(taxResult.impotEstime)}
                </span>
              </div>
            )}
          </div>
        )}
        
        {gainBrut <= 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Pas de plus-value imposable (gain négatif ou nul)
            </p>
          </div>
        )}
        
        <Separator />
        
        {/* Other Costs */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Autres frais estimés</h4>
          <div className="flex justify-between items-center p-2 rounded bg-muted/30">
            <span className="text-sm text-muted-foreground">Frais de notaire (~5%)</span>
            <span className="text-destructive">-{formatCurrency(fraisNotaireEstimes)}</span>
          </div>
        </div>
        
        <Separator />
        
        {/* Final Summary */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <PiggyBank className="w-4 h-4" />
            Récapitulatif final
          </h4>
          
          <div className="grid gap-2">
            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
              <span className="text-sm text-muted-foreground">Revenu brut de la vente</span>
              <span className="font-medium">{formatCurrency(commissionResult.sellerReceives)}</span>
            </div>
            
            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
              <span className="text-sm text-muted-foreground">Total charges et impôts</span>
              <span className="text-destructive font-medium">-{formatCurrency(totalCharges)}</span>
            </div>
            
            <div className="flex justify-between items-center p-4 rounded-lg bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40">
              <div>
                <span className="font-semibold text-lg">Revenu net estimé</span>
                <p className="text-xs text-muted-foreground">Après impôts et frais</p>
              </div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                <AnimatedValue value={revenuNet} prefix="CHF " />
              </span>
            </div>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Ces calculs sont des estimations basées sur les barèmes cantonaux 2026. 
            Pour un calcul précis, consultez un fiscaliste ou l'administration fiscale de votre canton.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
