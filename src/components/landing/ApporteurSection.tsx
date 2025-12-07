import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Handshake, TrendingUp, Eye, CreditCard, ArrowRight, Sparkles } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Jusqu\'à 500 CHF par client',
    description: 'Touche ta commission pour chaque personne relogée grâce à ta recommandation.',
  },
  {
    icon: Eye,
    title: 'Dashboard dédié',
    description: 'Suis tes recommandations et tes gains en temps réel depuis ton espace perso.',
  },
  {
    icon: CreditCard,
    title: 'Paiement sous 15 jours',
    description: 'Virement direct sur ton compte dès la conclusion de l\'affaire. Rapide et sans paperasse.',
  },
];

export function ApporteurSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-background to-primary/[0.05]" />

      {/* Subtle animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-[10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Subtle sparkles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${20 + i * 20}%`,
              left: `${15 + i * 25}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/20 animate-pulse" 
              style={{ animationDuration: `${3 + i}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 relative group mb-6">
              <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
                <Handshake className="inline-block h-4 w-4 text-primary mr-2" />
                <span className="text-sm font-semibold text-primary">Programme partenaire</span>
              </div>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Transforme ton réseau en <span className="text-primary">revenus passifs</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-lg">
              Tu connais quelqu'un qui galère à trouver un appart' ? 
              Envoie-le nous et touche ta commission. Simple comme bonjour.
            </p>

            <p className="text-base text-foreground font-medium mb-10">
              💡 Parfait pour : agents immobiliers, RH, expatriés, concierges, tout le monde !
            </p>

            {/* CTA */}
            <div className="relative inline-block group">
              <Button asChild size="lg" className="relative overflow-hidden shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all duration-300">
                <Link to="/login">
                  <Sparkles className="mr-2 h-5 w-5" />
                  <span>Devenir partenaire</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right content - Benefits */}
          <div className="space-y-6 md:space-y-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="relative rounded-2xl p-6 md:p-8 animate-fade-in group"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Glass background */}
                <div className="absolute inset-0 glass-morphism rounded-2xl border border-border/40 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/5 transition-all duration-300 bg-card/80" />

                <div className="flex gap-5 md:gap-6 relative z-10">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-all duration-300 border border-primary/20 group-hover:border-primary/30">
                      <benefit.icon className="h-8 w-8 md:h-9 md:w-9 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
