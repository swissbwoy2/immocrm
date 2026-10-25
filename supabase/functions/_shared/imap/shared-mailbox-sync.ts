// Relève d'une boîte partagée (table shared_mailboxes) vers mailbox_emails.
// Incrémentale par UID : chaque passage lit au plus PER_RUN nouveaux e-mails, du plus ancien au plus récent ;
// le retard (premier passage : 30 derniers jours) est rattrapé sur les passages suivants.
// deno-lint-ignore-file no-explicit-any
import PostalMime from 'npm:postal-mime@2.4.4';
import { imapDate, LeanImap, parseInternalDate, type FetchedMessage } from './lean-imap.ts';

export const PER_RUN = 15;
export const MAX_MESSAGE_BYTES = 65536;
export const MAX_BODY_CHARS = 20000;
export const INITIAL_DAYS = 30;

export interface MailboxRow {
  id: string;
  address: string;
  imap_host: string;
  imap_port: number;
  uid_validity: number | null;
  last_uid: number | null;
}

export interface SyncResult {
  mailbox: string;
  ok: boolean;
  stored: number;
  pending: number;
  error?: string;
}

type Db = any;
type Connect = (host: string, port: number) => Promise<LeanImap>;

const clean = (s: string | null | undefined) => (s ?? '').split('\u0000').join('').trim();

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const joinAddresses = (list: any[] | undefined) =>
  (list || [])
    .flatMap((a: any) => (a?.group ? a.group : [a]))
    .map((a: any) => clean(a?.address).toLowerCase())
    .filter(Boolean)
    .join(', ');

export async function toEmailRow(msg: FetchedMessage, mailbox: MailboxRow, uidValidity: number) {
  const parsed: any = await PostalMime.parse(msg.raw);
  const text = clean(parsed.text) || (parsed.html ? htmlToText(String(parsed.html)) : '');
  const parsedDate = parsed.date ? new Date(parsed.date) : null;
  const received = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : parseInternalDate(msg.internalDate);
  return {
    mailbox_id: mailbox.id,
    mailbox: mailbox.address,
    uid: msg.uid,
    uid_validity: uidValidity,
    message_key: clean(parsed.messageId).replace(/^<|>$/g, '').slice(0, 100) || null,
    from_email: clean(parsed.from?.address).toLowerCase() || null,
    from_name: clean(parsed.from?.name).slice(0, 200) || null,
    to_emails: joinAddresses(parsed.to).slice(0, 2000) || null,
    cc_emails: joinAddresses(parsed.cc).slice(0, 2000) || null,
    subject: clean(parsed.subject).slice(0, 500) || null,
    body_text: text.slice(0, MAX_BODY_CHARS) || null,
    received_at: received ?? new Date().toISOString(),
  };
}

export async function syncMailbox(opts: { db: Db; mailbox: MailboxRow; connect: Connect; now?: Date }): Promise<SyncResult> {
  const { db, mailbox, connect } = opts;
  const now = opts.now ?? new Date();
  const fail = async (error: string): Promise<SyncResult> => {
    await db.from('shared_mailboxes').update({ last_error: error.slice(0, 500), updated_at: now.toISOString() }).eq('id', mailbox.id);
    return { mailbox: mailbox.address, ok: false, stored: 0, pending: 0, error };
  };

  const { data: password, error: pwError } = await db.rpc('shared_mailbox_credentials', { p_id: mailbox.id });
  if (pwError) return fail(`Mot de passe illisible : ${pwError.message}`);
  if (!password) return fail('Mot de passe manquant : à saisir dans « Boîtes e-mail lues par Steeve ».');

  let client: LeanImap | null = null;
  try {
    client = await connect(mailbox.imap_host, mailbox.imap_port);
    try {
      await client.login(mailbox.address, password);
    } catch {
      client.close();
      return fail('Connexion refusée : adresse ou mot de passe incorrect.');
    }
    const info = await client.selectInbox();
    const uidValidity = info.uidValidity ?? 0;
    let lastUid = mailbox.uid_validity === uidValidity ? mailbox.last_uid : null;

    let uids: number[];
    if (lastUid === null) {
      const since = new Date(now.getTime() - INITIAL_DAYS * 86400000);
      uids = await client.uidSearch(`SINCE ${imapDate(since)}`);
      if (uids.length === 0) lastUid = info.uidNext ? info.uidNext - 1 : 0;
    } else {
      // « n:* » renvoie au moins le dernier message même s'il est déjà lu : on ne garde que les nouveaux.
      uids = (await client.uidSearch(`UID ${lastUid + 1}:*`)).filter((u) => u > (lastUid as number));
    }

    const batch = uids.slice(0, PER_RUN);
    const fetched = await client.uidFetchRaw(batch, MAX_MESSAGE_BYTES);
    await client.logout();
    client = null;

    const rows = [];
    for (const msg of fetched) {
      try {
        rows.push(await toEmailRow(msg, mailbox, uidValidity));
      } catch (err) {
        console.error(`[sync-shared-mailboxes] ${mailbox.address} UID ${msg.uid} illisible :`, err);
      }
    }
    if (rows.length > 0) {
      const { error } = await db.from('mailbox_emails').upsert(rows, { onConflict: 'mailbox_id,uid_validity,uid', ignoreDuplicates: true });
      if (error) return fail(`Enregistrement impossible : ${error.message}`);
    }

    const newLastUid = batch.length > 0 ? batch[batch.length - 1] : lastUid;
    const pending = Math.max(0, uids.length - batch.length);
    await db.from('shared_mailboxes').update({
      uid_validity: uidValidity,
      last_uid: newLastUid,
      pending_count: pending,
      last_sync_at: now.toISOString(),
      last_error: null,
      updated_at: now.toISOString(),
    }).eq('id', mailbox.id);
    return { mailbox: mailbox.address, ok: true, stored: rows.length, pending };
  } catch (err) {
    client?.close();
    return fail(err instanceof Error ? err.message : String(err));
  }
}
