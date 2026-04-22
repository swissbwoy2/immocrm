import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Star } from "lucide-react";
import { META_STAGES } from "./types";

export type MetaPeriod = "all" | "24h" | "7d" | "30d";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  formName: string;
  setFormName: (v: string) => void;
  campaign: string;
  setCampaign: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  period: MetaPeriod;
  setPeriod: (v: MetaPeriod) => void;
  hot: boolean;
  setHot: (v: boolean) => void;
  formOptions: string[];
  campaignOptions: string[];
  sourceOptions: string[];
  resultCount: number;
}

export function MetaLeadsFilters({
  search, setSearch, status, setStatus, formName, setFormName,
  campaign, setCampaign, source, setSource, period, setPeriod, hot, setHot,
  formOptions, campaignOptions, sourceOptions, resultCount,
}: Props) {
  const chips: { label: string; clear: () => void }[] = [];
  if (status !== "all") chips.push({ label: `Statut : ${META_STAGES.find((s) => s.key === status)?.label || status}`, clear: () => setStatus("all") });
  if (formName !== "all") chips.push({ label: `Form : ${formName}`, clear: () => setFormName("all") });
  if (campaign !== "all") chips.push({ label: `Camp : ${campaign}`, clear: () => setCampaign("all") });
  if (source !== "all") chips.push({ label: `Source : ${source}`, clear: () => setSource("all") });
  if (period !== "all") chips.push({ label: period === "24h" ? "24h" : period === "7d" ? "7j" : "30j", clear: () => setPeriod("all") });
  if (hot) chips.push({ label: "★ À traiter", clear: () => setHot(false) });

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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="min-w-[120px] w-[120px] sm:w-[140px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {META_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={formName} onValueChange={setFormName}>
            <SelectTrigger className="min-w-[140px] w-[140px] sm:w-[180px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue placeholder="Formulaire" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous formulaires</SelectItem>
              {formOptions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={campaign} onValueChange={setCampaign}>
            <SelectTrigger className="min-w-[140px] w-[140px] sm:w-[180px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue placeholder="Campagne" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes campagnes</SelectItem>
              {campaignOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="min-w-[120px] w-[120px] sm:w-[140px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sources</SelectItem>
              {sourceOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as MetaPeriod)}>
            <SelectTrigger className="min-w-[110px] w-[110px] sm:w-[130px] flex-shrink-0 h-11 lg:h-10 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="24h">24 dernières h</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={hot ? "default" : "outline"}
            onClick={() => setHot(!hot)}
            className="gap-1 flex-shrink-0 h-11 lg:h-10"
          >
            <Star className="h-4 w-4" />
            À traiter
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">{resultCount} résultat(s)</span>
        {chips.map((c, i) => (
          <Badge key={i} variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/70" onClick={c.clear}>
            {c.label}
            <X className="h-3 w-3" />
          </Badge>
        ))}
      </div>
    </div>
  );
}
