import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

/**
 * 401 sans jeton, 403 si le rôle applicatif requis manque.
 * Le contrôle se fait avec le client porteur du jeton (RLS active).
 */
export async function requireAutomationOperator(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    throw new ToolError("401 unauthorized: jeton OAuth manquant ou invalide.");
  }
  const userId = ctx.getUserId();
  if (!userId) {
    throw new ToolError("401 unauthorized: jeton sans sujet (sub).");
  }
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    throw new ToolError(`403 forbidden: impossible de vérifier le rôle (${error.message}).`);
  }
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("automation_operator")) {
    throw new ToolError(
      "403 forbidden: le rôle applicatif « automation_operator » est requis pour cet outil.",
    );
  }
  return { supabase, userId, roles };
}

/** ISO 8601 avec l'offset Europe/Zurich. */
export function toZurichISO(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  const local = parts.replace(" ", "T");
  // Offset réel (CET/CEST) calculé à partir de l'écart local/UTC
  const asUtc = new Date(`${local}Z`).getTime();
  const offsetMinutes = Math.round((asUtc - date.getTime()) / 60000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${local}${sign}${hh}:${mm}`;
}

export function textResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

/** Journal d'audit — jamais de contenu de fichier, jamais de jeton ni d'URL signée. */
export async function auditLog(
  supabase: ReturnType<typeof supabaseForUser>,
  entry: {
    actor_user_id: string;
    tool: string;
    client_id?: string | null;
    document_id?: string | null;
    filename?: string | null;
    size_bytes?: number | null;
    outcome: "granted" | "denied" | "duplicate" | "invalid";
    detail?: string | null;
  },
) {
  const { error } = await supabase.from("automation_mcp_audit").insert(entry);
  if (error) console.warn("[mcp-audit]", error.message);
}
