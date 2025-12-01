import { AlertTriangle, CheckCircle, Home, Calculator, AlertCircle, Ban, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PurchaseSolvabilityResult } from '@/hooks/usePurchaseSolvabilityCheck';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PurchaseSolvabilityAlertProps {
  result: PurchaseSolvabilityResult;
  compact?: boolean;
  className?: string;
}

export function PurchaseSolvabilityAlert({ result, compact = false, className }: PurchaseSolvabilityAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    revenuAnnuelBrut,
  } = result;

  const criticalProblems = problems.filter(p => p.type === 'critical');
  const warningProblems = problems.filter(p => p.type === 'warning');

  // Compact view amélioré
  if (compact) {
    if (isSolvable && problems.length === 0) {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Projet d'achat viable
          </span>
          <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
            <Home className="w-3 h-3 mr-1" />
            Achat
          </Badge>
        </div>
      );
    }

    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">
                      ⚠️ Achat non viable
                    </p>
                    <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                      <Home className="w-3 h-3 mr-1" />
                      Achat
                    </Badge>
                    {criticalProblems.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {criticalProblems.length} bloquant{criticalProblems.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <div className="ml-auto">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Résumé rapide des problèmes critiques */}
                  {criticalProblems.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {criticalProblems.slice(0, isExpanded ? undefined : 2).map((problem, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                          <span className="text-red-600 font-medium">❌</span>
                          <span className="text-red-700 dark:text-red-400">{problem.message}</span>
                        </div>
                      ))}
                      {!isExpanded && criticalProblems.length > 2 && (
                        <p className="text-xs text-red-500">
                          +{criticalProblems.length - 2} autre{criticalProblems.length - 2 > 1 ? 's' : ''} problème{criticalProblems.length - 2 > 1 ? 's' : ''} bloquant{criticalProblems.length - 2 > 1 ? 's' : ''}...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Récapitulatif financier rapide */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2 p-2 bg-white/50 dark:bg-black/20 rounded">
                    <div>
                      <span className="text-muted-foreground">Prix demandé:</span>
                      <span className="font-medium ml-1">{prixDemande.toLocaleString()} CHF</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max finançable:</span>
                      <span className={cn("font-medium ml-1", prixAchatMax >= prixDemande ? "text-green-600" : "text-red-600")}>
                        {prixAchatMax.toLocaleString()} CHF
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Apport requis:</span>
                      <span className="font-medium ml-1">{apportRequis.toLocaleString()} CHF</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Apport disponible:</span>
                      <span className={cn("font-medium ml-1", apportDisponible >= apportRequis ? "text-green-600" : "text-red-600")}>
                        {apportDisponible.toLocaleString()} CHF
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3 space-y-3">
            {/* Solutions détaillées */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm text-blue-700 dark:text-blue-400">Comment résoudre ?</span>
              </div>
              <div className="space-y-2">
                {criticalProblems.map((problem, index) => (
                  <div key={index} className="text-xs p-2 bg-white/50 dark:bg-black/20 rounded">
                    <p className="font-medium text-red-700 dark:text-red-400 mb-1">
                      🔴 {problem.message}
                    </p>
                    <p className="text-blue-600 dark:text-blue-400">
                      ➡️ {problem.solution}
                    </p>
                  </div>
                ))}
                {warningProblems.map((problem, index) => (
                  <div key={index} className="text-xs p-2 bg-white/50 dark:bg-black/20 rounded">
                    <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                      🟠 {problem.message}
                    </p>
                    <p className="text-blue-600 dark:text-blue-400">
                      ➡️ {problem.solution}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Détails financiers */}
            <div className="text-xs p-2 bg-muted/50 rounded">
              <p className="mb-1">
                <strong>Revenu annuel brut:</strong> {revenuAnnuelBrut.toLocaleString()} CHF
              </p>
              <p className="mb-1">
                <strong>Charges mensuelles estimées:</strong> {chargesMensuelles.toLocaleString()} CHF
              </p>
              <p>
                <strong>Taux d'effort:</strong> <span className={tauxEffort <= 33 ? "text-green-600" : "text-red-600"}>{tauxEffort}%</span> (max 33%)
              </p>
              {apportManquant > 0 && (
                <p className="text-red-600 mt-1">
                  <strong>Apport manquant:</strong> {apportManquant.toLocaleString()} CHF
                </p>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
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
              <span className="text-red-700 dark:text-red-400">Projet d'achat non viable</span>
              {criticalProblems.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {criticalProblems.length} bloquant{criticalProblems.length > 1 ? 's' : ''}
                </Badge>
              )}
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
          <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border-2 border-red-300 dark:border-red-700">
            <Ban className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                ⛔ Permis non éligible à l'achat
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                L'accès à la propriété en Suisse nécessite un permis B, C ou la nationalité suisse. 
                Veuillez d'abord obtenir un permis éligible.
              </p>
            </div>
          </div>
        )}

        {/* Financial summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-background/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Prix demandé</p>
            <p className="text-lg font-semibold">{prixDemande.toLocaleString()} CHF</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Max finançable</p>
            <p className={cn("text-lg font-semibold", prixAchatMax >= prixDemande ? 'text-green-600' : 'text-red-600')}>
              {prixAchatMax.toLocaleString()} CHF
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Revenu annuel</p>
            <p className="text-lg font-semibold">{revenuAnnuelBrut.toLocaleString()} CHF</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taux d'effort</p>
            <p className={cn("text-lg font-semibold", tauxEffort <= 33 ? 'text-green-600' : 'text-red-600')}>
              {tauxEffort}%
            </p>
          </div>
        </div>

        {/* Down payment analysis */}
        <div className="p-4 bg-background/50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="font-medium">Analyse de l'apport (26% requis)</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Apport requis</p>
              <p className="font-semibold">{apportRequis.toLocaleString()} CHF</p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Apport disponible</p>
              <p className={cn("font-semibold", apportDisponible >= apportRequis ? 'text-green-600' : 'text-red-600')}>
                {apportDisponible.toLocaleString()} CHF
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Manquant</p>
              <p className={cn("font-semibold", apportManquant === 0 ? 'text-green-600' : 'text-red-600')}>
                {apportManquant === 0 ? '✅ OK' : `❌ ${apportManquant.toLocaleString()} CHF`}
              </p>
            </div>
          </div>
          <Progress 
            value={Math.min(100, (apportDisponible / apportRequis) * 100)} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground">
            Progression: {Math.round((apportDisponible / apportRequis) * 100)}% de l'apport requis
          </p>
        </div>

        {/* Effort rate analysis */}
        <div className="p-4 bg-background/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Taux d'effort (max 33%)</span>
            <span className={cn("font-bold text-lg", tauxEffort <= 33 ? 'text-green-600' : 'text-red-600')}>
              {tauxEffort}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, (tauxEffort / 40) * 100)} 
            className={cn("h-3", tauxEffort > 33 ? '[&>div]:bg-red-500' : '')}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Charges mensuelles: {chargesMensuelles.toLocaleString()} CHF/mois</span>
            <span className={tauxEffort <= 33 ? 'text-green-600' : 'text-red-600'}>
              {tauxEffort <= 33 ? '✅ Dans les limites' : '❌ Dépasse les limites'}
            </span>
          </div>
        </div>

        {/* Problems list with solutions */}
        {problems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="font-bold text-foreground">
                Problèmes à résoudre ({problems.length})
              </p>
            </div>

            {/* Problèmes critiques */}
            {criticalProblems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                  🔴 Problèmes bloquants
                </p>
                {criticalProblems.map((problem, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-700 dark:text-red-300 font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                          {problem.message}
                        </p>
                        <div className="p-2 bg-white/50 dark:bg-black/30 rounded">
                          <p className="text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span><strong>Solution:</strong> {problem.solution}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Alertes */}
            {warningProblems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">
                  🟠 Alertes
                </p>
                {warningProblems.map((problem, index) => (
                  <div 
                    key={index} 
                    className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
                      <div className="flex-1">
                        <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                          {problem.message}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-500">
                          💡 {problem.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
