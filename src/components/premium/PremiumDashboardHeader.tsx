import { Sparkles, Bell, Send, Home, Hammer, Tag, KeyRound, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type ParcoursType = 'location' | 'achat' | 'vente' | 'renovation' | 'relocation';

interface PremiumDashboardHeaderProps {
  userName?: string;
  isAcheteur?: boolean;
  parcoursType?: ParcoursType;
  messageCount?: number;
  offerCount?: number;
  onMessagesClick?: () => void;
  onOffersClick?: () => void;
  className?: string;
  subtitle?: string;
  headingBadge?: string;
  /** Icône du badge (par défaut : celle du parcours). */
  badgeIcon?: typeof Home;
  action?: ReactNode;
}

const PARCOURS_CONFIG: Record<ParcoursType, { label: string; icon: typeof Home; subtitle: string }> = {
  location: {
    label: 'Recherche de logement',
    icon: Search,
    subtitle: "Suivez l'avancement de votre recherche de logement",
  },
  achat: {
    label: "Projet d'achat",
    icon: Home,
    subtitle: "Suivez l'avancement de votre projet d'achat immobilier",
  },
  renovation: {
    label: 'Projet de rénovation',
    icon: Hammer,
    subtitle: "Suivez l'avancement de votre projet de construction ou rénovation",
  },
  vente: {
    label: 'Vente de votre bien',
    icon: Tag,
    subtitle: "Suivez l'avancement de la vente de votre bien immobilier",
  },
  relocation: {
    label: 'Relocation de votre bien',
    icon: KeyRound,
    subtitle: "Suivez la mise en relocation de votre appartement",
  },
};

export function PremiumDashboardHeader({
  userName,
  isAcheteur = false,
  parcoursType,
  messageCount = 0,
  offerCount = 0,
  onMessagesClick,
  onOffersClick,
  className,
  subtitle,
  headingBadge,
  badgeIcon,
  action,
}: PremiumDashboardHeaderProps) {
  // Resolve effective parcours: explicit prop wins, else legacy isAcheteur fallback
  const effective: ParcoursType = parcoursType ?? (isAcheteur ? 'achat' : 'location');
  const cfg = PARCOURS_CONFIG[effective] ?? PARCOURS_CONFIG.location;
  const Icon = badgeIcon ?? cfg.icon;

  return (
    <div className={cn(
      'imr-lg-hero rounded-[28px]',
      'p-6 md:p-8 mb-8 animate-fade-in',
      className
    )}>
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg shadow-primary/10">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse-soft" />
            </div>
            <Badge
              variant="outline"
              className="px-3 py-1 text-xs sm:text-sm font-medium text-primary/80 uppercase tracking-wider border-primary/30 bg-primary/5"
            >
              <Icon className="w-3 h-3 mr-1.5" />
               {headingBadge ?? cfg.label}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Bonjour{userName ? `, ${userName}` : ''} 👋
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
             {subtitle ?? cfg.subtitle}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
           {action}
          {messageCount > 0 && (
            <Button
              variant="outline"
              onClick={onMessagesClick}
              className="relative group"
            >
              <Bell className="w-4 h-4 mr-2 group-hover:animate-wiggle" />
              Messages
              <Badge variant="destructive" className="ml-2 animate-bounce-soft shadow-lg shadow-destructive/30">
                {messageCount}
              </Badge>
            </Button>
          )}
          {offerCount > 0 && (
            <Button
              variant="outline"
              onClick={onOffersClick}
              className="relative group"
            >
              <Send className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              Offres
              <Badge variant="destructive" className="ml-2 animate-bounce-soft shadow-lg shadow-destructive/30">
                {offerCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
