import { Shield } from 'lucide-react';

export function GuaranteeSection() {
  return (
    <section className="py-16 relative overflow-hidden bg-gradient-to-b from-background via-muted/10 to-background">
      {/* Subtle background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Guarantee badge */}
          <div className="animate-fade-in mb-6">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border-2 border-primary/50 rounded-full px-6 py-3 glow-breathe">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-lg md:text-xl font-bold text-primary">
                Acompte remboursé à 100% en cas d'échec*
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">*Après 3 mois de recherches</p>
          </div>
          
          {/* Commission info */}
          <div className="flex flex-wrap justify-center gap-4 text-sm animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="glass-morphism rounded-full px-5 py-3 border border-border/30">
              <span className="text-muted-foreground">Acompte : </span>
              <span className="font-semibold text-foreground">300 CHF</span>
            </div>
            <div className="glass-morphism rounded-full px-5 py-3 border border-border/30">
              <span className="text-muted-foreground">Succès : </span>
              <span className="font-semibold text-foreground">1 mois de loyer - 300 CHF</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
