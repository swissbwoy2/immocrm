import { AlertTriangle, CheckCircle, Shield, UserPlus, AlertCircle, Ban, FileWarning, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SolvabilityResult } from '@/hooks/useSolvabilityCheck';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SolvabilityAlertProps {
  result: SolvabilityResult;
  onAddCandidate?: () => void;
  compact?: boolean;
  className?: string;
}

const CANDIDATE_TYPE_LABELS: Record<string, string> = {
  colocataire: 'Colocataire',
  co_debiteur: 'Co-débiteur',
  signataire_solidaire: 'Signataire solidaire',
  garant: 'Garant',
  occupant: 'Occupant',
};

export function SolvabilityAlert({ result, onAddCandidate, compact = false, className }: SolvabilityAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { 
    isSolvable, 
    problems, 
    budgetPossible, 
    budgetDemande, 
    hasValidGarant, 
    garantInfo,
    clientHasStableStatus,
    excludedCandidates,
    solvabilitySource,
    totalRevenus,
    clientRevenus,
  } = result;

  // Si tout est OK et pas de budget demandé, ne rien afficher
  if (isSolvable && problems.length === 0 && budgetDemande === 0) {
    return null;
  }

  const criticalProblems = problems.filter(p => p.type === 'critical');
  const warningProblems = problems.filter(p => p.type === 'warning');

  // Affichage compact amélioré pour le dashboard
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

    // Vue compacte améliorée avec TOUS les problèmes visibles
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
                      ⚠️ Dossier non solvable
                    </p>
                    {criticalProblems.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {criticalProblems.length} bloquant{criticalProblems.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {warningProblems.length > 0 && (
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                        {warningProblems.length} alerte{warningProblems.length > 1 ? 's' : ''}
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

                  {/* Récapitulatif budget */}
                  <div className="flex gap-4 text-xs mb-2 p-2 bg-white/50 dark:bg-black/20 rounded">
                    <div>
                      <span className="text-muted-foreground">Budget demandé:</span>
                      <span className="font-medium ml-1">{budgetDemande.toLocaleString()} CHF</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Budget possible:</span>
                      <span className={cn("font-medium ml-1", budgetPossible >= budgetDemande ? "text-green-600" : "text-red-600")}>
                        {budgetPossible.toLocaleString()} CHF
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

            {/* Candidats exclus */}
            {excludedCandidates.length > 0 && (
              <div className="text-xs p-2 bg-orange-100/50 dark:bg-orange-900/20 rounded">
                <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">
                  ⚠️ Candidats non comptabilisés dans le calcul:
                </p>
                {excludedCandidates.map((c, i) => (
                  <p key={i} className="text-orange-600">
                    • {c.name} ({CANDIDATE_TYPE_LABELS[c.type] || c.type}): {c.reason}
                  </p>
                ))}
              </div>
            )}

            {onAddCandidate && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-8 text-xs border-primary text-primary hover:bg-primary/10"
                onClick={onAddCandidate}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Ajouter un candidat (garant, co-débiteur...)
              </Button>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Affichage complet
  return (
    <Card className={cn(isSolvable ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-red-500/50 bg-red-50/30 dark:bg-red-950/10', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isSolvable ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400">Dossier solvable</span>
              {solvabilitySource === 'garant' && (
                <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
                  Via garant
                </Badge>
              )}
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 dark:text-red-400">Dossier non solvable</span>
              <Badge variant="destructive" className="ml-2">
                {criticalProblems.length} problème{criticalProblems.length > 1 ? 's' : ''} bloquant{criticalProblems.length > 1 ? 's' : ''}
              </Badge>
            </>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Résumé financier */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-background/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Revenus client</p>
            <p className="text-lg font-semibold">{clientRevenus.toLocaleString()} CHF</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Revenus totaux</p>
            <p className="text-lg font-semibold">{totalRevenus.toLocaleString()} CHF</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget demandé</p>
            <p className="text-lg font-semibold">{budgetDemande.toLocaleString()} CHF</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Budget possible {solvabilitySource === 'garant' && '(via garant)'}
            </p>
            <p className={cn("text-lg font-semibold", budgetPossible >= budgetDemande ? 'text-green-600' : 'text-red-600')}>
              {budgetPossible.toLocaleString()} CHF
            </p>
          </div>
        </div>

        {/* Statut du permis client */}
        {!clientHasStableStatus && (
          <div className="flex items-center gap-3 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
            <FileWarning className="w-5 h-5 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                ⚠️ Permis non stable détecté
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-500">
                Un garant avec permis B/C ou nationalité suisse est nécessaire pour valider le dossier
              </p>
            </div>
          </div>
        )}

        {/* Info garant valide */}
        {hasValidGarant && garantInfo && (
          <div className="flex items-center gap-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✅ Garant valide: {garantInfo.nom}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                Revenus: {garantInfo.revenus.toLocaleString()} CHF → Garantit jusqu'à {garantInfo.maxLoyer.toLocaleString()} CHF/mois
                {garantInfo.permis && ` • Permis ${garantInfo.permis}`}
              </p>
            </div>
            <Badge className="bg-green-600 text-white">
              Permis stable
            </Badge>
          </div>
        )}

        {/* Problèmes détectés avec solutions claires */}
        {problems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-bold text-foreground">
                Problèmes à résoudre ({problems.length})
              </p>
            </div>
            
            {/* Problèmes critiques */}
            {criticalProblems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                  🔴 Problèmes bloquants (à résoudre obligatoirement)
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
                  🟠 Alertes (recommandations)
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

        {/* Candidats exclus du calcul */}
        {excludedCandidates.length > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                Candidats non comptabilisés ({excludedCandidates.length})
              </p>
            </div>
            <div className="space-y-1">
              {excludedCandidates.map((candidate, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 bg-white/50 dark:bg-black/20 rounded">
                  <span className="text-orange-600 dark:text-orange-500">
                    {candidate.name} ({CANDIDATE_TYPE_LABELS[candidate.type] || candidate.type})
                  </span>
                  <span className="text-orange-500 dark:text-orange-600">
                    ⚠️ {candidate.reason}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-orange-500 mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
              💡 <strong>Pour comptabiliser ces revenus:</strong> Ces candidats doivent avoir un permis B, C ou être de nationalité suisse
            </p>
          </div>
        )}

        {/* Bouton ajouter candidat */}
        {!isSolvable && onAddCandidate && (
          <Button onClick={onAddCandidate} className="w-full" size="lg">
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter un candidat au dossier (garant, co-débiteur...)
          </Button>
        )}

        {/* Info sur le calcul */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          📊 <strong>Règle de calcul:</strong> Budget possible = Revenus totaux ÷ 3. 
          Les revenus ne sont comptabilisés que pour les personnes avec permis B, C ou nationalité suisse.
        </div>
      </CardContent>
    </Card>
  );
}
