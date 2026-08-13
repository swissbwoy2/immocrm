import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, RefreshCw, ExternalLink, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { GererOffreDialog } from "@/components/offres-auto/GererOffreDialog";
import { TablePagination, type PageSize } from "@/components/offres-auto/TablePagination";
import { fetchAllPaginated } from "@/lib/fetchAllWithRange";
import { fr } from "date-fns/locale";

type ClientInfo = { prenom?: string | null; nom?: string | null; email?: string | null };

type Row = {
  id: string;
  created_at: string;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  statut: string | null;
  commentaires: string | null;
  lien_annonce: string | null;
  client_id: string;
  needs_agent_action?: boolean | null;
  missing_info?: string | null;
  visites?: { id: string; date_visite: string | null; statut: string | null }[];
  _client?: ClientInfo;
};

function needsManualAction(row: Row): boolean {
  return !!row.needs_agent_action;
}

function extractVisitInfo(commentaires: string | null): string {
  if (!commentaires) return "—";
  const lines = commentaires.split("\n");
  const visit = lines.find(l => /visite|contact|régie|regie|rappeler|fixer/i.test(l));
  return visit ?? lines[0] ?? "—";
}


export default function OffresAuto() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [statut, setStatut] = useState<string>("all");
  const [clientQ, setClientQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<"all" | "manual">("all");
  const [pageAll, setPageAll] = useState(1);
  const [pageManual, setPageManual] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);

  // Deep link: ?offre=<id> (ou ?offreId=<id>) -> ouvre l'offre à traiter
  useEffect(() => {
    const offreId = searchParams.get("offre") || searchParams.get("offreId");
    if (!offreId || rows.length === 0) return;
    const target = rows.find((r) => r.id === offreId);
    if (!target) return;
    setEditing(target);
    const next = new URLSearchParams(searchParams);
    next.delete("offre");
    next.delete("offreId");
    setSearchParams(next, { replace: true });
  }, [rows, searchParams, setSearchParams]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await fetchAllPaginated<Row>(() => {
        let q = supabase
          .from("offres")
          .select("id, created_at, adresse, prix, pieces, statut, commentaires, lien_annonce, client_id, agent_id, needs_agent_action, missing_info, visites(id, date_visite, date_visite_fin, statut)")
          .eq("envoi_auto", true)
          .order("created_at", { ascending: false });
        if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
        if (dateTo) {
          const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
          q = q.lte("created_at", to.toISOString());
        }
        return q;
      });
      if (error) { console.error("[OffresAuto] load offres", error); setRows([]); return; }

      const offres = (data ?? []) as Row[];
      const clientIds = Array.from(new Set(offres.map(o => o.client_id).filter(Boolean)));

      if (clientIds.length === 0) { setRows(offres); return; }

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, user_id")
        .in("id", clientIds);

      const userIds = Array.from(new Set((clientsData ?? []).map(c => c.user_id).filter(Boolean)));
      const clientToUser = new Map<string, string>((clientsData ?? []).map(c => [c.id, c.user_id as string]));

      let profileByUser = new Map<string, ClientInfo>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, prenom, nom, email")
          .in("id", userIds);
        profileByUser = new Map((profilesData ?? []).map((p: any) => [p.id as string, { prenom: p.prenom, nom: p.nom, email: p.email }]));
      }

      const enriched = offres.map(o => ({
        ...o,
        _client: profileByUser.get(clientToUser.get(o.client_id) ?? "") ?? {},
      }));
      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statut !== "all" && (r.statut ?? "") !== statut) return false;
      if (clientQ) {
        const q = clientQ.toLowerCase();
        const name = `${r._client?.prenom ?? ""} ${r._client?.nom ?? ""} ${r._client?.email ?? ""}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statut, clientQ]);

  const manual = useMemo(() => filtered.filter(needsManualAction), [filtered]);

  // Reset to page 1 when filters or page size change
  useEffect(() => { setPageAll(1); setPageManual(1); }, [statut, clientQ, dateFrom, dateTo, pageSize]);

  const pagedAll = useMemo(() => filtered.slice((pageAll - 1) * pageSize, pageAll * pageSize), [filtered, pageAll, pageSize]);
  const pagedManual = useMemo(() => manual.slice((pageManual - 1) * pageSize, pageManual * pageSize), [manual, pageManual, pageSize]);

  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const start7 = new Date(now); start7.setDate(now.getDate() - 7);
    const today = rows.filter(r => new Date(r.created_at) >= startToday);
    const last7 = rows.filter(r => new Date(r.created_at) >= start7);
    const interesses = rows.filter(r => r.statut === "interesse").length;
    const refuses = rows.filter(r => r.statut === "refuse" || r.statut === "refusee").length;
    const visites = rows.filter(r => (r.visites ?? []).some(v => v.date_visite)).length;
    const aCompleter = rows.filter(r => r.needs_agent_action).length;
    return { today: today.length, last7: last7.length, interesses, refuses, visites, aCompleter };
  }, [rows]);


  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offres automatiques</h1>
          <p className="text-sm text-muted-foreground">Suivi des offres créées par la routine Auto-Offres.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Aujourd'hui" value={stats.today} />
        <StatCard label="7 derniers jours" value={stats.last7} />
        <StatCard label="Intéressés" value={stats.interesses} tone="success" />
        <StatCard label="Refusés" value={stats.refuses} tone="danger" />
        <StatCard label="Visites planifiées" value={stats.visites} tone="info" />
        <StatCard label="⚠️ À compléter" value={stats.aCompleter} tone="danger" />
      </div>


      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Statut</label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="envoyee">Envoyée</SelectItem>
                <SelectItem value="interesse">Intéressé</SelectItem>
                <SelectItem value="souhaite_postuler">Souhaite postuler</SelectItem>
                <SelectItem value="refuse">Refusé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Client (nom/email)</label>
            <Input value={clientQ} onChange={e => setClientQ(e.target.value)} placeholder="Rechercher..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Du</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Au</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "manual")}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({filtered.length})</TabsTrigger>
          <TabsTrigger value="manual">
            <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
            À gérer manuellement ({manual.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <OffresTable rows={pagedAll} onEdit={setEditing} />
          <TablePagination total={filtered.length} page={pageAll} pageSize={pageSize} onPageChange={setPageAll} onPageSizeChange={setPageSize} />
        </TabsContent>
        <TabsContent value="manual">
          <OffresTable rows={pagedManual} showMissing onEdit={setEditing} />
          <TablePagination total={manual.length} page={pageManual} pageSize={pageSize} onPageChange={setPageManual} onPageSizeChange={setPageSize} />
        </TabsContent>

      </Tabs>

      <GererOffreDialog
        offre={editing as any}
        open={!!editing}
        onOpenChange={v => { if (!v) setEditing(null); }}
        onSaved={load}
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" | "info" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : tone === "info" ? "text-blue-600" : "";
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent>
    </Card>
  );
}

function statutBadge(s: string | null) {
  const map: Record<string, { label: string; cls: string }> = {
    envoyee: { label: "Envoyée", cls: "bg-blue-100 text-blue-800" },
    interesse: { label: "Intéressé", cls: "bg-emerald-100 text-emerald-800" },
    souhaite_postuler: { label: "Souhaite postuler", cls: "bg-violet-100 text-violet-800 border border-violet-300" },
    refuse: { label: "Refusé", cls: "bg-red-100 text-red-800" },
    refusee: { label: "Refusée", cls: "bg-red-100 text-red-800" },
  };
  const v = map[s ?? ""] ?? { label: s ?? "—", cls: "bg-muted" };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

function OffresTable({ rows, showMissing, onEdit }: { rows: Row[]; showMissing?: boolean; onEdit?: (r: Row) => void }) {
  if (rows.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-8">Aucune offre.</div>;
  }
  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead>Pcs</TableHead>
            <TableHead>Statut</TableHead>
            {showMissing && <TableHead>Ce qui manque</TableHead>}
            <TableHead>Info visite</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.id} className={r.needs_agent_action ? "bg-amber-50" : ""}>
              <TableCell className="whitespace-nowrap text-xs">
                {format(new Date(r.created_at), "dd MMM HH:mm", { locale: fr })}
              </TableCell>
              <TableCell className="text-sm">
                <div className="font-medium">{r._client?.prenom ?? ""} {r._client?.nom ?? ""}</div>
                <div className="text-xs text-muted-foreground">{r._client?.email ?? ""}</div>
              </TableCell>
              <TableCell className="text-sm">{r.adresse ?? "—"}</TableCell>
              <TableCell className="text-sm whitespace-nowrap">{r.prix ? `${r.prix} CHF` : "—"}</TableCell>
              <TableCell className="text-sm">{r.pieces ?? "—"}</TableCell>
              <TableCell>{statutBadge(r.statut)}</TableCell>
              {showMissing && (
                <TableCell className="text-xs text-amber-700 max-w-[220px]">
                  {r.missing_info ?? "—"}
                </TableCell>
              )}
              <TableCell className="text-xs max-w-[280px] truncate" title={r.commentaires ?? ""}>
                {extractVisitInfo(r.commentaires)}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(r)} title="Gérer l'offre">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {r.lien_annonce && (
                    <a href={r.lien_annonce} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline" title="Ouvrir l'annonce externe">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
