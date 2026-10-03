// Parsing de la page détail d'une annonce (immobilier.ch & similaires).
// Factorisé depuis auto-offers-run pour être réutilisé par le backfill.
import { parseHTML } from "npm:linkedom@0.18.5";
import { cleanValue } from "./offre-message.ts";

export interface ListingDetails {
  surface: number | null;
  pieces: number | null;
  etage: string | null;
  disponibilite: string | null;
  description: string | null;
  type_bien: string | null;
  contact_gerance: string | null;
  contact_annonceur: string | null;
  contact_visite: string | null;
}

export const EMPTY_DETAILS: ListingDetails = {
  surface: null, pieces: null, etage: null, disponibilite: null,
  description: null, type_bien: null,
  contact_gerance: null, contact_annonceur: null, contact_visite: null,
};

function parseNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, "").replace(/'/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parseListingDetails(html: string): ListingDetails {
  const { document } = parseHTML(html);
  const body = document.querySelector("main") ?? document.body;
  const text = (body?.textContent ?? "").replace(/\u00a0|\u202f/g, " ").replace(/[ \t]+/g, " ");

  const pick = (re: RegExp): string | null => {
    const m = text.match(re);
    return m?.[1] ? m[1].trim() : null;
  };

  const surfaceRaw = pick(/surface[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*m/i) ?? pick(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)\b/i);
  const piecesRaw = pick(/(\d+(?:[.,]\d+)?)\s*(?:pièces|pieces|pcs)/i);
  const etage = pick(/étage\s*[:\-]?\s*([^\n.;]{1,30})/i) ?? pick(/(rez[- ]de[- ]chauss[ée]e)/i);
  const disponibilite = pick(/disponib(?:ilité|le)\s*(?:dès|à partir du)?\s*[:\-]?\s*([^\n.;]{1,40})/i);
  const typeBien = pick(/(appartement|studio|maison|villa|duplex|attique|loft|chambre)/i);

  const descNodes = Array.from(
    body?.querySelectorAll?.("[class*='description'], [class*='detail-text'], [itemprop='description'], article p") ?? [],
  ) as any[];
  let description: string | null = null;
  for (const n of descNodes) {
    const t = (n.textContent ?? "").replace(/\s+/g, " ").trim();
    if (t.length > (description?.length ?? 0)) description = t;
  }
  if (description && description.length < 40) description = null;

  const regie = pick(/(?:régie|gérance|agence)\s*[:\-]?\s*([^\n;]{2,60})/i);
  const phones = Array.from(text.matchAll(/(\+41[\s.\-]?\d[\d\s.\-]{7,}|0\d{2}[\s.\-]?\d{3}[\s.\-]?\d{2}[\s.\-]?\d{2})/g))
    .map(m => m[1].replace(/\s+/g, " ").trim());
  const uniquePhones = Array.from(new Set(phones));
  const email = pick(/([\w.\-+]+@[\w\-]+\.[\w.\-]+)/);

  const contact_gerance = [regie, uniquePhones[0]].filter(Boolean).join(" — ") || null;
  const contact_annonceur = [regie, email].filter(Boolean).join(" — ") || null;
  const contact_visite = uniquePhones[1] ?? uniquePhones[0] ?? null;

  return {
    surface: surfaceRaw ? parseNumber(surfaceRaw) : null,
    pieces: piecesRaw ? parseNumber(piecesRaw) : null,
    etage: cleanValue(etage),
    disponibilite: cleanValue(disponibilite),
    description: cleanValue(description),
    type_bien: cleanValue(typeBien),
    contact_gerance: cleanValue(contact_gerance),
    contact_annonceur: cleanValue(contact_annonceur),
    contact_visite: cleanValue(contact_visite),
  };
}

/** Retourne { details, status } — status: 'ok' | 'http_<code>' | 'error' */
export async function fetchListingDetails(
  url: string,
): Promise<{ details: ListingDetails; status: string }> {
  if (!url) return { details: { ...EMPTY_DETAILS }, status: "no_url" };
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LogisoramaBot/1.0; +https://logisorama.ch)",
        "Accept-Language": "fr-CH,fr;q=0.9",
      },
    });
    if (!res.ok) return { details: { ...EMPTY_DETAILS }, status: `http_${res.status}` };
    return { details: parseListingDetails(await res.text()), status: "ok" };
  } catch (e) {
    console.warn("fetchListingDetails failed", url, e);
    return { details: { ...EMPTY_DETAILS }, status: "error" };
  }
}
