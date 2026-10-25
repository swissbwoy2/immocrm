// Relève d'une boîte partagée (table shared_mailboxes) vers mailbox_emails.
// Incrémentale par UID : chaque passage lit au plus PER_RUN nouveaux e-mails, du plus ancien au plus récent ;
// le retard (premier passage : 30 derniers jours) est rattrapé sur les passages suivants.
// Robustesse : la position avance message par message (un e-mail illisible est sauté, jamais rejoué sans fin),
// le temps de calcul et le temps réel sont bornés, et la tentative est datée même en cas d'échec.
// deno-lint-ignore-file no-explicit-any
import PostalMime from 'npm:postal-mime@2.4.4';
import { imapDate, LeanImap, parseInternalDate, withTimeout, type FetchedMessage } from './lean-imap.ts';

export const PER_RUN = 15;
export const MAX_MESSAGE_BYTES = 65536;
export const MAX_BODY_CHARS = 20000;
export const INITIAL_DAYS = 30;
/** Temps de calcul maximal consacré au décodage par boîte et par passage (limite de la fonction : ~2 s). */
export const PARSE_BUDGET_MS = 600;
/** Temps réel maximal par boîte (connexion, recherche, lecture). */
export const MAILBOX_TIMEOUT_MS = 30_000;

export interface MailboxRow {
  id: string;
  address: string;
  imap_host: string;
  imap_port: number;
  uid_validity: number | null;
  last_uid: number | null;
  /** Identifiants exacts (séparés par des virgules) du serveur de réception dont les résultats font foi. */
  trusted_authserv?: string | null;
}

export interface SyncResult {
  mailbox: string;
  ok: boolean;
  stored: number;
  skipped: number;
  pending: number;
  parseMs: number;
  error?: string;
}

type Db = any;
type Connect = (host: string, port: number) => Promise<LeanImap>;

/** Retire les octets NUL (refusés par Postgres) et les espaces de bord. */
export const clean = (s: string | null | undefined) => (s ?? '').split('\u0000').join('').trim();

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };
const BLOCK_TAGS = new Set(['br', 'p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table']);

/** HTML → texte en une seule passe (coût linéaire, même sur un HTML piégé). */
export function htmlToText(html: string): string {
  let out = '';
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    const gt = html.indexOf('>', lt + 1);
    if (gt < 0) break; // balise non fermée : fin du texte utile
    const tag = html.slice(lt + 1, Math.min(gt, lt + 12)).replace(/^\//, '').split(/[\s/>]/)[0].toLowerCase();
    if ((tag === 'script' || tag === 'style') && html[lt + 1] !== '/') {
      const close = html.toLowerCase().indexOf(`</${tag}`, gt + 1);
      i = close < 0 ? n : html.indexOf('>', close) + 1 || n;
      continue;
    }
    if (BLOCK_TAGS.has(tag)) out += '\n';
    i = gt + 1;
  }
  out = out.replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/gi, (_, e: string) => ENTITIES[e.toLowerCase()] ?? '');
  const lines = out.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim());
  const compact: string[] = [];
  for (const l of lines) {
    if (l === '' && compact.length > 0 && compact[compact.length - 1] === '') continue;
    compact.push(l);
  }
  return compact.join('\n').trim();
}

/** En-tête Authentication-Results analysé (RFC 8601) : commentaires retirés, guillemets respectés. */
export function parseAuthResults(value: string): { authserv: string; clauses: { method: string; result: string; props: Record<string, string> }[] } {
  let cleaned = '';
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quoted) {
      cleaned += ch;
      if (ch === '\\' && i + 1 < value.length) cleaned += value[++i];
      else if (ch === '"') quoted = false;
      continue;
    }
    if (depth > 0) {
      if (ch === '\\') i++;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
      continue;
    }
    if (ch === '(') depth = 1;
    else {
      if (ch === '"') quoted = true;
      cleaned += ch;
    }
  }
  // Découpage sur « ; » hors guillemets.
  const parts: string[] = [];
  let current = '';
  quoted = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (quoted) {
      current += ch;
      if (ch === '\\' && i + 1 < cleaned.length) current += cleaned[++i];
      else if (ch === '"') quoted = false;
    } else if (ch === '"') {
      quoted = true;
      current += ch;
    } else if (ch === ';') {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  parts.push(current);
  const authserv = (parts.shift() || '').trim().split(/\s+/)[0].toLowerCase();
  const clauses = parts.map((raw) => {
    const c = raw.replace(/\s+/g, ' ').trim();
    const head = c.match(/^([a-z0-9-]+)\s*=\s*([a-z0-9-]+)/i);
    const props: Record<string, string> = {};
    for (const m of c.matchAll(/\b([a-z]+\.[a-z0-9-]+)\s*=\s*("((?:[^"\\]|\\.)*)"|[^\s]+)/gi)) {
      props[m[1].toLowerCase()] = (m[3] ?? m[2]).toLowerCase();
    }
    return { method: head ? head[1].toLowerCase() : '', result: head ? head[2].toLowerCase() : '', props };
  }).filter((c) => c.method);
  return { authserv, clauses };
}

