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

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl geo-shape-1" />
        <div className="absolute bottom-20 left-[10%] w-48 h-48 bg-gradient-to-tr from-primary/15 to-transparent rounded-full blur-3xl geo-shape-2" />
        <div className="absolute top-1/2 right-[30%] w-24 h-24 border border-primary/20 rounded-xl rotate-45 float-particle" />
        <div className="absolute bottom-1/3 left-[25%] w-16 h-16 border border-primary/15 rounded-full float-particle-delayed" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-6">
              <Handshake className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Programme partenaire</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Devenez <span className="gradient-text-animated">apporteur d'affaires</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Vous connaissez des personnes à la recherche d'un logement ? 
              Recommandez-les et gagnez des commissions sur chaque affaire conclue.
            </p>

            <Button asChild size="lg" className="group glow-breathe">
              <Link to="/login">
                <Sparkles className="mr-2 h-5 w-5" />
                Devenir partenaire
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Right content - Benefits with 3D cards */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="glass-morphism rounded-xl p-6 card-shine card-3d animate-fade-in group"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex gap-5">
                  <div className="flex-shrink-0 relative">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform icon-float`}>
                      <benefit.icon className="h-7 w-7 text-white" />
                    </div>
                    {/* Glow effect */}
                    <div className={`absolute inset-0 w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} blur-xl opacity-0 group-hover:opacity-40 transition-opacity`} />
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
