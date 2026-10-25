import { useEffect, useMemo, useState, type ElementType } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, ExternalLink, AlertTriangle, Pencil, CalendarDays, CalendarRange, ThumbsUp, ThumbsDown, CalendarCheck, Inbox } from "lucide-react";
import { DASH_CARD, DashPage, DashPageHeader, DashFilterPills, DashBadge, DashEmptyState } from "@/components/client/dashboard/DashPrimitives";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { GererOffreDialog } from "@/components/offres-auto/GererOffreDialog";
import { TablePagination, type PageSize } from "@/components/offres-auto/TablePagination";
import { fetchAllPaginated } from "@/lib/fetchAllWithRange";

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
  agent_id?: string | null;
  needs_agent_action?: boolean | null;
  missing_info?: string | null;
  visites?: { id: string; date_visite: string | null; statut: string | null; est_deleguee?: boolean | null; client_decision?: string | null; client_confirme_visite_at?: string | null }[];
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

type Groupe = { cle: string; derniere: string; besoinAction: boolean; offres: Row[] };

/** Même clé que la fonction SQL offre_groupe_cle (page admin) : lien sans paramètres, sinon adresse normalisée. */
function groupeCle(r: Row): string {
  const lien = (r.lien_annonce ?? "").trim().toLowerCase().replace(/[?#].*$/, "");
  if (lien) return lien;
  return "adr:" + (r.adresse ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function grouper(rows: Row[]): Groupe[] {
  const map = new Map<string, Groupe>();
  for (const r of rows) {
    const cle = groupeCle(r);
    const g = map.get(cle);
    if (g) {
      g.offres.push(r);
      if (r.created_at > g.derniere) g.derniere = r.created_at;
      if (r.needs_agent_action) g.besoinAction = true;
    } else {
      map.set(cle, { cle, derniere: r.created_at, besoinAction: !!r.needs_agent_action, offres: [r] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.derniere.localeCompare(a.derniere));
}

function visiteLabel(r: Row): string {
  const vs = Array.isArray(r.visites) ? r.visites : [];
  const withDate = vs.filter((v) => v && v.date_visite);
  if (withDate.length === 0) return r.needs_agent_action ? "À fixer — action requise (ex. appel)" : "Pas encore de visite";
  withDate.sort((a, b) => new Date(b.date_visite as string).getTime() - new Date(a.date_visite as string).getTime());
  const v = withDate[0];
  const dateStr = new Date(v.date_visite as string).toLocaleString("fr-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const mode = v.est_deleguee === true ? " — déléguée (agent/coursier)" : (v.client_confirme_visite_at ? " — le client visite (confirmé)" : " — en attente décision client");
  const dec = v.client_decision === "souhaite_postuler" ? " — postuler" : ((v.client_decision === "refuse" || v.client_decision === "refusee") ? " — refusée" : "");
  return "Visite " + dateStr + mode + dec;
}

export default function AgentOffresAuto() {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [statut, setStatut] = useState<string>("all");
  const [clientQ, setClientQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [editingGroupe, setEditingGroupe] = useState<Row[] | null>(null);
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
    const cle = groupeCle(target);
    setEditingGroupe(rows.filter((r) => groupeCle(r) === cle));
    const next = new URLSearchParams(searchParams);
    next.delete("offre");
    next.delete("offreId");
    setSearchParams(next, { replace: true });
  }, [rows, searchParams, setSearchParams]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agentData } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!agentData) { setRows([]); return; }
      setAgentId(agentData.id);

      // Collect all client_ids assigned to this agent (principal + co)
      const [{ data: ownClients }, { data: coAssignments }] = await Promise.all([
        supabase.from("clients").select("id").eq("agent_id", agentData.id),
        supabase.from("client_agents").select("client_id").eq("agent_id", agentData.id),
      ]);
      const clientIds = Array.from(new Set([
        ...(ownClients ?? []).map((c: any) => c.id),
        ...(coAssignments ?? []).map((c: any) => c.client_id),
      ]));
      if (clientIds.length === 0) { setRows([]); return; }

      const { data, error } = await fetchAllPaginated<Row>(() => {
        let q = supabase
          .from("offres")
          .select("id, created_at, adresse, prix, pieces, statut, commentaires, lien_annonce, client_id, agent_id, needs_agent_action, missing_info, visites(id, date_visite, date_visite_fin, statut, est_deleguee, client_decision, client_confirme_visite_at)")
          .eq("envoi_auto", true)
          .in("client_id", clientIds)
          .order("created_at", { ascending: false });
        if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
        if (dateTo) {
          const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
          q = q.lte("created_at", to.toISOString());
        }
        return q;
      });
      if (error) { console.error("[Agent/OffresAuto] load", error); setRows([]); return; }

      const offres = (data ?? []) as Row[];
      const offreClientIds = Array.from(new Set(offres.map(o => o.client_id).filter(Boolean)));
      if (offreClientIds.length === 0) { setRows(offres); return; }

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, user_id")
        .in("id", offreClientIds);
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

      setRows(offres.map(o => ({
        ...o,
        _client: profileByUser.get(clientToUser.get(o.client_id) ?? "") ?? {},
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id, dateFrom, dateTo]);

  const filtered = useMemo(() => rows.filter(r => {
    if (statut !== "all" && (r.statut ?? "") !== statut) return false;
    if (clientQ) {
      const q = clientQ.toLowerCase();
      const name = `${r._client?.prenom ?? ""} ${r._client?.nom ?? ""} ${r._client?.email ?? ""}`.toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  }), [rows, statut, clientQ]);

  const manual = useMemo(() => filtered.filter(needsManualAction), [filtered]);

  useEffect(() => { setPageAll(1); setPageManual(1); }, [statut, clientQ, dateFrom, dateTo, pageSize]);

  // Une ligne par annonce (plusieurs clients regroupés), comme la page admin.
  const groupesAll = useMemo(() => grouper(filtered), [filtered]);
  const groupesManual = useMemo(() => grouper(filtered).filter((g) => g.besoinAction), [filtered]);
  const pagedAll = useMemo(() => groupesAll.slice((pageAll - 1) * pageSize, pageAll * pageSize), [groupesAll, pageAll, pageSize]);
  const pagedManual = useMemo(() => groupesManual.slice((pageManual - 1) * pageSize, pageManual * pageSize), [groupesManual, pageManual, pageSize]);
  const openGroupe = (groupe: Row[], offre: Row) => { setEditingGroupe(groupe); setEditing(offre); };

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
    <DashPage className="space-y-6">
      <DashPageHeader
        title="Offres automatiques"
        subtitle="Offres auto de vos clients — complétez-les et fixez les visites."
        action={
          <Button variant="outline" size="sm" className="rounded-full" onClick={load} disabled={loading} aria-label="Actualiser">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={CalendarDays} label="Aujourd'hui" value={stats.today} />
        <StatCard icon={CalendarRange} label="7 derniers jours" value={stats.last7} />
        <StatCard icon={ThumbsUp} label="Intéressés" value={stats.interesses} tone="success" />
        <StatCard icon={ThumbsDown} label="Refusés" value={stats.refuses} tone="danger" />
        <StatCard icon={CalendarCheck} label="Visites planifiées" value={stats.visites} tone="info" />
        <StatCard icon={AlertTriangle} label="À compléter" value={stats.aCompleter} tone="warning" />
      </div>

      <div className={`${DASH_CARD} grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-4 md:p-5`}>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Client (nom/email)</label>
            <Input value={clientQ} onChange={e => setClientQ(e.target.value)} placeholder="Rechercher..." className="rounded-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Du</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Au</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-full" />
          </div>
      </div>

      <div>
        <DashFilterPills
          label="Onglets offres automatiques"
          value={tab}
          onChange={(v) => setTab(v as "all" | "manual")}
          options={[
            { key: "all", label: `Annonces · ${filtered.length} offres`, count: groupesAll.length },
            { key: "manual", label: "À gérer manuellement", count: groupesManual.length },
          ]}
        />
        {tab === "all" && (
          <div className="space-y-3">
            <OffresGroupesTable groupes={pagedAll} onEdit={openGroupe} />
            <TablePagination total={groupesAll.length} page={pageAll} pageSize={pageSize} onPageChange={setPageAll} onPageSizeChange={setPageSize} />
          </div>
        )}
        {tab === "manual" && (
          <div className="space-y-3">
            <OffresGroupesTable groupes={pagedManual} showMissing onEdit={openGroupe} />
            <TablePagination total={groupesManual.length} page={pageManual} pageSize={pageSize} onPageChange={setPageManual} onPageSizeChange={setPageSize} />
          </div>
        )}
      </div>

      <GererOffreDialog
        offre={editing as any}
        groupe={(editingGroupe ?? (editing ? [editing] : [])) as any}
        open={!!editing}
        onOpenChange={v => { if (!v) { setEditing(null); setEditingGroupe(null); } }}
        onSaved={load}
        visitAgentIdOverride={agentId}
      />
    </DashPage>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: number; tone?: "success" | "danger" | "info" | "warning" }) {
  const pill = tone === "success" ? "bg-emerald-500/10 text-emerald-600"
    : tone === "danger" ? "bg-destructive/10 text-destructive"
    : tone === "warning" ? "bg-amber-500/10 text-amber-600"
    : "bg-primary/10 text-primary";
  return (
    <div className={`${DASH_CARD} flex min-h-[104px] flex-col items-start justify-between p-3 sm:p-4`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${pill}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="mt-2 block w-full">
        <span className="block text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function statutBadge(s: string | null) {
  const map: Record<string, { label: string; tone: "neutral" | "primary" | "success" | "danger" | "muted" }> = {
    envoyee: { label: "Envoyée", tone: "neutral" },
    interesse: { label: "Intéressé", tone: "success" },
    souhaite_postuler: { label: "Souhaite postuler", tone: "primary" },
    refuse: { label: "Refusé", tone: "danger" },
    refusee: { label: "Refusée", tone: "danger" },
  };
  const v = map[s ?? ""] ?? { label: s ?? "—", tone: "muted" as const };
  return <DashBadge tone={v.tone}>{v.label}</DashBadge>;
}

function OffresTable({ rows, showMissing, onEdit }: { rows: Row[]; showMissing?: boolean; onEdit?: (r: Row) => void }) {
  if (rows.length === 0) {
    return <DashEmptyState icon={Inbox} title="Aucune offre." />;
  }
  return (
    <div className={`${DASH_CARD} overflow-hidden`}>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
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
        <TableBody className="[&>tr]:border-border/70 [&>tr:hover]:bg-muted/50">
          {rows.map(r => (
            <TableRow key={r.id} className={r.needs_agent_action ? "bg-amber-500/5" : ""}>
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
                <TableCell className="text-xs text-amber-700 dark:text-amber-400 max-w-[220px]">
                  {r.missing_info ?? "—"}
                </TableCell>
              )}
              <TableCell className="text-xs max-w-[280px] truncate" title={r.commentaires ?? ""}>
                {extractVisitInfo(r.commentaires)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => onEdit(r)} title="Gérer l'offre">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {r.lien_annonce && (
                    <a href={r.lien_annonce} target="_blank" rel="noreferrer" className="text-primary hover:underline" title="Ouvrir l'annonce externe">
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
    </div>
  );
}


function OffresGroupesTable({ groupes, showMissing, onEdit }: { groupes: Groupe[]; showMissing?: boolean; onEdit?: (groupe: Row[], offre: Row) => void }) {
  if (groupes.length === 0) {
    return <DashEmptyState icon={Inbox} title="Aucune offre." />;
  }
  return (
    <div className={`${DASH_CARD} overflow-hidden`}>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
            <TableHead>Dernier envoi</TableHead>
            <TableHead>Annonce</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead>Pcs</TableHead>
            <TableHead>Clients concernés</TableHead>
            {showMissing && <TableHead>Ce qui manque</TableHead>}
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&>tr]:border-border/70 [&>tr:hover]:bg-muted/50">
          {groupes.map(g => {
            const ref = g.offres[0];
            if (!ref) return null;
            const missing = g.offres.find(o => o.needs_agent_action && o.missing_info)?.missing_info;
            return (
              <TableRow key={g.cle} className={g.besoinAction ? "bg-amber-500/5" : ""}>
                <TableCell className="whitespace-nowrap text-xs align-top">
                  {format(new Date(g.derniere), "dd MMM HH:mm", { locale: fr })}
                </TableCell>
                <TableCell className="text-sm align-top max-w-[260px]">
                  <div className="font-medium">{ref.adresse ?? "—"}</div>
                  {ref.lien_annonce && (
                    <a href={ref.lien_annonce} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Annonce
                    </a>
                  )}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap align-top">{ref.prix ? `${ref.prix} CHF` : "—"}</TableCell>
                <TableCell className="text-sm align-top">{ref.pieces ?? "—"}</TableCell>
                <TableCell className="text-sm align-top">
                  <div className="text-xs text-muted-foreground mb-1">{g.offres.length} client{g.offres.length > 1 ? "s" : ""}</div>
                  <div className="space-y-1">
                    {g.offres.map(o => (
                      <div key={o.id} className="flex items-center gap-2 flex-wrap">
                        <button type="button" className="font-medium hover:underline text-left" onClick={() => onEdit?.(g.offres, o)}>
                          {(o._client?.prenom ?? "") + " " + (o._client?.nom ?? "")}
                        </button>
                        {statutBadge(o.statut)}
                        <span className="text-xs text-muted-foreground">{visiteLabel(o)}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                {showMissing && (
                  <TableCell className="text-xs text-amber-700 dark:text-amber-400 max-w-[220px] align-top">{missing ?? "—"}</TableCell>
                )}
                <TableCell className="align-top">
                  {onEdit && (
                    <Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => onEdit(g.offres, ref)} title="Gérer l'annonce pour tous les clients">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Gérer
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
