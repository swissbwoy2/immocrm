import { escapeEmailHtml, renderCorporateEmail } from "./email-brand.ts";

/** Manual messages may contain plain text, HTML fragments, or a quoted full email.
 * Keep the authored content and personal signature inside the common outer frame.
 * Stored dossier templates stay editable plain text; branding happens at send time.
 */
export function renderCorrespondenceEmail(
  subject: string,
  body: string,
  signature?: string,
): string {
  const fullDocument = /^\s*(?:<!doctype\s+html[^>]*>\s*)?<html\b/i.test(body);
  const head = fullDocument
    ? body.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]
    : "";
  // System-generated messages (e.g. property offers) already have the frame.
  // Check the outer head only, never a marker inside quoted correspondence.
  if (head?.includes('name="logisorama-email-layout" content="corporate-v1"')) {
    return body;
  }
  const fragment = body.replace(/<!doctype[^>]*>/gi, "").replace(
    /<head\b[^>]*>[\s\S]*?<\/head>/gi,
    "",
  ).replace(/<\/?(?:html|body)\b[^>]*>/gi, "");
  // Preserve line breaks in typed text and inline-HTML messages without inserting
  // stray <br> tags between rows of HTML tables or rich-text paragraphs.
  const hasBlocks = /<(?:p|div|table|ul|ol|blockquote|h[1-6])\b/i.test(
    fragment,
  );
  const hasMarkup = /<\/?[a-z][^>]*>/i.test(fragment);
  const content = hasMarkup ? fragment : escapeEmailHtml(fragment);
  return renderCorporateEmail({
    title: subject,
    category: "CORRESPONDANCE",
    bodyHtml: hasBlocks ? content : content.replace(/\r?\n/g, "<br>"),
    signatureHtml: signature?.trim() || undefined,
  });
}
