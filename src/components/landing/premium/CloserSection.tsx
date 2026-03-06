import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

export function CloserSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Prêt à trouver votre logement ?
          </h2>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Rejoignez les +500 familles qui ont délégué leur recherche à nos experts. Résultat garanti ou remboursé.
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Acompte 300 CHF
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              90 jours garantis
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              Remboursé si échec
            </span>
          </div>

          {/* CTA principal */}
          <Button asChild size="lg" className="group shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 text-base md:text-lg px-8 md:px-12 py-6">
            <Link to="/nouveau-mandat">
              <Rocket className="h-5 w-5 mr-2" />
              Activer ma recherche maintenant
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          {/* CTA secondaire */}
          <div>
            <a
              href="#comment-ca-marche"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Voir comment ça marche
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
