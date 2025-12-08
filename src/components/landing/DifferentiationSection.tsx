import { 
  Search, 
  Users, 
  Filter, 
  Calendar, 
  FileText, 
  MessageCircle, 
  Brain, 
  Eye, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ComparisonItem {
  aspect: string;
  icon: LucideIcon;
  immorama: string;
  solo: string;
}

const comparisonData: ComparisonItem[] = [
  {
    aspect: "Recherche de biens",
    icon: Search,
    immorama: "Un agent dédié + nos outils surveillent en continu les annonces et opportunités en Suisse romande.",
    solo: "Tu scrutes les sites un par un, dès que tu as du temps, en espérant ne rien rater.",
  },
  {
    aspect: "Accès au réseau",
    icon: Users,
    immorama: "On connaît des propriétaires et avons de bonnes relations avec de nombreuses régies, ce qui peut ouvrir des portes et crédibiliser ton dossier.",
    solo: "Tu arrives comme un dossier parmi des dizaines d'autres, sans relation préalable ni quelqu'un pour te présenter.",
  },
  {
    aspect: "Tri et sélection",
    icon: Filter,
    immorama: "On filtre les annonces pour ne garder que celles réalistes pour ton budget, ton profil et tes délais.",
    solo: "Tu candidatures à tout ce qui « semble possible », sans savoir si ton dossier a vraiment une chance.",
  },
  {
    aspect: "Organisation des visites",
    icon: Calendar,
    immorama: "On demande les visites, on regroupe les créneaux et on sait comment parler aux régies pour optimiser tes chances.",
    solo: "Tu contactes chaque régie séparément, souvent trop tard, et tu dois te débrouiller seul pour obtenir un créneau.",
  },
  {
    aspect: "Dossier locatif",
    icon: FileText,
    immorama: "On t'aide à constituer un dossier complet et pro, aligné avec les attentes des régies et des propriétaires de la région.",
    solo: "Tu improvises ton dossier, tu ne sais pas toujours ce qui manque ou ce qui pose problème.",
  },
  {
    aspect: "Suivi avec les régies",
    icon: MessageCircle,
    immorama: "On relance, on clarifie et on utilise notre relationnel pour obtenir des réponses quand c'est possible.",
    solo: "Tu envoies ton dossier et tu attends… parfois sans jamais avoir de feedback.",
  },
  {
    aspect: "Temps & charge mentale",
    icon: Brain,
    immorama: "Tu délègues la chasse à une équipe qui connaît déjà le marché et les interlocuteurs.",
    solo: "Tu passes ton temps à chercher, relancer et stresser, sans savoir si tu t'y prends « comme il faut ».",
  },
  {
    aspect: "Visibilité sur l'avancement",
    icon: Eye,
    immorama: "Tu as un mandat clair de 90 jours, un agent référent et un suivi structuré.",
    solo: "Tu avances au feeling, sans cadre ni échéance.",
  },
  {
    aspect: "Garantie",
    icon: Shield,
    immorama: "Si aucun bail n'est signé en 90 jours, la garantie de remboursement prévue au mandat s'applique.",
    solo: "Aucun filet de sécurité : tout le risque repose sur toi.",
  },
];

export function DifferentiationSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Avec Logisorama, tu ne te présentes pas seul face aux régies et propriétaires
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Chercher un appart en Suisse romande peut se faire de deux façons : avec une équipe qui connaît le terrain, les régies et les propriétaires… ou en solo, au milieu de centaines de candidatures anonymes.
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block max-w-6xl mx-auto">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-4 mb-4">
            <div className="p-4">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Critère</span>
            </div>
            <div className="p-4 bg-primary/10 rounded-t-xl border border-primary/20 border-b-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">Avec Immo-rama.ch</span>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-t-xl border border-border border-b-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <span className="font-bold text-muted-foreground">Toi, seul</span>
              </div>
            </div>
          </div>

          {/* Table Body */}
          {comparisonData.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === comparisonData.length - 1;
            
            return (
              <div 
                key={item.aspect} 
                className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-4"
              >
                {/* Critère */}
                <div className={`p-4 flex items-start gap-3 ${index !== 0 ? 'border-t border-border/50' : ''}`}>
                  <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="font-medium text-foreground text-sm">{item.aspect}</span>
                </div>
                
                {/* Immo-rama */}
                <div className={`p-4 bg-primary/10 border-x border-primary/20 ${isLast ? 'rounded-b-xl border-b' : ''}`}>
                  <p className="text-sm text-foreground leading-relaxed">{item.immorama}</p>
                </div>
                
                {/* Solo */}
                <div className={`p-4 bg-muted/50 border-x border-border ${isLast ? 'rounded-b-xl border-b' : ''}`}>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.solo}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-6">
          {comparisonData.map((item) => {
            const Icon = item.icon;
            
            return (
              <div key={item.aspect} className="space-y-3">
                {/* Critère Title */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{item.aspect}</h3>
                </div>
                
                {/* Cards */}
                <div className="grid gap-3">
                  {/* Immo-rama Card */}
                  <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">Avec Immo-rama.ch</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{item.immorama}</p>
                  </div>
                  
                  {/* Solo Card */}
                  <div className="p-4 bg-muted/50 rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Toi, seul</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.solo}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Final */}
        <div className="text-center mt-12 md:mt-16 pt-8 border-t border-border/50">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Tu vois la différence ?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Avec Immo-rama.ch, tu as une équipe entière qui se bat pour ton dossier et qui connaît déjà le marché.
            Clique sur « Activer ma recherche » pour lancer tes 90 jours de recherche garantie.
          </p>
          <Button 
            onClick={() => navigate("/nouveau-mandat")} 
            size="lg"
            className="text-base px-8"
          >
            Activer ma recherche
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
