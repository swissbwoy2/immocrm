import { AlertTriangle, CheckCircle, Home, Calculator, AlertCircle, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PurchaseSolvabilityResult } from '@/hooks/usePurchaseSolvabilityCheck';
import { cn } from '@/lib/utils';

interface PurchaseSolvabilityAlertProps {
  result: PurchaseSolvabilityResult;
  compact?: boolean;
  className?: string;
}

export function PurchaseSolvabilityAlert({ result, compact = false, className }: PurchaseSolvabilityAlertProps) {
  const { 
    isSolvable, 
    problems, 
    prixAchatMax,
    prixDemande,
    apportDisponible,
    apportRequis,
    apportManquant,
    chargesMensuelles,
    tauxEffort,
    clientHasStableStatus,
  } = result;

  // Compact view for dashboard
  if (compact) {
    if (isSolvable && problems.length === 0) {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Dossier achat viable
          </span>
          <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
            <Home className="w-3 h-3 mr-1" />
            Achat
          </Badge>
        </div>
      );
    }

    const criticalProblem = problems.find(p => p.type === 'critical') || problems[0];
    const warningCount = problems.filter(p => p.type === 'warning').length;
    const criticalCount = problems.filter(p => p.type === 'critical').length;

    return (
      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Achat non viable
              </p>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                <Home className="w-3 h-3 mr-1" />
                Achat
              </Badge>
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} critique{criticalCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {criticalProblem && (
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                {criticalProblem.message}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <Card className={cn(
      isSolvable 
        ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' 
        : 'border-red-500/50 bg-red-50/30 dark:bg-red-950/10', 
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isSolvable ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400">Projet d'achat viable</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 dark:text-red-400">Problèmes de viabilité</span>
            </>
          )}
          <Badge variant="outline" className="ml-2 text-blue-600 border-blue-300">
            <Home className="w-3 h-3 mr-1" />
            Achat immobilier
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Permit status warning */}
        {!clientHasStableStatus && (
          <div className="flex items-center gap-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
            <Ban className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Permis non éligible
              </p>
              <p className="text-xs text-red-600 dark:text-red-500">
                L'accès à la propriété en Suisse nécessite un permis B, C ou la nationalité suisse
              </p>
            </div>
          </div>
        )}

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-background/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Prix demandé</p>
            <p className="text-lg font-semibold">{prixDemande.toLocaleString()} CHF</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prix max finançable</p>
            <p className={`text-lg font-semibold ${prixAchatMax >= prixDemande ? 'text-green-600' : 'text-orange-600'}`}>
              {prixAchatMax.toLocaleString()} CHF
            </p>
          </div>
        </div>

        {/* Down payment analysis */}
        <div className="p-3 bg-background/50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Analyse de l'apport (26% requis)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Apport requis</p>
              <p className="font-semibold">{apportRequis.toLocaleString()} CHF</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Apport disponible</p>
              <p className={`font-semibold ${apportDisponible >= apportRequis ? 'text-green-600' : 'text-orange-600'}`}>
                {apportDisponible.toLocaleString()} CHF
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Manquant</p>
              <p className={`font-semibold ${apportManquant === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {apportManquant === 0 ? 'OK' : `${apportManquant.toLocaleString()} CHF`}
              </p>
            </div>
          </div>
          <Progress 
            value={Math.min(100, (apportDisponible / apportRequis) * 100)} 
            className="h-2"
          />
        </div>

        {/* Effort rate analysis */}
        <div className="p-3 bg-background/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Taux d'effort (max 33%)</span>
            <span className={`font-bold ${tauxEffort <= 33 ? 'text-green-600' : 'text-red-600'}`}>
              {tauxEffort}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, (tauxEffort / 40) * 100)} 
            className={`h-2 ${tauxEffort > 33 ? '[&>div]:bg-red-500' : ''}`}
          />
          <p className="text-xs text-muted-foreground">
            Charges mensuelles estimées: {chargesMensuelles.toLocaleString()} CHF/mois
          </p>
        </div>

        {/* Problems list */}
        {problems.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Problèmes détectés ({problems.length})
            </p>
            {problems.map((problem, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${
                  problem.type === 'critical' 
                    ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
                    : 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    problem.type === 'critical' ? 'text-red-600' : 'text-orange-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${
                        problem.type === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                      }`}>
                        {problem.message}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          problem.type === 'critical' 
                            ? 'border-red-300 text-red-600' 
                            : 'border-orange-300 text-orange-600'
                        }`}
                      >
                        {problem.type === 'critical' ? 'Critique' : 'Alerte'}
                      </Badge>
                    </div>
                    <p className={`text-xs mt-1 ${
                      problem.type === 'critical' ? 'text-red-600 dark:text-red-500' : 'text-orange-600 dark:text-orange-500'
                    }`}>
                      💡 {problem.solution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            📊 <strong>Calcul suisse standard:</strong> Apport 26% (20% achat + 5% notaire + 1% entretien). 
            Charges théoriques = 7%/an (5% intérêts + 1% amort. + 1% entretien). 
            Max 33% du revenu brut annuel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
