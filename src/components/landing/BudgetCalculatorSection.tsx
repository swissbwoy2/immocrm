import { useState, useMemo, useEffect } from 'react';
import { Calculator, CheckCircle, AlertTriangle, ArrowRight, Sparkles, Info, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Optimized order: qualified permits first
const permitTypes = [
  { value: 'suisse', label: 'Nationalité suisse' },
  { value: 'C', label: 'Permis C (établissement)' },
  { value: 'B', label: 'Permis B (séjour)' },
  { value: 'G', label: 'Permis G (frontalier)' },
  { value: 'L', label: 'Permis L (courte durée)' },
  { value: 'F', label: 'Permis F (admission provisoire)' },
  { value: 'N', label: 'Permis N (requérant d\'asile)' },
];

function formatCHF(amount: number): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(amount);
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <>{formatCHF(Math.round(displayValue))}</>;
}

function FloatingParticle({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div 
      className={cn(
        "absolute w-1 h-1 bg-primary/40 rounded-full animate-float pointer-events-none",
        className
      )}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <Sparkles 
      className={cn(
        "absolute w-4 h-4 text-primary/60 animate-pulse pointer-events-none",
        className
      )} 
    />
  );
}

export function BudgetCalculatorSection() {
  const [revenus, setRevenus] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [permit, setPermit] = useState<string>('');
  const [confirmNoPoursuites, setConfirmNoPoursuites] = useState(true); // Positive framing, pre-checked
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(() => {
    const revenusNum = parseFloat(revenus) || 0;
    const budgetNum = parseFloat(budget) || 0;
    
    if (revenusNum <= 0) {
      return null;
    }

    const budgetPossible = Math.floor(revenusNum / 3);
    const isBudgetOk = budgetNum <= budgetPossible;
    // Seuls les permis stables (suisse, C, B) sont considérés comme solvables
    const isPermitStable = ['suisse', 'C', 'B'].includes(permit);
    const hasPoursuites = !confirmNoPoursuites;
    // Pour être solvable : budget OK, pas de poursuites ET permis stable (ou pas encore sélectionné)
    const isSolvable = isBudgetOk && !hasPoursuites && (isPermitStable || !permit);

    const problems: string[] = [];
    if (!isBudgetOk && budgetNum > 0) {
      problems.push(`Ton budget demandé (${formatCHF(budgetNum)}) dépasse le maximum recommandé`);
    }
    if (hasPoursuites) {
      problems.push('Les poursuites sont un frein majeur pour les régies');
    }
    if (!isPermitStable && permit) {
      problems.push('Ton type de permis rend les candidatures très difficiles - les régies acceptent rarement ce statut');
    }

    return {
      budgetPossible,
      isSolvable,
      problems,
      isPermitStable,
      budgetDiff: budgetPossible - budgetNum,
    };
  }, [revenus, budget, permit, confirmNoPoursuites]);

  const handleCalculate = () => {
    if (revenus) {
      setShowResult(true);
    }
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-muted/10 via-background to-muted/10">
      {/* Premium animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated orbs */}
        <div className="absolute top-1/4 right-[10%] w-64 h-64 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl animate-float hidden md:block" />
        <div className="absolute bottom-1/4 left-[5%] w-80 h-80 bg-gradient-to-br from-success/15 to-success/5 rounded-full blur-3xl animate-float hidden md:block" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-pulse hidden md:block" />
        
        {/* Floating particles */}
        <FloatingParticle className="top-[20%] left-[15%] hidden md:block" delay={0} />
        <FloatingParticle className="top-[30%] right-[20%] hidden md:block" delay={0.5} />
        <FloatingParticle className="bottom-[25%] left-[25%] hidden md:block" delay={1} />
        <FloatingParticle className="top-[40%] left-[40%] hidden md:block" delay={1.5} />
        <FloatingParticle className="bottom-[35%] right-[15%] hidden md:block" delay={2} />
        
        {/* Sparkle decorations */}
        <SparkleIcon className="top-[15%] right-[25%] hidden md:block" />
        <SparkleIcon className="bottom-[20%] left-[20%] hidden md:block" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Premium section header */}
          <div className="text-center mb-10 md:mb-14 animate-fade-in">
            {/* Premium badge with shine effect */}
            <div className="relative inline-flex items-center gap-2 mb-4 group">
              <div className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-full px-5 py-2.5 border border-primary/30 shadow-lg shadow-primary/10">
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {/* Glow */}
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse" />
                <div className="relative flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary animate-bounce" style={{ animationDuration: '2s' }} />
                  <span className="text-primary font-semibold">Calculateur gratuit</span>
                  <Sparkles className="h-3 w-3 text-primary/70" />
                </div>
              </div>
              {/* Sparkle decorations around badge */}
              <span className="absolute -top-1 -right-1 text-primary/60 animate-pulse">✨</span>
              <span className="absolute -bottom-1 -left-1 text-primary/40 animate-pulse" style={{ animationDelay: '0.5s' }}>⭐</span>
            </div>
            
            {/* Animated gradient title */}
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]">
                Quel loyer peux-tu te permettre ?
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              Découvre ton budget maximum en 30 secondes
            </p>
          </div>

          {/* Premium calculator card */}
          <div className="relative group animate-fade-in">
            {/* Animated border gradient */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/50 via-success/50 to-primary/50 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/30 via-success/30 to-primary/30 rounded-2xl md:rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative glass-morphism rounded-2xl md:rounded-3xl border border-border/30 p-5 md:p-8 overflow-hidden backdrop-blur-xl bg-card/80">
              {/* Shine effect on card */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
              
              {/* Card floating particles */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-primary/30 rounded-full animate-float hidden md:block" />
              <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-success/40 rounded-full animate-float hidden md:block" style={{ animationDelay: '1s' }} />
              
              <div className="relative grid md:grid-cols-2 gap-6 md:gap-8">
                {/* Form */}
                <div className="space-y-5">
                  <div className="space-y-2 group/field">
                    <Label htmlFor="revenus" className="text-sm font-medium flex items-center gap-2">
                      Revenus mensuels nets (CHF)
                    </Label>
                    <div className="relative">
                      <Input
                        id="revenus"
                        type="number"
                        placeholder="Ex: 5500"
                        value={revenus}
                        onChange={(e) => {
                          setRevenus(e.target.value);
                          setShowResult(false);
                        }}
                        className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                      />
                      {/* Glow on focus */}
                      <div className="absolute inset-0 -z-10 rounded-md bg-primary/20 blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="space-y-2 group/field">
                    <Label htmlFor="budget" className="text-sm font-medium">
                      Budget souhaité (CHF/mois) <span className="text-muted-foreground">(optionnel)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="budget"
                        type="number"
                        placeholder="Ex: 1800"
                        value={budget}
                        onChange={(e) => {
                          setBudget(e.target.value);
                          setShowResult(false);
                        }}
                        className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                      />
                      <div className="absolute inset-0 -z-10 rounded-md bg-primary/20 blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="space-y-2 group/field">
                    <Label htmlFor="permit" className="text-sm font-medium">
                      Statut / Permis
                    </Label>
                    <div className="relative">
                      <Select value={permit} onValueChange={(v) => { setPermit(v); setShowResult(false); }}>
                        <SelectTrigger id="permit" className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50">
                          <SelectValue placeholder="Sélectionne ton statut" />
                        </SelectTrigger>
                        <SelectContent>
                          {permitTypes.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Positive framing for debt confirmation */}
                  <div className="flex items-start space-x-3 py-3 px-4 rounded-xl bg-green-500/5 border border-green-500/20">
                    <Checkbox 
                      id="no-poursuites-calc" 
                      checked={confirmNoPoursuites}
                      onCheckedChange={(checked) => { setConfirmNoPoursuites(checked as boolean); setShowResult(false); }}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="no-poursuites-calc" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                        Je confirme n'avoir aucune poursuite
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ni actes de défaut de bien en cours
                      </p>
                    </div>
                  </div>

                  {/* Premium calculate button */}
                  <div className="relative group/btn">
                    {/* Permanent glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/30 rounded-xl blur-md opacity-60 group-hover/btn:opacity-100 transition-opacity animate-pulse" />
                    <Button 
                      onClick={handleCalculate}
                      className="relative w-full h-12 text-base font-semibold overflow-hidden group-hover/btn:scale-[1.02] transition-transform duration-300"
                      disabled={!revenus}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                      <Calculator className="mr-2 h-5 w-5 group-hover/btn:animate-bounce" />
                      Calculer mon budget
                      <Sparkles className="ml-2 h-4 w-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </Button>
                  </div>
                </div>

                {/* Result */}
                <div className="flex items-center justify-center">
                  {!showResult ? (
                    <div className="text-center py-8 md:py-0 relative">
                      {/* Animated icon container */}
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        {/* Glow ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-muted/20 animate-pulse" />
                        <div className="absolute inset-2 rounded-full bg-muted/50 flex items-center justify-center backdrop-blur-sm">
                          <Calculator className="h-10 w-10 text-muted-foreground/50 animate-bounce" style={{ animationDuration: '3s' }} />
                        </div>
                        {/* Floating particles around */}
                        <div className="absolute -top-1 right-2 w-2 h-2 bg-primary/30 rounded-full animate-float" />
                        <div className="absolute bottom-0 -left-1 w-1.5 h-1.5 bg-primary/40 rounded-full animate-float" style={{ animationDelay: '1s' }} />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Remplis le formulaire pour voir ton résultat
                      </p>
                    </div>
                  ) : result ? (
                    <div className="w-full space-y-5 animate-scale-in">
                      {/* Premium budget result */}
                      <div className={cn(
                        "relative overflow-hidden rounded-2xl p-5 text-center group/result",
                        result.isSolvable 
                          ? 'bg-gradient-to-br from-success/20 via-success/10 to-success/5' 
                          : 'bg-gradient-to-br from-warning/20 via-warning/10 to-warning/5'
                      )}>
                        {/* Animated border */}
                        <div className={cn(
                          "absolute inset-0 rounded-2xl border-2 transition-all duration-300",
                          result.isSolvable ? 'border-success/40' : 'border-warning/40'
                        )} />
                        
                        {/* Glow effect */}
                        <div className={cn(
                          "absolute inset-0 blur-xl opacity-30",
                          result.isSolvable ? 'bg-success/30' : 'bg-warning/30'
                        )} />
                        
                        {/* Confetti/sparkles for success */}
                        {result.isSolvable && (
                          <>
                            <span className="absolute top-2 left-4 text-lg animate-bounce">🎉</span>
                            <span className="absolute top-3 right-6 text-sm animate-pulse">✨</span>
                            <span className="absolute bottom-3 left-8 text-sm animate-pulse" style={{ animationDelay: '0.3s' }}>⭐</span>
                          </>
                        )}
                        
                        <div className="relative">
                          <p className="text-sm text-muted-foreground mb-1">Budget maximum recommandé</p>
                          <p className={cn(
                            "text-3xl md:text-4xl font-bold",
                            result.isSolvable ? 'text-success' : 'text-warning'
                          )}>
                            <AnimatedNumber value={result.budgetPossible} />
                            <span className="text-lg font-normal text-muted-foreground">/mois</span>
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      {result.isSolvable ? (
                        <div className="space-y-4">
                          <div className="relative overflow-hidden flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/20 group/status">
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/10 to-transparent -translate-x-full group-hover/status:translate-x-full transition-transform duration-1000" />
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5 animate-bounce" style={{ animationDuration: '2s' }} />
                            <div className="relative">
                              <p className="font-medium text-success">Ton profil est solide !</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Avec nos experts, tu as toutes les chances de trouver rapidement.
                              </p>
                            </div>
                          </div>
                          
                          {/* CTA to form */}
                          <Button asChild className="w-full group">
                            <a href="#quickform">
                              <Sparkles className="mr-2 h-4 w-4" />
                              Recevoir ma shortlist gratuite
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {result.problems.map((problem, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-muted-foreground">{problem}</p>
                              </div>
                            ))}
                          </div>
                          
                          {/* CTA to form even for warnings */}
                          <Button asChild variant="outline" className="w-full group">
                            <a href="#quickform">
                              Parler à un expert
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </a>
                          </Button>
                        </div>
                      )}

                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Premium disclaimer */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative overflow-hidden rounded-xl p-4 bg-muted/30 backdrop-blur-sm border border-border/30">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Ce calcul est indicatif et basé sur la règle du tiers (loyer = 1/3 des revenus). 
                  Chaque situation est unique, nos experts peuvent t'aider à optimiser ton dossier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
