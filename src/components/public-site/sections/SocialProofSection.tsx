import { Award, Users, Play } from 'lucide-react';

export function SocialProofSection() {
  return (
    <section id="avis" className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Stats badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-8 animate-fade-in">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 shadow-sm">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Experts relocation depuis 2016</span>
          </div>
        </div>

        {/* Google Reviews Widget */}
        <div className="max-w-5xl mx-auto mb-16 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="elfsight-app-6edfc233-2b60-465a-9be1-9b16cf306e85" />
        </div>

        {/* Video testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Testimonial video */}
          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1.5 mb-3">
                <Users className="h-3 w-3" />
                <span>Témoignage clients</span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Ils nous ont fait confiance 🤝</h3>
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden bg-muted shadow-lg border border-border/50">
              <iframe
                src="https://www.instagram.com/reel/DVPQODmCNBU/embed/"
                className="w-full border-0"
                style={{ height: '520px' }}
                allowFullScreen
                loading="lazy"
                title="Témoignage clients Immo-rama"
              />
            </div>
          </div>

          {/* Presentation video */}
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1.5 mb-3">
                <Play className="h-3 w-3" />
                <span>Vidéo de présentation</span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Notre service en 1 minute 🎬</h3>
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden bg-muted shadow-lg border border-border/50">
              <iframe
                src="https://www.instagram.com/reel/DUf-zVlDDDv/embed/"
                className="w-full border-0"
                style={{ height: '520px' }}
                allowFullScreen
                loading="lazy"
                title="Vidéo de présentation Immo-rama"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
