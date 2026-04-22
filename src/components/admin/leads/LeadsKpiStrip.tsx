import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Users, Phone, ShieldCheck, Activity } from "lucide-react";
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
  qualifiedCount: number;
  contactedCount: number;
  onFilterTotal?: () => void;
  onFilterRdv?: () => void;
  onFilterQualified?: () => void;
  onFilterContacted?: () => void;
}

export function LeadsKpiStrip({
  total, rdvCount, rdvConfirmed, qualifiedCount, contactedCount,
  onFilterTotal, onFilterRdv, onFilterQualified, onFilterContacted,
}: Props) {
  const qualifiedPct = total ? (qualifiedCount / total) * 100 : 0;
  const contactPct = total ? (contactedCount / total) * 100 : 0;

  const kpis: Kpi[] = [
    {
      label: "Total leads",
      value: total,
      icon: <Users className="h-5 w-5" />,
      accent: "from-sky-500/20 to-sky-500/5 text-sky-500",
      decimals: 0,
      onClick: onFilterTotal,
    },
    {
      label: "RDV téléphoniques",
      value: rdvCount,
      hint: `${rdvConfirmed} confirmés`,
      icon: <Phone className="h-5 w-5" />,
      accent: "from-amber-500/20 to-amber-500/5 text-amber-500",
      decimals: 0,
      onClick: onFilterRdv,
    },
    {
      label: "Qualifiés",
      value: qualifiedCount,
      hint: `${qualifiedPct.toFixed(0)}% du total`,
      icon: <ShieldCheck className="h-5 w-5" />,
      accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
      decimals: 0,
      onClick: onFilterQualified,
    },
    {
      label: "Taux de contact",
      value: contactPct,
      hint: `${contactedCount}/${total}`,
      icon: <Activity className="h-5 w-5" />,
      accent: "from-violet-500/20 to-violet-500/5 text-violet-500",
      decimals: 0,
      suffix: "%",
      onClick: onFilterContacted,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Card
            onClick={k.onClick}
            className={cn(
              "relative overflow-hidden border-border/50 backdrop-blur-sm",
              "bg-gradient-to-br hover:shadow-lg cursor-pointer transition-all",
              "hover:-translate-y-0.5 hover:border-border",
              k.accent
            )}
          >
            <div className="p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                  {k.label}
                </span>
                <div className="opacity-70 flex-shrink-0">{k.icon}</div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                <AnimatedCounter value={k.value} decimals={k.decimals ?? 0} suffix={k.suffix} />
              </div>
              {k.hint && <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{k.hint}</div>}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
