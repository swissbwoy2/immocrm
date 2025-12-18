import { MapPin, CheckCircle, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const cantons = ["Vaud", "Genève", "Valais", "Fribourg", "Neuchâtel", "Jura"];

export function CoverageSection() {
  return (
    <section className="py-12 md:py-16 relative overflow-hidden bg-muted/20">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {/* Compact header */}
          <div className="inline-flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Couverture</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Toute la <span className="text-primary">Suisse Romande</span>
          </h2>
          
          {/* Cantons en ligne */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {cantons.map((canton) => (
              <div
                key={canton}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-border/40 hover:border-primary/30 transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{canton}</span>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
            ))}
          </div>
          
          {/* CTA */}
          <p className="text-muted-foreground mb-4">
            +50 agences partenaires • Accès aux offres exclusives
          </p>
          
          <Button asChild variant="outline" className="group">
            <Link to="/nouveau-mandat">
              Démarre ta recherche
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
