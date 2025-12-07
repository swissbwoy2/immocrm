import { ReactNode } from "react";
import { LucideIcon, Clock, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type StatusVariant = "waiting" | "success" | "info" | "warning" | "action";

interface PremiumStatusCardProps {
  variant: StatusVariant;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  children?: ReactNode;
}

const variantStyles: Record<StatusVariant, {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  defaultIcon: LucideIcon;
}> = {
  waiting: {
    bg: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-500/30",
    iconBg: "from-amber-500 to-orange-600",
    iconColor: "text-white",
    defaultIcon: Clock,
  },
  success: {
    bg: "from-emerald-500/10 to-green-500/5",
    border: "border-emerald-500/30",
    iconBg: "from-emerald-500 to-green-600",
    iconColor: "text-white",
    defaultIcon: CheckCircle,
  },
  info: {
    bg: "from-blue-500/10 to-indigo-500/5",
    border: "border-blue-500/30",
    iconBg: "from-blue-500 to-indigo-600",
    iconColor: "text-white",
    defaultIcon: Info,
  },
  warning: {
    bg: "from-red-500/10 to-rose-500/5",
    border: "border-red-500/30",
    iconBg: "from-red-500 to-rose-600",
    iconColor: "text-white",
    defaultIcon: AlertTriangle,
  },
  action: {
    bg: "from-primary/10 to-primary/5",
    border: "border-primary/30",
    iconBg: "from-primary to-primary/80",
    iconColor: "text-white",
    defaultIcon: AlertCircle,
  },
};

export function PremiumStatusCard({ 
  variant, 
  title, 
  description, 
  icon, 
  action,
  children 
}: PremiumStatusCardProps) {
  const styles = variantStyles[variant];
  const Icon = icon || styles.defaultIcon;

  return (
    <div className={`
      group relative overflow-hidden rounded-xl
      bg-gradient-to-br ${styles.bg}
      backdrop-blur-sm border ${styles.border}
      p-4 md:p-5 transition-all duration-300
      hover:shadow-lg
    `}>
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      <div className="relative z-10 flex items-start gap-4">
        {/* Icon */}
        <div className={`
          shrink-0 p-3 rounded-xl bg-gradient-to-br ${styles.iconBg}
          shadow-lg transition-transform duration-300 group-hover:scale-110
        `}>
          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-1">{title}</h4>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {children}
        </div>

        {/* Action button */}
        {action && (
          <Button
            onClick={action.onClick}
            disabled={action.loading}
            className="shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {action.loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              action.label
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
