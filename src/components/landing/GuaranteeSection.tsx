import { Shield, Wallet, CheckCircle, RefreshCcw, Crown, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSearchType } from '@/contexts/SearchTypeContext';

function AnimatedValue({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {value}{suffix}
    </span>
  );
}

export function GuaranteeSection() {
  const { isAchat } = useSearchType();

  const pricingItemsLocation = [
    {
      icon: Wallet,
      label: 'Acompte',
      value: '300 CHF',
      description: '100% sécurisé',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: CheckCircle,
      label: 'Succès',
      value: '1 mois de loyer',
      description: 'Moins les 300 CHF déjà versés',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: RefreshCcw,
      label: 'Échec après 3 mois ?',
      value: 'Remboursement',
      description: 'Intégral. Sans condition.',
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  const pricingItemsAchat = [
    {
      icon: Wallet,
      label: 'Acompte',
      value: '2\'500 CHF',
      description: 'Déduit de la commission finale',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: CheckCircle,
      label: 'Commission',
      value: '1% du prix',
      description: 'De l\'achat, acompte déduit',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: RefreshCcw,
      label: 'Échec après 6 mois ?',
      value: 'Remboursement',
      description: 'Intégral des 2\'500 CHF',
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  const pricingItems = isAchat ? pricingItemsAchat : pricingItemsLocation;

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">💰 Tarification transparente</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {isAchat 
                ? 'Commission transparente de 1% 🏡'
                : <>Tellement confiant qu'on te <span className="text-primary">rembourse</span></>
              }
            </h2>
            <p className="text-muted-foreground text-lg">
              {isAchat 
                ? 'Acompte de 2\'500 CHF déduit de ta commission finale. Remboursé après 6 mois sans succès.'
                : 'Échec après 3 mois ? Remboursement intégral ! 💪'
              }
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {pricingItems.map((item, index) => (
              <div
                key={index}
                className="animate-fade-in group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative rounded-2xl p-6 border border-border/30 group-hover:border-primary/40 transition-all duration-300 h-full text-center bg-card/80 group-hover:shadow-lg">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <item.icon className="h-7 w-7 text-white" />
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
                    <AnimatedValue value={item.value} />
                  </p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Guarantee Box */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="max-w-xl mx-auto rounded-2xl p-6 border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-primary/20 border border-primary/30">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    🛡️ {isAchat ? 'ACCOMPAGNEMENT COMPLET' : 'GARANTIE SÉRÉNITÉ'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {isAchat ? (
                      <>
                        Mandat de <strong className="text-foreground">6 mois</strong> : on cherche activement ton bien idéal.
                        <br />
                        <strong className="text-foreground">Pas de bien trouvé ? Acompte de 2'500 CHF intégralement remboursé.</strong>
                      </>
                    ) : (
                      <>
                        Après ta shortlist personnalisée, tu peux nous confier ta recherche pendant <strong className="text-foreground">90 jours</strong>.
                        <br />
                        Pas de bail signé ? <strong className="text-foreground">Remboursement intégral. Sans condition.</strong>
                      </>
                    )}
                  </p>
                  <Button asChild variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10 group/btn">
                    <a href="/nouveau-mandat">
                      {isAchat ? 'Démarrer ma recherche d\'achat' : 'Découvrir le mandat 90 jours'}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Guarantee badge */}
          <div className="text-center animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="inline-flex flex-col items-center gap-3 bg-gradient-to-r from-primary/15 via-primary/25 to-primary/15 border-2 border-primary/40 rounded-2xl px-6 py-5">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-amber-500" />
                <span className="text-lg md:text-xl font-bold text-primary">
                  {isAchat ? 'Garantie remboursement 6 mois 🎯' : 'Garantie 100% remboursé 🎯'}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {isAchat 
                  ? '✓ Commission 1% • ✓ Acompte déduit • ✓ Remboursé si échec après 6 mois'
                  : '✓ Zéro condition cachée • ✓ Remboursement sous 7 jours'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
