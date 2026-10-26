// Paramètre « state » des connexions OAuth (Google Agenda) : signé et limité dans le temps,
// pour que personne ne puisse rattacher un agenda au compte d'un autre utilisateur.
// deno-lint-ignore-file no-explicit-any
const enc = new TextEncoder();
const DUREE_MS = 15 * 60 * 1000;

async function cle(): Promise<CryptoKey> {
  const secret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(texte: string): Uint8Array {
  const b64 = texte.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function signature(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await cle(), enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

/** Fabrique un state signé valable 15 minutes. */
export async function signerEtat(data: Record<string, unknown>): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ ...data, exp: Date.now() + DUREE_MS })));
  return payload + "." + (await signature(payload));
}

/** Lit un state signé ; null s'il est absent, modifié ou expiré. */
export async function lireEtat(state: string | null): Promise<Record<string, any> | null> {
  if (!state) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const attendu = await signature(payload);
  if (attendu.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= attendu.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(deB64url(payload)));
    if (typeof data?.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/** Adresse de retour autorisée (sites de l'agence et aperçus Lovable). */
export function retourAutorise(url: unknown): boolean {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname;
    return h === "logisorama.ch" || h.endsWith(".logisorama.ch") || h.endsWith(".lovable.app") ||
      h.endsWith(".lovableproject.com");
  } catch {
    return false;
  }
}
