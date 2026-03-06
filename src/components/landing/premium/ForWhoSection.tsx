import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, Target, Compass, ArrowRight } from 'lucide-react';

const profiles = [
  {
    icon: Clock,
    title: 'Vous manquez de temps',
    description: "Entre le travail, la famille et les obligations, vous n'avez pas le temps d'éplucher les annonces et d'appeler les régies.",
  },
  {
    icon: Target,
    title: 'Vous ne trouvez rien qui correspond',
    description: "Les annonces disparaissent en quelques heures. Vous arrivez toujours trop tard ou votre dossier n'est pas retenu.",
  },
  {
    icon: Compass,
    title: "Vous venez d'arriver en Suisse",
    description: "Vous ne connaissez pas encore le marché local, les régies, ni les pratiques. Vous avez besoin d'un guide.",
  },
];

export function ForWhoSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium mb-3">
            Pour qui ?
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Ce service est fait pour vous si…
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {profiles.map((p, i) => (
            <div
              key={i}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 text-center space-y-4 hover:border-primary/30 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10">
                <p.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button asChild variant="outline" size="lg" className="group border-primary/30 hover:border-primary">
            <Link to="/nouveau-mandat">
              Activer ma recherche
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
