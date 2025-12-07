import { useState, useMemo } from 'react';
import { Calculator, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';

const permitTypes = [
  { value: 'suisse', label: 'Nationalité suisse' },
  { value: 'C', label: 'Permis C (établissement)' },
  { value: 'B', label: 'Permis B (séjour)' },
  { value: 'L', label: 'Permis L (courte durée)' },
  { value: 'G', label: 'Permis G (frontalier)' },
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

export function BudgetCalculatorSection() {
  const [revenus, setRevenus] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [permit, setPermit] = useState<string>('');
  const [hasPoursuites, setHasPoursuites] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(() => {
    const revenusNum = parseFloat(revenus) || 0;
    const budgetNum = parseFloat(budget) || 0;
    
    if (revenusNum <= 0) {
      return null;
    }

    // Budget possible = revenus / 3 (règle du tiers)
    const budgetPossible = Math.floor(revenusNum / 3);
    
    // Check solvability
    const isBudgetOk = budgetNum <= budgetPossible;
    const isPermitStable = ['suisse', 'C', 'B'].includes(permit);
    const isSolvable = isBudgetOk && !hasPoursuites;

    const problems: string[] = [];
    if (!isBudgetOk && budgetNum > 0) {
      problems.push(`Ton budget demandé (${formatCHF(budgetNum)}) dépasse le maximum recommandé`);
    }
    if (hasPoursuites) {
      problems.push('Les poursuites sont un frein majeur pour les régies');
    }
    if (!isPermitStable && permit) {
      problems.push('Ton type de permis peut compliquer certaines candidatures');
    }

    return {
      budgetPossible,
      isSolvable,
      problems,
      isPermitStable,
      budgetDiff: budgetPossible - budgetNum,
    };
  }, [revenus, budget, permit, hasPoursuites]);

  const handleCalculate = () => {
    if (revenus) {
      setShowResult(true);
    }
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-muted/10 via-background to-muted/10">
      {/* Background effects - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-80 h-80 bg-success/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-10 md:mb-14 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">Calculateur gratuit</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
              Quel loyer peux-tu te permettre ?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              Découvre ton budget maximum en 30 secondes
            </p>
          </div>

          {/* Calculator card */}
          <div className="glass-morphism rounded-2xl md:rounded-3xl border border-border/30 p-5 md:p-8 animate-fade-in">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* Form */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="revenus" className="text-sm font-medium">
                    Revenus mensuels nets (CHF)
                  </Label>
                  <Input
                    id="revenus"
                    type="number"
                    placeholder="Ex: 5500"
                    value={revenus}
                    onChange={(e) => {
                      setRevenus(e.target.value);
                      setShowResult(false);
                    }}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-sm font-medium">
                    Budget souhaité (CHF/mois) <span className="text-muted-foreground">(optionnel)</span>
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="Ex: 1800"
                    value={budget}
                    onChange={(e) => {
                      setBudget(e.target.value);
                      setShowResult(false);
                    }}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permit" className="text-sm font-medium">
                    Statut / Permis
                  </Label>
                  <Select value={permit} onValueChange={(v) => { setPermit(v); setShowResult(false); }}>
                    <SelectTrigger id="permit" className="h-12 text-base">
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

                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="poursuites" className="text-sm font-medium cursor-pointer">
                    Avez-vous des poursuites en cours ?
                  </Label>
                  <Switch
                    id="poursuites"
                    checked={hasPoursuites}
                    onCheckedChange={(v) => { setHasPoursuites(v); setShowResult(false); }}
                  />
                </div>

                <Button 
                  onClick={handleCalculate}
                  className="w-full h-12 text-base font-semibold"
                  disabled={!revenus}
                >
                  <Calculator className="mr-2 h-5 w-5" />
                  Calculer mon budget
                </Button>
              </div>

              {/* Result */}
              <div className="flex items-center justify-center">
                {!showResult ? (
                  <div className="text-center py-8 md:py-0">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                      <Calculator className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Remplis le formulaire pour voir ton résultat
                    </p>
                  </div>
                ) : result ? (
                  <div className="w-full space-y-5 animate-fade-in-scale">
                    {/* Budget possible */}
                    <div className={`rounded-2xl p-5 text-center ${
                      result.isSolvable 
                        ? 'bg-gradient-to-br from-success/20 to-success/5 border border-success/30' 
                        : 'bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30'
                    }`}>
                      <p className="text-sm text-muted-foreground mb-1">Budget maximum recommandé</p>
                      <p className={`text-3xl md:text-4xl font-bold ${
                        result.isSolvable ? 'text-success' : 'text-warning'
                      }`}>
                        {formatCHF(result.budgetPossible)}
                        <span className="text-lg font-normal text-muted-foreground">/mois</span>
                      </p>
                    </div>

                    {/* Status */}
                    {result.isSolvable ? (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-success">Ton profil est solide !</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Avec nos experts, tu as toutes les chances de trouver rapidement.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {result.problems.map((problem, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{problem}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    <Button asChild className="w-full h-12 text-base font-semibold group">
                      <Link to="/nouveau-mandat">
                        {result.isSolvable ? 'Démarre ta recherche' : 'Parle à un expert'}
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-6 max-w-2xl mx-auto">
            Ce calcul est indicatif et basé sur la règle du tiers (loyer = 1/3 des revenus). 
            Chaque situation est unique, nos experts peuvent t'aider à optimiser ton dossier.
          </p>
        </div>
      </div>
    </section>
  );
}