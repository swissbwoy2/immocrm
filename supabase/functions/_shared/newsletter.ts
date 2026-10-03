// @deno-types="npm:@types/sanitize-html@2.16.0"
import sanitizeHtml from "npm:sanitize-html@2.17.0";

export const CATEGORIES = ["landlord", "seller", "renter", "buyer", "cleaning", "relocation"];
export function email(value: unknown): string {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  if (s.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s))
    throw new Error("Adresse email invalide");
  return s;
}
export function categories(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((v) => !CATEGORIES.includes(v))
  )
    throw new Error("Choisissez au moins une catégorie");
  return [...new Set(value)];
}
export function text(value: unknown, max: number): string {
  const s = String(value ?? "").trim();
  if (!s || s.length > max || /[\r\n]/.test(s))
    throw new Error(`Texte requis, ${max} caractères maximum`);
  return s;
}
export function cleanHtml(value: unknown): string {
  const raw = String(value ?? "");
  if (!raw.trim() || new TextEncoder().encode(raw).length > 250_000)
    throw new Error("Code HTML requis (250 Ko maximum)");
  const clean = sanitizeHtml(raw, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "html",
      "head",
      "body",
      "title",
      "style",
      "img",
      "center",
    ],
    allowedAttributes: {
      "*": [
        "style",
        "class",
        "id",
        "align",
        "valign",
        "width",
        "height",
        "bgcolor",
        "dir",
        "lang",
        "role",
      ],
      a: ["href", "target", "title"],
      img: ["src", "alt", "width", "height"],
      table: [
        "cellpadding",
        "cellspacing",
        "border",
        "role",
        "width",
        "align",
        "style",
        "class",
        "id",
      ],
    },
    allowedSchemes: ["https", "mailto"],
    allowProtocolRelative: false,
    allowVulnerableTags: true,
    transformTags: {
      "*": (tagName, attribs) => {
        if (
          attribs.style &&
          /expression\s*\(|javascript\s*:|@import|behavior\s*:|-moz-binding/i.test(
            attribs.style,
          )
        )
          delete attribs.style;
        // Conditional Outlook/VML comments are removed by the sanitizer. Keep
        // the normal CTA visible in Outlook as its accessible fallback.
        if (attribs.style)
          attribs.style = attribs.style.replace(
            /mso-hide\s*:\s*all\s*;?/gi,
            "",
          );
        return { tagName, attribs };
      },
    },
  });
  if (!/<(?:table|p|div|h1|img)\b/i.test(clean))
    throw new Error("Le HTML ne contient pas de newsletter");
  // Relative/local images cannot be displayed by an email client.
  for (const match of clean.matchAll(/\bsrc="([^"]*)"/gi)) {
    if (!/^https:\/\//i.test(match[1]))
      throw new Error("Les images doivent utiliser une adresse HTTPS publique");
  }
  for (const match of clean.matchAll(/url\(([^)]+)\)/gi)) {
    if (!/^https:\/\//i.test(match[1].trim().replace(/^['"]|['"]$/g, "")))
      throw new Error("Les images CSS doivent être hébergées en HTTPS");
  }
  if (/@import|expression\s*\(/i.test(clean))
    throw new Error("CSS externe ou actif non autorisé");
  return clean;
}
export function recipientHtml(html: string, token: string): string {
  const url = `https://logisorama.ch/unsubscribe?token=${encodeURIComponent(token)}`;
  const hadPlaceholder =
    /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}|\{\{unsubscribe_url\}\}/.test(html);
  let result = html
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", url)
    .replaceAll("{{unsubscribe_url}}", url);
  if (!hadPlaceholder) {
    const footer = `<p style="text-align:center;font:12px Arial;color:#6b7280;padding:20px"><a href="${url}" style="color:#6b7280">Se désinscrire des newsletters Logisorama</a></p>`;
    result = /<\/body>/i.test(result)
      ? result.replace(/<\/body>/i, footer + "</body>")
      : result + footer;
  }
  return result;
}
export function retryStatus(
  attempt: number,
  status: number,
): "pending" | "failed" | "attention" {
  if (status === 409 || status === 0 || status >= 500)
    return attempt >= 8 ? "attention" : "pending";
  if (status === 429) return attempt >= 8 ? "failed" : "pending";
  return "failed";
}
