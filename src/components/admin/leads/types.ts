export type Lead = {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  localite: string | null;
  budget: string | null;
  statut_emploi: string | null;
  permis_nationalite: string | null;
  poursuites: boolean | null;
  a_garant: boolean | null;
  is_qualified: boolean | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  created_at: string | null;
  contacted: boolean | null;
  notes: string | null;
  formulaire: string | null;
  type_recherche: string | null;
};

export type PhoneAppointment = {
  id: string;
  lead_id: string | null;
  slot_start: string;
  slot_end: string;
  status: string;
  prospect_email: string | null;
};

export type PipelineStage = "nouveau" | "rdv" | "contacte" | "qualifie" | "client";

export const STAGES: { key: PipelineStage; label: string; gradient: string; ring: string }[] = [
  { key: "nouveau", label: "Nouveau", gradient: "from-sky-500/15 to-sky-500/5", ring: "ring-sky-500/30" },
  { key: "rdv", label: "RDV téléphonique", gradient: "from-amber-500/15 to-amber-500/5", ring: "ring-amber-500/30" },
  { key: "contacte", label: "Contacté", gradient: "from-violet-500/15 to-violet-500/5", ring: "ring-violet-500/30" },
  { key: "qualifie", label: "Qualifié", gradient: "from-emerald-500/15 to-emerald-500/5", ring: "ring-emerald-500/30" },
  { key: "client", label: "Client", gradient: "from-primary/20 to-primary/5", ring: "ring-primary/40" },
];

export function getStage(lead: Lead, hasAppointment: boolean, isClient: boolean): PipelineStage {
  if (isClient) return "client";
  if (lead.is_qualified === true) return "qualifie";
  if (lead.contacted) return "contacte";
  if (hasAppointment) return "rdv";
  return "nouveau";
}

export function initials(lead: Lead): string {
  const a = (lead.prenom || "").trim();
  const b = (lead.nom || "").trim();
  if (a || b) return ((a[0] || "") + (b[0] || "")).toUpperCase() || lead.email[0].toUpperCase();
  return (lead.email[0] || "?").toUpperCase();
}

export function fullName(lead: Lead): string {
  const n = `${lead.prenom || ""} ${lead.nom || ""}`.trim();
  return n || lead.email;
}
