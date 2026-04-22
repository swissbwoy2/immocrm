import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Users, ShieldCheck, Trophy, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  total: number;
  qualifiedCount: number;
  convertedCount: number;
  campaignsCount: number;
  delta7d: number;
  onFilterAll?: () => void;
  onFilterQualified?: () => void;
  onFilterConverted?: () => void;
}

export function MetaLeadsKpiStrip({
  total, qualifiedCount, convertedCount, campaignsCount, delta7d,
  onFilterAll, onFilterQualified, onFilterConverted,
}: Props) {
  const qualifiedPct = total ? (qualifiedCount / total) * 100 : 0;
  const convertedPct = total ? (convertedCount / total) * 100 : 0;

  const kpis = [
    {
      label: "Total leads",
      value: total,
      hint: delta7d > 0 ? `+${delta7d} sur 7j` : `${delta7d} sur 7j`,
      icon: <Users className="h-5 w-5" />,
      accent: "from-sky-500/20 to-sky-500/5 text-sky-500",
      onClick: onFilterAll,
    },
    {
      label: "Qualifiés",
      value: qualifiedCount,
      hint: `${qualifiedPct.toFixed(0)}% du total`,
      icon: <ShieldCheck className="h-5 w-5" />,
      accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
      onClick: onFilterQualified,
    },
    {
      label: "Convertis",
      value: convertedCount,
      hint: `${convertedPct.toFixed(0)}% du total`,
      icon: <Trophy className="h-5 w-5" />,
      accent: "from-violet-500/20 to-violet-500/5 text-violet-500",
      onClick: onFilterConverted,
    },
    {
      label: "Campagnes",
      value: campaignsCount,
      hint: "actives / connues",
      icon: <Megaphone className="h-5 w-5" />,
      accent: "from-[#1877F2]/20 to-[#1877F2]/5 text-[#1877F2]",
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
              "bg-gradient-to-br hover:shadow-lg transition-all",
              "hover:-translate-y-0.5 hover:border-border",
              k.onClick && "cursor-pointer",
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
                <AnimatedCounter value={k.value} decimals={0} />
              </div>
              {k.hint && <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{k.hint}</div>}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
