import { AlertTriangle, CheckCircle, Shield, UserPlus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SolvabilityResult } from '@/hooks/useSolvabilityCheck';

interface SolvabilityAlertProps {
  result: SolvabilityResult;
  onAddCandidate?: () => void;
  compact?: boolean;
}

export function SolvabilityAlert({ result, onAddCandidate, compact = false }: SolvabilityAlertProps) {
  const { isSolvable, problems, budgetPossible, budgetDemande, hasValidGarant, garantInfo } = result;

  // Si tout est OK et pas de budget demandé, ne rien afficher
  if (isSolvable && problems.length === 0 && budgetDemande === 0) {
    return null;
  }

  // Affichage compact pour le dashboard
  if (compact) {
    if (isSolvable && problems.length === 0) {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Dossier solvable
          </span>
          {hasValidGarant && (
            <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
              <Shield className="w-3 h-3 mr-1" />
              Garant valide
            </Badge>
          )}
        </div>
      );
    }

    return (
      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Dossier non solvable
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {problems[0]?.message}
            </p>
            {onAddCandidate && (
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2 h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
                onClick={onAddCandidate}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Ajouter un candidat
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Affichage complet
  return (
    <Card className={isSolvable ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-red-500/50 bg-red-50/30 dark:bg-red-950/10'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isSolvable ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400">Dossier solvable</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 dark:text-red-400">Problèmes de solvabilité</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Récapitulatif budget */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-background/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Budget demandé</p>
            <p className="text-lg font-semibold">CHF {budgetDemande.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget possible</p>
            <p className={`text-lg font-semibold ${budgetPossible >= budgetDemande ? 'text-green-600' : 'text-orange-600'}`}>
              CHF {budgetPossible.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Info garant valide */}
        {hasValidGarant && garantInfo && (
          <div className="flex items-center gap-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Garant valide: {garantInfo.nom}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                Revenus: CHF {garantInfo.revenus.toLocaleString()} → Garantit jusqu'à CHF {garantInfo.maxLoyer.toLocaleString()}/mois
              </p>
            </div>
          </div>
        )}

        {/* Liste des problèmes */}
        {problems.length > 0 && (
          <div className="space-y-3">
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
                  <div>
                    <p className={`text-sm font-medium ${
                      problem.type === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                    }`}>
                      {problem.message}
                    </p>
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

        {/* Bouton ajouter candidat */}
        {!isSolvable && onAddCandidate && (
          <Button onClick={onAddCandidate} className="w-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter un candidat au dossier
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
