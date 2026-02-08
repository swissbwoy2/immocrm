import { useState, useMemo, useEffect } from 'react';
import { Calculator, CheckCircle, AlertTriangle, ArrowRight, Info, ShieldCheck, Landmark, Home, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useSearchType } from '@/contexts/SearchTypeContext';

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

// Property types for purchase
const propertyTypes = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison / Villa' },
  { value: 'immeuble', label: 'Immeuble de rendement' },
  { value: 'terrain', label: 'Terrain à bâtir' },
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



export function BudgetCalculatorSection() {
  const { isAchat } = useSearchType();
  
  // Location states
  const [revenus, setRevenus] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [permit, setPermit] = useState<string>('');
  const [confirmNoPoursuites, setConfirmNoPoursuites] = useState(true);
  
  // Achat states
  const [revenusAchat, setRevenusAchat] = useState<string>('');
  const [apport, setApport] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  
  const [showResult, setShowResult] = useState(false);

  // Location calculation
  const resultLocation = useMemo(() => {
    const revenusNum = parseFloat(revenus) || 0;
    const budgetNum = parseFloat(budget) || 0;
    
    if (revenusNum <= 0) return null;

    const budgetPossible = Math.floor(revenusNum / 3);
    const isBudgetOk = budgetNum <= budgetPossible;
    const isPermitStable = ['suisse', 'C', 'B'].includes(permit);
    const hasPoursuites = !confirmNoPoursuites;
    const isSolvable = isBudgetOk && !hasPoursuites && (isPermitStable || !permit);

    const problems: string[] = [];
    if (!isBudgetOk && budgetNum > 0) {
      problems.push(`Ton budget demandé (${formatCHF(budgetNum)}) dépasse le maximum recommandé`);
    }
    if (hasPoursuites) {
      problems.push('Les poursuites sont un frein majeur pour les régies');
    }
    if (!isPermitStable && permit) {
      problems.push('Ton type de permis rend les candidatures très difficiles');
    }

    return {
      budgetPossible,
      isSolvable,
      problems,
      isPermitStable,
      budgetDiff: budgetPossible - budgetNum,
    };
  }, [revenus, budget, permit, confirmNoPoursuites]);

  // Achat calculation (Swiss mortgage rules)
  const resultAchat = useMemo(() => {
    const revenusNum = parseFloat(revenusAchat) || 0;
    const apportNum = parseFloat(apport) || 0;
    
    if (revenusNum <= 0 && apportNum <= 0) return null;

    // Swiss rules: max 33% of annual income for charges (5% of property value = theoretical charges)
    const revenusAnnuels = revenusNum * 12;
    const chargesMaxAnnuelles = revenusAnnuels * 0.33;
    const prixMaxParRevenus = chargesMaxAnnuelles / 0.05;

    // Minimum 20% down payment
    const prixMaxParApport = apportNum / 0.20;

    // The limiting factor is the smaller of the two
    const prixMax = Math.min(prixMaxParRevenus || Infinity, prixMaxParApport || Infinity);
    const empruntMax = prixMax * 0.80;

    const problems: string[] = [];
    let isSolvable = true;

    if (apportNum < 100000) {
      problems.push('Apport inférieur à CHF 100\'000 - difficile d\'obtenir un prêt');
      isSolvable = false;
    }

    if (revenusNum > 0 && prixMaxParRevenus < prixMaxParApport) {
      problems.push('Tes revenus limitent ta capacité d\'emprunt (charges > 33%)');
    }

    if (apportNum > 0 && prixMaxParApport < prixMaxParRevenus && revenusNum > 0) {
      problems.push('Ton apport limite le prix d\'achat (min 20% de fonds propres)');
    }

    return {
      prixMax: prixMax === Infinity ? 0 : prixMax,
      empruntMax: empruntMax === Infinity ? 0 : empruntMax,
      apportMin: prixMax === Infinity ? 0 : prixMax * 0.20,
      isSolvable: isSolvable && prixMax > 0,
      problems,
      limitingFactor: prixMaxParRevenus < prixMaxParApport ? 'revenus' : 'apport',
    };
  }, [revenusAchat, apport]);

  const handleCalculate = () => {
    if (isAchat ? (revenusAchat || apport) : revenus) {
      setShowResult(true);
    }
  };

  const resetForm = () => {
    setShowResult(false);
  };

  // Dynamic content
  const content = {
    title: isAchat ? "Quel bien peux-tu te permettre ?" : "Quel loyer peux-tu te permettre ?",
    subtitle: isAchat ? "Estime ta capacité d'achat en 30 secondes" : "Découvre ton budget maximum en 30 secondes",
    disclaimer: isAchat 
      ? "Ce calcul est indicatif, basé sur les critères bancaires suisses (charges max 33%, fonds propres min 20%). Chaque banque a ses propres critères."
      : "Ce calcul est indicatif et basé sur la règle du tiers (loyer = 1/3 des revenus). Chaque situation est unique, nos experts peuvent t'aider à optimiser ton dossier.",
  };

  const result = isAchat ? resultAchat : resultLocation;

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-muted/10 via-background to-muted/10">



      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Premium section header */}
          <div className="text-center mb-10 md:mb-14 animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="bg-primary/10 rounded-full px-5 py-2.5 border border-primary/20">
                <div className="flex items-center gap-2">
                  {isAchat ? (
                    <Landmark className="h-4 w-4 text-primary" />
                  ) : (
                    <Calculator className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-primary font-semibold">Calculateur gratuit</span>
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold mb-3 text-foreground">
              {content.title}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              {content.subtitle}
            </p>
          </div>


          {/* Calculator card */}
          <div className="relative animate-fade-in">
            <div className="rounded-2xl md:rounded-3xl border border-border/30 p-5 md:p-8 bg-card/80">
              <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                {/* Form */}
                <div className="space-y-5">
                  {isAchat ? (
                    // ACHAT Form
                    <>
                      <div className="space-y-2 group/field">
                        <Label htmlFor="revenus-achat" className="text-sm font-medium flex items-center gap-2">
                          <PiggyBank className="h-4 w-4 text-muted-foreground" />
                          Revenus mensuels nets du ménage (CHF)
                        </Label>
                        <div className="relative">
                          <Input
                            id="revenus-achat"
                            type="number"
                            placeholder="Ex: 12000"
                            value={revenusAchat}
                            onChange={(e) => { setRevenusAchat(e.target.value); resetForm(); }}
                            className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                          />
                          <div className="absolute inset-0 -z-10 rounded-md bg-primary/20 blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      <div className="space-y-2 group/field">
                        <Label htmlFor="apport" className="text-sm font-medium flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-muted-foreground" />
                          Apport personnel / Fonds propres (CHF)
                        </Label>
                        <div className="relative">
                          <Input
                            id="apport"
                            type="number"
                            placeholder="Ex: 200000"
                            value={apport}
                            onChange={(e) => { setApport(e.target.value); resetForm(); }}
                            className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                          />
                          <div className="absolute inset-0 -z-10 rounded-md bg-primary/20 blur-md opacity-0 group-focus-within/field:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground">Minimum 20% du prix d'achat requis</p>
                      </div>

                      <div className="space-y-2 group/field">
                        <Label htmlFor="property-type" className="text-sm font-medium flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          Type de bien recherché
                        </Label>
                        <div className="relative">
                          <Select value={propertyType} onValueChange={(v) => { setPropertyType(v); }}>
                            <SelectTrigger id="property-type" className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50">
                              <SelectValue placeholder="Sélectionne le type" />
                            </SelectTrigger>
                            <SelectContent>
                              {propertyTypes.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  ) : (
                    // LOCATION Form
                    <>
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
                            onChange={(e) => { setRevenus(e.target.value); resetForm(); }}
                            className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                          />
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
                            onChange={(e) => { setBudget(e.target.value); resetForm(); }}
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
                          <Select value={permit} onValueChange={(v) => { setPermit(v); resetForm(); }}>
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

                      <div className="flex items-start space-x-3 py-3 px-4 rounded-xl bg-green-500/5 border border-green-500/20">
                        <Checkbox 
                          id="no-poursuites-calc" 
                          checked={confirmNoPoursuites}
                          onCheckedChange={(checked) => { setConfirmNoPoursuites(checked as boolean); resetForm(); }}
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
                    </>
                  )}

                  <div>
                    <Button 
                      onClick={handleCalculate}
                      className="w-full h-12 text-base font-semibold"
                      disabled={isAchat ? (!revenusAchat && !apport) : !revenus}
                    >
                      {isAchat ? (
                        <Landmark className="mr-2 h-5 w-5" />
                      ) : (
                        <Calculator className="mr-2 h-5 w-5" />
                      )}
                      {isAchat ? "Calculer ma capacité d'achat" : "Calculer mon budget"}
                    </Button>
                  </div>

                </div>

                {/* Result */}
                <div className="flex items-center justify-center">
                  {!showResult ? (
                    <div className="text-center py-8 md:py-0 relative">
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-muted/20 animate-pulse" />
                        <div className="absolute inset-2 rounded-full bg-muted/50 flex items-center justify-center backdrop-blur-sm">
                          {isAchat ? (
                            <Home className="h-10 w-10 text-muted-foreground/50 animate-bounce" style={{ animationDuration: '3s' }} />
                          ) : (
                            <Calculator className="h-10 w-10 text-muted-foreground/50 animate-bounce" style={{ animationDuration: '3s' }} />
                          )}
                        </div>
                        <div className="absolute -top-1 right-2 w-2 h-2 bg-primary/30 rounded-full animate-float" />
                        <div className="absolute bottom-0 -left-1 w-1.5 h-1.5 bg-primary/40 rounded-full animate-float" style={{ animationDelay: '1s' }} />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Remplis le formulaire pour voir ton résultat
                      </p>
                    </div>
                  ) : result ? (
                    <div className="w-full space-y-5 animate-scale-in">
                      {/* Premium result */}
                      <div className={cn(
                        "relative overflow-hidden rounded-2xl p-5 text-center group/result",
                        result.isSolvable 
                          ? 'bg-gradient-to-br from-success/20 via-success/10 to-success/5' 
                          : 'bg-gradient-to-br from-warning/20 via-warning/10 to-warning/5'
                      )}>
                        <div className={cn(
                          "absolute inset-0 rounded-2xl border-2 transition-all duration-300",
                          result.isSolvable ? 'border-success/40' : 'border-warning/40'
                        )} />
                        
                        <div className={cn(
                          "absolute inset-0 blur-xl opacity-30",
                          result.isSolvable ? 'bg-success/30' : 'bg-warning/30'
                        )} />
                        
                        {result.isSolvable && (
                          <>
                            <span className="absolute top-2 left-4 text-lg animate-bounce">🎉</span>
                            <span className="absolute top-3 right-6 text-sm animate-pulse">✨</span>
                            <span className="absolute bottom-3 left-8 text-sm animate-pulse" style={{ animationDelay: '0.3s' }}>⭐</span>
                          </>
                        )}
                        
                        <div className="relative">
                          {isAchat && resultAchat ? (
                            <>
                              <p className="text-sm text-muted-foreground mb-1">Prix d'achat maximum estimé</p>
                              <p className={cn(
                                "text-3xl md:text-4xl font-bold",
                                result.isSolvable ? 'text-success' : 'text-warning'
                              )}>
                                <AnimatedNumber value={resultAchat.prixMax} />
                              </p>
                              {resultAchat.empruntMax > 0 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Capacité d'emprunt : <span className="font-semibold">{formatCHF(resultAchat.empruntMax)}</span> (80%)
                                </p>
                              )}
                            </>
                          ) : resultLocation ? (
                            <>
                              <p className="text-sm text-muted-foreground mb-1">Budget maximum recommandé</p>
                              <p className={cn(
                                "text-3xl md:text-4xl font-bold",
                                result.isSolvable ? 'text-success' : 'text-warning'
                              )}>
                                <AnimatedNumber value={resultLocation.budgetPossible} />
                                <span className="text-lg font-normal text-muted-foreground">/mois</span>
                              </p>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Status */}
                      {result.isSolvable ? (
                        <div className="space-y-4">
                          <div className="relative overflow-hidden flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/20 group/status">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/10 to-transparent -translate-x-full group-hover/status:translate-x-full transition-transform duration-1000" />
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5 animate-bounce" style={{ animationDuration: '2s' }} />
                            <div className="relative">
                              <p className="font-medium text-success">
                                {isAchat ? "Ta capacité d'achat est solide !" : "Ton profil est solide !"}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {isAchat 
                                  ? "Avec nos experts, trouve le bien idéal dans ton budget."
                                  : "Avec nos experts, tu as toutes les chances de trouver rapidement."}
                              </p>
                            </div>
                          </div>
                          
                          <Button asChild className="w-full group">
                            <a href="#quickform">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {isAchat ? "Trouver mon bien" : "Recevoir ma shortlist gratuite"}
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
                  {content.disclaimer}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
