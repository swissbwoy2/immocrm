import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface WaLog {
  id: string;
  client_id: string | null;
  agent_id: string | null;
  event_type: string;
  template_key: string | null;
  recipient_phone: string;
  payload_json: any;
  status: string;
  meta_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
  delivery_mode: string | null;
  context_type: string | null;
  context_ref: string | null;
}

const STATUS_VARIANTS: Record<string, any> = {
  sent: "default",
  delivered: "secondary",
  read: "secondary",
  failed: "destructive",
  queued: "outline",
};

export default function AdminWhatsAppLogs() {
  const [logs, setLogs] = useState<WaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodDays, setPeriodDays] = useState<string>("7");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - parseInt(periodDays) * 24 * 60 * 60 * 1000).toISOString();
    let q = supabase
      .from("whatsapp_notification_logs")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setLogs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, periodDays]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const qq = search.toLowerCase();
    return logs.filter(l =>
      (l.event_type || "").toLowerCase().includes(qq) ||
      (l.template_key || "").toLowerCase().includes(qq) ||
      (l.recipient_phone || "").toLowerCase().includes(qq) ||
      (l.error_message || "").toLowerCase().includes(qq) ||
      (l.meta_message_id || "").toLowerCase().includes(qq) ||
      JSON.stringify(l.payload_json || {}).toLowerCase().includes(qq),
    );
  }, [logs, search]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter(l => ["sent", "delivered", "read"].includes(l.status)).length;
    const failed = logs.filter(l => l.status === "failed").length;
    const successRate = total ? Math.round((sent / total) * 100) : 0;
    const errorCounts = new Map<string, number>();
    logs.filter(l => l.status === "failed" && l.error_message).forEach(l => {
      const key = (l.error_message || "").slice(0, 80);
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });
    const topErrors = Array.from(errorCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { total, sent, failed, successRate, topErrors };
  }, [logs]);

  const launchTemplateTest = async () => {
    const { data, error } = await supabase.functions.invoke("wa-test-all-templates", { body: {} });
    if (error) { alert("Erreur: " + error.message); return; }
    alert("Test lancé. " + (data?.summary || ""));
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📊 Console WhatsApp — Logs</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={launchTemplateTest}>Tester tous les templates</Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Total ({periodDays}j)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-green-700">Succès</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{stats.sent}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-destructive">Échecs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{stats.failed}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Taux de succès</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.successRate}%</div></CardContent></Card>
      </div>

      {stats.topErrors.length > 0 && (
        <Card className="mb-4 border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Top erreurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.topErrors.map(([msg, count]) => (
              <div key={msg} className="flex justify-between text-sm">
                <span className="truncate flex-1">{msg}</span>
                <Badge variant="destructive">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-3">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher (téléphone, template, erreur, code 132001...)" value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 focus-visible:ring-0" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="delivered">Délivré</SelectItem>
              <SelectItem value="read">Lu</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
              <SelectItem value="queued">En attente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24h</SelectItem>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Aucun log</p>
          ) : (
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {filtered.map(l => {
                const isError132001 = (l.error_message || "").includes("132001");
                return (
                  <div key={l.id} className={`p-3 hover:bg-muted/40 ${isError132001 ? "bg-destructive/5" : ""}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_VARIANTS[l.status] || "outline"}>{l.status}</Badge>
                        {l.template_key && <Badge variant="outline">{l.template_key}</Badge>}
                        {l.delivery_mode && <Badge variant="secondary" className="text-[10px]">{l.delivery_mode}</Badge>}
                        {isError132001 && <Badge variant="destructive">132001</Badge>}
                        <span className="text-sm font-mono">{l.recipient_phone}</span>
                        <span className="text-xs text-muted-foreground">{l.event_type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(l.created_at), "d MMM HH:mm:ss", { locale: fr })}</span>
                    </div>
                    {l.error_message && (
                      <div className="mt-1 text-xs text-destructive bg-destructive/10 rounded px-2 py-1 font-mono break-all">{l.error_message}</div>
                    )}
                    {l.meta_message_id && (
                      <div className="mt-1 text-xs text-muted-foreground font-mono">Meta ID: {l.meta_message_id}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
