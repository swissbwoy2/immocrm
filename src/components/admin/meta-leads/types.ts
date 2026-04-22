export type MetaLead = {
  id: string;
  leadgen_id: string;
  source: string;
  page_id: string | null;
  page_name: string | null;
  form_id: string | null;
  form_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  ad_reference_label: string | null;
  ad_reference_url: string | null;
  is_organic: boolean | null;
  lead_created_time_meta: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  raw_answers: Record<string, any> | null;
  raw_meta_payload: any;
  lead_status: MetaLeadStatus;
  assigned_to: string | null;
  notes: string | null;
  imported_at: string | null;
  created_at: string;
};

export type MetaLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "not_qualified"
  | "converted"
  | "archived";

export const META_STAGES: {
  key: MetaLeadStatus;
  label: string;
  gradient: string;
  ring: string;
  badge: string;
}[] = [
  { key: "new", label: "Nouveau", gradient: "from-sky-500/15 to-sky-500/5", ring: "ring-sky-500/30", badge: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  { key: "contacted", label: "Contacté", gradient: "from-amber-500/15 to-amber-500/5", ring: "ring-amber-500/30", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { key: "qualified", label: "Qualifié", gradient: "from-emerald-500/15 to-emerald-500/5", ring: "ring-emerald-500/30", badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  { key: "not_qualified", label: "Non qualifié", gradient: "from-slate-500/15 to-slate-500/5", ring: "ring-slate-500/30", badge: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  { key: "converted", label: "Converti", gradient: "from-violet-500/15 to-violet-500/5", ring: "ring-violet-500/30", badge: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  { key: "archived", label: "Archivé", gradient: "from-rose-500/15 to-rose-500/5", ring: "ring-rose-500/30", badge: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
];

export function metaInitials(lead: MetaLead): string {
  const a = (lead.first_name || "").trim();
  const b = (lead.last_name || "").trim();
  if (a || b) return ((a[0] || "") + (b[0] || "")).toUpperCase() || (lead.email?.[0] || "?").toUpperCase();
  if (lead.full_name) return lead.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (lead.email?.[0] || "?").toUpperCase();
}

export function metaFullName(lead: MetaLead): string {
  const composed = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
  return lead.full_name || composed || lead.email || "Sans nom";
}

export type SourceBadge = {
  label: string;
  className: string;
};

export function getSourceBadge(lead: MetaLead): SourceBadge {
  if (lead.is_organic) {
    return { label: "Organique", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  }
  if (lead.source === "csv_import") {
    return { label: "CSV", className: "bg-orange-500/15 text-orange-600 border-orange-500/30" };
  }
  if (lead.source === "meta_leadgen" || lead.source === "meta_api") {
    return { label: "Meta", className: "bg-[#1877F2]/15 text-[#1877F2] border-[#1877F2]/30" };
  }
  return { label: lead.source || "—", className: "bg-muted text-muted-foreground" };
}

/**
 * Extract Q&A entries from a meta lead, supporting 3 formats:
 * 1) raw_answers (key-value JSONB)
 * 2) raw_meta_payload.field_data (Meta API native: [{name, values:[]}])
 * 3) raw_meta_payload flattened (CSV imports: budget, type_recherche, etc.)
 */
export function extractAnswers(lead: MetaLead): { question: string; answer: string }[] {
  const entries: { question: string; answer: string }[] = [];

  // Format 1: raw_answers
  if (lead.raw_answers && typeof lead.raw_answers === "object" && !Array.isArray(lead.raw_answers)) {
    for (const [k, v] of Object.entries(lead.raw_answers)) {
      const ans = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
      if (ans.trim()) entries.push({ question: humanizeKey(k), answer: ans });
    }
    if (entries.length > 0) return entries;
  }

  // Format 2: raw_meta_payload.field_data
  const fd = lead.raw_meta_payload?.field_data;
  if (Array.isArray(fd)) {
    for (const item of fd) {
      if (!item) continue;
      const q = item.name || item.label || "Question";
      const a = Array.isArray(item.values) ? item.values.join(", ") : String(item.values ?? "");
      if (a.trim()) entries.push({ question: humanizeKey(q), answer: a });
    }
    if (entries.length > 0) return entries;
  }

  // Format 3: raw_meta_payload flattened (CSV imports)
  const payload = lead.raw_meta_payload || {};
  const HIDDEN_KEYS = new Set([
    "original_lead_id",
    "original_source",
    "original_formulaire",
    "field_data",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]);
  for (const [k, v] of Object.entries(payload)) {
    if (HIDDEN_KEYS.has(k)) continue;
    if (v == null || v === "") continue;
    if (typeof v === "object") continue;
    entries.push({ question: humanizeKey(k), answer: String(v) });
  }

  return entries;
}

export function extractUtm(lead: MetaLead): Record<string, string> {
  const out: Record<string, string> = {};
  const p = lead.raw_meta_payload || {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    if (p[k]) out[k] = String(p[k]);
  }
  return out;
}

function humanizeKey(k: string): string {
  return k
    .replace(/[_-]+/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/^./, (c) => c.toUpperCase());
}
