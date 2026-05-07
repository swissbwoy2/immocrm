// Shared helpers for WhatsApp template rendering
// Always Europe/Zurich timezone

const TZ = "Europe/Zurich";

export function fmtPieces(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!isFinite(num)) return String(n);
  return Number.isInteger(num) ? String(num) : String(num);
}

export function fmtPrixCHF(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!isFinite(num)) return String(n);
  // Suisse: apostrophe '
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

const FR_MONTHS_FULL = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const FR_DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function partsTZ(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "long", hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: get("hour"),
    minute: get("minute"),
    weekday: get("weekday").toLowerCase(),
  };
}

export function fmtDateFR(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const p = partsTZ(d);
  // Map English weekday from Intl back to French day name (safer)
  const dayIdx = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return `${FR_DAYS[dayIdx]} ${p.day} ${FR_MONTHS_FULL[p.month - 1]} ${p.year} à ${p.hour}:${p.minute}`;
}

export function fmtDateCourtFR(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const p = partsTZ(d);
  return `${p.day} ${FR_MONTHS_FULL[p.month - 1]} ${p.year}`;
}

export function fmtHeureFR(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  const p = partsTZ(d);
  return `${p.hour}:${p.minute}`;
}

export function fmtDispo(value: string | null | undefined): string {
  if (!value || String(value).trim() === "") return "Sur demande";
  return String(value);
}

export function lienAnnonceOuFallback(url: string | null | undefined): string {
  if (!url || String(url).trim() === "") return "Sur demande";
  return String(url);
}

export async function loadOffreDetails(supabase: any, offre_id: string | null | undefined) {
  if (!offre_id) return null;
  const { data } = await supabase
    .from("offres")
    .select("id, titre, adresse, prix, pieces, surface, etage, lien_annonce, disponibilite, description, concierge_nom")
    .eq("id", offre_id)
    .maybeSingle();
  return data;
}

export async function loadClientProfile(supabase: any, client_id: string) {
  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, agent_id")
    .eq("id", client_id)
    .maybeSingle();
  if (!client?.user_id) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("prenom, nom, telephone, whatsapp_phone, whatsapp_opt_in")
    .eq("id", client.user_id)
    .maybeSingle();
  return { ...profile, client_user_id: client.user_id, agent_id: client.agent_id };
}

export async function loadAgentName(supabase: any, agent_id: string | null | undefined): Promise<string> {
  if (!agent_id) return "votre agent";
  const { data: agent } = await supabase
    .from("agents").select("user_id").eq("id", agent_id).maybeSingle();
  if (!agent?.user_id) return "votre agent";
  const { data: p } = await supabase
    .from("profiles").select("prenom, nom").eq("id", agent.user_id).maybeSingle();
  const full = `${p?.prenom || ""} ${p?.nom || ""}`.trim();
  return full || "votre agent";
}

export async function callSendWhatsApp(payload: Record<string, any>): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify(payload),
  });
  return await res.json().catch(() => ({}));
}
