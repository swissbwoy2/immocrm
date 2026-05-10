import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Eye,
  Send,
  Mail,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Smartphone,
  Monitor,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Campaign = {
  id: string;
  campaign_key: string;
  name: string;
  subject: string;
  hero_title: string;
  cta_label: string;
  cta_url: string;
  status: "draft" | "active" | "inactive";
};

type Lead = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  campaign_key: string | null;
  imported_at: string;
  source: string | null;
};

type LogRow = {
  id: string;
  recipient_email: string;
  campaign_key: string;
  subject: string;
  status: string;
  error_message: string | null;
  created_at: string;
  test_send: boolean;
  delivered_at?: string | null;
  opened_at?: string | null;
  last_opened_at?: string | null;
  opens_count?: number | null;
  clicked_at?: string | null;
  last_clicked_at?: string | null;
  clicks_count?: number | null;
  bounced_at?: string | null;
  complained_at?: string | null;
  last_click_url?: string | null;
};

type LeadTracking = {
  sent: boolean;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
  opens: number;
  clicks: number;
  count: number;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  sent: { label: "Envoyé", className: "bg-green-100 text-green-800 border-green-300" },
  failed: { label: "Échec", className: "bg-red-100 text-red-800 border-red-300" },
  skipped: { label: "Ignoré", className: "bg-amber-100 text-amber-800 border-amber-300" },
  pending: { label: "En cours", className: "bg-blue-100 text-blue-800 border-blue-300" },
};

