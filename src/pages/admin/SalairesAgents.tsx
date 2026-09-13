import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

type Row = {
  id: string; date_conclusion: string | null; agent_id: string | null;
  agent_prenom: string | null; agent_nom: string | null;
  client_prenom: string | null; client_nom: string | null; adresse: string | null;
  loyer_brut: number | null; taux_commission: number | null; commission_agent: number | null; statut_paiement: string | null;
};
const money = (n: number) => n.toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SalairesAgents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
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
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; agent: string; supprime: boolean; rows: Row[] }>();
    for (const r of rows) {
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
  }, [rows]);
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salaires / commissions par agent</h1>
          <p className="text-sm text-muted-foreground">Basé sur le registre immuable — reste exact même après suppression d'un agent ou client.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
      </div>
      <div className="space-y-3">
        {groups.map(g => (
          <Card key={g.key}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {open[g.key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {g.agent}
                  {g.supprime && <Badge variant="outline" className="bg-muted text-muted-foreground">profil supprimé</Badge>}
                </CardTitle>
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">{g.nb} affaire(s)</span>
                  <span>Total <b>{money(g.total)}</b></span>
                  <span className="text-emerald-600">Payé {money(g.paye)}</span>
                  <span className="text-red-600">À payer {money(g.du)}</span>
                </div>
              </div>
            </CardHeader>
            {open[g.key] && (<CardContent>
              <div className="border rounded-lg overflow-x-auto"><Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Adresse</TableHead>
                  <TableHead className="text-right">Loyer</TableHead><TableHead className="text-center">Taux</TableHead>
                  <TableHead className="text-right">Commission</TableHead><TableHead>Paiement</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {g.rows.map(r => (<TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{r.date_conclusion ?? "—"}</TableCell>
                    <TableCell className="text-sm">{`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "—"}</TableCell>
                    <TableCell className="text-sm">{r.adresse ?? "—"}</TableCell>
                    <TableCell className="text-sm text-right">{r.loyer_brut != null ? money(r.loyer_brut) : "—"}</TableCell>
                    <TableCell className="text-sm text-center">{r.taux_commission ? `${r.taux_commission}%` : "—"}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{r.commission_agent != null ? money(r.commission_agent) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={r.statut_paiement === "paye" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{r.statut_paiement === "paye" ? "Payé" : "À payer"}</Badge></TableCell>
                  </TableRow>))}
                </TableBody>
              </Table></div>
            </CardContent>)}
          </Card>
        ))}
        {groups.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Aucune commission enregistrée.</div>}
      </div>
    </div>
  );
}
