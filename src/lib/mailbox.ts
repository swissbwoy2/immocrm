import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';

/** Boîte partagée telle que renvoyée par admin_mail_boxes(). */
export interface MailBox {
  id: string;
  address: string;
  label: string | null;
  display_name: string;
  signature_html: string | null;
  is_active: boolean;
  has_password: boolean;
  full_sync_at: string | null;
  full_sync_error: string | null;
  inbox_unseen: number;
  drafts_count: number;
}

export type FolderRole = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'archive' | 'other';

export interface MailFolder {
  id: string;
  mailbox_id: string;
  path: string;
  name: string;
  role: FolderRole;
  total_count: number;
  unseen_count: number;
  present_on_server: boolean;
  selectable: boolean;
  last_sync_at: string | null;
  backfill_done: boolean;
}

export interface MailAddress {
  name: string | null;
  email: string;
}

export interface MailAttachment {
  part: string;
  filename: string;
  mime: string;
  size: number;
  inline: boolean;
  content_id: string | null;
}

export interface MailListItem {
  id: string;
  mailbox_id: string;
  folder_id: string;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  to_list: MailAddress[];
  sent_at: string | null;
  snippet: string | null;
  has_attachments: boolean;
  is_seen: boolean;
  is_flagged: boolean;
  is_answered: boolean;
  is_draft: boolean;
}

export interface MailMessage extends MailListItem {
  cc_list: MailAddress[];
  bcc_list: MailAddress[];
  reply_to: MailAddress[];
  message_id: string | null;
  body_text: string | null;
  body_html: string | null;
  body_truncated: boolean;
  attachments: MailAttachment[];
}

export const LIST_COLUMNS =
  'id, mailbox_id, folder_id, subject, from_email, from_name, to_list, sent_at, snippet, has_attachments, is_seen, is_flagged, is_answered, is_draft';

export const FOLDER_ORDER: Record<FolderRole, number> = { inbox: 0, drafts: 1, sent: 2, archive: 3, spam: 4, trash: 5, other: 6 };

export const FOLDER_LABEL: Record<FolderRole, string> = {
  inbox: 'Réception',
  drafts: 'Brouillons',
  sent: 'Envoyés',
  archive: 'Archives',
  spam: 'Spam',
  trash: 'Corbeille',
  other: '',
};

export const db = supabase as any;

/** Appelle la fonction serveur mailbox-action ; lève une erreur lisible en cas d'échec. */
export async function mailAction<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mailbox-action', { body: { action, ...payload } });
  if (error) {
    let message = error.message || 'Erreur';
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* corps illisible */
    }
    if (/Failed to send a request|FunctionsFetchError|404/i.test(message)) {
      message = "La fonction d'envoi n'est pas encore en ligne (déploiement en attente).";
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function syncMailbox(mailboxId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('mailbox-sync', { body: { mailbox_id: mailboxId } });
  if (error) throw new Error("La relève n'a pas abouti (fonction pas encore en ligne ou mot de passe refusé).");
}

export function addressLabel(a: MailAddress | null | undefined): string {
  if (!a) return '';
  return a.name ? `${a.name} <${a.email}>` : a.email;
}

export function shortAddress(a: MailAddress | null | undefined): string {
  if (!a) return '';
  return a.name || a.email;
}

export function formatList(list: MailAddress[] | null | undefined): string {
  return (list || []).map(addressLabel).join(', ');
}

/** HTML d'un e-mail, nettoyé pour l'affichage isolé (iframe sans scripts). */
export function emailDocument(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'meta', 'link', 'base'],
    FORBID_ATTR: ['srcdoc', 'formaction', 'onerror', 'onload'],
  });
  const head = '<meta charset="utf-8"><base target="_blank"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;margin:0;padding:4px;word-wrap:break-word;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}blockquote{margin:0 0 0 8px;padding-left:10px;border-left:3px solid #d1d5db;color:#4b5563}</style>';
  if (/<head[^>]*>/i.test(clean)) return clean.replace(/<head[^>]*>/i, (m) => `${m}${head}`);
  return `<!doctype html><html><head>${head}</head><body>${clean}</body></html>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texte saisi → HTML simple (paragraphes et retours à la ligne). */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function parseRecipients(input: string): MailAddress[] {
  return input
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*)<([^>]+)>$/);
      if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || null, email: m[2].trim().toLowerCase() };
      return { name: null, email: s.toLowerCase() };
    });
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

export function formatSize(bytes: number | null | undefined): string {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}
