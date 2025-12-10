import { Calendar, MapPin, Home, Maximize2, Banknote, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours } from 'date-fns';
import { toSwissTime, formatSwissDate, formatSwissTime } from '@/lib/dateUtils';

interface PremiumVisiteCardProps {
  visite: {
    id: string;
    adresse: string;
    date_visite: string;
    offres?: {
      pieces?: number;
      surface?: number;
      prix?: number;
    };
  };
  index?: number;
  onClick?: () => void;
  className?: string;
}

export function PremiumVisiteCard({ visite, index = 0, onClick, className }: PremiumVisiteCardProps) {
  const now = new Date();
  const visiteDate = toSwissTime(visite.date_visite);
  const daysUntil = differenceInDays(visiteDate, now);
  const hoursUntil = differenceInHours(visiteDate, now);
  
  // Determine countdown text and color
  const getCountdownInfo = () => {
    if (hoursUntil < 0) return { text: 'Passée', color: 'bg-muted text-muted-foreground', urgent: false };
    if (hoursUntil < 3) return { text: 'Imminent', color: 'bg-destructive text-destructive-foreground', urgent: true };
    if (hoursUntil < 24) return { text: `Dans ${hoursUntil}h`, color: 'bg-warning text-warning-foreground', urgent: true };
    if (daysUntil === 0) return { text: "Aujourd'hui", color: 'bg-warning text-warning-foreground', urgent: true };
    if (daysUntil === 1) return { text: 'Demain', color: 'bg-amber-500 text-white', urgent: false };
    if (daysUntil <= 3) return { text: `Dans ${daysUntil} jours`, color: 'bg-primary text-primary-foreground', urgent: false };
    return { text: `Dans ${daysUntil} jours`, color: 'bg-muted text-muted-foreground', urgent: false };
  };

  const countdownInfo = getCountdownInfo();
  
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl cursor-pointer",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border border-border/50 hover:border-primary/30",
        "hover:shadow-xl hover:shadow-primary/10",
        "transform hover:scale-[1.02] hover:-translate-y-0.5",
        "transition-all duration-500 ease-out",
        "animate-fade-in",
        className
      )}
      onClick={onClick}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
      
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>
      
      {/* Content */}
      <div className="relative p-5">
        {/* Header with countdown badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "relative p-3 rounded-xl transition-all duration-300",
              countdownInfo.urgent 
                ? "bg-gradient-to-br from-destructive/20 to-warning/20 group-hover:shadow-lg group-hover:shadow-destructive/20"
                : "bg-gradient-to-br from-primary/10 to-accent/10 group-hover:shadow-lg group-hover:shadow-primary/20"
            )}>
              <Calendar className={cn(
                "w-5 h-5 transition-all duration-300 group-hover:scale-110",
                countdownInfo.urgent ? "text-destructive" : "text-primary"
              )} />
              {countdownInfo.urgent && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
              )}
            </div>
          </div>
          
          <Badge className={cn(
            "font-semibold shadow-lg transition-all duration-300",
            countdownInfo.color,
            countdownInfo.urgent && "animate-pulse"
          )}>
            {countdownInfo.text}
          </Badge>
        </div>
        
        {/* Address */}
        <div className="flex items-start gap-2 mb-4">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {visite.adresse}
          </p>
        </div>
        
        {/* Property details grid */}
        {visite.offres && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {visite.offres.pieces && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors duration-300">
                <Home className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{visite.offres.pieces}p</span>
              </div>
            )}
            {visite.offres.surface && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors duration-300">
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{visite.offres.surface}m²</span>
              </div>
            )}
            {visite.offres.prix && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors duration-300">
                <Banknote className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{visite.offres.prix.toLocaleString('fr-CH')}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Date/time footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {formatSwissDate(visiteDate, "EEE dd MMM")} à {formatSwissTime(visiteDate)}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs font-medium">Détails</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
