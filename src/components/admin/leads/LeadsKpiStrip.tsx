import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Users, Phone, ShieldCheck, Activity } from "lucide-react";
import { DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: number;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
  suffix?: string;
  decimals?: number;
  onClick?: () => void;
}

interface Props {
  total: number;
  rdvCount: number;
  rdvConfirmed: number;
  rdvPending?: number;
  qualifiedCount: number;
  contactedCount: number;
  onFilterTotal?: () => void;
  onFilterRdv?: () => void;
  onFilterQualified?: () => void;
  onFilterContacted?: () => void;
}

export function LeadsKpiStrip({
  total, rdvCount, rdvConfirmed, rdvPending = 0, qualifiedCount, contactedCount,
  onFilterTotal, onFilterRdv, onFilterQualified, onFilterContacted,
}: Props) {
  const qualifiedPct = total ? (qualifiedCount / total) * 100 : 0;
  const contactPct = total ? (contactedCount / total) * 100 : 0;

  const kpis: Kpi[] = [
    {
      label: "Total leads",
      value: total,
      icon: <Users className="h-[18px] w-[18px]" />,
      accent: "bg-primary/10 text-primary",
      decimals: 0,
      onClick: onFilterTotal,
    },
    {
      label: "RDV bureau",
      value: rdvCount,
      hint: rdvPending > 0
        ? `${rdvPending} à confirmer · ${rdvConfirmed} confirmés`
        : `${rdvConfirmed} confirmés`,
      icon: <Phone className="h-[18px] w-[18px]" />,
      accent: rdvPending > 0 ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary",
      decimals: 0,
      onClick: onFilterRdv,
    },
    {
      label: "Qualifiés",
      value: qualifiedCount,
      hint: `${qualifiedPct.toFixed(0)}% du total`,
      icon: <ShieldCheck className="h-[18px] w-[18px]" />,
      accent: "bg-primary/10 text-primary",
      decimals: 0,
      onClick: onFilterQualified,
    },
    {
      label: "Taux de contact",
      value: contactPct,
      hint: `${contactedCount}/${total}`,
      icon: <Activity className="h-[18px] w-[18px]" />,
      accent: "bg-primary/10 text-primary",
      decimals: 0,
      suffix: "%",
      onClick: onFilterContacted,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <button
          key={k.label}
          type="button"
          onClick={k.onClick}
          className={cn(
            DASH_CARD,
            "flex min-h-[104px] flex-col items-start justify-between gap-2 p-3 text-left transition-colors hover:bg-muted/50 sm:p-4"
          )}
        >
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", k.accent)}>{k.icon}</span>
          <span className="block w-full min-w-0">
            <span className="block text-2xl font-semibold tabular-nums text-foreground">
              <AnimatedCounter value={k.value} decimals={k.decimals ?? 0} suffix={k.suffix} />
            </span>
            <span className="block truncate text-sm font-medium text-foreground">{k.label}</span>
            {k.hint && <span className="block truncate text-xs text-muted-foreground">{k.hint}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
