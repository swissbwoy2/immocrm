import { Check, X, ArrowRight, Coins, PiggyBank } from 'lucide-react';

export function VendeurZeroCommissionSection() {
  const comparisonExample = {
    prixVente: 800000,
    commissionClassique: 24000, // 3%
    commissionImmoRama: 0,
  };

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Coins className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-500">Modèle Révolutionnaire</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Gardez <span className="text-emerald-500">100%</span> de votre prix de vente
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Notre modèle est unique : la commission est incluse dans le prix acheteur, 
            pas dans le vôtre. Vous fixez votre prix net, vous le gardez intégralement.
          </p>
        </div>

        {/* Visual comparison */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Classic agency */}
            <div className="relative p-8 rounded-3xl bg-card border border-border/50 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Agence classique</h3>
                    <p className="text-sm text-muted-foreground">Commission 2-4%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Prix de vente</p>
                    <p className="text-2xl font-bold">{comparisonExample.prixVente.toLocaleString()} CHF</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-sm text-red-400 mb-1">Commission agence (3%)</p>
                    <p className="text-2xl font-bold text-red-500">- {comparisonExample.commissionClassique.toLocaleString()} CHF</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Vous recevez</p>
                    <p className="text-2xl font-bold">{(comparisonExample.prixVente - comparisonExample.commissionClassique).toLocaleString()} CHF</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Immo-rama */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-primary/10 border-2 border-emerald-500/30 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="absolute -top-2 -right-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold rounded-full shadow-lg">
                RECOMMANDÉ
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Immo-rama.ch</h3>
                    <p className="text-sm text-emerald-500 font-medium">0% commission vendeur</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-card/50">
                    <p className="text-sm text-muted-foreground mb-1">Prix de vente (votre prix net)</p>
                    <p className="text-2xl font-bold">{comparisonExample.prixVente.toLocaleString()} CHF</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-sm text-emerald-500 mb-1">Commission vendeur</p>
                    <p className="text-2xl font-bold text-emerald-500">0 CHF</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-primary/20 border border-emerald-500/30">
                    <p className="text-sm text-emerald-400 mb-1">Vous recevez</p>
                    <p className="text-3xl font-bold text-emerald-500">{comparisonExample.prixVente.toLocaleString()} CHF</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Savings highlight */}
          <div className="text-center p-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-emerald-500/10 border border-emerald-500/20">
            <div className="inline-flex items-center gap-3 mb-4">
              <PiggyBank className="w-8 h-8 text-emerald-500" />
              <span className="text-2xl md:text-3xl font-bold">
                Vous économisez <span className="text-emerald-500">{comparisonExample.commissionClassique.toLocaleString()} CHF</span>
              </span>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Sur une vente à {comparisonExample.prixVente.toLocaleString()} CHF, vous gardez l'intégralité de votre prix. 
              La commission est payée par l'acheteur et incluse dans son budget.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Frais cachés : AUCUN</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Prix négocié : FIXE</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">L'acheteur paie la commission</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
