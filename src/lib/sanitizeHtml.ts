import DOMPurify from 'dompurify';

/**
 * Sanitize untrusted HTML before rendering via dangerouslySetInnerHTML.
 * Strips scripts, event handlers, dangerous tags (iframe, object, embed),
 * javascript:/data: URIs and other XSS vectors.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'srcdoc', 'formaction'],
  });
}
