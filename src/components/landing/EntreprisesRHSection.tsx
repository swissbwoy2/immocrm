import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Users, BarChart3, Clock, ArrowRight, CheckCircle } from "lucide-react";
import b2bTeam from "@/assets/b2b-team.jpg";

const benefits = [
  {
    icon: Users,
    text: "Gestion complète du relogement (expats, mobilité interne, nouveaux recrutements)",
  },
  {
    icon: BarChart3,
    text: "Reporting et visibilité sur l'avancement des recherches",
  },
  {
    icon: Clock,
    text: "Gain de temps pour vos équipes RH et vos collaborateurs",
  },
  {
    icon: CheckCircle,
    text: "Conditions spéciales pour volumes",
  },
];

export function EntreprisesRHSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Clean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-background to-primary/[0.03]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="bg-card/80 rounded-full px-5 py-2.5 border border-primary/20">
                  <Building2 className="inline-block h-4 w-4 text-primary mr-2" />
                  <span className="text-sm font-semibold text-primary">Entreprises & RH</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-6">
                Offrez à vos équipes un <span className="text-primary">accompagnement relocation</span> clé en main
              </h2>

              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                Vos collaborateurs déménagent en Suisse romande ? On s'occupe de tout : recherche de logement, visites,
                dossier, jusqu'à la remise des clés. Vous vous concentrez sur l'essentiel.
              </p>

              {/* Benefits list */}
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 sm:gap-4 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <benefit.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <p className="text-sm sm:text-base text-foreground font-medium pt-1 sm:pt-2">{benefit.text}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                asChild
                size="lg"
                className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 w-full sm:w-auto"
              >
                <a
                  href="mailto:info@immo-rama.ch?subject=Demande de renseignements - Service Relocation Entreprises"
                  className="flex items-center justify-center"
                >
                  <span className="text-sm sm:text-base">Parler relocation</span>
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </a>
              </Button>
            </div>

            {/* Right content - Real image */}
            <div
              className="animate-fade-in hidden lg:block"
              style={{ animationDelay: "200ms" }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={b2bTeam} 
                  alt="Notre équipe de relocation professionnelle" 
                  className="w-full h-[400px] object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-xl font-bold text-white mb-1">Service B2B</p>
                  <p className="text-white/80 text-sm">Relocation professionnelle sur-mesure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
