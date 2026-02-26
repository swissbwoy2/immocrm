import { Users } from 'lucide-react';

export function TestimonialVideoSection() {
  return (
    <section className="py-10 md:py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1.5 mb-4">
              <Users className="h-3 w-3" />
              <span>Témoignage clients</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Ils nous ont fait confiance 🤝
            </h2>
            <p className="text-sm text-muted-foreground">
              Découvrez l'expérience de nos clients en Suisse romande
            </p>
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden bg-muted shadow-lg border border-border/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <video
              className="w-full"
              controls
              preload="metadata"
              playsInline
            >
              <source src="/videos/temoignage-clients.mov" type="video/quicktime" />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
