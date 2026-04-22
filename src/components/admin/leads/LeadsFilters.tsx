import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Flame } from "lucide-react";
import { LEAD_SOURCE_FILTER_OPTIONS, type LeadSourceKey } from "@/lib/lead-source";

export type PeriodFilter = "all" | "7d" | "30d";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  sourceFilter: LeadSourceKey | "all";
  setSourceFilter: (v: LeadSourceKey | "all") => void;
  period: PeriodFilter;
  setPeriod: (v: PeriodFilter) => void;
  hot: boolean;
  setHot: (v: boolean) => void;
  resultCount: number;
}

export function LeadsFilters({
  search, setSearch, typeFilter, setTypeFilter,
  sourceFilter, setSourceFilter, period, setPeriod, hot, setHot, resultCount,
}: Props) {
  const activeChips: { label: string; clear: () => void }[] = [];
  if (typeFilter !== "all") activeChips.push({ label: `Type : ${typeFilter}`, clear: () => setTypeFilter("all") });
  if (sourceFilter !== "all") activeChips.push({ label: `Source : ${sourceFilter}`, clear: () => setSourceFilter("all") });
  if (period !== "all") activeChips.push({ label: period === "7d" ? "7 jours" : "30 jours", clear: () => setPeriod("all") });
  if (hot) activeChips.push({ label: "🔥 Hot leads", clear: () => setHot(false) });

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative w-full lg:flex-1 lg:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email, téléphone, ville…"
            className="pl-9 h-11 lg:h-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 lg:overflow-visible lg:flex-wrap scrollbar-thin">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="min-w-[120px] w-[120px] sm:w-[150px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="Louer">🔑 Location</SelectItem>
              <SelectItem value="Acheter">🏠 Achat</SelectItem>
              <SelectItem value="Vendre">🏢 Vendeur</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LeadSourceKey | "all")}>
            <SelectTrigger className="min-w-[130px] w-[130px] sm:w-[170px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              {LEAD_SOURCE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="min-w-[120px] w-[120px] sm:w-[130px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={hot ? "default" : "outline"}
            onClick={() => setHot(!hot)}
            className="gap-1 flex-shrink-0 h-11 lg:h-10"
          >
            <Flame className="h-4 w-4" />
            Hot
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">{resultCount} résultat(s)</span>
        {activeChips.map((c, i) => (
          <Badge key={i} variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/70" onClick={c.clear}>
            {c.label}
            <X className="h-3 w-3" />
          </Badge>
        ))}
      </div>
    </div>
  );
}