export default function CampagnesSuivi() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCamp, setLoadingCamp] = useState(true);
  const [activeTab, setActiveTab] = useState("campagnes");

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Test send
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Leads tab
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("location");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [hideAlreadySent, setHideAlreadySent] = useState(true);
  const [allowResend, setAllowResend] = useState(false);
  const [sentLeadIds, setSentLeadIds] = useState<Set<string>>(new Set());
  const [sentCountByLead, setSentCountByLead] = useState<Map<string, number>>(new Map());
  const [trackingByLead, setTrackingByLead] = useState<Map<string, LeadTracking>>(new Map());

  // Lead history dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [historyRows, setHistoryRows] = useState<LogRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Import CSV
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCampaignKey, setImportCampaignKey] = useState<string>("location");
  const [importing, setImporting] = useState(false);

  // Confirm send
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Logs tab
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // WhatsApp Location tab
  const [waPreview, setWaPreview] = useState<{ body_rendered: string; button_url: string; activation_link: string; first_name_param: string } | null>(null);
  const [waPreviewLoading, setWaPreviewLoading] = useState(false);
  const [waTesting, setWaTesting] = useState(false);
  const [waSelectedIds, setWaSelectedIds] = useState<Set<string>>(new Set());
  const [waAlreadySent, setWaAlreadySent] = useState<Set<string>>(new Set());
  const [waAllowResend, setWaAllowResend] = useState(false);
  const [waSearch, setWaSearch] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waLastResult, setWaLastResult] = useState<{ sent: number; skipped: number; failed: number; processed: number; total_requested: number } | null>(null);

  // ───── Load campaigns
  useEffect(() => {
    (async () => {
      setLoadingCamp(true);
      const { data, error } = await supabase
        .from("email_followup_campaigns")
        .select("*")
        .order("created_at");
      if (error) toast.error("Erreur chargement campagnes", { description: error.message });
      setCampaigns((data || []) as Campaign[]);
      setLoadingCamp(false);
    })();
  }, []);

  // ───── Load leads
  const loadLeads = async () => {
    setLoadingLeads(true);
    const { data, error } = await supabase
      .from("meta_leads")
      .select("id, email, first_name, last_name, phone, campaign_key, imported_at, source")
      .order("imported_at", { ascending: false })
      .limit(2000);
    if (error) toast.error("Erreur chargement leads", { description: error.message });
    setLeads((data || []) as Lead[]);

    // Get already-sent for selected campaign
    const camp = campaigns.find((c) => c.campaign_key === selectedCampaign);
    if (camp) {
      const { data: sentData } = await supabase
        .from("lead_email_logs")
        .select("lead_id")
        .eq("campaign_id", camp.id)
        .eq("status", "sent")
        .eq("test_send", false)
        .not("lead_id", "is", null)
        .limit(15000);
      setSentLeadIds(new Set((sentData || []).map((r: any) => r.lead_id)));
    }

    // Global per-lead tracking aggregate (all campaigns)
    const { data: allLogs } = await supabase
      .from("lead_email_logs")
      .select("lead_id, status, opened_at, clicked_at, delivered_at, bounced_at, opens_count, clicks_count")
      .eq("test_send", false)
      .not("lead_id", "is", null)
      .limit(15000);
    const counts = new Map<string, number>();
    const tracking = new Map<string, LeadTracking>();
    (allLogs || []).forEach((r: any) => {
      if (r.status === "sent") counts.set(r.lead_id, (counts.get(r.lead_id) || 0) + 1);
      const t: LeadTracking = tracking.get(r.lead_id) || {
        sent: false, delivered: false, opened: false, clicked: false, bounced: false,
        opens: 0, clicks: 0, count: 0,
      };
      if (r.status === "sent") { t.sent = true; t.count++; }
      if (r.delivered_at || r.opened_at || r.clicked_at) t.delivered = true;
      if (r.opened_at) t.opened = true;
      if (r.clicked_at) t.clicked = true;
      if (r.bounced_at || r.status === "failed") t.bounced = true;
      t.opens += r.opens_count || 0;
      t.clicks += r.clicks_count || 0;
      tracking.set(r.lead_id, t);
    });
    setSentCountByLead(counts);
    setTrackingByLead(tracking);

    setLoadingLeads(false);
  };

  useEffect(() => {
    if ((activeTab === "leads" || activeTab === "whatsapp") && campaigns.length > 0) loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCampaign, campaigns.length]);

  // ───── Load logs
  useEffect(() => {
    if (activeTab !== "logs") return;
    (async () => {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from("lead_email_logs")
        .select("id, recipient_email, campaign_key, subject, status, error_message, created_at, test_send, delivered_at, opened_at, last_opened_at, opens_count, clicked_at, last_clicked_at, clicks_count, bounced_at, complained_at, last_click_url")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) toast.error("Erreur logs", { description: error.message });
      setLogs((data || []) as LogRow[]);
      setLoadingLogs(false);
    })();
  }, [activeTab]);

  // ───── Preview
  const handlePreview = async (campaign: Campaign) => {
    setPreviewCampaign(campaign);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    const { data, error } = await supabase.functions.invoke("send-followup-campaign", {
      body: { mode: "preview", campaignKey: campaign.campaign_key },
    });
    setPreviewLoading(false);
    if (error || !data?.html) {
      toast.error("Erreur aperçu", { description: error?.message || "HTML manquant" });
      return;
    }
    setPreviewHtml(data.html);
  };

  // ───── Test send
  const handleTest = async (campaign: Campaign) => {
    setTestingKey(campaign.campaign_key);
    const { data, error } = await supabase.functions.invoke("send-followup-campaign", {
      body: { mode: "test", campaignKey: campaign.campaign_key },
    });
    setTestingKey(null);
    if (error || data?.error) {
      toast.error("Échec envoi test", { description: error?.message || data?.error });
      return;
    }
    toast.success("Email test envoyé", { description: `Destinataire : info@immo-rama.ch` });
  };

  // ───── WhatsApp Location campaign
  const WA_TEMPLATE_KEY = "location_rdv_activation_v2";
  const [waMetaTemplateName, setWaMetaTemplateName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("whatsapp_message_templates")
        .select("template_name_meta")
        .eq("template_key", WA_TEMPLATE_KEY)
        .maybeSingle();
      if (data?.template_name_meta) setWaMetaTemplateName(data.template_name_meta);
    })();
  }, []);

  const loadWaAlreadySent = async () => {
    // Bug fix: inclure sent + delivered + read (Meta met à jour le statut via webhook)
    // Sinon les leads livrés réapparaissent comme "disponibles".
    const all: string[] = [];
    const PAGE = 1000;
    for (let from = 0; from < 50000; from += PAGE) {
      const { data, error } = await supabase
        .from("whatsapp_notification_logs")
        .select("context_ref")
        .eq("template_key", WA_TEMPLATE_KEY)
        .in("status", ["sent", "delivered", "read"])
        .eq("context_type", "lead")
        .not("context_ref", "is", null)
        .range(from, from + PAGE - 1);
      if (error) {
        toast.error("Erreur chargement envois WhatsApp", { description: error.message });
        break;
      }
      const rows = data || [];
      rows.forEach((r: any) => { if (r.context_ref) all.push(r.context_ref); });
      if (rows.length < PAGE) break;
    }
    setWaAlreadySent(new Set(all));
  };

  const handleWaPreview = async () => {
    setWaPreviewLoading(true);
    setWaPreview(null);
    const { data, error } = await supabase.functions.invoke("send-followup-whatsapp", {
      body: { mode: "preview", first_name: "V-Yael" },
    });
    setWaPreviewLoading(false);
    if (error || data?.error) {
      toast.error("Erreur aperçu WhatsApp", { description: error?.message || data?.error });
      return;
    }
    setWaPreview(data);
  };

  const handleWaTest = async () => {
    setWaTesting(true);
    const { data, error } = await supabase.functions.invoke("send-followup-whatsapp", {
      body: { mode: "test", first_name: "Christ" },
    });
    setWaTesting(false);
    if (error || data?.error || data?.ok === false) {
      toast.error("Échec test WhatsApp", { description: error?.message || data?.error || JSON.stringify(data?.result || {}) });
      return;
    }
    toast.success("Message WhatsApp test envoyé", { description: "Vérifie ton numéro test." });
  };

  const handleWaSend = async () => {
    if (waSelectedIds.size === 0) return;
    setWaSending(true);
    setWaLastResult(null);
    const ids = Array.from(waSelectedIds);
    let totalSent = 0, totalSkipped = 0, totalFailed = 0, totalProcessed = 0;
    let aborted = false;
    // Batches of 3 (Edge Function enforces MAX_BATCH=3)
    for (let i = 0; i < ids.length; i += 3) {
      const slice = ids.slice(i, i + 3);
      const { data, error } = await supabase.functions.invoke("send-followup-whatsapp", {
        body: { mode: "send", lead_ids: slice, allowResend: waAllowResend },
      });
      if (error || data?.error) {
        toast.error(`Batch ${i / 3 + 1} échoué`, { description: error?.message || data?.error });
        totalFailed += slice.length;
        continue;
      }
      const s = data?.summary || {};
      totalSent += s.sent || 0;
      totalSkipped += s.skipped || 0;
      totalFailed += s.failed || 0;
      totalProcessed += s.processed || 0;

      // Detect Meta payment issue (error 131042) → stop the campaign immediately
      const results = Array.isArray(data?.results) ? data.results : [];
      const hasPaymentIssue = results.some((r: any) =>
        r?.status === "failed" && typeof r?.reason === "string" && r.reason.includes("131042")
      );
      if (hasPaymentIssue) {
        aborted = true;
        toast.error("⚠️ Problème de paiement Meta WhatsApp", {
          description: "Règle ta facturation sur business.facebook.com → WhatsApp puis relance. Campagne stoppée.",
          duration: 15000,
        });
        break;
      }
    }
    setWaSending(false);
    setWaLastResult({ sent: totalSent, skipped: totalSkipped, failed: totalFailed, processed: totalProcessed, total_requested: ids.length });
    setWaSelectedIds(new Set());
    await loadWaAlreadySent();
    if (!aborted) {
      toast.success(`Campagne WhatsApp terminée`, {
        description: `${totalSent} envoyés · ${totalSkipped} ignorés · ${totalFailed} échecs sur ${ids.length}`,
      });
    }
  };

  // Retry only the leads that previously failed (never delivered)
  const handleWaRetryFailed = async () => {
    setWaSending(true);
    setWaLastResult(null);
    const locationLeadIds = leads.filter((l) => l.campaign_key === "location" && l.phone).map((l) => l.id);
    if (locationLeadIds.length === 0) {
      setWaSending(false);
      toast.info("Aucun lead Location avec téléphone");
      return;
    }
    // Fetch all logs for these leads in chunks to bypass row limits
    const allLogs: { context_ref: string; status: string }[] = [];
    for (let i = 0; i < locationLeadIds.length; i += 500) {
      const slice = locationLeadIds.slice(i, i + 500);
      const { data } = await supabase
        .from("whatsapp_notification_logs")
        .select("context_ref,status")
        .eq("template_key", WA_TEMPLATE_KEY)
        .in("context_ref", slice)
        .limit(15000);
      if (data) allLogs.push(...(data as any));
    }
    const everSent = new Set<string>();
    const everFailed = new Set<string>();
    for (const r of allLogs) {
      if (!r.context_ref) continue;
      if (["sent", "delivered", "read"].includes(r.status)) everSent.add(r.context_ref);
      if (r.status === "failed") everFailed.add(r.context_ref);
    }
    const failedOnly = [...everFailed].filter((id) => !everSent.has(id));
    if (failedOnly.length === 0) {
      setWaSending(false);
      toast.info("Aucun échec à relancer 🎉");
      return;
    }
    if (!confirm(`Relancer ${failedOnly.length} lead(s) en échec ?`)) {
      setWaSending(false);
      return;
    }
    let totalSent = 0, totalSkipped = 0, totalFailed = 0, totalProcessed = 0;
    for (let i = 0; i < failedOnly.length; i += 3) {
      const slice = failedOnly.slice(i, i + 3);
      const { data, error } = await supabase.functions.invoke("send-followup-whatsapp", {
        body: { mode: "send", lead_ids: slice, allowResend: true },
      });
      if (error || data?.error) {
        totalFailed += slice.length;
        continue;
      }
      const s = data?.summary || {};
      totalSent += s.sent || 0;
      totalSkipped += s.skipped || 0;
      totalFailed += s.failed || 0;
      totalProcessed += s.processed || 0;
    }
    setWaSending(false);
    setWaLastResult({ sent: totalSent, skipped: totalSkipped, failed: totalFailed, processed: totalProcessed, total_requested: failedOnly.length });
    await loadWaAlreadySent();
    toast.success("Relance des échecs terminée", {
      description: `${totalSent} envoyés · ${totalSkipped} ignorés · ${totalFailed} échecs sur ${failedOnly.length}`,
    });
  };

  // ───── Filtered leads (WhatsApp)
  const waFilteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.campaign_key !== "location") return false;
      if (!l.phone) return false;
      if (!waAllowResend && waAlreadySent.has(l.id)) return false;
      if (waSearch) {
        const s = waSearch.toLowerCase();
        const hay = `${l.email} ${l.first_name || ""} ${l.last_name || ""} ${l.phone || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [leads, waAlreadySent, waAllowResend, waSearch]);

  const toggleWaSelect = (id: string) => {
    setWaSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleWaSelectAll = () => {
    if (waSelectedIds.size === waFilteredLeads.length) setWaSelectedIds(new Set());
    else setWaSelectedIds(new Set(waFilteredLeads.map((l) => l.id)));
  };

  useEffect(() => {
    if (activeTab === "whatsapp") loadWaAlreadySent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ───── Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.campaign_key !== selectedCampaign) return false;
      if (hideAlreadySent && sentLeadIds.has(l.id)) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${l.email} ${l.first_name || ""} ${l.last_name || ""} ${l.phone || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [leads, selectedCampaign, hideAlreadySent, sentLeadIds, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
  };

  // ───── CSV line parser (handles quoted commas)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result.map((c) => c.replace(/^"|"$/g, ""));
  };

  // ───── Import CSV — Filtre strict : Logisorama + Qualifié → Location uniquement
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      // Strip BOM
      const clean = text.replace(/^\uFEFF/, "");
      const lines = clean.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV vide");
      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
      const nameIdx = headers.findIndex((h) => h.includes("nom") || h.includes("name"));
      const emailIdx = headers.findIndex((h) => h.includes("e-mail") || h.includes("email") || h.includes("adresse e"));
      const sourceIdx = headers.findIndex((h) => h === "source");
      const formulaireIdx = headers.findIndex((h) => h.includes("formulaire"));
      const etapeIdx = headers.findIndex((h) => h.includes("étape") || h.includes("etape") || h.includes("stage"));
      const phoneIdx = headers.findIndex((h) => h.includes("téléphone") || h.includes("telephone") || h.includes("phone"));
      if (emailIdx === -1) throw new Error("Colonne email introuvable");
      if (formulaireIdx === -1) throw new Error("Colonne 'Formulaire' introuvable");
      if (etapeIdx === -1) throw new Error("Colonne 'Étape' introuvable");

      const parsed: any[] = [];
      let rejectedFormulaire = 0;
      let rejectedEtape = 0;
      let rejectedEmail = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const email = cols[emailIdx]?.trim();
        if (!email || !email.includes("@")) { rejectedEmail++; continue; }

        const formulaire = cols[formulaireIdx] || "";
        const etape = cols[etapeIdx] || "";

        const isLogisorama = formulaire.toLowerCase().includes("logisorama");
        const normEtape = etape
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        const isQualifie = normEtape === "qualifie";

        if (!isLogisorama) { rejectedFormulaire++; continue; }
        if (!isQualifie) { rejectedEtape++; continue; }

        const fullName = nameIdx >= 0 ? cols[nameIdx] : "";
        const parts = fullName.split(" ");
        parsed.push({
          email,
          prenom: parts[0] || null,
          nom: parts.slice(1).join(" ") || null,
          telephone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          source: sourceIdx >= 0 ? cols[sourceIdx] || "CSV Import" : "CSV Import",
          formulaire,
          etape,
        });
      }

      if (parsed.length === 0) {
        toast.error("Aucun lead conforme", {
          description: `Vérifie que le CSV contient des leads avec Formulaire « Logisorama » ET Étape « Qualifié ». Rejetés : ${rejectedFormulaire} hors Logisorama · ${rejectedEtape} non Qualifiés.`,
        });
        setImporting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("import-leads-csv", {
        body: {
          leads: parsed,
          formulaire_name: importFile.name,
          campaign_key: "location", // verrouillé
        },
      });
      if (error) throw error;
      const reattached = data.reattached || 0;
      toast.success(`Import terminé : ${data.inserted} nouveau(x) + ${reattached} rattaché(s) à Location`, {
        description:
          `📊 Sur ${lines.length - 1} lignes du CSV :\n` +
          `• ✅ ${data.inserted} nouveaux importés\n` +
          `• 🔗 ${reattached} existants rattachés à Location\n` +
          `• 🔁 ${data.duplicates} déjà rattachés (vrais doublons)\n` +
          `• 🚫 ${rejectedFormulaire} rejetés (formulaire ≠ Logisorama)\n` +
          `• 🚫 ${rejectedEtape} rejetés (étape ≠ Qualifié)\n` +
          `• ⚠️ ${data.errors || 0} erreurs`,
        duration: 12000,
      });
      setImportOpen(false);
      setImportFile(null);
      loadLeads();
    } catch (err) {
      toast.error("Erreur import", { description: err instanceof Error ? err.message : "Erreur inconnue" });
    } finally {
      setImporting(false);
    }
  };

  // ───── Send batch
  const currentCampaign = campaigns.find((c) => c.campaign_key === selectedCampaign);

  const handleConfirmSend = async () => {
    if (!currentCampaign || selectedIds.size === 0) return;
    setSending(true);
    setConfirmOpen(false);
    const { data, error } = await supabase.functions.invoke("send-followup-campaign", {
      body: {
        mode: "send",
        campaignKey: currentCampaign.campaign_key,
        leadIds: Array.from(selectedIds),
        allowResend,
      },
    });
    setSending(false);
    if (error || data?.error) {
      toast.error("Erreur envoi", { description: error?.message || data?.error });
      return;
    }
    toast.success("Campagne envoyée", {
      description: `${data.sent} envoyés · ${data.failed} échecs · ${data.skipped_already_sent} déjà envoyés · ${data.skipped_unsubscribed} désinscrits`,
    });
    setSelectedIds(new Set());
    loadLeads();
  };

  // ───── Open lead email history
  const openLeadHistory = async (lead: Lead) => {
    setHistoryLead(lead);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRows([]);
    const { data, error } = await supabase
      .from("lead_email_logs")
      .select("id, recipient_email, campaign_key, subject, status, error_message, created_at, test_send, delivered_at, opened_at, last_opened_at, opens_count, clicked_at, last_clicked_at, clicks_count, bounced_at, complained_at, last_click_url")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error("Erreur historique", { description: error.message });
    setHistoryRows((data || []) as LogRow[]);
    setHistoryLoading(false);
  };

  // ───── View campaign HTML from a log row
  const viewCampaignFromLog = async (campaignKey: string) => {
    const camp = campaigns.find((c) => c.campaign_key === campaignKey);
    if (!camp) {
      toast.error("Campagne introuvable", { description: campaignKey });
      return;
    }
    handlePreview(camp);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campagnes de suivi</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Emails de relance pour vos leads importés (Facebook Lead Ads, CSV).
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
       <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="campagnes">Campagnes</TabsTrigger>
          <TabsTrigger value="leads">Leads & envoi</TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* ───────── ONGLET 1 : CAMPAGNES ───────── */}
        <TabsContent value="campagnes" className="space-y-4 mt-4">
          {loadingCamp ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((c) => (
                <Card key={c.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{c.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">{c.subject}</CardDescription>
                      </div>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>
                        {c.status === "active" ? "Active" : c.status === "draft" ? "Brouillon" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">CTA :</span> {c.cta_label}
                      </div>
                      <div className="truncate">
                        <span className="font-medium text-foreground">URL :</span> {c.cta_url}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(c)}
                        disabled={c.status !== "active"}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Aperçu
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(c)}
                        disabled={c.status !== "active" || testingKey === c.campaign_key}
                      >
                        {testingKey === c.campaign_key ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4 mr-1" />
                        )}
                        Test
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(c.campaign_key);
                          setActiveTab("leads");
                        }}
                        disabled={c.status !== "active"}
                      >
                        <Send className="h-4 w-4 mr-1" /> Envoyer aux leads
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ───────── ONGLET 2 : LEADS & ENVOI ───────── */}
        <TabsContent value="leads" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Campagne</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.campaign_key} value={c.campaign_key}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Recherche</Label>
                  <Input
                    placeholder="Email, nom, téléphone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox
                    id="hide-sent"
                    checked={hideAlreadySent}
                    onCheckedChange={(v) => setHideAlreadySent(!!v)}
                    disabled={allowResend}
                  />
                  <Label htmlFor="hide-sent" className="text-sm cursor-pointer">
                    Masquer déjà envoyés
                  </Label>
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox
                    id="allow-resend"
                    checked={allowResend}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setAllowResend(on);
                      if (on) setHideAlreadySent(false);
                    }}
                  />
                  <Label htmlFor="allow-resend" className="text-sm cursor-pointer text-amber-700 dark:text-amber-400 font-medium">
                    🔁 Renvoyer aux leads déjà contactés
                  </Label>
                </div>
                <Button onClick={() => setImportOpen(true)} variant="outline">
                  <Upload className="h-4 w-4 mr-1" /> Importer CSV
                </Button>
              </div>

              {(() => {
                const totalCampaign = leads.filter((l) => l.campaign_key === selectedCampaign).length;
                const sentInCampaign = leads.filter(
                  (l) => l.campaign_key === selectedCampaign && sentLeadIds.has(l.id),
                ).length;
                const remaining = totalCampaign - sentInCampaign;
                return (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="bg-muted/40">
                      Total campagne : <strong className="ml-1">{totalCampaign}</strong>
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                      Déjà envoyés : <strong className="ml-1">{sentInCampaign}</strong>
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
                      Restants à envoyer : <strong className="ml-1">{remaining}</strong>
                    </Badge>
                    {hideAlreadySent && sentInCampaign > 0 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                        ⓘ {sentInCampaign} masqués par le filtre
                      </Badge>
                    )}
                  </div>
                );
              })()}

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredLeads.length > 0 && selectedIds.size === filteredLeads.length
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Téléphone</TableHead>
                      <TableHead className="hidden md:table-cell">Importé</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLeads ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          Aucun lead pour cette campagne. Importez un CSV ci-dessus.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((l) => {
                        const already = sentLeadIds.has(l.id);
                        const lockedRow = already && !allowResend;
                        return (
                          <TableRow key={l.id} className={lockedRow ? "opacity-60" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(l.id)}
                                onCheckedChange={() => toggleSelect(l.id)}
                                disabled={lockedRow}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {l.first_name || l.last_name
                                ? `${l.first_name || ""} ${l.last_name || ""}`.trim()
                                : "—"}
                              <div className="md:hidden text-xs text-muted-foreground truncate max-w-[180px]">
                                {l.email}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{l.email}</TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">{l.phone || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {format(new Date(l.imported_at), "dd/MM/yy", { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1">
                                {(() => {
                                  const t = trackingByLead.get(l.id);
                                  if (!already && !t?.sent) {
                                    return <Badge variant="outline" className="text-xs">En attente</Badge>;
                                  }
                                  return (
                                    <>
                                      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 border-green-300" title="Email envoyé">
                                        ✉ Envoyé{(sentCountByLead.get(l.id) || 0) > 1 ? ` ·${sentCountByLead.get(l.id)}` : ""}
                                      </Badge>
                                      {t?.opened ? (
                                        <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 border-blue-300" title="Email ouvert">
                                          👁 Ouvert{t.opens > 1 ? ` ·${t.opens}` : ""}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] opacity-50" title="Pas encore ouvert">
                                          👁 —
                                        </Badge>
                                      )}
                                      {t?.clicked && (
                                        <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 border-purple-300" title="Lien cliqué">
                                          🔗 Cliqué{t.clicks > 1 ? ` ·${t.clicks}` : ""}
                                        </Badge>
                                      )}
                                      {t?.bounced && (
                                        <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-800 border-red-300" title="Bounce / échec">
                                          ✗ Bounce
                                        </Badge>
                                      )}
                                    </>
                                  );
                                })()}
                                {(sentCountByLead.get(l.id) || 0) > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => openLeadHistory(l)}
                                    title="Voir les emails envoyés"
                                  >
                                    <Mail className="h-3.5 w-3.5 mr-1" />
                                    Voir
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {selectedIds.size > 0 && currentCampaign && (
            <div className="sticky bottom-4 z-10">
              <Card className="border-primary bg-background shadow-lg">
                <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{selectedIds.size} leads sélectionnés</div>
                    <div className="text-sm text-muted-foreground">
                      Campagne : <span className="font-medium">{currentCampaign.name}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {allowResend && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                        🔁 Mode renvoi activé
                      </Badge>
                    )}
                    <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                      Désélectionner
                    </Button>
                    <Button onClick={() => setConfirmOpen(true)} disabled={sending}>
                      {sending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      Envoyer la campagne
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ───────── ONGLET 3 : LOGS ───────── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden md:table-cell">Erreur</TableHead>
                      <TableHead className="w-24 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          Aucun envoi pour le moment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => {
                        const badge = STATUS_BADGE[log.status] || STATUS_BADGE.pending;
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(log.created_at), "dd/MM HH:mm", { locale: fr })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.recipient_email}
                              {log.test_send && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  TEST
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {log.campaign_key}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                              {log.subject || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${badge.className}`}>
                                {badge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs truncate">
                              {log.error_message || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => viewCampaignFromLog(log.campaign_key)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── ONGLET WHATSAPP LOCATION ───────── */}
        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Campagne WhatsApp — Location (RDV gratuit Crissier)
              </CardTitle>
              <CardDescription>
                Template Meta actif : <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{waMetaTemplateName || "—"}</code>
                {waMetaTemplateName?.endsWith("_v1") && (
                  <span className="ml-2 inline-block text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">v2 en attente Meta</span>
                )}
                {waMetaTemplateName?.endsWith("_v2") && (
                  <span className="ml-2 inline-block text-[10px] uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">v2 actif</span>
                )}
                {" · "}Bouton CTA : <strong>Réserver mon RDV</strong>
                {" · "}Lien activation dans le corps du message.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleWaPreview} disabled={waPreviewLoading}>
                  {waPreviewLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
                  Aperçu
                </Button>
                <Button variant="outline" onClick={handleWaTest} disabled={waTesting}>
                  {waTesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-1" />}
                  Test interne
                </Button>
              </div>

              {waPreview && (
                <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                  <div className="text-xs text-muted-foreground">Aperçu du message envoyé :</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm bg-background border rounded p-3">{waPreview.body_rendered}</pre>
                  <div className="text-xs space-y-1">
                    <div><strong>Variable {"{{1}}"} :</strong> {waPreview.first_name_param}</div>
                    <div className="truncate"><strong>Bouton URL :</strong> <a href={waPreview.button_url} target="_blank" rel="noopener" className="text-primary underline">{waPreview.button_url}</a></div>
                    <div className="truncate"><strong>Lien activation :</strong> <a href={waPreview.activation_link} target="_blank" rel="noopener" className="text-primary underline">{waPreview.activation_link}</a></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[220px]">
                  <Label className="text-xs">Recherche</Label>
                  <Input
                    placeholder="Email, nom, téléphone…"
                    value={waSearch}
                    onChange={(e) => setWaSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox
                    id="wa-allow-resend"
                    checked={waAllowResend}
                    onCheckedChange={(v) => setWaAllowResend(v === true)}
                  />
                  <Label htmlFor="wa-allow-resend" className="text-sm cursor-pointer text-amber-700 dark:text-amber-400 font-medium">
                    🔁 Renvoyer aux leads déjà contactés
                  </Label>
                </div>
                <Button
                  variant="outline"
                  onClick={handleWaRetryFailed}
                  disabled={waSending}
                  className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                >
                  {waSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <span className="mr-1">🔁</span>}
                  Réessayer les échecs
                </Button>
                <Button
                  onClick={handleWaSend}
                  disabled={waSelectedIds.size === 0 || waSending}
                >
                  {waSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Envoyer aux {waSelectedIds.size} lead{waSelectedIds.size > 1 ? "s" : ""}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Leads location avec téléphone : <strong className="ml-1">{leads.filter((l) => l.campaign_key === "location" && l.phone).length}</strong></Badge>
                <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">Déjà envoyés WhatsApp : <strong className="ml-1">{waAlreadySent.size}</strong></Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">Disponibles : <strong className="ml-1">{waFilteredLeads.length}</strong></Badge>
              </div>

              {waLastResult && (
                <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">
                  <div className="font-semibold text-green-900">Dernier envoi : {waLastResult.processed} / {waLastResult.total_requested} traités</div>
                  <div className="text-green-800 text-xs mt-1">
                    ✅ {waLastResult.sent} envoyés · ⏭ {waLastResult.skipped} ignorés · ❌ {waLastResult.failed} échecs
                  </div>
                </div>
              )}

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={waFilteredLeads.length > 0 && waSelectedIds.size === waFilteredLeads.length}
                          onCheckedChange={toggleWaSelectAll}
                        />
                      </TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waFilteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          Aucun lead disponible. Importez des leads location avec téléphone, ou activez le mode renvoi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      waFilteredLeads.map((l) => {
                        const already = waAlreadySent.has(l.id);
                        return (
                          <TableRow key={l.id}>
                            <TableCell>
                              <Checkbox
                                checked={waSelectedIds.has(l.id)}
                                onCheckedChange={() => toggleWaSelect(l.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {l.first_name || l.last_name ? `${l.first_name || ""} ${l.last_name || ""}`.trim() : "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{l.email}</TableCell>
                            <TableCell className="text-sm">{l.phone || "—"}</TableCell>
                            <TableCell>
                              {already ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">WhatsApp envoyé</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">En attente</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ───────── PREVIEW DIALOG ───────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="truncate">{previewCampaign?.name}</DialogTitle>
                <DialogDescription className="truncate">{previewCampaign?.subject}</DialogDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={previewMode === "desktop" ? "default" : "outline"}
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === "mobile" ? "default" : "outline"}
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 p-4">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div
                className="mx-auto bg-white rounded-md shadow-md overflow-hidden transition-all"
                style={{ maxWidth: previewMode === "mobile" ? 375 : 700 }}
              >
                <iframe
                  srcDoc={previewHtml}
                  title="Aperçu email"
                  className="w-full border-0"
                  style={{ height: "75vh" }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────── IMPORT CSV DIALOG ───────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer un CSV de leads Meta</DialogTitle>
            <DialogDescription>
              Export Facebook Lead Ads. Filtre strict appliqué automatiquement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Filtre automatique — Campagne Location
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Seuls les leads dont le <strong>Formulaire</strong> contient « Logisorama »
                <strong> ET</strong> dont l'<strong>Étape</strong> est <strong>« Qualifié »</strong> seront importés.
                Tous les autres (À évaluer, Contacté, Converti, RENOV IA, vendeurs/acheteurs…)
                sont automatiquement écartés.
              </p>
            </div>
            <div>
              <Label className="text-sm">Fichier CSV</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              {importFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  <FileText className="inline h-3 w-3 mr-1" />
                  {importFile.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Cible :</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Campagne Location
              </span>
              <span className="text-xs text-muted-foreground">(rattachement automatique)</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
              Annuler
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Importer vers Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────── LEAD HISTORY DIALOG ───────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails envoyés
            </DialogTitle>
            <DialogDescription>
              {historyLead && (
                <>
                  {historyLead.first_name || historyLead.last_name
                    ? `${historyLead.first_name || ""} ${historyLead.last_name || ""}`.trim()
                    : historyLead.email}
                  {" — "}
                  <span className="text-xs">{historyLead.email}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : historyRows.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Aucun email envoyé à ce lead.
            </div>
          ) : (
            <div className="space-y-3">
              {historyRows.map((row) => {
                const badge = STATUS_BADGE[row.status] || STATUS_BADGE.pending;
                return (
                  <Card key={row.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {row.campaign_key}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${badge.className}`}>
                            {badge.label}
                          </Badge>
                          {row.test_send && (
                            <Badge variant="outline" className="text-[10px]">TEST</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(row.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <div className="text-sm font-medium">{row.subject || "(sans sujet)"}</div>
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        <Badge variant="outline" className="bg-green-50 border-green-300" title={row.created_at}>
                          ✉ Envoyé · {format(new Date(row.created_at), "dd/MM HH:mm", { locale: fr })}
                        </Badge>
                        {row.opened_at && (
                          <Badge variant="outline" className="bg-blue-50 border-blue-300" title={row.last_opened_at || row.opened_at}>
                            👁 Ouvert{(row.opens_count || 0) > 1 ? ` ${row.opens_count}×` : ""} · {format(new Date(row.opened_at), "dd/MM HH:mm", { locale: fr })}
                          </Badge>
                        )}
                        {row.clicked_at && (
                          <Badge variant="outline" className="bg-purple-50 border-purple-300" title={row.last_click_url || ""}>
                            🔗 Cliqué{(row.clicks_count || 0) > 1 ? ` ${row.clicks_count}×` : ""} · {format(new Date(row.clicked_at), "dd/MM HH:mm", { locale: fr })}
                          </Badge>
                        )}
                        {row.bounced_at && (
                          <Badge variant="outline" className="bg-red-50 border-red-300">✗ Bounce</Badge>
                        )}
                      </div>
                      {row.error_message && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                          {row.error_message}
                        </div>
                      )}
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setHistoryOpen(false);
                            viewCampaignFromLog(row.campaign_key);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Voir le contenu envoyé
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ───────── CONFIRM SEND ───────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmer l'envoi
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <span className="block text-base text-foreground">
                Vous êtes sur le point d'envoyer la campagne{" "}
                <strong>{currentCampaign?.name}</strong> à <strong>{selectedIds.size} leads</strong>.
              </span>
              <span className="block text-sm">
                Cette action est irréversible. Les emails seront envoyés immédiatement via Logisorama.
              </span>
              {allowResend && (
                <span className="block text-sm font-medium text-amber-600 dark:text-amber-400">
                  ⚠️ Mode renvoi activé : l'email sera également envoyé aux leads ayant déjà reçu cette campagne.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              <Send className="h-4 w-4 mr-1" /> Confirmer l'envoi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
