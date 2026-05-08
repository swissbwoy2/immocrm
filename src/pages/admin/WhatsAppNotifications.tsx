import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, CheckCircle2, Eye, AlertTriangle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogRow {
  id: string;
  client_id: string | null;
  event_type: string;
  template_key: string | null;
  recipient_phone: string;
  status: string;
  meta_message_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  context_type?: string | null;
  context_ref?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  read: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300",
  queued: "bg-muted text-muted-foreground",
};

export default function AdminWhatsAppNotifications() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [stats, setStats] = useState({ sent: 0, delivered: 0, read: 0, failed: 0 });

  // Test form
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("new_offer_available");
  const [testVar1, setTestVar1] = useState("Test");
  const [testVar2, setTestVar2] = useState("https://logisorama.ch");
  const [sendingTest, setSendingTest] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [allReport, setAllReport] = useState<any[] | null>(null);

  const runAllTemplatesTest = async () => {
    if (!testPhone) { toast.error("Numéro requis pour le test global"); return; }
    setTestingAll(true);
    setAllReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("wa-test-all-templates", {
        body: { recipient_phone: testPhone },
      });
      if (error) throw error;
      setAllReport((data as any)?.report || []);
      const s = (data as any)?.summary;
      if (s) toast.success(`Test global : ${s.ok}/${s.total} OK, ${s.failed} échec(s)`);
      load();
    } catch (e: any) {
      toast.error("Erreur : " + (e?.message || "inconnue"));
    } finally {
      setTestingAll(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

    let q = supabase
      .from("whatsapp_notification_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (eventFilter !== "all") q = q.eq("event_type", eventFilter);

    const [{ data: rows }, { count: sentCount }, { count: delivered }, { count: read }, { count: failed }] =
      await Promise.all([
        q,
        supabase.from("whatsapp_notification_logs").select("*", { count: "exact", head: true }).gte("created_at", since).eq("status", "sent"),
        supabase.from("whatsapp_notification_logs").select("*", { count: "exact", head: true }).gte("created_at", since).eq("status", "delivered"),
        supabase.from("whatsapp_notification_logs").select("*", { count: "exact", head: true }).gte("created_at", since).eq("status", "read"),
        supabase.from("whatsapp_notification_logs").select("*", { count: "exact", head: true }).gte("created_at", since).eq("status", "failed"),
      ]);

    setLogs((rows as LogRow[]) || []);
    setStats({
      sent: sentCount || 0,
      delivered: delivered || 0,
      read: read || 0,
      failed: failed || 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter, eventFilter]);

  const sendTest = async () => {
    if (!testPhone) {
      toast.error("Numéro WhatsApp requis");
      return;
    }
    setSendingTest(true);
    try {
      const variables = testTemplate === "visit_reminder_24h"
        ? [testVar1, "14h00", "Av. de la Gare 1, Lausanne"]
        : testTemplate === "agent_message_alert"
          ? [testVar1, "Christ Ramazani", "https://logisorama.ch/client/messagerie"]
          : [testVar1, testVar2];

      const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
        body: {
          event_type: "admin_test",
          template_key: testTemplate,
          recipient_phone_override: testPhone,
          variables,
        },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) {
        toast.error("Échec : " + JSON.stringify((data as any).error).slice(0, 200));
      } else {
        toast.success("Message test envoyé");
        load();
      }
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setSendingTest(false);
    }
  };

  const kpis = [
    { label: "Envoyés (24h)", value: stats.sent, icon: Send, color: "text-blue-500" },
    { label: "Livrés (24h)", value: stats.delivered, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Lus (24h)", value: stats.read, icon: Eye, color: "text-amber-500" },
    { label: "Échoués (24h)", value: stats.failed, icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Notifications WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Logs, statistiques et envoi de test</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold">{k.value}</p>
                </div>
                <k.icon className={`h-8 w-8 ${k.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envoyer un message test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Numéro</Label>
              <Input placeholder="+41 79 123 45 67" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            </div>
            <div>
              <Label>Template</Label>
              <Select value={testTemplate} onValueChange={setTestTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_offer_available">new_offer_available</SelectItem>
                  <SelectItem value="visit_reminder_24h">visit_reminder_24h</SelectItem>
                  <SelectItem value="agent_message_alert">agent_message_alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Variable 1 (prénom)</Label>
              <Input value={testVar1} onChange={(e) => setTestVar1(e.target.value)} />
            </div>
            <div>
              <Label>Variable 2 (lien/heure)</Label>
              <Input value={testVar2} onChange={(e) => setTestVar2(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendTest} disabled={sendingTest}>
              {sendingTest ? "Envoi..." : "Envoyer test simple"}
            </Button>
            <Button variant="outline" onClick={runAllTemplatesTest} disabled={testingAll}>
              {testingAll ? "Test en cours..." : "Tester TOUS les templates"}
            </Button>
          </div>
          {allReport && (
            <div className="mt-3 border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium mb-2">Rapport ({allReport.filter(r => r.ok).length}/{allReport.length} OK)</p>
              <div className="space-y-1 max-h-64 overflow-auto text-xs font-mono">
                {allReport.map((r) => (
                  <div key={r.template_key} className={r.ok ? "text-emerald-600" : "text-red-600"}>
                    {r.ok ? "✅" : "❌"} {r.template_key} {r.ok ? `→ ${r.meta_message_id?.slice(0, 30)}…` : `→ ${JSON.stringify(r.error).slice(0, 200)}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Derniers envois</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="sent">Envoyés</SelectItem>
                <SelectItem value="delivered">Livrés</SelectItem>
                <SelectItem value="read">Lus</SelectItem>
                <SelectItem value="failed">Échoués</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous évènements</SelectItem>
                <SelectItem value="new_offer">Nouvelle offre</SelectItem>
                <SelectItem value="visit_reminder_24h">Rappel visite 24h</SelectItem>
                <SelectItem value="agent_message">Message agent</SelectItem>
                <SelectItem value="admin_test">Test admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun envoi pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Évènement</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">
                        {new Date(l.created_at).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}
                      </TableCell>
                      <TableCell className="text-xs">{l.event_type}</TableCell>
                      <TableCell className="text-xs">{l.template_key}</TableCell>
                      <TableCell className="text-xs font-mono">{l.recipient_phone}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[l.status] || ""} variant="outline">
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-red-500 max-w-[280px] truncate">
                        {l.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
