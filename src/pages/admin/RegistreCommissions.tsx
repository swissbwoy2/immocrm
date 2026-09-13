import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Download } from "lucide-react";

type Row = {
  id: string; date_conclusion: string | null;
  agent_prenom: string | null; agent_nom: string | null;
  client_prenom: string | null; client_nom: string | null;
  adresse: string | null; ville: string | null; type_affaire: string | null;
  loyer_brut: number | null; taux_commission: number | null; honoraire_total: number | null;
  commission_agent: number | null; statut_paiement: string | null; facture_ref: string | null;
};
const money = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RegistreCommissions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentQ, setAgentQ] = useState("");
  const [statut, setStatut] = useState("all");
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registre des commissions</h1>
          <p className="text-sm text-muted-foreground">Archive immuable — conservée même après suppression d'un agent ou d'un client.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Affaires" value={String(stats.nb)} />
        <StatCard label="Total commissions" value={money(stats.total)} />
        <StatCard label="Déjà payé" value={money(stats.paye)} tone="success" />
        <StatCard label="À payer" value={money(stats.du)} tone="danger" />
      </div>
      <Card><CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><label className="text-xs text-muted-foreground">Agent</label><Input value={agentQ} onChange={e => setAgentQ(e.target.value)} placeholder="Nom de l'agent..." /></div>
        <div><label className="text-xs text-muted-foreground">Paiement</label>
          <Select value={statut} onValueChange={setStatut}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="paye">Payé</SelectItem><SelectItem value="en_attente">À payer</SelectItem></SelectContent>
          </Select></div>
        <div><label className="text-xs text-muted-foreground">Du</label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Au</label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
      </CardContent></Card>
      <div className="border rounded-lg overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Client</TableHead><TableHead>Adresse</TableHead>
          <TableHead className="text-right">Loyer brut</TableHead><TableHead className="text-center">Taux</TableHead>
          <TableHead className="text-right">Honoraire</TableHead><TableHead className="text-right">Commission</TableHead>
          <TableHead>Paiement</TableHead><TableHead>Facture</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 && (<TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Aucune ligne.</TableCell></TableRow>)}
          {filtered.map(r => (<TableRow key={r.id}>
            <TableCell className="whitespace-nowrap text-xs">{r.date_conclusion ?? "—"}</TableCell>
            <TableCell className="text-sm font-medium">{`${r.agent_prenom ?? ""} ${r.agent_nom ?? ""}`.trim() || "—"}</TableCell>
            <TableCell className="text-sm">{`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "—"}</TableCell>
            <TableCell className="text-sm">{r.adresse ?? "—"}{r.ville ? `, ${r.ville}` : ""}</TableCell>
            <TableCell className="text-sm text-right">{money(r.loyer_brut)}</TableCell>
            <TableCell className="text-sm text-center">{r.taux_commission ? `${r.taux_commission}%` : "—"}</TableCell>
            <TableCell className="text-sm text-right">{money(r.honoraire_total)}</TableCell>
            <TableCell className="text-sm text-right font-semibold">{money(r.commission_agent)}</TableCell>
            <TableCell><Badge variant="outline" className={r.statut_paiement === "paye" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{r.statut_paiement === "paye" ? "Payé" : "À payer"}</Badge></TableCell>
            <TableCell className="text-xs">{r.facture_ref ?? "—"}</TableCell>
          </TableRow>))}
        </TableBody>
      </Table></div>
    </div>
  );
}
function StatCard({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "";
  return (<Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent></Card>);
}
