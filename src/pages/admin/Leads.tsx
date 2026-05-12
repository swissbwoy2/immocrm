import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Zap, MessageCircle } from "lucide-react";
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
  const [invitingLeadId, setInvitingLeadId] = useState<string | null>(null);
  const [confirmingApptId, setConfirmingApptId] = useState<string | null>(null);

  // ---------- Data ----------
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .neq("source", "Payé")
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
    const nowMs = Date.now();
    const staleCutoff = nowMs - 2 * 3600_000;
    const rdvPending = rdvLeads.filter((l) => {
      const a = getApptForLead(l);
      if (!a || a.status !== "en_attente") return false;
      return new Date(a.slot_start).getTime() >= staleCutoff;
    }).length;
    const qualified = filteredLeads.filter((l) => l.is_qualified === true).length;
    const contacted = filteredLeads.filter((l) => l.contacted).length;
    return { total, rdvCount, rdvConfirmed, rdvPending, qualified, contacted };
  }, [filteredLeads, apptByLeadId, apptByEmail]);

  // ---------- Hot items ----------
  // Priorité : (1) tout RDV bureau "en_attente" qui demande confirmation,
  // peu importe la date — sinon les RDV passés ou >24h disparaissent du radar.
  // (2) RDV confirmé dans les prochaines 24h. (3) Leads qualifiés froids.
  const hotItems: HotItem[] = useMemo(() => {
    const items: HotItem[] = [];
    const seen = new Set<string>();
    const in24h = Date.now() + 24 * 3600_000;
    const now = Date.now();
    const staleCutoff = now - 2 * 3600_000;
    leads.forEach((l) => {
      const a = getApptForLead(l);
      if (a && a.status === "en_attente" && new Date(a.slot_start).getTime() >= staleCutoff) {
        items.push({ lead: l, reason: "rdv_today", appt: a });
        seen.add(l.id);
        return;
      }
      if (
        a &&
        a.status === "confirme" &&
        new Date(a.slot_start).getTime() <= in24h &&
        new Date(a.slot_start).getTime() >= now
      ) {
        items.push({ lead: l, reason: "rdv_today", appt: a });
        seen.add(l.id);
        return;
      }
      if (l.is_qualified === true && !l.contacted) {
        const created = l.created_at ? new Date(l.created_at).getTime() : 0;
        if (now - created > 48 * 3600_000 && !seen.has(l.id)) {
          items.push({ lead: l, reason: "qualified_cold" });
        }
      }
    });
    // Sort: pending first (oldest slot first), then upcoming confirmed, then cold
    items.sort((a, b) => {
      const wa = a.appt?.status === "en_attente" ? 0 : a.appt ? 1 : 2;
      const wb = b.appt?.status === "en_attente" ? 0 : b.appt ? 1 : 2;
      if (wa !== wb) return wa - wb;
      if (a.appt && b.appt) return new Date(a.appt.slot_start).getTime() - new Date(b.appt.slot_start).getTime();
      return 0;
    });
    return items.slice(0, 20);
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

  // Mappe le parcours du lead vers la bonne campagne email.
  // "achat" est volontairement laissé en `null` (campagne en draft) -> lead ignoré.
  const getCampaignKeyForLead = (lead: Lead): string | null => {
    const t = (lead.type_recherche || "").toLowerCase().trim();
    if (t === "location" || t === "louer") return "location";
    if (t === "vente" || t === "vendre") return "vente";
    if (t === "renovation" || t === "rénovation") return "renovation";
    // achat / acheter / autre / vide -> ignoré pour l'instant
    return null;
  };

  const sendSingleRelance = async (lead: Lead) => {
    const campaignKey = getCampaignKeyForLead(lead);
    if (!campaignKey) {
      toast.error("Parcours non supporté", {
        description: `Type "${lead.type_recherche || "inconnu"}" : aucune campagne associée (achat en attente).`,
      });
      return;
    }
    toast.loading(`Envoi à ${lead.prenom || lead.email}…`, { id: `relance-${lead.id}` });
    try {
      const { data, error } = await supabase.functions.invoke("send-followup-campaign", {
        body: {
          mode: "send",
          campaignKey,
          leadSource: "leads",
          leadIds: [lead.id],
        },
      });
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

  // Répartition des leads non-contactés par campagne (utilisée par le dialog + l'envoi bulk)
  const relanceBreakdown = useMemo(() => {
    const groups: Record<string, string[]> = { location: [], vente: [], renovation: [] };
    const ignored: { id: string; type: string }[] = [];
    for (const l of filteredLeads) {
      if (l.contacted) continue;
      const key = getCampaignKeyForLead(l);
      if (key && groups[key]) groups[key].push(l.id);
      else ignored.push({ id: l.id, type: l.type_recherche || "inconnu" });
    }
    return { groups, ignored };
  }, [filteredLeads]);

  const sendableCount =
    relanceBreakdown.groups.location.length +
    relanceBreakdown.groups.vente.length +
    relanceBreakdown.groups.renovation.length;

  const sendRelanceAll = async () => {
    setRelanceSending(true);
    try {
      let totalSent = 0, totalErrors = 0;
      const perCampaign: Record<string, number> = {};
      for (const [campaignKey, ids] of Object.entries(relanceBreakdown.groups)) {
        if (!ids.length) continue;
        let sentForCampaign = 0;
        for (let i = 0; i < ids.length; i += 50) {
          const batch = ids.slice(i, i + 50);
          const { data, error } = await supabase.functions.invoke("send-followup-campaign", {
            body: { mode: "send", campaignKey, leadSource: "leads", leadIds: batch },
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || `Erreur campagne ${campaignKey}`);
          totalSent += data.sent || 0;
          totalErrors += data.failed || 0;
          sentForCampaign += data.sent || 0;
        }
        perCampaign[campaignKey] = sentForCampaign;
      }
      const detail = Object.entries(perCampaign).map(([k, n]) => `${n} ${k}`).join(" • ");
      const ignoredCount = relanceBreakdown.ignored.length;
      toast.success(`${totalSent} email(s) envoyé(s)`, {
        description: [
          detail || null,
          ignoredCount ? `${ignoredCount} ignoré(s) (parcours non supporté)` : null,
          totalErrors ? `${totalErrors} erreur(s)` : null,
        ].filter(Boolean).join(" • ") || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowRelanceDialog(false);
    } catch (err) {
      toast.error("Erreur lors de l'envoi", { description: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setRelanceSending(false);
    }
  };

  // ─── WHATSAPP RELANCE (template "location_rdv_activation_v2") ───
  // Cible : tous les leads non contactés ayant un téléphone (hors opt-out).
  // Le template parle de location mais on l'utilise comme relance générique
  // sur tous les parcours (mêmes destinataires que la relance email).
  const waCandidates = useMemo(
    () =>
      filteredLeads.filter((l) => {
        if (l.contacted) return false;
        if (!l.telephone && !(l as any).phone_e164) return false;
        if ((l as any).whatsapp_opt_out) return false;
        return true;
      }),
    [filteredLeads],
  );

  const [waSending, setWaSending] = useState(false);

  const sendWhatsappRelanceAll = async () => {
    const ids = waCandidates.map((l) => l.id);
    if (!ids.length) return;
    setWaSending(true);
    let totalSent = 0, totalSkipped = 0, totalFailed = 0;
    try {
      // Edge function MAX_BATCH = 3 → loop par paquets de 3
      for (let i = 0; i < ids.length; i += 3) {
        const batch = ids.slice(i, i + 3);
        const { data, error } = await supabase.functions.invoke("send-followup-whatsapp", {
          body: { mode: "send", lead_source: "leads", lead_ids: batch },
        });
        if (error) throw error;
        const s = data?.summary || {};
        totalSent += s.sent || 0;
        totalSkipped += s.skipped || 0;
        totalFailed += s.failed || 0;
        // petite pause anti-burst (rate-limit Meta)
        await new Promise((r) => setTimeout(r, 800));
      }
      toast.success(`${totalSent} WhatsApp envoyé(s)`, {
        description: [
          totalSkipped ? `${totalSkipped} ignoré(s)` : null,
          totalFailed ? `${totalFailed} erreur(s)` : null,
        ].filter(Boolean).join(" • ") || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowRelanceDialog(false);
    } catch (err) {
      toast.error("Erreur WhatsApp", { description: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setWaSending(false);
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
          onExport={exportCSV}
        />

        <LeadsKpiStrip
          total={kpis.total}
          rdvCount={kpis.rdvCount}
          rdvConfirmed={kpis.rdvConfirmed}
          rdvPending={kpis.rdvPending}
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
              Chaque lead reçoit l'email de la campagne correspondant à son parcours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Location (recherche appartement)</span><strong>{relanceBreakdown.groups.location.length}</strong></div>
            <div className="flex justify-between"><span>Vente (vendre son bien)</span><strong>{relanceBreakdown.groups.vente.length}</strong></div>
            <div className="flex justify-between"><span>Rénovation</span><strong>{relanceBreakdown.groups.renovation.length}</strong></div>
            <div className="flex justify-between text-muted-foreground border-t pt-2">
              <span>Ignorés (achat / parcours non supporté)</span>
              <strong>{relanceBreakdown.ignored.length}</strong>
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-sm flex items-center justify-between gap-3">
            <div>
              <div className="font-medium flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" />WhatsApp (template location)</div>
              <div className="text-xs text-muted-foreground">{waCandidates.length} lead(s) avec téléphone — envoi par paquets de 3</div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={sendWhatsappRelanceAll}
              disabled={waSending || relanceSending || waCandidates.length === 0}
              className="gap-2"
            >
              {waSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {waSending ? "Envoi…" : `WhatsApp (${waCandidates.length})`}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelanceDialog(false)} disabled={relanceSending || waSending}>Annuler</Button>
            <Button onClick={sendRelanceAll} disabled={relanceSending || waSending || sendableCount === 0} className="gap-2">
              {relanceSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {relanceSending ? "Envoi…" : `Email (${sendableCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
