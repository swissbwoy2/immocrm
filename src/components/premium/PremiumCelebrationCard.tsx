import { ReactNode } from "react";
import { LucideIcon, PartyPopper, Key, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type CelebrationType = "accepted" | "keys" | "success";

interface PremiumCelebrationCardProps {
  type: CelebrationType;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  children?: ReactNode;
}

const celebrationStyles: Record<CelebrationType, {
  gradient: string;
  particleColor: string;
  iconBg: string;
  defaultIcon: LucideIcon;
}> = {
  accepted: {
    gradient: "from-emerald-500/20 via-green-500/10 to-teal-500/20",
    particleColor: "bg-emerald-400",
    iconBg: "from-emerald-500 to-green-600",
    defaultIcon: PartyPopper,
  },
  keys: {
    gradient: "from-violet-500/20 via-purple-500/10 to-fuchsia-500/20",
    particleColor: "bg-violet-400",
    iconBg: "from-violet-500 to-purple-600",
    defaultIcon: Key,
  },
  success: {
    gradient: "from-amber-500/20 via-yellow-500/10 to-orange-500/20",
    particleColor: "bg-amber-400",
    iconBg: "from-amber-500 to-orange-600",
    defaultIcon: Star,
  },
};

export function PremiumCelebrationCard({ 
  type, 
  title, 
  description, 
  icon,
  action,
  secondaryAction,
  children 
}: PremiumCelebrationCardProps) {
  const styles = celebrationStyles[type];
  const Icon = icon || styles.defaultIcon;

  return (
    <div className={`
      group relative overflow-hidden rounded-2xl
      bg-gradient-to-br ${styles.gradient}
      backdrop-blur-sm border border-white/20
      p-6 md:p-8 transition-all duration-300
    `}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse opacity-50" />
      
      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`
              absolute w-2 h-2 rounded-full ${styles.particleColor}
              animate-bounce opacity-60
            `}
            style={{
              left: `${10 + (i * 7.5)}%`,
              top: `${15 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${1.5 + (i % 3) * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Sparkle effects */}
      <div className="absolute top-4 right-4 text-2xl animate-pulse">✨</div>
      <div className="absolute bottom-4 left-4 text-xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</div>
      <div className="absolute top-1/2 right-8 text-lg animate-pulse" style={{ animationDelay: '1s' }}>⭐</div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon with bounce animation */}
        <div className={`
          p-4 rounded-2xl bg-gradient-to-br ${styles.iconBg}
          shadow-2xl mb-4 animate-bounce
        `}
        style={{ animationDuration: '2s' }}
        >
          <Icon className="h-8 w-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
        )}

        {/* Children content */}
        {children}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full sm:w-auto">
          {action && (
            <Button
              onClick={action.onClick}
              disabled={action.loading}
              size="lg"
              className={`
                bg-gradient-to-r ${styles.iconBg} hover:opacity-90
                shadow-lg transition-all duration-300 hover:scale-105
              `}
            >
              {action.loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : action.icon && (
                <action.icon className="h-5 w-5 mr-2" />
              )}
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="lg"
              className="border-white/30 hover:bg-white/10 transition-all duration-300 hover:scale-105"
            >
              {secondaryAction.icon && (
                <secondaryAction.icon className="h-5 w-5 mr-2" />
              )}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
