import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight } from 'lucide-react';

const steps = [
  { num: '01', title: 'Vous nous décrivez votre besoin', description: "En 2 minutes, remplissez le formulaire : zone, budget, type de bien, situation personnelle. C'est gratuit et sans engagement." },
  { num: '02', title: 'Votre agent dédié entre en action', description: "Il active son réseau, contacte les régies, filtre les annonces et vous propose uniquement les biens pertinents." },
  { num: '03', title: 'Vous visitez… ou nous visitons pour vous', description: "Quand vous êtes au travail, en vacances ou indisponible, nous visitons pour vous et vous faisons un retour complet. Dossier optimisé, candidature déposée, suivi auprès de la régie — vous n'avez qu'à choisir votre futur logement." },
];

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium mb-3">Comment ça marche</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">3 étapes simples</h2>
        </div>

        <div className="max-w-2xl mx-auto space-y-0">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-6 relative">
              {i < steps.length - 1 && <div className="absolute left-6 top-14 bottom-0 w-px bg-primary/20" />}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold z-10">{s.num}</div>
              <div className="pb-10">
                <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button asChild size="lg" className="group shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90">
            <Link to="/nouveau-mandat">
              <Rocket className="h-5 w-5 mr-2" />Activer ma recherche maintenant
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
