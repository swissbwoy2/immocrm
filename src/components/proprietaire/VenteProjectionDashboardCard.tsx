import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calculator, ArrowRight, Landmark, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  calculateCapitalGainsTax, 
  calculateSellerCommission, 
  calculateYearsOwned,
  getCantonDisplayName,
  type CommissionMode,
  type TaxCalculationResult 
} from '@/utils/swissRealEstateTax';

interface Immeuble {
  id: string;
  nom?: string;
  adresse?: string;
  canton?: string;
  prix_vendeur?: number;
  prix_commercial?: number;
  prix_acquisition?: number;
  date_acquisition?: string;
  travaux_plus_value?: number;
  commission_mode?: string;
  mode_exploitation?: string;
}

interface VenteProjectionDashboardCardProps {
  immeubles: Immeuble[];
}

interface PropertyProjection {
  immeuble: Immeuble;
  prixVente: number;
  commission: number;
  sellerReceives: number;
  gainBrut: number;
  taxEstimee: number;
  fraisNotaire: number;
  revenuNet: number;
  yearsOwned: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-CH', { 
    style: 'currency', 
    currency: 'CHF',
    maximumFractionDigits: 0 
  }).format(amount);
};

export function VenteProjectionDashboardCard({ immeubles }: VenteProjectionDashboardCardProps) {
  const navigate = useNavigate();
  
  // Filter properties in sale mode
  const propertiesInSale = useMemo(() => {
    return immeubles.filter(i => 
      i.mode_exploitation === 'vente' || i.mode_exploitation === 'les_deux'
    );
  }, [immeubles]);
  
  // Calculate projections for each property
  const projections = useMemo(() => {
    return propertiesInSale.map(immeuble => {
      const prixVendeur = immeuble.prix_vendeur || 0;
      const prixCommercial = immeuble.prix_commercial || prixVendeur;
      const prixVente = prixCommercial;
      const prixAcquisition = immeuble.prix_acquisition || 0;
      const travauxPlusValue = immeuble.travaux_plus_value || 0;
      const commissionMode = (immeuble.commission_mode as CommissionMode) || 'net_vendeur';
      const yearsOwned = calculateYearsOwned(immeuble.date_acquisition || null);
      
      // Calculate commission
      const commissionResult = calculateSellerCommission(
        commissionMode,
        prixVendeur,
        prixCommercial,
        prixVente
      );
      
      // Calculate gross gain
      const gainBrut = commissionResult.sellerReceives - prixAcquisition;
      
      // Calculate tax
      let taxEstimee = 0;
      if (immeuble.canton && gainBrut > 0) {
        const taxResult = calculateCapitalGainsTax({
          canton: immeuble.canton,
          gainBrut,
          yearsOwned,
          travauxPlusValue
        });
        taxEstimee = taxResult.impotEstime;
      }
      
      // Notary fees (5%)
      const fraisNotaire = Math.round(prixVente * 0.05);
      
      // Net revenue
      const totalCharges = commissionResult.commission + taxEstimee + fraisNotaire;
      const revenuNet = prixVente - totalCharges;
      
      return {
        immeuble,
        prixVente,
        commission: commissionResult.commission,
        sellerReceives: commissionResult.sellerReceives,
        gainBrut,
        taxEstimee,
        fraisNotaire,
        revenuNet,
        yearsOwned
      } as PropertyProjection;
    }).filter(p => p.prixVente > 0);
  }, [propertiesInSale]);
  
  // Aggregate totals
  const totals = useMemo(() => {
    return projections.reduce((acc, p) => ({
      totalPrixVente: acc.totalPrixVente + p.prixVente,
      totalTaxe: acc.totalTaxe + p.taxEstimee,
      totalFraisNotaire: acc.totalFraisNotaire + p.fraisNotaire,
      totalCommission: acc.totalCommission + p.commission,
      totalRevenuNet: acc.totalRevenuNet + p.revenuNet
    }), {
      totalPrixVente: 0,
      totalTaxe: 0,
      totalFraisNotaire: 0,
      totalCommission: 0,
      totalRevenuNet: 0
    });
  }, [projections]);
  
  if (projections.length === 0) return null;
  
  return (
    <div className="lg:col-span-3 mb-2">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20 dark:border-emerald-800/30 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Calculator className="w-5 h-5" />
              Projection financière vente
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300">
              {projections.length} bien{projections.length > 1 ? 's' : ''} en vente
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Individual property cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projections.map((projection) => (
              <Card 
                key={projection.immeuble.id}
                className="bg-white/80 dark:bg-background/50 border-emerald-100 dark:border-emerald-900/30 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/proprietaire/immeubles/${projection.immeuble.id}?tab=vente`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {projection.immeuble.nom || projection.immeuble.adresse || 'Bien immobilier'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {getCantonDisplayName(projection.immeuble.canton || null)}
                        {projection.yearsOwned > 0 && ` • ${projection.yearsOwned} an${projection.yearsOwned > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                  </div>
                  
                  <Separator className="bg-emerald-100 dark:bg-emerald-900/30" />
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Prix de vente</span>
                      <span className="font-medium">{formatCurrency(projection.prixVente)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Landmark className="w-3 h-3" />
                        Impôt estimé
                      </span>
                      <span className="text-destructive">-{formatCurrency(projection.taxEstimee)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Frais notaire
                      </span>
                      <span className="text-destructive">-{formatCurrency(projection.fraisNotaire)}</span>
                    </div>
                  </div>
                  
                  <Separator className="bg-emerald-100 dark:bg-emerald-900/30" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Revenu net estimé</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(projection.revenuNet)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Aggregated totals if multiple properties */}
          {projections.length > 1 && (
            <>
              <Separator className="bg-emerald-200 dark:bg-emerald-800/50" />
              <div className="bg-gradient-to-r from-emerald-100/80 to-teal-100/80 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      Total estimé ({projections.length} biens)
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Impôts: -{formatCurrency(totals.totalTaxe)} • Frais: -{formatCurrency(totals.totalFraisNotaire + totals.totalCommission)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(totals.totalRevenuNet)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">revenu net total</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* CTA */}
          <div className="flex justify-end pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/proprietaire/vente')}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Voir le détail complet
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
