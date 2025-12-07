import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Handshake, TrendingUp, Eye, CreditCard, ArrowRight, Sparkles, Star, Zap } from 'lucide-react';

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
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Premium animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute inset-0 mesh-gradient opacity-60" />

      {/* Animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-48 h-48 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-[10%] w-64 h-64 bg-gradient-to-tr from-green-500/15 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-[30%] w-40 h-40 bg-gradient-to-br from-purple-500/12 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/4 left-[20%] w-36 h-36 bg-gradient-to-r from-blue-500/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>

      {/* Confetti/sparkle particles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/40 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.25}s` }}
            />
          </div>
        ))}
        {[...Array(6)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Star 
              className="h-2 w-2 text-primary/30 animate-float" 
              style={{ animationDuration: `${3 + Math.random() * 2}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>

      {/* Floating geometric shapes - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 right-[30%] w-28 h-28 border-2 border-primary/20 rounded-xl rotate-45 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/3 left-[25%] w-20 h-20 border-2 border-primary/15 rounded-full animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/4 right-[15%] w-16 h-16 border border-primary/10 rounded-lg rotate-12 animate-pulse" style={{ animationDuration: '4s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 relative group mb-6">
              {/* Glow behind badge */}
              <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="relative glass-morphism rounded-full px-5 py-2.5 overflow-hidden border border-primary/20">
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Handshake className="inline-block h-4 w-4 text-primary mr-2" />
                <span className="text-sm font-semibold text-primary">Programme partenaire</span>
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-pulse" />
              </div>
            </div>

            <div className="relative mb-6">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Devenez <span className="gradient-text-animated">apporteur d'affaires</span>
              </h2>
              {/* Sparkles around title - hidden on mobile */}
              <Sparkles className="hidden md:block absolute -top-3 right-[15%] h-6 w-6 text-primary animate-pulse" />
              <Sparkles className="hidden md:block absolute top-1/2 -right-6 h-5 w-5 text-primary/70 animate-pulse" style={{ animationDelay: '0.5s' }} />
              <Star className="hidden md:block absolute -bottom-2 right-[25%] h-4 w-4 text-primary/50 animate-float" />
            </div>
            
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg">
              Vous connaissez des personnes à la recherche d'un logement ? 
              Recommandez-les et gagnez des commissions sur chaque affaire conclue.
            </p>

            {/* CTA with enhanced effects */}
            <div className="relative inline-block group">
              {/* Pulsing glow behind button */}
              <div className="absolute -inset-2 bg-primary/40 blur-xl rounded-xl opacity-50 group-hover:opacity-80 transition-opacity animate-pulse" style={{ animationDuration: '2s' }} />
              
              {/* Pulse rings */}
              <div className="absolute -inset-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 rounded-xl border-2 border-primary/30 animate-ping" style={{ animationDuration: '1.5s' }} />
              </div>
              
              <Button asChild size="lg" className="relative group/btn overflow-hidden shadow-xl shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300">
                <Link to="/login">
                  {/* Shine effect on button */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  <Sparkles className="mr-2 h-5 w-5 relative z-10" />
                  <span className="relative z-10">Devenir partenaire</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform relative z-10" />
                </Link>
              </Button>
              
              {/* Sparkle on hover */}
              <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            </div>
          </div>

          {/* Right content - Benefits with premium cards */}
          <div className="space-y-6 md:space-y-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="relative rounded-2xl p-6 md:p-8 animate-fade-in group"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Animated border gradient on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${benefit.gradient} animate-gradient-x`} />
                  <div className="absolute inset-[2px] rounded-2xl bg-card" />
                </div>

                {/* Glow effect on hover */}
                <div className={`absolute -inset-2 bg-gradient-to-r ${benefit.gradient} rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl`} />

                {/* Glass background */}
                <div className="absolute inset-0 glass-morphism rounded-2xl border border-border/30 group-hover:border-transparent transition-all duration-300" />

                {/* Floating particles on hover - hidden on mobile */}
                <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-1.5 h-1.5 bg-gradient-to-r ${benefit.gradient} rounded-full animate-float`}
                      style={{
                        top: `${18 + i * 16}%`,
                        left: `${12 + i * 18}%`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none rounded-2xl" />

                <div className="flex gap-5 md:gap-6 relative z-10">
                  <div className="flex-shrink-0 relative">
                    {/* Pulsing ring */}
                    <div className={`absolute inset-0 w-16 h-16 md:w-18 md:h-18 rounded-xl bg-gradient-to-br ${benefit.gradient} opacity-30 group-hover:scale-125 group-hover:opacity-0 transition-all duration-500`} />
                    <div className={`w-16 h-16 md:w-18 md:h-18 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <benefit.icon className="h-8 w-8 md:h-9 md:w-9 text-white" />
                    </div>
                    {/* Glow effect */}
                    <div className={`absolute inset-0 w-16 h-16 md:w-18 md:h-18 rounded-xl bg-gradient-to-br ${benefit.gradient} blur-xl opacity-0 group-hover:opacity-60 transition-opacity`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
                      {benefit.title}
                      <Sparkles className="h-4 w-4 text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>

                {/* Bottom gradient accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${benefit.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
