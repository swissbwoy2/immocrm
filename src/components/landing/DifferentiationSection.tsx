import { CheckCircle, X, Scale, Shield, Clock, Search, Users, Filter, Calendar, FileText, MessageSquare, Brain, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const comparisonData = [
  {
    aspect: "Recherche de biens",
    logisorama: "Un agent dédié + nos outils surveillent en continu les annonces et opportunités en Suisse romande.",
    solo: "Tu scrutes les sites un par un, dès que tu as du temps, en espérant ne rien rater.",
    icon: Search,
  },
  {
    aspect: "Accès au réseau",
    logisorama: "On connaît des propriétaires et avons de bonnes relations avec de nombreuses régies, ce qui peut ouvrir des portes et crédibiliser ton dossier.",
    solo: "Tu arrives comme un dossier parmi des dizaines d'autres, sans relation préalable ni quelqu'un pour te présenter.",
    icon: Users,
  },
  {
    aspect: "Tri et sélection",
    logisorama: "On filtre les annonces pour ne garder que celles réalistes pour ton budget, ton profil et tes délais.",
    solo: "Tu candidatures à tout ce qui 'semble possible', sans savoir si ton dossier a vraiment une chance.",
    icon: Filter,
  },
  {
    aspect: "Organisation des visites",
    logisorama: "On demande les visites, on regroupe les créneaux et on sait comment parler aux régies pour optimiser tes chances.",
    solo: "Tu contactes chaque régie séparément, souvent trop tard, et tu dois te débrouiller seul pour obtenir un créneau.",
    icon: Calendar,
  },
  {
    aspect: "Dossier locatif",
    logisorama: "On t'aide à constituer un dossier complet et pro, aligné avec les attentes des régies et des propriétaires de la région.",
    solo: "Tu improvises ton dossier, tu ne sais pas toujours ce qui manque ou ce qui pose problème.",
    icon: FileText,
  },
  {
    aspect: "Suivi avec les régies",
    logisorama: "On relance, on clarifie et on utilise notre relationnel pour obtenir des réponses quand c'est possible.",
    solo: "Tu envoies ton dossier et tu attends… parfois sans jamais avoir de feedback.",
    icon: MessageSquare,
  },
  {
    aspect: "Temps & charge mentale",
    logisorama: "Tu délègues la chasse à une équipe qui connaît déjà le marché et les interlocuteurs.",
    solo: "Tu passes ton temps à chercher, relancer et stresser, sans savoir si tu t'y prends 'comme il faut'.",
    icon: Brain,
  },
  {
    aspect: "Visibilité sur l'avancement",
    logisorama: "Tu as un mandat clair de 90 jours, un agent référent et un suivi structuré.",
    solo: "Tu avances au feeling, sans cadre ni échéance.",
    icon: Eye,
  },
  {
    aspect: "Garantie",
    logisorama: "Si aucun bail n'est signé en 90 jours, la garantie de remboursement prévue au mandat s'applique.",
    solo: "Aucun filet de sécurité : tout le risque repose sur toi.",
    icon: Shield,
  },
];

export function DifferentiationSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-background via-muted/5 to-background">
      {/* Subtle professional gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.02] via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative glass-morphism rounded-full px-5 py-2.5 border border-primary/20 bg-card/80">
              <Scale className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-semibold text-primary">Analyse comparative</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Avec Logisorama, tu ne te présentes pas seul <span className="text-primary">face aux régies et propriétaires</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Chercher un appart en Suisse romande peut se faire de deux façons : avec une équipe qui connaît le terrain, les régies et les propriétaires… ou en solo, au milieu de centaines de candidatures anonymes.
          </p>
        </div>

        {/* Comparison table */}
        <div className="max-w-4xl mx-auto">
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Header */}
              <div className="p-4" />
              <Card className="bg-primary/10 border-primary/30 shadow-lg shadow-primary/5">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-primary font-bold">Avec Immo-rama.ch</CardTitle>
                  <p className="text-xs text-primary/80 font-medium">Mandat de recherche locative</p>
                </CardHeader>
              </Card>
              <Card className="bg-muted/30 border-border/30">
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-lg text-muted-foreground font-semibold">Toi, seul</CardTitle>
                  <p className="text-xs text-muted-foreground/80">Recherche autonome - Sans accompagnement</p>
                </CardHeader>
              </Card>
            </div>

            {/* Rows */}
            {comparisonData.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-4 mb-3 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-4 flex items-center gap-3">
                  <row.icon className="h-4 w-4 text-primary/60" />
                  <span className="font-medium text-foreground">{row.aspect}</span>
                </div>
                <Card className="bg-primary/5 border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{row.logisorama}</span>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20 border-border/20">
                  <CardContent className="p-4 flex items-start gap-2">
                    <X className="h-5 w-5 text-destructive/60 flex-shrink-0 mt-0.5" />
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
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-primary font-medium">Avec Immo-rama.ch</p>
                      <p className="text-sm text-foreground">{row.logisorama}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/20">
                    <X className="h-5 w-5 text-destructive/60 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Toi, seul</p>
                      <p className="text-sm text-muted-foreground">{row.solo}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div className="mt-12 md:mt-16 text-center space-y-6 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <div className="inline-block relative group">
            <div className="relative px-8 py-6 glass-morphism rounded-2xl border border-primary/20 group-hover:border-primary/40 transition-all duration-300 bg-card/80 shadow-lg shadow-primary/5 max-w-2xl mx-auto">
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Tu vois la différence ?
              </h3>
              <p className="text-muted-foreground mb-4">
                Avec Immo-rama.ch, tu as une équipe entière qui se bat pour ton dossier et qui connaît déjà le marché. Clique sur « Activer ma recherche » pour lancer tes 90 jours de recherche garantie.
              </p>
              <Link to="/nouveau-mandat">
                <Button size="lg" className="font-semibold">
                  Activer ma recherche
                </Button>
              </Link>
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
