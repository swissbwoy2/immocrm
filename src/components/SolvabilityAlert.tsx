import { AlertTriangle, CheckCircle, Shield, UserPlus, AlertCircle, Ban, FileWarning, Lightbulb, ChevronDown, ChevronUp, Sparkles, TrendingUp, Wallet, Target, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SolvabilityResult } from '@/hooks/useSolvabilityCheck';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';

interface SolvabilityAlertProps {
  result: SolvabilityResult;
  onAddCandidate?: () => void;
  compact?: boolean;
  className?: string;
  /** 'client' : rendu sobre des tableaux de bord client (DASH_CARD). 'default' : rendu historique (fiches admin/agent). */
  appearance?: 'default' | 'client';
}

const CANDIDATE_TYPE_LABELS: Record<string, string> = {
  colocataire: 'Colocataire',
  co_debiteur: 'Co-débiteur',
  signataire_solidaire: 'Signataire solidaire',
  garant: 'Garant',
  occupant: 'Occupant',
};

export function SolvabilityAlert({ result, onAddCandidate, compact = false, className, appearance = 'default' }: SolvabilityAlertProps) {
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

  // Rendu « client » (espace client, style DASH_CARD sobre). Le rendu par défaut ci-dessous reste inchangé.
  if (appearance === 'client') {
    const barCls = solvabilityPercentage >= 100 ? 'bg-emerald-500' : solvabilityPercentage >= 80 ? 'bg-amber-500' : 'bg-destructive';
    const pctCls = solvabilityPercentage >= 100 ? 'text-emerald-600' : solvabilityPercentage >= 80 ? 'text-amber-600' : 'text-destructive';
    const possibleCls = budgetPossible >= budgetDemande ? 'text-emerald-600' : 'text-destructive';

    if (compact) {
      if (isSolvable && problems.length === 0) {
        return (
          <div className={cn(DASH_CARD, 'flex items-center gap-3 p-4', className)}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </span>
            <p className="font-semibold text-foreground">Dossier solvable</p>
            {hasValidGarant && (
              <span className="ml-auto"><DashBadge tone="success">Garant valide</DashBadge></span>
            )}
          </div>
        );
      }

      return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className={cn(DASH_CARD, className)}>
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">Dossier non solvable</p>
                      {criticalProblems.length > 0 && (
                        <DashBadge tone="danger">
                          {criticalProblems.length} bloquant{criticalProblems.length > 1 ? 's' : ''}
                        </DashBadge>
                      )}
                      <div className="ml-auto">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Demandé:</span>
                        <span className="ml-1 font-medium text-foreground">{budgetDemande.toLocaleString()} CHF</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Possible:</span>
                        <span className={cn('ml-1 font-medium', possibleCls)}>
                          {budgetPossible.toLocaleString()} CHF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3 px-4 pb-4">
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Solutions</span>
                </div>
                <div className="space-y-2">
                  {criticalProblems.map((problem, index) => (
                    <div key={index} className="rounded-lg bg-background p-2 text-xs">
                      <p className="mb-1 font-medium text-destructive">{problem.message}</p>
                      <p className="text-muted-foreground">{problem.solution}</p>
                    </div>
                  ))}
                </div>
              </div>

              {onAddCandidate && (
                <Button size="sm" className="w-full rounded-full" onClick={onAddCandidate}>
                  <UserPlus className="mr-1 h-3 w-3" />
                  Ajouter un candidat
                </Button>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }

    return (
      <div className={cn(DASH_CARD, 'p-4 md:p-5', className)}>
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <span className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            isSolvable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
          )}>
            {isSolvable ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              {isSolvable ? 'Dossier solvable' : 'Dossier non solvable'}
            </h3>
            {solvabilitySource === 'garant' && (
              <p className="mt-0.5 text-xs text-muted-foreground">Via garant</p>
            )}
          </div>
          {isSolvable ? (
            hasValidGarant && <DashBadge tone="success">Garant valide</DashBadge>
          ) : (
            <DashBadge tone="danger">
              {criticalProblems.length} bloquant{criticalProblems.length > 1 ? 's' : ''}
            </DashBadge>
          )}
        </div>

        {/* Résumé financier */}
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          {([
            { icon: Wallet, label: 'Revenus client', value: clientRevenus, cls: 'text-foreground' },
            { icon: TrendingUp, label: 'Revenus totaux', value: totalRevenus, cls: 'text-foreground' },
            { icon: Target, label: 'Budget demandé', value: budgetDemande, cls: 'text-foreground' },
            { icon: Calculator, label: `Budget possible${solvabilitySource === 'garant' ? ' (garant)' : ''}`, value: budgetPossible, cls: possibleCls },
          ] as const).map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className="imr-lg-glass rounded-2xl p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={cn('text-base font-semibold', cls)}>{value.toLocaleString()} CHF</p>
            </div>
          ))}
        </div>

        {/* Barre de solvabilité */}
        {budgetDemande > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Capacité de solvabilité</span>
              <span className={cn('font-semibold', pctCls)}>{solvabilityPercentage}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full transition-all duration-500', barCls)} style={{ width: `${solvabilityPercentage}%` }} />
            </div>
          </div>
        )}

        {/* Statut du permis client */}
        {!clientHasStableStatus && (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-500/10 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <FileWarning className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Permis non stable détecté</p>
              <p className="text-xs text-muted-foreground">
                Un garant avec permis B/C ou nationalité suisse est nécessaire
              </p>
            </div>
          </div>
        )}

        {/* Info garant valide */}
        {hasValidGarant && garantInfo && (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Shield className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Garant valide: {garantInfo.nom}</p>
              <p className="text-xs text-muted-foreground">
                Revenus: {garantInfo.revenus.toLocaleString()} CHF → Max {garantInfo.maxLoyer.toLocaleString()} CHF/mois
                {garantInfo.permis && ` • Permis ${garantInfo.permis}`}
              </p>
            </div>
            <DashBadge tone="success">Permis stable</DashBadge>
          </div>
        )}

        {/* Problèmes détectés */}
        {problems.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold text-foreground">
                Problèmes à résoudre ({problems.length})
              </p>
            </div>

            {criticalProblems.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-destructive">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  Problèmes bloquants
                </p>
                {criticalProblems.map((problem, index) => (
                  <div key={index} className="rounded-xl border border-destructive/20 p-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{problem.message}</p>
                        <p className="mt-1.5 flex items-start gap-2 text-sm text-muted-foreground">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span><strong className="text-foreground">Solution:</strong> {problem.solution}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {warningProblems.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Alertes
                </p>
                {warningProblems.map((problem, index) => (
                  <div key={index} className="rounded-xl border border-amber-500/30 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-sm font-medium text-foreground">{problem.message}</p>
                        <p className="text-xs text-muted-foreground">{problem.solution}</p>
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
          <div className="mb-4 rounded-xl border border-amber-500/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Ban className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-foreground">
                Candidats non comptabilisés ({excludedCandidates.length})
              </p>
            </div>
            <div className="space-y-2">
              {excludedCandidates.map((candidate, index) => (
                <div key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
                  <span className="font-medium text-foreground">
                    {candidate.name} ({CANDIDATE_TYPE_LABELS[candidate.type] || candidate.type})
                  </span>
                  <DashBadge tone="warning">{candidate.reason}</DashBadge>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span><strong className="text-foreground">Pour comptabiliser ces revenus:</strong> Ces candidats doivent avoir un permis B, C ou être de nationalité suisse</span>
            </p>
          </div>
        )}

        {/* Bouton ajouter candidat */}
        {!isSolvable && onAddCandidate && (
          <Button onClick={onAddCandidate} className="mb-4 w-full rounded-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter un candidat au dossier
          </Button>
        )}

        {/* Info sur le calcul */}
        <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              <strong className="text-foreground">Règle de calcul:</strong> Budget possible = Revenus totaux ÷ 3. 
              Les revenus ne sont comptabilisés que pour les personnes sans poursuites ni actes de défaut de bien, avec permis B, C ou nationalité suisse.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                className="w-full"
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
            className="w-full group/btn"
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
              Les revenus ne sont comptabilisés que pour les personnes sans poursuites ni actes de défaut de bien, avec permis B, C ou nationalité suisse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
