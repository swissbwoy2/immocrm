import { ReactNode } from "react";
import { LucideIcon, Clock, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASH_CARD } from "@/components/client/dashboard/DashPrimitives";

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

/** Pastille d'icône ronde par variante (même rendu que TodoCard). */
const variantStyles: Record<StatusVariant, {
  iconCls: string;
  defaultIcon: LucideIcon;
}> = {
  waiting: { iconCls: "bg-amber-500/10 text-amber-600", defaultIcon: Clock },
  success: { iconCls: "bg-emerald-500/10 text-emerald-600", defaultIcon: CheckCircle },
  info: { iconCls: "bg-primary/10 text-primary", defaultIcon: Info },
  warning: { iconCls: "bg-destructive/10 text-destructive", defaultIcon: AlertTriangle },
  action: { iconCls: "bg-primary/10 text-primary", defaultIcon: AlertCircle },
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
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.iconCls}`}>
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          {children}
          {action && (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={action.onClick}
                disabled={action.loading}
                className="rounded-full"
              >
                {action.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  action.label
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
