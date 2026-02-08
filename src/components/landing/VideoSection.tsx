import { Play } from 'lucide-react';

export function VideoSection() {
  return (
    <section className="py-10 md:py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Header */}
          <div className="mb-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1.5 mb-4">
              <Play className="h-3 w-3" />
              <span>Vidéo de présentation</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Découvrez notre service en 1 minute 🎬
            </h2>
            <p className="text-sm text-muted-foreground">
              Comment on vous aide à trouver votre bien idéal en Suisse romande
            </p>
          </div>

          {/* Instagram Reel Embed */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-muted shadow-lg border border-border/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
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
    </section>
  );
}
