import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Upload, Zap, FileText as FileTextIcon } from "lucide-react";
import { getLeadSource, type LeadSourceKey } from "@/lib/lead-source";
import { LeadsHero, type ViewMode } from "@/components/admin/leads/LeadsHero";
import { LeadsKpiStrip } from "@/components/admin/leads/LeadsKpiStrip";
import { LeadsFilters, type PeriodFilter } from "@/components/admin/leads/LeadsFilters";
import { LeadsHotCarousel, type HotItem } from "@/components/admin/leads/LeadsHotCarousel";
import { LeadsPipeline } from "@/components/admin/leads/LeadsPipeline";
import { LeadsListView } from "@/components/admin/leads/LeadsListView";
import { LeadsCardsView } from "@/components/admin/leads/LeadsCardsView";
import { LeadDetailSheet } from "@/components/admin/leads/LeadDetailSheet";
import { useLeadsRealtime } from "@/hooks/useLeadsRealtime";
import type { Lead, PhoneAppointment, PipelineStage } from "@/components/admin/leads/types";

export default function Leads() {
  const queryClient = useQueryClient();
  useLeadsRealtime();

  // ---------- View / filters ----------
  const [view, setView] = useState<ViewMode>("pipeline");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<LeadSourceKey | "all">("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [hot, setHot] = useState(false);

  // ---------- UI state ----------
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showRelanceDialog, setShowRelanceDialog] = useState(false);
  const [relanceSending, setRelanceSending] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [invitingLeadId, setInvitingLeadId] = useState<string | null>(null);
  const [confirmingApptId, setConfirmingApptId] = useState<string | null>(null);

  // ---------- Data ----------
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15000);
      if (error) throw error;
      return data as Lead[];
    },
  });

  const { data: phoneAppointments = [] } = useQuery({
    queryKey: ["lead-phone-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_phone_appointments")
        .select("id, lead_id, slot_start, slot_end, status, prospect_email")
        .order("slot_start", { ascending: true });
      if (error) throw error;
      return data as PhoneAppointment[];
    },
  });

  const { data: clientEmailRows = [] } = useQuery({
    queryKey: ["clients-email-set"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .not("email", "is", null)
        .limit(15000);
      if (error) throw error;
      return (data as any[]).map((r) => ({ email: r.email as string }));
    },
  });

  const apptByLeadId = useMemo(() => {
    const m = new Map<string, PhoneAppointment>();
    phoneAppointments.forEach((a) => { if (a.lead_id) m.set(a.lead_id, a); });
    return m;
  }, [phoneAppointments]);

  const apptByEmail = useMemo(() => {
    const m = new Map<string, PhoneAppointment>();
    phoneAppointments.forEach((a) => { if (a.prospect_email) m.set(a.prospect_email.toLowerCase(), a); });
    return m;
  }, [phoneAppointments]);

  const clientEmails = useMemo(() => {
    const s = new Set<string>();
    clientEmailRows.forEach((c) => c.email && s.add(c.email.toLowerCase()));
    return s;
  }, [clientEmailRows]);

  const getApptForLead = (l: Lead): PhoneAppointment | null =>
    apptByLeadId.get(l.id) || (l.email ? apptByEmail.get(l.email.toLowerCase()) || null : null);

  // ---------- Filtering ----------
  const filteredLeads = useMemo(() => {
    let out = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((l) =>
        (l.email || "").toLowerCase().includes(q) ||
        (l.prenom || "").toLowerCase().includes(q) ||
        (l.nom || "").toLowerCase().includes(q) ||
        (l.telephone || "").toLowerCase().includes(q) ||
        (l.localite || "").toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") out = out.filter((l) => l.type_recherche === typeFilter);
    if (sourceFilter !== "all") out = out.filter((l) => getLeadSource(l).key === sourceFilter);
    if (period !== "all") {
      const days = period === "7d" ? 7 : 30;
      const cutoff = Date.now() - days * 86400_000;
      out = out.filter((l) => l.created_at && new Date(l.created_at).getTime() >= cutoff);
    }
    if (hot) {
      const in48h = Date.now() + 48 * 3600_000;
      out = out.filter((l) => {
        const a = getApptForLead(l);
        const rdvSoon = a && new Date(a.slot_start).getTime() <= in48h && a.status !== "annule";
        const qualifiedCold = l.is_qualified === true && !l.contacted;
        return rdvSoon || qualifiedCold;
      });
    }
    return out;
  }, [leads, search, typeFilter, sourceFilter, period, hot, apptByLeadId, apptByEmail]);

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const total = filteredLeads.length;
    const rdvLeads = filteredLeads.filter((l) => !!getApptForLead(l));
    const rdvCount = rdvLeads.length;
    const rdvConfirmed = rdvLeads.filter((l) => getApptForLead(l)?.status === "confirme").length;
    const qualified = filteredLeads.filter((l) => l.is_qualified === true).length;
    const contacted = filteredLeads.filter((l) => l.contacted).length;
    return { total, rdvCount, rdvConfirmed, qualified, contacted };
  }, [filteredLeads, apptByLeadId, apptByEmail]);

  // ---------- Hot items ----------
  const hotItems: HotItem[] = useMemo(() => {
    const items: HotItem[] = [];
    const in24h = Date.now() + 24 * 3600_000;
    const now = Date.now();
    leads.forEach((l) => {
      const a = getApptForLead(l);
      if (a && new Date(a.slot_start).getTime() <= in24h && new Date(a.slot_start).getTime() >= now && a.status !== "annule") {
        items.push({ lead: l, reason: "rdv_today", appt: a });
      } else if (l.is_qualified === true && !l.contacted) {
        const created = l.created_at ? new Date(l.created_at).getTime() : 0;
        if (now - created > 48 * 3600_000) {
          items.push({ lead: l, reason: "qualified_cold" });
        }
      }
    });
    return items.slice(0, 12);
  }, [leads, apptByLeadId, apptByEmail]);

  // ---------- Mutations & actions ----------
  const updateLead = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      const { error } = await supabase.from("leads").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead supprimé");
    },
  });

  const handleMoveStage = (lead: Lead, stage: PipelineStage) => {
    const data: Partial<Lead> = {};
    switch (stage) {
      case "nouveau": data.contacted = false; data.is_qualified = null; break;
      case "rdv": data.contacted = false; break;
      case "contacte": data.contacted = true; data.is_qualified = null; break;
      case "qualifie": data.contacted = true; data.is_qualified = true; break;
      case "client": data.contacted = true; data.is_qualified = true; break;
    }
    updateLead.mutate({ id: lead.id, data });
    toast.success(`Déplacé vers ${stage}`);
  };

  const confirmAppointment = async (appointmentId: string) => {
    setConfirmingApptId(appointmentId);
    try {
      const { error } = await supabase.functions.invoke("confirm-phone-appointment", {
        body: { appointment_id: appointmentId },
      });
      if (error) throw error;
      toast.success("Rendez-vous confirmé. Email + invitation envoyés.");
      queryClient.invalidateQueries({ queryKey: ["lead-phone-appointments"] });
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "confirmation échouée"));
    } finally {
      setConfirmingApptId(null);
    }
  };

  const sendSingleRelance = async (lead: Lead) => {
    toast.loading(`Envoi à ${lead.prenom || lead.email}…`, { id: `relance-${lead.id}` });
    try {
      const { data, error } = await supabase.functions.invoke("send-lead-relance", { body: { lead_ids: [lead.id] } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");
      toast.success(`Email envoyé à ${lead.prenom || lead.email}`, { id: `relance-${lead.id}` });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      toast.error(`Erreur pour ${lead.email}`, {
        id: `relance-${lead.id}`,
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  };

  const inviteLeadAsClient = async (lead: Lead) => {
    if (!lead.email) return toast.error("Email manquant");
    const isLouer = (lead.type_recherche || "").toLowerCase() === "location" || (lead.type_recherche || "").toLowerCase() === "louer";
    const isAcheter = (lead.type_recherche || "").toLowerCase() === "achat" || (lead.type_recherche || "").toLowerCase() === "acheter";
    const typeRecherche = isLouer ? "Louer" : isAcheter ? "Acheter" : "Louer";
    if (!confirm(`Inviter ${lead.prenom || ""} ${lead.nom || ""} (${lead.email}) en tant que client ?`)) return;
    setInvitingLeadId(lead.id);
    toast.loading(`Invitation de ${lead.prenom || lead.email}…`, { id: `invite-${lead.id}` });
    try {
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: {
          email: lead.email,
          prenom: lead.prenom || lead.email.split("@")[0],
          nom: lead.nom || "",
          telephone: lead.telephone || "",
          invitationLegere: true,
          typeRecherche,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from("leads").update({ contacted: true }).eq("id", lead.id);
      toast.success(`Client invité : ${lead.email}`, { id: `invite-${lead.id}` });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      toast.error("Erreur invitation", {
        id: `invite-${lead.id}`,
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setInvitingLeadId(null);
    }
  };

  const sendRelanceAll = async () => {
    const ids = filteredLeads.filter((l) => !l.contacted).map((l) => l.id);
    setRelanceSending(true);
    try {
      let totalSent = 0, totalErrors = 0;
      for (let i = 0; i < ids.length; i += 3) {
        const batch = ids.slice(i, i + 3);
        const { data, error } = await supabase.functions.invoke("send-lead-relance", { body: { lead_ids: batch } });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        totalSent += data.sent || 0;
        totalErrors += data.errors || 0;
      }
      toast.success(`${totalSent} email(s) envoyé(s)`, { description: totalErrors > 0 ? `${totalErrors} erreur(s)` : undefined });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowRelanceDialog(false);
    } catch (err) {
      toast.error("Erreur lors de l'envoi", { description: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setRelanceSending(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Localité", "Budget", "Type", "Qualifié", "Date", "Contacté", "Source", "Notes"];
    const rows = filteredLeads.map((l) => [
      l.prenom || "", l.nom || "", l.email, l.telephone || "", l.localite || "", l.budget || "",
      l.type_recherche || "", l.is_qualified ? "Oui" : "Non",
      l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm") : "",
      l.contacted ? "Oui" : "Non", getLeadSource(l).label, (l.notes || "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

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
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const email = cols[emailIdx]?.trim();
        if (!email || !email.includes("@")) continue;
        const fullName = nameIdx >= 0 ? cols[nameIdx] : "";
        const parts = fullName.split(" ");
        parsed.push({
          email, prenom: parts[0] || null, nom: parts.slice(1).join(" ") || null,
          telephone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          source: sourceIdx >= 0 ? cols[sourceIdx] || "CSV Import" : "CSV Import",
          formulaire: formulaireIdx >= 0 ? cols[formulaireIdx] || null : null,
        });
      }
      const { data, error } = await supabase.functions.invoke("import-leads-csv", { body: { leads: parsed, formulaire_name: importFile.name } });
      if (error) throw error;
      toast.success(`${data.inserted} leads importés`, { description: data.duplicates > 0 ? `${data.duplicates} doublons ignorés` : undefined });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowImportDialog(false);
      setImportFile(null);
    } catch (err) {
      toast.error("Erreur d'import", { description: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setImporting(false);
    }
  };

  const openLead = (l: Lead) => { setSelectedLead(l); setSheetOpen(true); };
  const notContactedCount = filteredLeads.filter((l) => !l.contacted).length;

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="relative space-y-5">
        <LeadsHero
          view={view}
          setView={setView}
          total={kpis.total}
          rdvCount={kpis.rdvCount}
          hotCount={hotItems.length}
          notContactedCount={notContactedCount}
          onRelance={() => setShowRelanceDialog(true)}
          onImport={() => setShowImportDialog(true)}
          onExport={exportCSV}
        />

        <LeadsKpiStrip
          total={kpis.total}
          rdvCount={kpis.rdvCount}
          rdvConfirmed={kpis.rdvConfirmed}
          qualifiedCount={kpis.qualified}
          contactedCount={kpis.contacted}
          onFilterRdv={() => setHot(true)}
          onFilterQualified={() => setTypeFilter("all")}
        />

        <LeadsHotCarousel
          hot={hotItems}
          onConfirm={confirmAppointment}
          confirmingId={confirmingApptId}
          onSelect={openLead}
        />

        <LeadsFilters
          search={search} setSearch={setSearch}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
          period={period} setPeriod={setPeriod}
          hot={hot} setHot={setHot}
          resultCount={filteredLeads.length}
        />

        {view === "pipeline" && (
          <LeadsPipeline
            leads={filteredLeads}
            appointments={apptByLeadId}
            apptByEmail={apptByEmail}
            clientEmails={clientEmails}
            onSelect={openLead}
            onMove={handleMoveStage}
          />
        )}
        {view === "list" && (
          <LeadsListView
            leads={filteredLeads}
            appointments={apptByLeadId}
            apptByEmail={apptByEmail}
            onSelect={openLead}
          />
        )}
        {view === "cards" && (
          <LeadsCardsView
            leads={filteredLeads}
            appointments={apptByLeadId}
            apptByEmail={apptByEmail}
            onSelect={openLead}
          />
        )}
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        appt={selectedLead ? getApptForLead(selectedLead) : null}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpdateNotes={(id, notes) => updateLead.mutate({ id, data: { notes } })}
        onToggleContacted={(l) => updateLead.mutate({ id: l.id, data: { contacted: !l.contacted } })}
        onSendRelance={sendSingleRelance}
        onInviteAsClient={inviteLeadAsClient}
        onConfirmAppt={confirmAppointment}
        onDelete={(l) => deleteLead.mutate(l.id)}
        invitingLeadId={invitingLeadId}
        confirmingApptId={confirmingApptId}
      />

      {/* Relance Dialog */}
      <Dialog open={showRelanceDialog} onOpenChange={setShowRelanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Relance marketing</DialogTitle>
            <DialogDescription>
              Un email marketing sera envoyé aux <strong>{notContactedCount}</strong> leads non contactés des résultats actuels.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelanceDialog(false)} disabled={relanceSending}>Annuler</Button>
            <Button onClick={sendRelanceAll} disabled={relanceSending || notContactedCount === 0} className="gap-2">
              {relanceSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {relanceSending ? "Envoi…" : `Envoyer à ${notContactedCount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Importer un CSV</DialogTitle>
            <DialogDescription>Format Wix accepté. Les doublons sont ignorés.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="mx-auto" />
              {importFile && (
                <div className="mt-2 flex items-center gap-2 justify-center text-sm text-muted-foreground">
                  <FileTextIcon className="h-4 w-4" />{importFile.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportFile(null); }} disabled={importing}>Annuler</Button>
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
