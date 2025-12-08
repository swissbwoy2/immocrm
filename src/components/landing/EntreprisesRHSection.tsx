import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Users, BarChart3, Clock, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

const benefits = [
  {
    icon: Users,
    text: 'Gestion complète du relogement (expats, mobilité interne, nouveaux recrutements)',
  },
  {
    icon: BarChart3,
    text: 'Reporting et visibilité sur l\'avancement des recherches',
  },
  {
    icon: Clock,
    text: 'Gain de temps pour vos équipes RH et vos collaborateurs',
  },
  {
    icon: CheckCircle,
    text: 'Conditions spéciales pour volumes',
  },
];

export function EntreprisesRHSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-background to-primary/[0.03]" />

      {/* Subtle animated orbs */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-primary/8 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 relative group mb-6">
                <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
                  <Building2 className="inline-block h-4 w-4 text-primary mr-2" />
                  <span className="text-sm font-semibold text-primary">Entreprises & RH</span>
                </div>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                Offrez à vos équipes un <span className="text-primary">accompagnement relocation</span> clé en main
              </h2>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Vos collaborateurs déménagent en Suisse romande ? On s'occupe de tout : 
                recherche de logement, visites, dossier, jusqu'à la remise des clés. 
                Vous vous concentrez sur l'essentiel.
              </p>

              {/* Benefits list */}
              <div className="space-y-4 mb-10">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-foreground font-medium pt-2">
                      {benefit.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="group shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                  <a href="mailto:entreprises@immo-rama.ch?subject=Demande de renseignements - Service Relocation Entreprises">
                    <Sparkles className="mr-2 h-5 w-5" />
                    <span>Parler relocation pour mes collaborateurs</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Right content - Visual */}
            <div className="animate-fade-in hidden lg:flex items-center justify-center" style={{ animationDelay: '200ms' }}>
              <div className="relative">
                {/* Decorative circles */}
                <div className="absolute -inset-8 bg-primary/5 rounded-full blur-2xl" />
                <div className="relative w-80 h-80 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/10">
                  <div className="text-center p-8">
                    <Building2 className="h-20 w-20 text-primary mx-auto mb-6" />
                    <p className="text-2xl font-bold text-foreground mb-2">Service B2B</p>
                    <p className="text-muted-foreground">Relocation professionnelle</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
