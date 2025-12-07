import { Shield, Wallet, CheckCircle, RefreshCcw, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

// Animated number component
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
  const pricingItems = [
    {
      icon: Wallet,
      label: 'Pour démarrer',
      value: '300 CHF',
      description: 'Remboursables à 100%',
      gradient: 'from-blue-500 to-cyan-500',
      glowColor: 'rgba(59, 130, 246, 0.3)',
    },
    {
      icon: CheckCircle,
      label: 'En cas de succès',
      value: '1 mois de loyer',
      description: '- les 300 CHF déjà versés',
      gradient: 'from-green-500 to-emerald-500',
      glowColor: 'rgba(34, 197, 94, 0.3)',
    },
    {
      icon: RefreshCcw,
      label: 'Pas trouvé après 3 mois ?',
      value: '0 CHF',
      description: 'On te rembourse tout.',
      gradient: 'from-amber-500 to-orange-500',
      glowColor: 'rgba(245, 158, 11, 0.3)',
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background">
      {/* Premium background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Animated orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse hidden md:block" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-primary/10 rounded-full blur-2xl animate-pulse hidden md:block" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        
        {/* Floating sparkles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute hidden md:block"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Sparkles 
              className="h-4 w-4 text-primary/30 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.3}s` }}
            />
          </div>
        ))}

        {/* Star decorations */}
        <Star className="absolute top-[15%] left-[15%] h-5 w-5 text-amber-500/30 animate-pulse hidden lg:block" style={{ animationDuration: '3s' }} />
        <Star className="absolute bottom-[20%] right-[15%] h-4 w-4 text-amber-500/30 animate-pulse hidden lg:block" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section header - Premium style */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4 relative overflow-hidden group">
              {/* Shine effect */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="text-primary font-medium relative z-10">💰 Zéro risque financier</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              On prend le risque <span className="gradient-text-animated">à ta place</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Tellement confiant qu'on te rembourse si on échoue
            </p>
          </div>

          {/* Pricing cards - Premium style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {pricingItems.map((item, index) => (
              <div
                key={index}
                className="animate-fade-in group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Animated border gradient */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                
                <div className="relative glass-morphism rounded-2xl p-6 border border-border/30 group-hover:border-primary/50 transition-all duration-300 h-full text-center bg-background/80 overflow-hidden group-hover:shadow-xl" style={{ boxShadow: `0 0 0 0 ${item.glowColor}` }}>
                  {/* Shine effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                  
                  {/* Glow effect on hover */}
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ boxShadow: `0 0 40px ${item.glowColor}, inset 0 0 40px ${item.glowColor.replace('0.3', '0.1')}` }}
                  />

                  {/* Icon with bounce animation */}
                  <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {/* Glow behind icon */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.gradient} blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
                    <item.icon className="h-7 w-7 text-white relative z-10 group-hover:animate-bounce" style={{ animationDuration: '1s', animationIterationCount: '1' }} />
                  </div>

                  {/* Label */}
                  <p className="text-sm text-muted-foreground mb-2 relative z-10">{item.label}</p>

                  {/* Value with glow effect */}
                  <p className="text-xl md:text-2xl font-bold text-foreground mb-1 relative z-10 group-hover:text-primary transition-colors duration-300">
                    <AnimatedValue value={item.value} />
                  </p>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground relative z-10">
                    {item.description}
                  </p>
                  
                  {/* Floating particle on hover */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Sparkles className="h-4 w-4 text-primary/50 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Guarantee badge - Premium celebration style */}
          <div className="text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="relative inline-flex flex-col items-center gap-3 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border-2 border-primary/50 rounded-2xl px-6 py-5 glow-breathe group overflow-hidden">
              {/* Animated confetti particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-primary/60 rounded-full animate-ping"
                    style={{
                      top: `${20 + Math.random() * 60}%`,
                      left: `${10 + Math.random() * 80}%`,
                      animationDuration: `${1 + Math.random()}s`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary relative z-10 animate-pulse" />
                <span className="text-lg md:text-xl font-bold text-primary relative z-10">
                  Garantie 100% remboursé en cas d'échec
                </span>
                <Sparkles className="h-5 w-5 text-amber-500 relative z-10 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
              
              <p className="text-sm text-muted-foreground relative z-10">
                ✓ Aucune condition cachée • ✓ Remboursement sous 7 jours
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