/** Identifiant du serveur qui a ajouté l'en-tête Authentication-Results le plus haut (pour le réglage). */
export function topAuthServer(headers: { key: string; value: string }[] | undefined): string | null {
  const top = (headers || []).find((h) => h.key.toLowerCase() === 'authentication-results');
  return top ? parseAuthResults(top.value).authserv.slice(0, 200) || null : null;
}

/**
 * Expéditeur authentifié ? Seul l'en-tête Authentication-Results le plus haut compte, et seulement si son
 * identifiant de serveur est exactement l'un de ceux déclarés pour la boîte. Accepté : DMARC réussi pour le
 * domaine exact de l'expéditeur, ou DKIM réussi d'un domaine égal au sien ou dont il est un sous-domaine.
 * SPF seul ne prouve rien sur l'adresse affichée.
 */
export function senderAuthenticated(headers: { key: string; value: string }[] | undefined, fromAddress: string, trustedAuthserv: string): boolean {
  const domain = fromAddress.split('@')[1]?.toLowerCase();
  const trusted = (trustedAuthserv || '').toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
  if (!domain || trusted.length === 0) return false;
  const top = (headers || []).find((h) => h.key.toLowerCase() === 'authentication-results');
  if (!top) return false;
  const { authserv, clauses } = parseAuthResults(top.value);
  if (!trusted.includes(authserv)) return false;
  for (const c of clauses) {
    if (c.result !== 'pass') continue;
    if (c.method === 'dmarc' && c.props['header.from'] === domain) return true;
    if (c.method === 'dkim') {
      const d = (c.props['header.d'] || '').replace(/^@/, '');
      if (d.includes('.') && (d === domain || domain.endsWith(`.${d}`))) return true;
    }
  }
  return false;
}

const joinAddresses = (list: any[] | undefined) =>
  (list || [])
    .flatMap((a: any) => (a?.group ? a.group : [a]))
    .map((a: any) => clean(a?.address).toLowerCase())
    .filter(Boolean)
    .join(', ');

export async function toEmailRow(msg: FetchedMessage, mailbox: MailboxRow, uidValidity: number, now: Date) {
  const parsed: any = await PostalMime.parse(msg.raw);
  const fromAddress = clean(parsed.from?.address).toLowerCase();
  const text = clean(parsed.text) || clean(parsed.html ? htmlToText(String(parsed.html).slice(0, MAX_MESSAGE_BYTES)) : '');
  // Date de réception par le serveur (l'en-tête Date est choisi par l'expéditeur), jamais dans le futur.
  const server = parseInternalDate(msg.internalDate);
  const header = parsed.date ? new Date(parsed.date) : null;
  let received = server ?? (header && !isNaN(header.getTime()) ? header.toISOString() : now.toISOString());
  if (new Date(received).getTime() > now.getTime()) received = now.toISOString();
  return {
    mailbox_id: mailbox.id,
    mailbox: mailbox.address,
    uid: msg.uid,
    uid_validity: uidValidity,
    message_key: clean(parsed.messageId).replace(/^<|>$/g, '').slice(0, 100) || null,
    from_email: fromAddress.slice(0, 320) || null,
    from_name: clean(parsed.from?.name).slice(0, 200) || null,
    to_emails: joinAddresses(parsed.to).slice(0, 2000) || null,
    cc_emails: joinAddresses(parsed.cc).slice(0, 2000) || null,
    subject: clean(parsed.subject).slice(0, 500) || null,
    body_text: text.slice(0, MAX_BODY_CHARS) || null,
    received_at: received,
    auth_verified: senderAuthenticated(parsed.headers, fromAddress, mailbox.trusted_authserv ?? ''),
    auth_server: topAuthServer(parsed.headers),
  };
}

