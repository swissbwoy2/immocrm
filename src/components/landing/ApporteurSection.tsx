import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Handshake, TrendingUp, Eye, CreditCard, ArrowRight } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Commissions attractives',
    description: 'Jusqu\'à 10% sur chaque affaire conclue grâce à vos recommandations.',
  },
  {
    icon: Eye,
    title: 'Suivi transparent',
    description: 'Suivez en temps réel l\'évolution de vos recommandations et commissions.',
  },
  {
    icon: CreditCard,
    title: 'Paiements rapides',
    description: 'Recevez vos commissions rapidement après la conclusion des affaires.',
  },
];

export function ApporteurSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-6">
              <Handshake className="h-4 w-4" />
              <span className="text-sm font-medium">Programme partenaire</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Devenez apporteur d'affaires
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Vous connaissez des personnes à la recherche d'un logement ? 
              Recommandez-les et gagnez des commissions sur chaque affaire conclue.
            </p>

            <Button asChild size="lg" className="group">
              <Link to="/login">
                Devenir partenaire
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Right content - Benefits */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-6 card-interactive animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
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
