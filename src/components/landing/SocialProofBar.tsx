import { Star, Users, Award, Quote } from 'lucide-react';

const testimonials = [
  { text: "En 6 semaines, nous avions les clés.", author: "M.", city: "Lausanne" },
  { text: "Dossier validé du premier coup. Merci !", author: "S.", city: "Genève" },
  { text: "Je n'aurais jamais trouvé seul.", author: "A.", city: "Nyon" },
];

export function SocialProofBar() {
  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
      {/* Subtle background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1)_0%,transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Stats line */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-8 animate-fade-in">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 shadow-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              +500 familles relogées
            </span>
          </div>
          
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-amber-500/30 shadow-sm">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">4.8/5 sur Google</span>
          </div>
          
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50 shadow-sm">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Experts relocation depuis 2016
            </span>
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Quote className="absolute top-3 left-3 h-4 w-4 text-primary/30" />
              <p className="text-sm text-foreground italic pl-6 mb-2">
                "{testimonial.text}"
              </p>
              <p className="text-xs text-muted-foreground pl-6">
                – {testimonial.author}, {testimonial.city}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