export async function syncMailbox(opts: { db: Db; mailbox: MailboxRow; connect: Connect; now?: Date; parseBudgetMs?: number }): Promise<SyncResult> {
  const { db, mailbox, connect } = opts;
  const now = opts.now ?? new Date();
  const parseBudget = opts.parseBudgetMs ?? PARSE_BUDGET_MS;
  const result: SyncResult = { mailbox: mailbox.address, ok: false, stored: 0, skipped: 0, pending: 0, parseMs: 0 };
  // Tentative datée d'emblée : une boîte en échec passe en fin de file et ne bloque pas les autres.
  await db.from('shared_mailboxes').update({ last_attempt_at: now.toISOString() }).eq('id', mailbox.id);

  const fail = async (error: string, progress?: Record<string, unknown>): Promise<SyncResult> => {
    await db.from('shared_mailboxes').update({ ...(progress || {}), last_error: error.slice(0, 500), updated_at: now.toISOString() }).eq('id', mailbox.id);
    return { ...result, ok: false, error };
  };

  const { data: password, error: pwError } = await db.rpc('shared_mailbox_credentials', { p_id: mailbox.id });
  if (pwError) return fail('Mot de passe illisible.');
  if (!password) return fail('Mot de passe manquant : à saisir dans « Boîtes e-mail lues par Steeve ».');

  let client: LeanImap | null = null;
  let fetched: FetchedMessage[] = [];
  let uids: number[] = [];
  let uidValidity = 0;
  let lastUid: number | null = null;
  try {
    await withTimeout((async () => {
      client = await connect(mailbox.imap_host, mailbox.imap_port);
      try {
        await client.login(mailbox.address, password);
      } catch (err) {
        // Refus du serveur (NO/BAD) : message clair, jamais le détail ; délai ou coupure : message d'origine.
        if (err instanceof Error && err.message.startsWith('IMAP LOGIN')) {
          throw new Error('Connexion refusée : adresse ou mot de passe incorrect.');
        }
        throw err;
      }
      const info = await client.selectInbox();
      uidValidity = info.uidValidity ?? 0;
      lastUid = mailbox.uid_validity === uidValidity ? mailbox.last_uid : null;
      if (lastUid === null) {
        const since = new Date(now.getTime() - INITIAL_DAYS * 86400000);
        uids = await client.uidSearch(`SINCE ${imapDate(since)}`);
        if (uids.length === 0) {
          lastUid = info.uidNext ? info.uidNext - 1 : ((await client.uidSearch('UID *'))[0] ?? 0);
        } else {
          lastUid = uids[0] - 1;
        }
      } else {
        // « n:* » renvoie au moins le dernier message même s'il est déjà lu : on ne garde que les nouveaux.
        const from = lastUid;
        uids = (await client.uidSearch(`UID ${from + 1}:*`)).filter((u) => u > from);
      }
      fetched = await client.uidFetchRaw(uids.slice(0, PER_RUN), MAX_MESSAGE_BYTES);
      await client.logout();
      client = null;
    })(), MAILBOX_TIMEOUT_MS, 'Relève', () => (client as LeanImap | null)?.close());
  } catch (err) {
    (client as LeanImap | null)?.close();
    return fail(err instanceof Error ? err.message : String(err));
  }

  // Décodage et enregistrement message par message, dans l'ordre des UID.
  const byUid = new Map(fetched.map((m) => [m.uid, m]));
  let parseMs = 0;
  let position = lastUid ?? 0;
  for (const uid of uids.slice(0, PER_RUN)) {
    if (parseMs > parseBudget) break; // la suite au passage suivant
    const msg = byUid.get(uid);
    if (msg) {
      const t0 = performance.now();
      let row = null;
      try {
        row = await toEmailRow(msg, mailbox, uidValidity, now);
      } catch (err) {
        console.error(`[sync-shared-mailboxes] ${mailbox.address} UID ${uid} illisible :`, err);
      }
      parseMs += performance.now() - t0;
      if (row) {
        const { error } = await db.from('mailbox_emails').upsert([row], { onConflict: 'mailbox_id,uid_validity,uid', ignoreDuplicates: true });
        if (error) {
          // Erreur de la base (souvent passagère) : on s'arrête sans avancer, l'e-mail sera relu au prochain passage.
          console.error(`[sync-shared-mailboxes] ${mailbox.address} UID ${uid} non enregistré :`, error.message);
          result.parseMs = parseMs;
          result.pending = uids.filter((u) => u > position).length;
          return fail('Enregistrement impossible (nouvel essai au prochain passage).', {
            uid_validity: uidValidity, last_uid: position, pending_count: result.pending,
          });
        }
        result.stored += 1;
      } else {
        result.skipped += 1;
      }
    }
    // Message absent (supprimé entre-temps), illisible ou enregistré : la position avance.
    position = uid;
  }

  result.pending = uids.filter((u) => u > position).length;
  result.parseMs = parseMs;
  await db.from('shared_mailboxes').update({
    uid_validity: uidValidity,
    last_uid: position,
    pending_count: result.pending,
    last_sync_at: now.toISOString(),
    last_error: result.skipped > 0 ? `${result.skipped} e-mail(s) illisible(s) ignoré(s) au dernier passage.` : null,
    updated_at: now.toISOString(),
  }).eq('id', mailbox.id);
  return { ...result, ok: true };
}
