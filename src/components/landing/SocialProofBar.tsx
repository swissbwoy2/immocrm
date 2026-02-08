import { Users, Award } from 'lucide-react';

export function SocialProofBar() {
  return (
    <section className="py-6 md:py-8 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Stats badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 shadow-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              +500 familles relogées
            </span>
          </div>
          
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 shadow-sm">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Experts relocation depuis 2016
            </span>
          </div>
        </div>

        {/* Elfsight Google Reviews Widget */}
        <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div 
            className="elfsight-app-6edfc233-2b60-465a-9be1-9b16cf306e85" 
             
          />
        </div>
      </div>
    </section>
  );
}
