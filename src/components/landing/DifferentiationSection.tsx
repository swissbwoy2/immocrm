import { CheckCircle, X, Minus, Scale, Shield, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const comparisonData = [
  {
    aspect: "Représentation",
    logisorama: "Exclusivement le locataire",
    agence: "Le propriétaire (mandat de gérance)",
    solo: "Vous-même, sans soutien",
    icon: Shield,
  },
  {
    aspect: "Veille du marché",
    logisorama: "Surveillance automatisée 24h/24 via IA",
    agence: "Consultation manuelle, priorité aux mandats internes",
    solo: "Recherche manuelle chronophage",
    icon: Clock,
  },
  {
    aspect: "Suivi des candidatures",
    logisorama: "Dashboard temps réel avec historique complet",
    agence: "Communication ponctuelle sur demande",
    solo: "Aucun outil de suivi structuré",
    icon: TrendingUp,
  },
  {
    aspect: "Préparation du dossier",
    logisorama: "Analyse et optimisation par des experts",
    agence: "Vérification minimale des pièces",
    solo: "Qualité variable, souvent incomplet",
    icon: CheckCircle,
  },
  {
    aspect: "Temps investi",
    logisorama: "Délégation complète, vous restez informé",
    agence: "Démarches à effectuer vous-même",
    solo: "Investissement personnel important",
    icon: Clock,
  },
  {
    aspect: "Engagement de résultat",
    logisorama: "Garantie 100% remboursé sous 90 jours",
    agence: "Aucune garantie contractuelle",
    solo: "Aucune garantie",
    icon: Shield,
  },
];

export function DifferentiationSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-background via-muted/5 to-background">
      {/* Subtle professional gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.02] via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header - more professional */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
              <Scale className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-semibold text-primary">Analyse comparative</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Logisorama vs <span className="text-primary">les alternatives</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un comparatif objectif pour vous aider à choisir la solution adaptée à votre recherche.
          </p>
        </div>

        {/* Comparison table */}
        <div className="max-w-5xl mx-auto">
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-4 gap-4 mb-4">
              {/* Header */}
              <div className="p-4" />
              <Card className="bg-primary/10 border-primary/30 shadow-lg shadow-primary/5">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-primary font-bold">Logisorama</CardTitle>
                  <p className="text-xs text-primary/80 font-medium">Mandat de recherche locative</p>
                </CardHeader>
              </Card>
              <Card className="bg-muted/50 border-border/40">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-muted-foreground font-semibold">Agence immobilière</CardTitle>
                  <p className="text-xs text-muted-foreground/80">Mandat de gérance</p>
                </CardHeader>
              </Card>
              <Card className="bg-muted/30 border-border/30">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-muted-foreground font-semibold">Recherche autonome</CardTitle>
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
                <div className="p-4 flex items-center gap-3">
                  <row.icon className="h-4 w-4 text-primary/60" />
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
                  <div className="flex items-center gap-2">
                    <row.icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{row.aspect}</CardTitle>
                  </div>
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
                      <p className="text-xs text-muted-foreground font-medium">Agence immobilière</p>
                      <p className="text-sm text-muted-foreground">{row.agence}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20">
                    <X className="h-5 w-5 text-destructive/60 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Recherche autonome</p>
                      <p className="text-sm text-muted-foreground">{row.solo}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Professional bottom section */}
        <div className="mt-12 md:mt-16 text-center space-y-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
          {/* Professional tagline */}
          <div className="inline-block relative group">
            <div className="relative px-8 py-4 glass-morphism rounded-2xl border border-primary/20 group-hover:border-primary/40 transition-all duration-300 bg-card/80 shadow-lg shadow-primary/5">
              <p className="text-lg md:text-xl font-semibold text-foreground">
                Délégation totale, transparence complète, <span className="text-primary">résultat garanti</span>.
              </p>
            </div>
          </div>
          
          {/* Credibility note */}
          <p className="text-sm text-muted-foreground">
            * Basé sur plus de 500 mandats traités en Suisse romande depuis 2020
          </p>
        </div>
      </div>
    </section>
  );
}
