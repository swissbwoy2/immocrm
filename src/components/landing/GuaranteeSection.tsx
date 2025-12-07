import { Shield, Wallet, CheckCircle, RefreshCcw } from 'lucide-react';

export function GuaranteeSection() {
  const pricingItems = [
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
      description: '- les 300 CHF déjà versés',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: RefreshCcw,
      label: 'Échec après 3 mois ?',
      value: 'Remboursement intégral !',
      description: 'Garanti sans conditions',
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <span className="text-primary font-medium">💰 Tarification transparente</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Pas de surprise, tout est{' '}
              <span className="gradient-text-animated">clair et sécurisé</span>
            </h2>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {pricingItems.map((item, index) => (
              <div
                key={index}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="glass-morphism rounded-2xl p-6 border border-border/30 hover:border-primary/50 transition-all duration-300 h-full text-center">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-4`}>
                    <item.icon className="h-7 w-7 text-white" />
                  </div>

                  {/* Label */}
                  <p className="text-sm text-muted-foreground mb-2">{item.label}</p>

                  {/* Value */}
                  <p className="text-xl md:text-2xl font-bold text-foreground mb-1">
                    {item.value}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Guarantee badge */}
          <div className="text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border-2 border-primary/50 rounded-full px-6 py-4 glow-breathe">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg md:text-xl font-bold text-primary">
                Garantie 100% remboursé en cas d'échec
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
