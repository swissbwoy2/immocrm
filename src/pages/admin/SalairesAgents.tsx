import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ChevronDown, Users, Wallet, CheckCircle2, Clock } from "lucide-react";
import { DashPage, DashPageHeader, DashFilterPills, DashEmptyState, DashBadge, DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
import { FinanceStat, NextAction, SearchField } from "@/components/admin/finances/FinanceParts";
import { montant2, chf, dateCH, pluriel, dansPeriode, PERIODES, type PeriodeKey } from "@/components/admin/finances/financeModel";
import { cn } from "@/lib/utils";

type Row = {
  id: string; date_conclusion: string | null; agent_id: string | null;
  agent_prenom: string | null; agent_nom: string | null;
  client_prenom: string | null; client_nom: string | null; adresse: string | null;
  loyer_brut: number | null; taux_commission: number | null; commission_agent: number | null; statut_paiement: string | null;
};
const money = (n: number) => montant2(n);

type VueAgents = "a_payer" | "soldes" | "tous";
type TriAgents = "du" | "total" | "nom";

export default function SalairesAgents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [periode, setPeriode] = useState<PeriodeKey>("all");
  const [vue, setVue] = useState<VueAgents>("a_payer");
  const [tri, setTri] = useState<TriAgents>("du");
  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("registre_commissions")
        .select("id,date_conclusion,agent_id,agent_prenom,agent_nom,client_prenom,client_nom,adresse,loyer_brut,taux_commission,commission_agent,statut_paiement")
        .order("date_conclusion", { ascending: false });
      if (error) { console.error(error); setRows([]); return; }
      setRows((data ?? []) as Row[]);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // Filtre de période (affichage) appliqué avant le regroupement : les totaux suivent la période.
  const rowsPeriode = useMemo(() => rows.filter(r => dansPeriode(r.date_conclusion, periode)), [rows, periode]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; agent: string; supprime: boolean; rows: Row[] }>();
    for (const r of rowsPeriode) {
      const agent = `${r.agent_prenom ?? ""} ${r.agent_nom ?? ""}`.trim() || "(agent inconnu)";
      const key = (r.agent_id ?? "") + "|" + agent;
      if (!map.has(key)) map.set(key, { key, agent, supprime: !r.agent_id, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.values()).map(g => {
      const total = g.rows.reduce((s, r) => s + (r.commission_agent ?? 0), 0);
      const paye = g.rows.filter(r => r.statut_paiement === "paye").reduce((s, r) => s + (r.commission_agent ?? 0), 0);
      return { ...g, nb: g.rows.length, total, paye, du: total - paye };
    }).sort((a, b) => b.total - a.total);
  }, [rowsPeriode]);

  const groupesRecherche = useMemo(
    () => groups.filter(g => !q.trim() || g.agent.toLowerCase().includes(q.trim().toLowerCase())),
    [groups, q],
  );
  const counts = {
    a_payer: groupesRecherche.filter(g => g.du > 0).length,
    soldes: groupesRecherche.filter(g => g.du <= 0).length,
    tous: groupesRecherche.length,
  };
  const affiches = useMemo(() => {
    const arr = groupesRecherche.filter(g => vue === "tous" || (vue === "a_payer" ? g.du > 0 : g.du <= 0));
    if (tri === "du") arr.sort((a, b) => b.du - a.du || b.total - a.total);
    else if (tri === "nom") arr.sort((a, b) => a.agent.localeCompare(b.agent, "fr"));
    else arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [groupesRecherche, vue, tri]);

  const synthese = useMemo(() => groupesRecherche.reduce(
    (s, g) => ({ nb: s.nb + g.nb, total: s.total + g.total, paye: s.paye + g.paye, du: s.du + g.du }),
    { nb: 0, total: 0, paye: 0, du: 0 },
  ), [groupesRecherche]);

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Salaires / commissions par agent"
        subtitle={
          <>
            {counts.a_payer > 0 ? `${chf(synthese.du)} à verser à ${pluriel(counts.a_payer, "agent")}` : "Tous les agents sont soldés"}
            {` · ${pluriel(synthese.nb, "affaire")}`}
            <span className="block text-sm">Basé sur le registre immuable — reste exact même après suppression d'un agent ou client.</span>
          </>
        }
        action={
          <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={load} disabled={loading} aria-label="Actualiser">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Synthèse de la période */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FinanceStat icon={Users} tone="primary" label="Agents" value={String(groupesRecherche.length)} hint={pluriel(synthese.nb, "affaire")} />
        <FinanceStat icon={Wallet} tone="primary" label="Total commissions" value={money(synthese.total)} />
        <FinanceStat icon={CheckCircle2} tone="success" label="Payé" value={money(synthese.paye)} />
        <FinanceStat icon={Clock} tone={synthese.du > 0 ? "warning" : "muted"} label="À payer" value={money(synthese.du)} onClick={() => setVue("a_payer")} active={vue === "a_payer"} />
      </div>

      {/* Barre d'outils */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <SearchField value={q} onChange={setQ} placeholder="Nom de l'agent…" label="Rechercher un agent" />
        <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
          <Select value={tri} onValueChange={(v) => setTri(v as TriAgents)}>
            <SelectTrigger className="h-11 rounded-full md:w-[190px]" aria-label="Trier"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="du">Montant à payer</SelectItem>
              <SelectItem value="total">Total commissions</SelectItem>
              <SelectItem value="nom">Par agent (A–Z)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periode} onValueChange={(v) => setPeriode(v as PeriodeKey)}>
            <SelectTrigger className="h-11 rounded-full md:w-[180px]" aria-label="Période"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DashFilterPills
        label="Agents"
        value={vue}
        onChange={(v) => setVue(v as VueAgents)}
        options={[
          { key: "a_payer", label: "À payer", count: counts.a_payer },
          { key: "soldes", label: "Soldés", count: counts.soldes },
          { key: "tous", label: "Tous", count: counts.tous },
        ]}
      />

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : affiches.length === 0 ? (
        <DashEmptyState
          icon={Users}
          title={groups.length === 0 ? "Aucune commission enregistrée." : vue === "a_payer" && !q ? "Aucune commission à payer" : "Aucun agent pour ces filtres"}
        />
      ) : (
        <div className="space-y-3">
          {affiches.map(g => {
            const ouvert = !!open[g.key];
            return (
              <article key={g.key} className={cn(DASH_CARD, "overflow-hidden")}>
                <button
                  type="button"
                  className="grid w-full gap-3 p-4 text-left md:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6"
                  onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))}
                  aria-expanded={ouvert}
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !ouvert && "-rotate-90")} />
                      <span className="truncate text-[15px] font-semibold text-foreground">{g.agent}</span>
                      {g.supprime && <DashBadge tone="muted">profil supprimé</DashBadge>}
                      <span className="text-xs text-muted-foreground">{g.nb} affaire(s)</span>
                    </div>
                    <NextAction
                      action={g.du > 0
                        ? { texte: `${chf(g.du)} à verser à l'agent`, tone: "warning" }
                        : { texte: "Toutes les commissions sont payées", tone: "success" }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm lg:flex lg:gap-6">
                    <span className="min-w-0"><span className="block text-xs text-muted-foreground">Total</span><b className="tabular-nums">{money(g.total)}</b></span>
                    <span className="min-w-0 text-emerald-700 dark:text-emerald-400"><span className="block text-xs text-muted-foreground">Payé</span><span className="tabular-nums">{money(g.paye)}</span></span>
                    <span className={cn("min-w-0", g.du > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}><span className="block text-xs text-muted-foreground">À payer</span><span className="font-semibold tabular-nums">{money(g.du)}</span></span>
                  </div>
                </button>
                {ouvert && (
                  <div className="border-t border-border/70 p-3 md:p-4">
                    {/* Mobile : une ligne par affaire */}
                    <ul className="space-y-2 md:hidden">
                      {g.rows.map(r => (
                        <li key={r.id} className="rounded-xl bg-muted/40 px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "—"}</p>
                              <p className="line-clamp-2 text-xs text-muted-foreground">{r.adresse ?? "—"}</p>
                            </div>
                            <DashBadge tone={r.statut_paiement === "paye" ? "success" : "warning"}>{r.statut_paiement === "paye" ? "Payé" : "À payer"}</DashBadge>
                          </div>
                          <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                            <span>{dateCH(r.date_conclusion)} · Loyer {r.loyer_brut != null ? money(r.loyer_brut) : "—"} · {r.taux_commission ? `${r.taux_commission}%` : "—"}</span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{r.commission_agent != null ? money(r.commission_agent) : "—"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {/* Tablette et PC : tableau */}
                    <div className="hidden overflow-x-auto md:block"><Table>
                      <TableHeader><TableRow>
                        <TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Adresse</TableHead>
                        <TableHead className="text-right">Loyer</TableHead><TableHead className="text-center">Taux</TableHead>
                        <TableHead className="text-right">Commission</TableHead><TableHead>Paiement</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {g.rows.map(r => (<TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">{dateCH(r.date_conclusion)}</TableCell>
                          <TableCell className="text-sm">{`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "—"}</TableCell>
                          <TableCell className="text-sm">{r.adresse ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-right tabular-nums">{r.loyer_brut != null ? money(r.loyer_brut) : "—"}</TableCell>
                          <TableCell className="text-sm text-center">{r.taux_commission ? `${r.taux_commission}%` : "—"}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-right font-semibold tabular-nums">{r.commission_agent != null ? money(r.commission_agent) : "—"}</TableCell>
                          <TableCell><DashBadge tone={r.statut_paiement === "paye" ? "success" : "warning"}>{r.statut_paiement === "paye" ? "Payé" : "À payer"}</DashBadge></TableCell>
                        </TableRow>))}
                      </TableBody>
                    </Table></div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </DashPage>
  );
}
