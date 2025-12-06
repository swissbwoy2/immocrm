import { AlertTriangle, CheckCircle, Shield, UserPlus, AlertCircle, Ban, FileWarning, Lightbulb, ChevronDown, ChevronUp, Sparkles, TrendingUp, Wallet, Target, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SolvabilityResult } from '@/hooks/useSolvabilityCheck';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';

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
  
  // Calcul du pourcentage de solvabilité
  const solvabilityPercentage = budgetDemande > 0 
    ? Math.min(Math.round((budgetPossible / budgetDemande) * 100), 100)
    : 100;

  // Affichage compact amélioré pour le dashboard
  if (compact) {
    if (isSolvable && problems.length === 0) {
      return (
        <div className="group relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-xl border border-success/30 hover:border-success/50 transition-all duration-300 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-emerald-500/5" />
          <div className="relative flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-success/20 group-hover:bg-success/30 transition-colors">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm font-medium text-success">
              Dossier solvable
            </span>
            {hasValidGarant && (
              <Badge variant="outline" className="ml-auto text-success border-success/30 bg-success/10">
                <Shield className="w-3 h-3 mr-1" />
                Garant valide
              </Badge>
            )}
          </div>
        </div>
      );
    }

    // Vue compacte premium
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="group relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-xl border border-destructive/30 hover:border-destructive/50 transition-all duration-300 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-red-500/10" />
          
          <CollapsibleTrigger asChild>
            <div className="relative cursor-pointer p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <p className="text-sm font-bold text-destructive">
                      Dossier non solvable
                    </p>
                    {criticalProblems.length > 0 && (
                      <Badge variant="destructive" className="text-xs shadow-lg shadow-destructive/20">
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

                  {/* Résumé budget */}
                  <div className="flex gap-4 text-xs p-2 bg-background/50 backdrop-blur-sm rounded-lg border border-border/50">
                    <div>
                      <span className="text-muted-foreground">Demandé:</span>
                      <span className="font-medium ml-1">{budgetDemande.toLocaleString()} CHF</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Possible:</span>
                      <span className={cn("font-medium ml-1", budgetPossible >= budgetDemande ? "text-success" : "text-destructive")}>
                        {budgetPossible.toLocaleString()} CHF
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="relative px-4 pb-4 space-y-3">
            {/* Solutions */}
            <div className="p-3 bg-primary/5 backdrop-blur-sm rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm text-primary">Solutions</span>
              </div>
              <div className="space-y-2">
                {criticalProblems.map((problem, index) => (
                  <div key={index} className="text-xs p-2 bg-background/50 rounded">
                    <p className="font-medium text-destructive mb-1">❌ {problem.message}</p>
                    <p className="text-primary">➡️ {problem.solution}</p>
                  </div>
                ))}
              </div>
            </div>

            {onAddCandidate && (
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300"
                onClick={onAddCandidate}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Ajouter un candidat
              </Button>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Affichage complet premium
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border transition-all duration-500 hover:shadow-xl animate-fade-in",
      isSolvable 
        ? 'border-success/30 hover:border-success/50 hover:shadow-success/10' 
        : 'border-destructive/30 hover:border-destructive/50 hover:shadow-destructive/10',
      className
    )}>
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0",
        isSolvable 
          ? 'bg-gradient-to-br from-success/10 via-transparent to-emerald-500/10' 
          : 'bg-gradient-to-br from-destructive/10 via-transparent to-red-500/10'
      )} />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className={cn(
          "absolute top-4 right-10 w-16 h-16 rounded-full blur-2xl animate-float-particle",
          isSolvable ? 'bg-success/20' : 'bg-destructive/20'
        )} style={{ animationDelay: '0s' }} />
        <div className={cn(
          "absolute bottom-4 left-10 w-12 h-12 rounded-full blur-xl animate-float-particle",
          isSolvable ? 'bg-emerald-400/20' : 'bg-red-400/20'
        )} style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000",
          isSolvable ? 'via-success/10' : 'via-destructive/10'
        )} />
      </div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={cn(
            "p-2.5 rounded-xl transition-colors duration-300",
            isSolvable 
              ? 'bg-success/20 group-hover:bg-success/30' 
              : 'bg-destructive/20 group-hover:bg-destructive/30'
          )}>
            {isSolvable ? (
              <CheckCircle className="w-5 h-5 text-success group-hover:scale-110 transition-transform duration-300" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform duration-300" />
            )}
          </div>
          <div className="flex-1">
            <h3 className={cn(
              "text-lg font-semibold flex items-center gap-2",
              isSolvable ? 'text-success' : 'text-destructive'
            )}>
              {isSolvable ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse-soft" />
                  Dossier solvable
                </>
              ) : (
                'Dossier non solvable'
              )}
            </h3>
            {solvabilitySource === 'garant' && (
              <p className="text-xs text-muted-foreground mt-0.5">Via garant</p>
            )}
          </div>
          {isSolvable ? (
            hasValidGarant && (
              <Badge className="bg-success/20 text-success border-success/30 shadow-sm">
                <Shield className="w-3 h-3 mr-1" />
                Garant valide
              </Badge>
            )
          ) : (
            <Badge variant="destructive" className="shadow-lg shadow-destructive/20">
              {criticalProblems.length} bloquant{criticalProblems.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Résumé financier premium */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="group/item p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground group-hover/item:text-primary transition-colors" />
              <p className="text-xs text-muted-foreground">Revenus client</p>
            </div>
            <p className="text-lg font-bold group-hover/item:text-primary transition-colors">{clientRevenus.toLocaleString()} CHF</p>
          </div>
          <div className="group/item p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground group-hover/item:text-primary transition-colors" />
              <p className="text-xs text-muted-foreground">Revenus totaux</p>
            </div>
            <p className="text-lg font-bold group-hover/item:text-primary transition-colors">{totalRevenus.toLocaleString()} CHF</p>
          </div>
          <div className="group/item p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/30 hover:border-warning/30 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 text-muted-foreground group-hover/item:text-warning transition-colors" />
              <p className="text-xs text-muted-foreground">Budget demandé</p>
            </div>
            <p className="text-lg font-bold group-hover/item:text-warning transition-colors">{budgetDemande.toLocaleString()} CHF</p>
          </div>
          <div className="group/item p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/30 hover:scale-[1.02] transition-all duration-300" style={{ borderColor: budgetPossible >= budgetDemande ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--destructive) / 0.3)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Budget possible {solvabilitySource === 'garant' && '(garant)'}
              </p>
            </div>
            <p className={cn(
              "text-lg font-bold transition-colors",
              budgetPossible >= budgetDemande ? 'text-success' : 'text-destructive'
            )}>
              {budgetPossible.toLocaleString()} CHF
            </p>
          </div>
        </div>

        {/* Barre de solvabilité */}
        {budgetDemande > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-border/30">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground font-medium">Capacité de solvabilité</span>
              <span className={cn(
                "font-bold",
                solvabilityPercentage >= 100 ? 'text-success' : solvabilityPercentage >= 80 ? 'text-warning' : 'text-destructive'
              )}>
                {solvabilityPercentage}%
              </span>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden bg-muted/30">
              <Progress 
                value={solvabilityPercentage} 
                className="h-3 bg-transparent"
                indicatorClassName={cn(
                  "shadow-lg",
                  solvabilityPercentage >= 100 
                    ? 'bg-gradient-to-r from-success via-emerald-400 to-green-400 shadow-success/30' 
                    : solvabilityPercentage >= 80 
                      ? 'bg-gradient-to-r from-warning via-orange-400 to-amber-400 shadow-warning/30'
                      : 'bg-gradient-to-r from-destructive via-red-400 to-rose-400 shadow-destructive/30'
                )}
              />
            </div>
          </div>
        )}

        {/* Statut du permis client */}
        {!clientHasStableStatus && (
          <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-gradient-to-r from-warning/10 to-orange-500/10 border border-warning/30 hover:border-warning/50 transition-all duration-300">
            <div className="p-2 rounded-lg bg-warning/20">
              <FileWarning className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">Permis non stable détecté</p>
              <p className="text-xs text-muted-foreground">
                Un garant avec permis B/C ou nationalité suisse est nécessaire
              </p>
            </div>
          </div>
        )}

        {/* Info garant valide */}
        {hasValidGarant && garantInfo && (
          <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-gradient-to-r from-success/10 to-emerald-500/10 border border-success/30 hover:border-success/50 transition-all duration-300">
            <div className="p-2 rounded-lg bg-success/20">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-success flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Garant valide: {garantInfo.nom}
              </p>
              <p className="text-xs text-muted-foreground">
                Revenus: {garantInfo.revenus.toLocaleString()} CHF → Max {garantInfo.maxLoyer.toLocaleString()} CHF/mois
                {garantInfo.permis && ` • Permis ${garantInfo.permis}`}
              </p>
            </div>
            <Badge className="bg-success text-success-foreground shadow-sm">
              Permis stable
            </Badge>
          </div>
        )}

        {/* Problèmes détectés */}
        {problems.length > 0 && (
          <div className="space-y-4 mb-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm font-bold">
                Problèmes à résoudre ({problems.length})
              </p>
            </div>
            
            {/* Problèmes critiques */}
            {criticalProblems.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-destructive uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Problèmes bloquants
                </p>
                {criticalProblems.map((problem, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-red-500/10 border border-destructive/30 hover:border-destructive/50 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-destructive font-bold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-destructive mb-2">{problem.message}</p>
                        <div className="p-3 bg-background/50 backdrop-blur-sm rounded-lg border border-primary/20">
                          <p className="text-sm text-primary flex items-start gap-2">
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
              <div className="space-y-3">
                <p className="text-xs font-medium text-warning uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  Alertes
                </p>
                {warningProblems.map((problem, index) => (
                  <div 
                    key={index} 
                    className="p-3 rounded-xl bg-gradient-to-r from-warning/10 to-orange-500/10 border border-warning/30 hover:border-warning/50 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-warning" />
                      <div className="flex-1">
                        <p className="font-medium text-warning mb-1">{problem.message}</p>
                        <p className="text-xs text-muted-foreground">💡 {problem.solution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Candidats exclus */}
        {excludedCandidates.length > 0 && (
          <div className="p-4 mb-5 rounded-xl bg-gradient-to-r from-warning/10 to-orange-500/10 border border-warning/30">
            <div className="flex items-center gap-2 mb-3">
              <Ban className="w-4 h-4 text-warning" />
              <p className="text-sm font-medium text-warning">
                Candidats non comptabilisés ({excludedCandidates.length})
              </p>
            </div>
            <div className="space-y-2">
              {excludedCandidates.map((candidate, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-3 bg-background/50 backdrop-blur-sm rounded-lg border border-border/30">
                  <span className="text-foreground font-medium">
                    {candidate.name} ({CANDIDATE_TYPE_LABELS[candidate.type] || candidate.type})
                  </span>
                  <Badge variant="outline" className="text-warning border-warning/30">
                    {candidate.reason}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              💡 <strong>Pour comptabiliser ces revenus:</strong> Ces candidats doivent avoir un permis B, C ou être de nationalité suisse
            </p>
          </div>
        )}

        {/* Bouton ajouter candidat */}
        {!isSolvable && onAddCandidate && (
          <Button 
            onClick={onAddCandidate} 
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 group/btn"
          >
            <UserPlus className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
            Ajouter un candidat au dossier
            <Sparkles className="w-4 h-4 ml-2 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          </Button>
        )}

        {/* Info sur le calcul */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/20 border border-border/30 text-xs text-muted-foreground mt-5">
          <div className="flex items-start gap-2">
            <Calculator className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <p>
              <strong className="text-foreground">Règle de calcul:</strong> Budget possible = Revenus totaux ÷ 3. 
              Les revenus ne sont comptabilisés que pour les personnes avec permis B, C ou nationalité suisse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
