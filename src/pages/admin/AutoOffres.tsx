import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AutoOffres() {
  const [enabled, setEnabled] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  async function loadConfig() {
    const { data } = await supabase.from("app_config").select("key,value")
      .in("key", ["auto_offers_enabled", "auto_offers_dry_run"]);
    const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
    setEnabled(map.auto_offers_enabled === "true");
    setDryRun(map.auto_offers_dry_run !== "false");
  }

  async function loadRuns() {
    const { data } = await supabase.from("auto_offer_runs")
      .select("*").order("started_at", { ascending: false }).limit(30);
    setRuns(data ?? []);
    if (data?.length && !selectedRun) setSelectedRun(data[0].id);
  }

  async function loadCandidates(runId: string) {
    const { data } = await supabase.from("auto_offer_candidates")
      .select("*, clients(prenom, nom)").eq("run_id", runId)
      .order("score", { ascending: false }).limit(500);
    setCandidates(data ?? []);
  }

  useEffect(() => { loadConfig(); loadRuns(); }, []);
  useEffect(() => { if (selectedRun) loadCandidates(selectedRun); }, [selectedRun]);

  async function toggle(key: string, value: boolean) {
    setLoading(true);
    const { error } = await supabase.from("app_config")
      .upsert({ key, value: String(value) }, { onConflict: "key" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Configuration mise à jour");
    if (key === "auto_offers_enabled") setEnabled(value);
    if (key === "auto_offers_dry_run") setDryRun(value);
  }

  async function runNow() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-offers-run", { body: {} });
      if (error) throw error;
      toast.success(`Run terminé : ${data?.offers_created ?? 0} offres, ${data?.listings_retained ?? 0} candidats`);
      await loadRuns();
    } catch (e: any) {
      toast.error(`Erreur : ${e.message ?? e}`);
    } finally {
      setRunning(false);
    }
  }

  const willSendReal = enabled && !dryRun;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auto-Offres</h1>
          <p className="text-sm text-muted-foreground">Routine automatique de recherche et scoring d'annonces</p>
        </div>
        <Badge variant={willSendReal ? "destructive" : "secondary"}>
          {willSendReal ? "🔴 Envoi RÉEL activé" : "🟢 Dry-run (aucun envoi)"}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Activer la routine</div>
              <div className="text-sm text-muted-foreground">Autoriser l'exécution du cron</div>
            </div>
            <Switch checked={enabled} disabled={loading} onCheckedChange={v => toggle("auto_offers_enabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Mode dry-run</div>
              <div className="text-sm text-muted-foreground">Aucune offre réelle, aucun email/WhatsApp. Écrit uniquement les candidats.</div>
            </div>
            <Switch checked={dryRun} disabled={loading} onCheckedChange={v => toggle("auto_offers_dry_run", v)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={runNow} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Lancer un run maintenant
            </Button>
            <Button variant="outline" onClick={() => { loadRuns(); if (selectedRun) loadCandidates(selectedRun); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Derniers runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Mode</TableHead>
              <TableHead>Clients servis</TableHead><TableHead>Trouvés</TableHead>
              <TableHead>Retenus</TableHead><TableHead>Offres créées</TableHead>
              <TableHead>Erreur</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {runs.map(r => (
                <TableRow key={r.id} className={selectedRun === r.id ? "bg-muted cursor-pointer" : "cursor-pointer"}
                  onClick={() => setSelectedRun(r.id)}>
                  <TableCell>{new Date(r.started_at).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}</TableCell>
                  <TableCell>{r.dry_run ? <Badge variant="secondary">Dry</Badge> : <Badge variant="destructive">Réel</Badge>}</TableCell>
                  <TableCell>{r.clients_servis}</TableCell>
                  <TableCell>{r.listings_found}</TableCell>
                  <TableCell>{r.listings_retained}</TableCell>
                  <TableCell>{r.offers_created}</TableCell>
                  <TableCell className="text-destructive text-xs">{r.error ?? ""}</TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucun run</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Candidats du run sélectionné</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Client</TableHead><TableHead>Bien</TableHead>
              <TableHead>Pièces</TableHead><TableHead>Surface</TableHead>
              <TableHead>Loyer CC</TableHead><TableHead>Plafond</TableHead>
              <TableHead>Score</TableHead><TableHead>Envoi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {candidates.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{c.clients?.prenom} {c.clients?.nom}</TableCell>
                  <TableCell className="text-xs">
                    <a href={c.listing_url} target="_blank" rel="noreferrer" className="underline">
                      {c.adresse ?? c.listing_external_id}
                    </a>
                    <div className="text-muted-foreground">{c.npa} {c.ville} {c.regie ? `— ${c.regie}` : ""}</div>
                  </TableCell>
                  <TableCell>{c.pieces ?? "—"}</TableCell>
                  <TableCell>{c.surface ?? "—"}</TableCell>
                  <TableCell>{c.loyer_cc}</TableCell>
                  <TableCell className="text-xs">{c.hard_budget_cap ? Math.round(c.hard_budget_cap) : "—"}</TableCell>
                  <TableCell><Badge>{c.score}/10</Badge></TableCell>
                  <TableCell>{c.offer_id ? <Badge>Envoyée</Badge> : c.would_send ? <Badge variant="secondary">Would send</Badge> : "—"}</TableCell>
                </TableRow>
              ))}
              {candidates.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aucun candidat</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
