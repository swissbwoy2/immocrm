import { ReactNode } from "react";
import { 
  MapPin, Calendar, Square, Home, ChevronDown, ChevronUp 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface OffreData {
  id: string;
  adresse: string;
  prix: number;
  pieces?: number;
  surface?: number;
  date_envoi: string;
  lien_annonce?: string;
}

interface PremiumCandidatureCardProps {
  offre: OffreData;
  statut: string;
  statutLabel: string;
  statutVariant: "default" | "secondary" | "destructive" | "outline";
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
  children?: ReactNode;
}

const getStatutStyles = (statut: string) => {
  const styles: Record<string, { badge: string; border: string; glow: string }> = {
    acceptee: {
      badge: "bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      border: "border-emerald-500/50",
      glow: "shadow-emerald-500/20",
    },
    cles_remises: {
      badge: "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30",
      border: "border-violet-500/50",
      glow: "shadow-violet-500/20",
    },
    refusee: {
      badge: "bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-700 dark:text-red-300 border-red-500/30",
      border: "border-red-500/50",
      glow: "shadow-red-500/20",
    },
  };
  return styles[statut] || {
    badge: "",
    border: "border-border/50",
    glow: "",
  };
};

export function PremiumCandidatureCard({ 
  offre,
  statut,
  statutLabel,
  statutVariant,
  isExpanded,
  onToggle,
  index,
  children
}: PremiumCandidatureCardProps) {
  const styles = getStatutStyles(statut);
  const isSpecialStatus = ['acceptee', 'cles_remises'].includes(statut);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div 
        className={`
          group relative overflow-hidden rounded-2xl
          bg-gradient-to-br from-card/95 to-card/80
          backdrop-blur-sm border-2 ${styles.border}
          shadow-lg ${styles.glow}
          transition-all duration-300 
          hover:shadow-xl hover:border-primary/30
          animate-fade-in
        `}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Gradient border animation for special statuses */}
        {isSpecialStatus && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse opacity-50" />
        )}

        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        {/* Floating particles for special status */}
        {isSpecialStatus && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`
                  absolute w-1.5 h-1.5 rounded-full
                  ${statut === 'acceptee' ? 'bg-emerald-400/50' : 'bg-violet-400/50'}
                  animate-pulse
                `}
                style={{
                  left: `${15 + i * 18}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        )}

        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-muted/20 transition-colors p-5 md:p-6 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left section - Address and status */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <h3 className="text-lg md:text-xl font-bold truncate">{offre.adresse}</h3>
                  </div>
                  <Badge 
                    variant={statutVariant}
                    className={`${styles.badge} ${isSpecialStatus ? 'animate-pulse' : ''}`}
                  >
                    {statutLabel}
                  </Badge>
                </div>

                {/* Info grid */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1">
                    <Home className="h-4 w-4 text-primary/70" />
                    <span>{offre.pieces || '-'} pcs</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1">
                    <Square className="h-4 w-4 text-primary/70" />
                    <span>{offre.surface || '-'} m²</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1">
                    <Calendar className="h-4 w-4 text-primary/70" />
                    <span>{new Date(offre.date_envoi).toLocaleDateString('fr-CH')}</span>
                  </div>
                </div>
              </div>

              {/* Right section - Price and toggle */}
              <div className="flex items-center justify-between lg:justify-end gap-4">
                <div className="text-right">
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    CHF {offre.prix?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">par mois</p>
                </div>
                <div className={`
                  p-2 rounded-full bg-muted/30 text-muted-foreground
                  transition-all duration-300
                  ${isExpanded ? 'rotate-180 bg-primary/10 text-primary' : ''}
                `}>
                  <ChevronDown className="h-5 w-5" />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center lg:text-left">
              {isExpanded ? '↑ Cliquez pour réduire' : '↓ Cliquez pour voir les détails'}
            </p>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 md:px-6 pb-5 md:pb-6 relative z-10 border-t border-border/30">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
