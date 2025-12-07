import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Handshake, TrendingUp, Eye, CreditCard, ArrowRight, Sparkles } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Commissions attractives',
    description: 'Jusqu\'à 10% sur chaque affaire conclue grâce à vos recommandations.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Eye,
    title: 'Suivi transparent',
    description: 'Suivez en temps réel l\'évolution de vos recommandations et commissions.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: CreditCard,
    title: 'Paiements rapides',
    description: 'Recevez vos commissions rapidement après la conclusion des affaires.',
    gradient: 'from-purple-500 to-pink-500',
  },
];

export function ApporteurSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-[10%] w-56 h-56 bg-gradient-to-tr from-green-500/15 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-[30%] w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Confetti/sparkle particles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Floating geometric shapes - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 right-[30%] w-24 h-24 border border-primary/20 rounded-xl rotate-45 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/3 left-[25%] w-16 h-16 border border-primary/15 rounded-full animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-6 relative overflow-hidden group">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Handshake className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Programme partenaire</span>
            </div>

            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Devenez <span className="gradient-text-animated">apporteur d'affaires</span>
              </h2>
              {/* Sparkles around title - hidden on mobile */}
              <Sparkles className="hidden md:block absolute -top-2 right-[20%] h-5 w-5 text-primary animate-pulse" />
              <Sparkles className="hidden md:block absolute top-1/2 -right-4 h-4 w-4 text-primary/70 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Vous connaissez des personnes à la recherche d'un logement ? 
              Recommandez-les et gagnez des commissions sur chaque affaire conclue.
            </p>

            {/* CTA with enhanced effects */}
            <div className="relative inline-block group">
              {/* Pulsing glow behind button */}
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-lg opacity-50 group-hover:opacity-80 transition-opacity animate-pulse" />
              <Button asChild size="lg" className="relative group/btn overflow-hidden">
                <Link to="/login">
                  {/* Shine effect on button */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  <Sparkles className="mr-2 h-5 w-5" />
                  Devenir partenaire
                  <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right content - Benefits with premium cards */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="relative rounded-xl p-6 animate-fade-in group"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Animated border gradient on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${benefit.gradient} animate-gradient-x`} />
                  <div className="absolute inset-[1px] rounded-xl bg-card" />
                </div>

                {/* Glass background */}
                <div className="absolute inset-0 glass-morphism rounded-xl" />

                {/* Floating particles on hover - hidden on mobile */}
                <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-1 h-1 bg-gradient-to-r ${benefit.gradient} rounded-full animate-float`}
                      style={{
                        top: `${20 + i * 20}%`,
                        left: `${15 + i * 20}%`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none rounded-xl" />

                <div className="flex gap-5 relative z-10">
                  <div className="flex-shrink-0 relative">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <benefit.icon className="h-7 w-7 text-white group-hover:animate-bounce" style={{ animationDuration: '0.6s', animationIterationCount: '1' }} />
                    </div>
                    {/* Glow effect */}
                    <div className={`absolute inset-0 w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} blur-xl opacity-0 group-hover:opacity-50 transition-opacity`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
