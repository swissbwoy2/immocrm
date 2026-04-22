import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileText as FileTextIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { MetaLeadsHero, type MetaViewMode } from "@/components/admin/meta-leads/MetaLeadsHero";
import { MetaLeadsKpiStrip } from "@/components/admin/meta-leads/MetaLeadsKpiStrip";
import { MetaLeadsFilters, type MetaPeriod } from "@/components/admin/meta-leads/MetaLeadsFilters";
import { MetaLeadsHotCarousel } from "@/components/admin/meta-leads/MetaLeadsHotCarousel";
import { MetaLeadsPipeline } from "@/components/admin/meta-leads/MetaLeadsPipeline";
import { MetaLeadsListView } from "@/components/admin/meta-leads/MetaLeadsListView";
import { MetaLeadsCardsView } from "@/components/admin/meta-leads/MetaLeadsCardsView";
import { MetaLeadDetailSheet } from "@/components/admin/meta-leads/MetaLeadDetailSheet";
import type { MetaLead, MetaLeadStatus } from "@/components/admin/meta-leads/types";
import { useMetaLeadsRealtime } from "@/hooks/useMetaLeadsRealtime";

export default function MetaLeads() {
  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [view, setView] = useState<MetaViewMode>("pipeline");
  const [selected, setSelected] = useState<MetaLead | null>(null);
  const [converting, setConverting] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [formName, setFormName] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [source, setSource] = useState("all");
  const [period, setPeriod] = useState<MetaPeriod>("all");
  const [hot, setHot] = useState(false);

  // sync dialog
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [manualPageId, setManualPageId] = useState(() => localStorage.getItem("meta_backfill_page_id") || "");
  const [detectedPageId, setDetectedPageId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [checkingPageId, setCheckingPageId] = useState(false);
  const [pageIdError, setPageIdError] = useState("");

  // import dialog
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("meta_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erreur de chargement des leads");
    } else {
      setLeads((data as any[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents")
      .select("id, user_id, profiles:user_id(prenom, nom)")
      .eq("statut", "actif");
    setAgents(data || []);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchAgents();
  }, [fetchLeads, fetchAgents]);

  useMetaLeadsRealtime(fetchLeads);

  // Aggregations
  const formOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.form_name).filter(Boolean) as string[])).sort(),
    [leads]
  );
  const campaignOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.campaign_name).filter(Boolean) as string[])).sort(),
    [leads]
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.source).filter(Boolean))).sort(),
    [leads]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const periodMs = period === "24h" ? 24 * 3600e3 : period === "7d" ? 7 * 86400e3 : period === "30d" ? 30 * 86400e3 : null;
    return leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = [l.full_name, l.email, l.phone, l.city].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== "all" && l.lead_status !== status) return false;
      if (formName !== "all" && l.form_name !== formName) return false;
      if (campaign !== "all" && l.campaign_name !== campaign) return false;
      if (source !== "all" && l.source !== source) return false;
      if (periodMs !== null) {
        const t = new Date(l.lead_created_time_meta || l.created_at).getTime();
        if (now - t > periodMs) return false;
      }
      if (hot) {
        const t = new Date(l.created_at).getTime();
        if (l.lead_status !== "new" || now - t > 48 * 3600e3) return false;
      }
      return true;
    });
  }, [leads, search, status, formName, campaign, source, period, hot]);

  // KPIs
  const total = leads.length;
  const qualifiedCount = leads.filter((l) => l.lead_status === "qualified").length;
  const convertedCount = leads.filter((l) => l.lead_status === "converted").length;
  const campaignsCount = campaignOptions.length || formOptions.length;
  const delta7d = leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 7 * 86400e3).length;
  const newToday = leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 24 * 3600e3).length;

  // Hot list: new + < 48h, max 8
  const hotList = useMemo(() => {
    const now = Date.now();
    return leads
      .filter((l) => l.lead_status === "new" && now - new Date(l.created_at).getTime() < 48 * 3600e3)
      .slice(0, 8);
  }, [leads]);

  // Mutations
  const updateLead = async (id: string, patch: Partial<MetaLead>) => {
    const { error } = await supabase.from("meta_leads").update(patch as any).eq("id", id);
    if (error) {
      toast.error("Erreur de mise à jour");
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } as MetaLead : l)));
    if (selected?.id === id) setSelected({ ...selected, ...patch } as MetaLead);
  };

  const moveLead = async (lead: MetaLead, next: MetaLeadStatus) => {
    await updateLead(lead.id, { lead_status: next });
    toast.success(`Statut → ${next}`);
  };

  const deleteLead = async (lead: MetaLead) => {
    const { error } = await supabase.from("meta_leads").delete().eq("id", lead.id);
    if (error) {
      toast.error("Erreur suppression");
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setSelected(null);
    toast.success("Lead supprimé");
  };

  const convertToClient = async (lead: MetaLead) => {
    setConverting(true);
    try {
      const { error: insErr } = await supabase.from("clients").insert({
        nom: lead.last_name || lead.full_name || "Sans nom",
        prenom: lead.first_name || "",
        email: lead.email,
        telephone: lead.phone,
        type_recherche: "Louer",
        statut: "prospect",
      } as any);
      if (insErr) throw insErr;
      await updateLead(lead.id, { lead_status: "converted" });
      toast.success("Lead converti en client");
    } catch (e: any) {
      toast.error("Conversion échouée: " + (e.message || "inconnu"));
    } finally {
      setConverting(false);
    }
  };

  // Sync Meta backfill
  const handlePreCheck = async () => {
    setCheckingPageId(true);
    setPageIdError("");
    const { data: recentLead } = await supabase
      .from("meta_leads")
      .select("page_id")
      .not("page_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDetectedPageId(recentLead?.page_id || null);
    setCheckingPageId(false);
    setShowBackfillDialog(true);
  };

  const trimmedManualPageId = manualPageId.trim();
  const isManualPageIdValid = /^\d+$/.test(trimmedManualPageId);
  const resolvedPageId = detectedPageId || (isManualPageIdValid ? trimmedManualPageId : null);
  const canLaunchBackfill = !!resolvedPageId && !syncing;

  const handleBackfill = async () => {
    if (!resolvedPageId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-leads-backfill", {
        body: { page_id: resolvedPageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      localStorage.setItem("meta_backfill_page_id", resolvedPageId);
      toast.success(`Import : ${data?.imported || 0} importé(s), ${data?.skipped || 0} ignoré(s)`);
      setShowBackfillDialog(false);
      fetchLeads();
    } catch (err: any) {
      toast.error("Erreur backfill: " + (err.message || "inconnue"));
    }
    setSyncing(false);
  };

  // CSV Import (Wix format)
  const handleImportCSV = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const cleanText = text.replace(/^\uFEFF/, "");
      const lines = cleanText.split("\n").filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV vide");
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes("nom") && !h.includes("famille"));
      const emailIdx = headers.findIndex((h) => h.includes("e-mail") || h.includes("email") || h.includes("adresse e"));
      const sourceIdx = headers.findIndex((h) => h === "source");
      const formulaireIdx = headers.findIndex((h) => h.includes("formulaire"));
      const phoneIdx = headers.findIndex((h) => h.includes("téléphone") || h.includes("telephone") || h.includes("phone"));
      if (emailIdx === -1) throw new Error("Colonne email non trouvée");
      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const email = cols[emailIdx]?.trim();
        if (!email || !email.includes("@")) continue;
        const fullName = nameIdx >= 0 ? cols[nameIdx] : "";
        const parts = fullName.split(" ");
        parsed.push({
          email,
          prenom: parts[0] || null,
          nom: parts.slice(1).join(" ") || null,
          telephone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          source: sourceIdx >= 0 ? cols[sourceIdx] || "CSV Import" : "CSV Import",
          formulaire: formulaireIdx >= 0 ? cols[formulaireIdx] || null : null,
        });
      }
      const { data, error } = await supabase.functions.invoke("import-leads-csv", {
        body: { leads: parsed, formulaire_name: importFile.name },
      });
      if (error) throw error;
      toast.success(`${data.inserted} leads importés`, {
        description: data.duplicates > 0 ? `${data.duplicates} doublons ignorés` : undefined,
      });
      fetchLeads();
      setShowImportDialog(false);
      setImportFile(null);
    } catch (err) {
      toast.error("Erreur d'import", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#1877F2]/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <MetaLeadsHero
        view={view}
        setView={setView}
        total={total}
        campaignsCount={campaignsCount}
        newToday={newToday}
        loading={loading}
        syncing={syncing || checkingPageId}
        onImport={() => setShowImportDialog(true)}
        onSync={handlePreCheck}
        onRefresh={fetchLeads}
      />

      <MetaLeadsKpiStrip
        total={total}
        qualifiedCount={qualifiedCount}
        convertedCount={convertedCount}
        campaignsCount={campaignsCount}
        delta7d={delta7d}
        onFilterAll={() => setStatus("all")}
        onFilterQualified={() => setStatus("qualified")}
        onFilterConverted={() => setStatus("converted")}
      />

      <MetaLeadsFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        formName={formName}
        setFormName={setFormName}
        campaign={campaign}
        setCampaign={setCampaign}
        source={source}
        setSource={setSource}
        period={period}
        setPeriod={setPeriod}
        hot={hot}
        setHot={setHot}
        formOptions={formOptions}
        campaignOptions={campaignOptions}
        sourceOptions={sourceOptions}
        resultCount={filtered.length}
      />

      <MetaLeadsHotCarousel hot={hotList} onSelect={setSelected} />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
          Chargement…
        </div>
      ) : view === "pipeline" ? (
        <MetaLeadsPipeline leads={filtered} onSelect={setSelected} onMove={moveLead} />
      ) : view === "list" ? (
        <MetaLeadsListView leads={filtered} onSelect={setSelected} />
      ) : (
        <MetaLeadsCardsView leads={filtered} onSelect={setSelected} />
      )}

      <MetaLeadDetailSheet
        lead={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        agents={agents}
        onUpdate={updateLead}
        onConvertToClient={convertToClient}
        onDelete={deleteLead}
        converting={converting}
      />

      {/* Sync Meta dialog */}
      <AlertDialog open={showBackfillDialog} onOpenChange={(o) => { if (!o) { setShowBackfillDialog(false); setPageIdError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Synchroniser les leads Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Importer tous les leads Meta existants. Les doublons sont ignorés automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-3">
            {detectedPageId ? (
              <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Détecté</Badge>
                <span className="text-sm font-mono">{detectedPageId}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Page ID Facebook</label>
                <Input
                  placeholder="Ex: 123456789012345"
                  value={manualPageId}
                  onChange={(e) => {
                    setManualPageId(e.target.value);
                    const trimmed = e.target.value.trim();
                    setPageIdError(trimmed && !/^\d+$/.test(trimmed) ? "Le Page ID doit être numérique" : "");
                  }}
                />
                {pageIdError && <p className="text-xs text-destructive">{pageIdError}</p>}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackfill} disabled={!canLaunchBackfill}>
              Lancer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importer un CSV
            </DialogTitle>
            <DialogDescription>Format Wix accepté. Doublons (par email) ignorés.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="mx-auto"
              />
              {importFile && (
                <div className="mt-2 flex items-center gap-2 justify-center text-sm text-muted-foreground">
                  <FileTextIcon className="h-4 w-4" />
                  {importFile.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowImportDialog(false); setImportFile(null); }}
              disabled={importing}
            >
              Annuler
            </Button>
            <Button onClick={handleImportCSV} disabled={!importFile || importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? "Import…" : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
