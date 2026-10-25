import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Users, ShieldCheck, Trophy, Megaphone } from "lucide-react";
import { DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
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

  const kpis: { label: string; value: number; hint?: string; icon: React.ReactNode; onClick?: () => void }[] = [
    {
      label: "Total leads",
      value: total,
      hint: delta7d > 0 ? `+${delta7d} sur 7j` : `${delta7d} sur 7j`,
      icon: <Users className="h-[18px] w-[18px]" />,
      onClick: onFilterAll,
    },
    {
      label: "Qualifiés",
      value: qualifiedCount,
      hint: `${qualifiedPct.toFixed(0)}% du total`,
      icon: <ShieldCheck className="h-[18px] w-[18px]" />,
      onClick: onFilterQualified,
    },
    {
      label: "Convertis",
      value: convertedCount,
      hint: `${convertedPct.toFixed(0)}% du total`,
      icon: <Trophy className="h-[18px] w-[18px]" />,
      onClick: onFilterConverted,
    },
    {
      label: "Campagnes",
      value: campaignsCount,
      hint: "actives / connues",
      icon: <Megaphone className="h-[18px] w-[18px]" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div
          key={k.label}
          onClick={k.onClick}
          className={cn(
            DASH_CARD,
            "flex min-h-[104px] flex-col items-start justify-between gap-2 p-3 text-left transition-colors sm:p-4",
            k.onClick && "cursor-pointer hover:bg-muted/50"
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">{k.icon}</span>
          <span className="block w-full min-w-0">
            <span className="block text-2xl font-semibold tabular-nums text-foreground">
              <AnimatedCounter value={k.value} decimals={0} />
            </span>
            <span className="block truncate text-sm font-medium text-foreground">{k.label}</span>
            {k.hint && <span className="block truncate text-xs text-muted-foreground">{k.hint}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
