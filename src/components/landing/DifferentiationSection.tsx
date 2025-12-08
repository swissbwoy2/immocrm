import { CheckCircle, X, Minus, Sparkles, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const comparisonData = [
  {
    aspect: "Travaille pour",
    logisorama: "Toi, le locataire",
    agence: "Ne vont pas chercher pour toi",
    solo: "Toi seul (sans aide)",
  },
  {
    aspect: "Veille des annonces",
    logisorama: "IA + automatisation 24/7",
    agence: "Manuelle, priorité interne",
    solo: "Manuelle, épuisante",
  },
  {
    aspect: "Suivi temps réel",
    logisorama: "Dashboard client/candidat dédié",
    agence: "Uniquement pour les locataires",
    solo: "Aucun",
  },
  {
    aspect: "Optimisation dossier",
    logisorama: "Dossier analysé par des pros",
    agence: "Minimal",
    solo: "Variable, souvent incomplet",
  },
  {
    aspect: "Garantie résultat",
    logisorama: "100% remboursé si échec",
    agence: "Aucune",
    solo: "Aucune",
  },
];

export function DifferentiationSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/10 via-primary/[0.03] to-muted/10" />

      {/* Subtle animated orbs - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-[10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-10 right-[10%] w-56 h-56 bg-primary/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Subtle sparkles - hidden on mobile */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${25 + i * 25}%`,
              left: `${20 + i * 30}%`,
            }}
          >
            <Sparkles
              className="h-3 w-3 text-primary/20 animate-pulse"
              style={{ animationDuration: `${3 + i}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
              <Scale className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-semibold text-primary">Comparatif</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Pourquoi c'est <span className="text-primary">différent</span> ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Compare et vois la différence par toi-même.</p>
        </div>

        {/* Comparison table */}
        <div className="max-w-5xl mx-auto">
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-4 gap-4 mb-4">
              {/* Header */}
              <div className="p-4" />
              <Card className="bg-primary/10 border-primary/30">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-primary font-bold">Logisorama</CardTitle>
                  <p className="text-xs text-primary/80">Notre service</p>
                </CardHeader>
              </Card>
              <Card className="bg-muted/50 border-border/40">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-muted-foreground font-semibold">Agence classique</CardTitle>
                  <p className="text-xs text-muted-foreground/80">Travaille pour le propriétaire</p>
                </CardHeader>
              </Card>
              <Card className="bg-muted/30 border-border/30">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-muted-foreground font-semibold">Candidat solo</CardTitle>
                  <p className="text-xs text-muted-foreground/80">Sans accompagnement</p>
                </CardHeader>
              </Card>
            </div>

            {/* Rows */}
            {comparisonData.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-4 mb-3 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-4 flex items-center">
                  <span className="font-medium text-foreground">{row.aspect}</span>
                </div>
                <Card className="bg-primary/5 border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-foreground">{row.logisorama}</span>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border/30">
                  <CardContent className="p-4 flex items-center gap-2">
                    <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{row.agence}</span>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20 border-border/20">
                  <CardContent className="p-4 flex items-center gap-2">
                    <X className="h-5 w-5 text-destructive/60 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{row.solo}</span>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-6">
            {comparisonData.map((row, index) => (
              <Card
                key={index}
                className="animate-fade-in bg-card/80 border-border/40"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{row.aspect}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-primary font-medium">Logisorama</p>
                      <p className="text-sm text-foreground">{row.logisorama}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                    <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Agence classique</p>
                      <p className="text-sm text-muted-foreground">{row.agence}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20">
                    <X className="h-5 w-5 text-destructive/60 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Candidat solo</p>
                      <p className="text-sm text-muted-foreground">{row.solo}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="mt-12 md:mt-16 text-center animate-fade-in" style={{ animationDelay: "400ms" }}>
          <div className="inline-block relative group">
            <div className="relative px-8 py-4 glass-morphism rounded-full border border-border/40 group-hover:border-primary/30 transition-all duration-300 bg-card/80">
              <p className="text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                Tu délègues, on s'acharne, tu emménages. 🏠
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
