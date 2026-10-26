import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Download, BookOpen, Wallet, CheckCircle2, Clock, Users } from "lucide-react";
import { DashPage, DashPageHeader, DashFilterPills, DashEmptyState, DashBadge, DASH_CARD } from "@/components/client/dashboard/DashPrimitives";
import { FinanceStat, SearchField, ToggleDetails, Ligne, TableCard } from "@/components/admin/finances/FinanceParts";
import { montant2, dateCH, chf, pluriel, bornesPeriode, PERIODES, totauxParAgent, type PeriodeKey } from "@/components/admin/finances/financeModel";
import { cn } from "@/lib/utils";

type Row = {
  id: string; date_conclusion: string | null;
  agent_prenom: string | null; agent_nom: string | null;
  client_prenom: string | null; client_nom: string | null;
  adresse: string | null; ville: string | null; type_affaire: string | null;
  loyer_brut: number | null; taux_commission: number | null; honoraire_total: number | null;
  commission_agent: number | null; statut_paiement: string | null; facture_ref: string | null;
};
const money = (n: number | null | undefined) => montant2(n);

type PresetPeriode = PeriodeKey | 'perso';

export default function RegistreCommissions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentQ, setAgentQ] = useState("");
  const [statut, setStatut] = useState("en_attente");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      let q = supabase.from("registre_commissions")
        .select("id,date_conclusion,agent_prenom,agent_nom,client_prenom,client_nom,adresse,ville,type_affaire,loyer_brut,taux_commission,honoraire_total,commission_agent,statut_paiement,facture_ref")
        .order("date_conclusion", { ascending: false });
      if (dateFrom) q = q.gte("date_conclusion", dateFrom);
      if (dateTo) q = q.lte("date_conclusion", dateTo);
      const { data, error } = await q;
      if (error) { console.error(error); setRows([]); return; }
      setRows((data ?? []) as Row[]);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dateFrom, dateTo]);

  const filtered = useMemo(() => rows.filter(r => {
    if (statut !== "all" && (r.statut_paiement ?? "") !== statut) return false;
    if (agentQ) { const n = `${r.agent_prenom ?? ""} ${r.agent_nom ?? ""}`.toLowerCase(); if (!n.includes(agentQ.toLowerCase())) return false; }
    return true;
  }), [rows, statut, agentQ]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + (r.commission_agent ?? 0), 0);
    const paye = filtered.filter(r => r.statut_paiement === "paye").reduce((s, r) => s + (r.commission_agent ?? 0), 0);
    return { nb: filtered.length, total, paye, du: total - paye };
  }, [filtered]);

  function exportCsv() {
    const head = ["Date","Agent","Client","Adresse","Ville","Type","Loyer brut","Taux %","Honoraire","Commission agent","Statut","Facture"];
    const lines = filtered.map(r => [r.date_conclusion ?? "", `${r.agent_prenom ?? ""} ${r.agent_nom ?? ""}`.trim(), `${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim(), r.adresse ?? "", r.ville ?? "", r.type_affaire ?? "", r.loyer_brut ?? "", r.taux_commission ?? "", r.honoraire_total ?? "", r.commission_agent ?? "", r.statut_paiement ?? "", r.facture_ref ?? ""]);
    const csv = [head, ...lines].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `registre_commissions_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  // ─── Affichage (calculs purement visuels sur les lignes déjà chargées) ───
  const [preset, setPreset] = useState<PresetPeriode>("all");
  const [voirAgents, setVoirAgents] = useState(false);

  const choisirPreset = (p: PresetPeriode) => {
    setPreset(p);
    if (p === "perso") return;
    const { from, to } = bornesPeriode(p);
    setDateFrom(from ?? "");
    setDateTo(to ?? "");
  };

  // Lignes de la période et de l'agent, tous statuts confondus : base des compteurs des onglets.
  const horsStatut = useMemo(() => rows.filter(r => {
    if (agentQ) { const n = `${r.agent_prenom ?? ""} ${r.agent_nom ?? ""}`.toLowerCase(); if (!n.includes(agentQ.toLowerCase())) return false; }
    return true;
  }), [rows, agentQ]);
  const counts = {
    en_attente: horsStatut.filter(r => (r.statut_paiement ?? "") === "en_attente").length,
    paye: horsStatut.filter(r => (r.statut_paiement ?? "") === "paye").length,
    all: horsStatut.length,
  };
  const parAgent = useMemo(() => totauxParAgent(horsStatut), [horsStatut]);
  const agentsAPayer = parAgent.filter(a => a.du > 0);
  const totalDuPeriode = parAgent.reduce((s, a) => s + a.du, 0);
  const agentsAffiches = voirAgents ? parAgent : parAgent.slice(0, 6);

  const libellePeriode = preset === "perso"
    ? `${dateFrom ? `du ${dateCH(dateFrom)}` : ""}${dateTo ? ` au ${dateCH(dateTo)}` : ""}`.trim() || "toutes les dates"
    : (PERIODES.find(p => p.key === preset)?.label ?? "").toLowerCase();

  const badgePaiement = (r: Row) => (
    <DashBadge tone={r.statut_paiement === "paye" ? "success" : "warning"}>{r.statut_paiement === "paye" ? "Payé" : "À payer"}</DashBadge>
  );

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Registre des commissions"
        subtitle={
          <>
            {totalDuPeriode > 0
              ? `${chf(totalDuPeriode)} à payer à ${pluriel(agentsAPayer.length, "agent")}`
              : "Aucune commission à payer"}
            {` · ${pluriel(horsStatut.length, "affaire")} (${libellePeriode})`}
            <span className="block text-sm">Archive immuable — conservée même après suppression d'un agent ou d'un client.</span>
          </>
        }
        action={
          <>
            <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" />Export
              <span className="ml-1 text-xs text-muted-foreground">({filtered.length})</span>
            </Button>
            <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={load} disabled={loading} aria-label="Actualiser">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Actualiser</span>
            </Button>
          </>
        }
      />

      {/* Synthèse de la sélection (onglet, période, agent) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FinanceStat icon={BookOpen} tone="primary" label="Affaires" value={String(stats.nb)} />
        <FinanceStat icon={Wallet} tone="primary" label="Total commissions" value={money(stats.total)} />
        <FinanceStat icon={CheckCircle2} tone="success" label="Déjà payé" value={money(stats.paye)} />
        <FinanceStat icon={Clock} tone={stats.du > 0 ? "warning" : "muted"} label="À payer" value={money(stats.du)} />
      </div>

      {/* Filtres : agent, période */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <SearchField value={agentQ} onChange={setAgentQ} placeholder="Nom de l'agent..." label="Filtrer par agent" />
          <Select value={preset} onValueChange={(v) => choisirPreset(v as PresetPeriode)}>
            <SelectTrigger className="h-11 rounded-full md:w-[200px]" aria-label="Période"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
              <SelectItem value="perso">Dates précises…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(preset === "perso" || dateFrom || dateTo) && (
          <div className="grid grid-cols-2 gap-2 md:max-w-md">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Du</span>
              <Input type="date" className="h-11 rounded-full" value={dateFrom} onChange={e => { setPreset("perso"); setDateFrom(e.target.value); }} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Au</span>
              <Input type="date" className="h-11 rounded-full" value={dateTo} onChange={e => { setPreset("perso"); setDateTo(e.target.value); }} />
            </label>
          </div>
        )}
      </div>

      {/* Synthèse par agent (clic = filtrer sur l'agent) */}
      {parAgent.length > 1 && (
        <section aria-label="Synthèse par agent" className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4 text-muted-foreground" /> Par agent</h2>
            {parAgent.length > 6 && (
              <ToggleDetails open={voirAgents} onToggle={() => setVoirAgents(v => !v)}>{voirAgents ? "Réduire" : `Voir les ${parAgent.length} agents`}</ToggleDetails>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agentsAffiches.map((a) => (
              <button
                key={a.agent}
                type="button"
                onClick={() => setAgentQ(a.agent === "(agent inconnu)" ? "" : a.agent)}
                className={cn(DASH_CARD, "flex min-h-[64px] items-center justify-between gap-3 p-3 text-left transition-transform duration-150 active:scale-[0.98]")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{a.agent}</span>
                  <span className="block truncate text-xs text-muted-foreground">{pluriel(a.nb, "affaire")} · total {money(a.total)}</span>
                </span>
                <span className={cn("shrink-0 text-right text-sm font-semibold tabular-nums", a.du > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                  {a.du > 0 ? money(a.du) : "Soldé"}
                  <span className="block text-[11px] font-normal text-muted-foreground">{a.du > 0 ? "à payer" : "tout payé"}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <DashFilterPills
        label="Statut de paiement"
        value={statut as "en_attente" | "paye" | "all"}
        onChange={(v) => setStatut(v)}
        options={[
          { key: "en_attente", label: "À payer", count: counts.en_attente },
          { key: "paye", label: "Payées", count: counts.paye },
          { key: "all", label: "Toutes", count: counts.all },
        ]}
      />

      {filtered.length === 0 ? (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <DashEmptyState icon={BookOpen} title="Aucune ligne." description={agentQ || dateFrom || dateTo ? "Aucune commission ne correspond à ces filtres." : undefined} />
        )
      ) : (
        <>
          {/* Mobile : une carte par affaire */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {filtered.map(r => <RegistreCard key={r.id} r={r} badge={badgePaiement(r)} />)}
          </div>

          {/* Tablette et PC : registre dense */}
          <div className="hidden md:block">
            <TableCard>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Client</TableHead><TableHead>Adresse</TableHead>
                  <TableHead className="text-right">Loyer brut</TableHead><TableHead className="text-center">Taux</TableHead>
                  <TableHead className="text-right">Honoraire</TableHead><TableHead className="text-right">Commission</TableHead>
                  <TableHead>Paiement</TableHead><TableHead>Facture</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(r => (<TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{dateCH(r.date_conclusion)}</TableCell>
                    <TableCell className="text-sm font-medium">{`${r.agent_prenom ?? ""} ${r.agent_nom ?? ""}`.trim() || "—"}</TableCell>
                    <TableCell className="text-sm">{`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "—"}</TableCell>
                    <TableCell className="max-w-[220px] text-sm">{r.adresse ?? "—"}{r.ville ? `, ${r.ville}` : ""}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{money(r.loyer_brut)}</TableCell>
                    <TableCell className="text-center text-sm">{r.taux_commission ? `${r.taux_commission}%` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{money(r.honoraire_total)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-semibold tabular-nums">{money(r.commission_agent)}</TableCell>
                    <TableCell>{badgePaiement(r)}</TableCell>
                    <TableCell className="text-xs">{r.facture_ref ?? "—"}</TableCell>
                  </TableRow>))}
                </TableBody>
              </Table>
            </TableCard>
          </div>
        </>
      )}
    </DashPage>
  );
}

/** Une ligne du registre en carte (mobile) : agent, client, commission ; détails comptables repliables. */
function RegistreCard({ r, badge }: { r: Row; badge: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <article className={cn(DASH_CARD, "space-y-3 p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{`${r.agent_prenom ?? ""} ${r.agent_nom ?? ""}`.trim() || "—"}</p>
          <p className="truncate text-xs text-muted-foreground">Client : {`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "—"}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{r.adresse ?? "—"}{r.ville ? `, ${r.ville}` : ""}</p>
        </div>
        {badge}
      </div>
      <div className="flex items-end justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
        <div>
          <p className="text-xs text-muted-foreground">Commission agent</p>
          <p className="text-base font-semibold tabular-nums text-foreground">{money(r.commission_agent)}</p>
        </div>
        <p className="text-right text-xs text-muted-foreground">Conclue le<br /><span className="text-sm font-medium text-foreground">{dateCH(r.date_conclusion)}</span></p>
      </div>
      <div>
        <ToggleDetails open={ouvert} onToggle={() => setOuvert(o => !o)}>Détails comptables</ToggleDetails>
        {ouvert && (
          <div className="mt-1 space-y-1.5 rounded-lg bg-muted/50 p-3">
            <Ligne label="Loyer brut">{money(r.loyer_brut)}</Ligne>
            <Ligne label="Taux">{r.taux_commission ? `${r.taux_commission}%` : "—"}</Ligne>
            <Ligne label="Honoraire">{money(r.honoraire_total)}</Ligne>
            <Ligne label="Facture">{r.facture_ref ?? "—"}</Ligne>
            {r.type_affaire && <Ligne label="Type">{r.type_affaire}</Ligne>}
          </div>
        )}
      </div>
    </article>
  );
}
