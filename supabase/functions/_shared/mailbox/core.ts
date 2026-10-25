// Cœur de la boîte mail admin : identifiants des boîtes partagées, dossiers, relève et enregistrement des messages.
// Les mots de passe viennent uniquement du coffre (RPC shared_mailbox_credentials, clé de service).
// deno-lint-ignore-file no-explicit-any
import { decodeMailboxName, encodeMailboxName, type FetchedMessage, ImapClient, type ImapListEntry, quote } from "./imap.ts";
import {
  analyzeStructure,
  decodePartText,
  decodeWords,
  headerValue,
  makeSnippet,
  parseAddressList,
  parseHeaders,
  parseInternalDate,
  parseMailDate,
  parseMessageIdList,
  type PartInfo,
  pgSafe,
} from "./mime.ts";

export interface Box {
  id: string;
  address: string;
  label: string | null;
  display_name: string | null;
  signature_html: string | null;
  imap_host: string;
  imap_port: number;
  smtp_port: number;
  password: string;
}

export type FolderRole = "inbox" | "sent" | "drafts" | "spam" | "trash" | "archive" | "other";

/** Dossier où sont rangés les brouillons après envoi (jamais supprimés). */
export const SENT_DRAFTS_FOLDER = "Brouillons envoyés";

const TEXT_PART_MAX = 300_000;
const INITIAL_PER_FOLDER = 25;
const BATCH = 8;
const BACKFILL_TARGET = 400;
const FLAG_WINDOW = 300;

export async function loadBox(db: any, mailboxId: string): Promise<Box> {
  const { data: row, error } = await db
    .from("shared_mailboxes")
    .select("id, address, label, display_name, signature_html, imap_host, imap_port, smtp_port, secret_id")
    .eq("id", mailboxId)
    .maybeSingle();
  if (error || !row) throw new Error("Boîte introuvable");
  if (!row.secret_id) throw new Error(`Mot de passe manquant pour ${row.address} : à saisir dans Steeve → Boîtes e-mail partagées`);
  const { data: password } = await db.rpc("shared_mailbox_credentials", { p_id: row.id });
  if (typeof password !== "string" || !password) throw new Error(`Mot de passe illisible pour ${row.address}`);
  return {
    id: row.id,
    address: row.address,
    label: row.label,
    display_name: row.display_name,
    signature_html: row.signature_html,
    imap_host: row.imap_host || "mail.infomaniak.com",
    imap_port: row.imap_port || 993,
    smtp_port: row.smtp_port || 465,
    password,
  };
}

export async function openImap(box: Box): Promise<ImapClient> {
  const imap = new ImapClient();
  await imap.connect(box.imap_host, box.imap_port);
  await imap.login(box.address, box.password);
  return imap;
}

export function folderRole(entry: ImapListEntry): FolderRole {
  const flags = entry.flags.map((f) => f.toLowerCase());
  const name = decodeMailboxName(entry.path).toLowerCase();
  const leaf = entry.delimiter ? name.split(entry.delimiter).pop() || name : name;
  if (name === "inbox") return "inbox";
  if (flags.includes("\\sent")) return "sent";
  if (flags.includes("\\drafts")) return "drafts";
  if (flags.includes("\\junk")) return "spam";
  if (flags.includes("\\trash")) return "trash";
  if (flags.includes("\\archive")) return "archive";
  if (/^(sent|sent items|sent messages|envoy[ée]s|[ée]l[ée]ments envoy[ée]s|messages envoy[ée]s)$/.test(leaf)) return "sent";
  if (/^(drafts|brouillons?)$/.test(leaf)) return "drafts";
  if (/^(spam|junk|junk e-mail|courrier ind[ée]sirable|ind[ée]sirables?)$/.test(leaf)) return "spam";
  if (/^(trash|deleted|deleted items|deleted messages|corbeille|[ée]l[ée]ments supprim[ée]s)$/.test(leaf)) return "trash";
  if (/^(archive|archives)$/.test(leaf)) return "archive";
  return "other";
}

export function folderDisplayName(entry: ImapListEntry): string {
  const decoded = decodeMailboxName(entry.path);
  if (decoded.toUpperCase() === "INBOX") return "Boîte de réception";
  const d = entry.delimiter;
  let shown = decoded;
  if (d && shown.toUpperCase().startsWith(`INBOX${d}`)) shown = shown.slice(6);
  return d ? shown.split(d).join(" / ") : shown;
}

/** Liste les dossiers du serveur et met à jour mail_folders. */
export async function refreshFolders(db: any, box: Box, imap: ImapClient): Promise<any[]> {
  const entries = await imap.list();
  const now = new Date().toISOString();
  const rows = entries.map((e) => ({
    mailbox_id: box.id,
    path: e.path,
    name: folderDisplayName(e),
    role: folderRole(e),
    delimiter: e.delimiter,
    selectable: !e.flags.some((f) => /\\noselect|\\nonexistent/i.test(f)),
    present_on_server: true,
    updated_at: now,
  }));
  // Un seul dossier par rôle spécial : le premier trouvé garde le rôle, les autres deviennent « other ».
  const seen = new Set<string>();
  for (const r of rows.sort((a, b) => a.path.length - b.path.length)) {
    if (r.role !== "other" && seen.has(r.role)) r.role = "other";
    seen.add(r.role);
  }
  if (rows.length) {
    await db.from("mail_folders").upsert(rows, { onConflict: "mailbox_id,path" });
  }
  const paths = new Set(rows.map((r) => r.path));
  const { data: existing } = await db.from("mail_folders").select("*").eq("mailbox_id", box.id);
  for (const f of existing || []) {
    if (!paths.has(f.path) && f.present_on_server) {
      await db.from("mail_folders").update({ present_on_server: false, updated_at: now }).eq("id", f.id);
      f.present_on_server = false;
    }
  }
  return (existing || []).filter((f: any) => f.present_on_server && f.selectable);
}

const ROLE_ORDER: Record<string, number> = { inbox: 0, drafts: 1, sent: 2, spam: 3, archive: 4, trash: 5, other: 6 };

export interface SyncStats {
  mailbox: string;
  folders: number;
  fetched: number;
  error?: string;
}

/** Relève une boîte : dossiers, nouveaux messages, messages plus anciens (rattrapage), indicateurs. */
export async function syncBox(db: any, box: Box, opts: { deadline: number; messageBudget: number }): Promise<SyncStats> {
  const stats: SyncStats = { mailbox: box.address, folders: 0, fetched: 0 };
  const imap = await openImap(box);
  try {
    const folders = (await refreshFolders(db, box, imap)).sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
    stats.folders = folders.length;
    for (const folder of folders) {
      if (Date.now() > opts.deadline) break;
      const st = await imap.status(folder.path);
      if (!st) continue;
      const patch: any = { total_count: st.messages, unseen_count: st.unseen, uidnext: st.uidnext, last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      let lastUid = Number(folder.last_uid || 0);
      let minUid = folder.min_uid ? Number(folder.min_uid) : null;
      let backfillDone = !!folder.backfill_done;
      if (folder.uidvalidity && Number(folder.uidvalidity) !== st.uidvalidity) {
        await db.from("mail_messages").update({ deleted_on_server: true, updated_at: new Date().toISOString() })
          .eq("folder_id", folder.id).neq("uidvalidity", st.uidvalidity);
        lastUid = 0; minUid = null; backfillDone = false;
      }
      patch.uidvalidity = st.uidvalidity;
      const hasNew = st.uidnext - 1 > lastUid && st.messages > 0;
      const needBackfill = !backfillDone && st.messages > 0;
      const needFlags = lastUid > 0 && st.messages > 0;
      if (!hasNew && !needBackfill && !needFlags) {
        if (st.messages === 0) { patch.last_uid = 0; patch.backfill_done = true; }
        await db.from("mail_folders").update(patch).eq("id", folder.id);
        continue;
      }
      await imap.open(folder.path, false);
      let all: number[] | null = null;
      if (opts.messageBudget > 0 && (hasNew || needBackfill)) {
        if (lastUid === 0) {
          all = await imap.searchUids("ALL");
          const newest = all.slice(-Math.min(INITIAL_PER_FOLDER, opts.messageBudget));
          if (newest.length) {
            stats.fetched += await ingest(db, imap, box, folder, st.uidvalidity, newest);
            opts.messageBudget -= newest.length;
            lastUid = all[all.length - 1];
            minUid = newest[0];
          }
          backfillDone = all.length <= newest.length;
        } else if (hasNew) {
          const fresh = (await imap.searchUids(`UID ${lastUid + 1}:*`)).filter((u) => u > lastUid);
          const take = fresh.slice(0, Math.max(0, opts.messageBudget));
          if (take.length) {
            stats.fetched += await ingest(db, imap, box, folder, st.uidvalidity, take);
            opts.messageBudget -= take.length;
            lastUid = take[take.length - 1];
          }
        }
        if (!backfillDone && opts.messageBudget > 0 && Date.now() < opts.deadline && minUid) {
          const { count } = await db.from("mail_messages").select("id", { count: "exact", head: true }).eq("folder_id", folder.id).eq("deleted_on_server", false);
          if ((count ?? 0) >= BACKFILL_TARGET) {
            backfillDone = true;
          } else {
            all = all ?? await imap.searchUids("ALL");
            const older = all.filter((u) => u < (minUid as number));
            const take = older.slice(-Math.min(BATCH * 2, opts.messageBudget));
            if (take.length) {
              stats.fetched += await ingest(db, imap, box, folder, st.uidvalidity, take);
              opts.messageBudget -= take.length;
              minUid = take[0];
            }
            if (older.length <= take.length) backfillDone = true;
          }
        }
      }
      if (lastUid > 0 && Date.now() < opts.deadline) {
        await refreshFlags(db, imap, folder.id, st.uidvalidity, lastUid);
      }
      patch.last_uid = lastUid;
      patch.min_uid = minUid;
      patch.backfill_done = backfillDone;
      await db.from("mail_folders").update(patch).eq("id", folder.id);
    }
    await db.from("shared_mailboxes").update({ full_sync_at: new Date().toISOString(), full_sync_error: null }).eq("id", box.id);
  } finally {
    await imap.logout();
  }
  return stats;
}

/** Met à jour lu / suivi / répondu et repère les messages retirés du serveur, sur les derniers messages. */
async function refreshFlags(db: any, imap: ImapClient, folderId: string, uidvalidity: number, lastUid: number) {
  const { data: rows } = await db
    .from("mail_messages")
    .select("id, uid, is_seen, is_flagged, is_answered, is_draft")
    .eq("folder_id", folderId)
    .eq("uidvalidity", uidvalidity)
    .eq("deleted_on_server", false)
    .order("uid", { ascending: false })
    .limit(FLAG_WINDOW);
  if (!rows || rows.length === 0) return;
  const minUid = rows[rows.length - 1].uid;
  const fetched = await imap.fetch(`${minUid}:${lastUid}`, "UID FLAGS");
  const byUid = new Map<number, string[]>();
  for (const f of fetched) byUid.set(f.uid, f.flags.map((x) => x.toLowerCase()));
  const now = new Date().toISOString();
  for (const r of rows) {
    const flags = byUid.get(Number(r.uid));
    if (!flags) {
      await db.from("mail_messages").update({ deleted_on_server: true, updated_at: now }).eq("id", r.id);
      continue;
    }
    const next = {
      is_seen: flags.includes("\\seen"),
      is_flagged: flags.includes("\\flagged"),
      is_answered: flags.includes("\\answered"),
      is_draft: flags.includes("\\draft"),
    };
    if (next.is_seen !== r.is_seen || next.is_flagged !== r.is_flagged || next.is_answered !== r.is_answered || next.is_draft !== r.is_draft) {
      await db.from("mail_messages").update({ ...next, updated_at: now }).eq("id", r.id);
    }
  }
}

/** Lit en-têtes, structure et textes des messages donnés, puis les enregistre. */
export async function ingest(db: any, imap: ImapClient, box: Box, folder: any, uidvalidity: number, uids: number[]): Promise<number> {
  let saved = 0;
  for (let i = 0; i < uids.length; i += BATCH) {
    const chunk = uids.slice(i, i + BATCH);
    const metas = await imap.fetch(chunk.join(","), "UID FLAGS INTERNALDATE RFC822.SIZE BODYSTRUCTURE BODY.PEEK[HEADER]");
    const rows: any[] = [];
    for (const m of metas) {
      const row = await buildRow(imap, box, folder, uidvalidity, m);
      if (row) rows.push(row);
    }
    if (rows.length) {
      const { error } = await db.from("mail_messages").upsert(rows, { onConflict: "folder_id,uidvalidity,uid", ignoreDuplicates: false });
      if (error) console.error("[mailbox] enregistrement", error.message);
      else saved += rows.length;
    }
  }
  return saved;
}

async function buildRow(imap: ImapClient, box: Box, folder: any, uidvalidity: number, m: FetchedMessage): Promise<any | null> {
  if (!m.uid) return null;
  const headerBytes = m.sections["HEADER"] || new Uint8Array(0);
  const h = parseHeaders(headerBytes);
  const layout = analyzeStructure(m.bodystructure);
  const texts = await fetchTexts(imap, m.uid, layout.textPart, layout.htmlPart);
  const flags = m.flags.map((f) => f.toLowerCase());
  const from = parseAddressList(headerValue(h, "from"))[0] || null;
  const refs = headerValue(h, "references");
  const inReplyTo = parseMessageIdList(headerValue(h, "in-reply-to"))[0] || null;
  const sentAt = parseMailDate(headerValue(h, "date")) || parseInternalDate(m.internalDate);
  return {
    mailbox_id: box.id,
    folder_id: folder.id,
    uid: m.uid,
    uidvalidity,
    message_id: pgSafe(parseMessageIdList(headerValue(h, "message-id"))[0] || null, 500),
    in_reply_to: pgSafe(inReplyTo, 500),
    references_header: pgSafe(refs, 4000),
    subject: pgSafe(decodeWords(headerValue(h, "subject") || ""), 1000),
    from_email: pgSafe(from?.email || null, 320),
    from_name: pgSafe(from?.name || null, 320),
    to_list: parseAddressList(headerValue(h, "to")),
    cc_list: parseAddressList(headerValue(h, "cc")),
    bcc_list: parseAddressList(headerValue(h, "bcc")),
    reply_to: parseAddressList(headerValue(h, "reply-to")),
    sent_at: sentAt,
    internal_date: parseInternalDate(m.internalDate),
    snippet: pgSafe(makeSnippet(texts.text, texts.html), 300),
    body_text: pgSafe(texts.text),
    body_html: pgSafe(texts.html),
    body_truncated: texts.truncated,
    has_attachments: layout.attachments.some((a) => a.disposition !== "inline" || !a.contentId),
    attachments: layout.attachments.map((a) => ({
      part: a.part, filename: a.filename, mime: a.type, size: a.size, encoding: a.encoding,
      inline: a.disposition === "inline" && !!a.contentId, content_id: a.contentId,
    })),
    size_bytes: m.size,
    is_seen: flags.includes("\\seen"),
    is_flagged: flags.includes("\\flagged"),
    is_answered: flags.includes("\\answered"),
    is_draft: flags.includes("\\draft") || folder.role === "drafts",
    deleted_on_server: false,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchTexts(imap: ImapClient, uid: number, textPart: PartInfo | null, htmlPart: PartInfo | null) {
  const items: string[] = [];
  if (textPart) items.push(`BODY.PEEK[${textPart.part}]<0.${TEXT_PART_MAX}>`);
  if (htmlPart) items.push(`BODY.PEEK[${htmlPart.part}]<0.${TEXT_PART_MAX}>`);
  let text: string | null = null;
  let html: string | null = null;
  let truncated = false;
  if (!items.length) return { text, html, truncated };
  const [msg] = await imap.fetch(String(uid), `UID ${items.join(" ")}`);
  if (!msg) return { text, html, truncated };
  if (textPart && msg.sections[textPart.part]) {
    const raw = msg.sections[textPart.part];
    truncated ||= raw.length >= TEXT_PART_MAX;
    text = decodePartText(raw, textPart.encoding, textPart.charset);
  }
  if (htmlPart && msg.sections[htmlPart.part]) {
    const raw = msg.sections[htmlPart.part];
    truncated ||= raw.length >= TEXT_PART_MAX;
    html = decodePartText(raw, htmlPart.encoding, htmlPart.charset);
  }
  return { text, html, truncated };
}

/** Retrouve (ou crée) le dossier d'un rôle donné ; crée le dossier « nom » s'il n'existe pas. */
export async function folderFor(db: any, box: Box, imap: ImapClient, role: FolderRole, createName?: string): Promise<any | null> {
  const { data } = await db.from("mail_folders").select("*").eq("mailbox_id", box.id).eq("role", role).eq("present_on_server", true).order("path").limit(1);
  if (data && data[0]) return data[0];
  if (!createName) return null;
  return await ensureFolderByName(db, box, imap, createName);
}

export async function ensureFolderByName(db: any, box: Box, imap: ImapClient, name: string): Promise<any> {
  const { data } = await db.from("mail_folders").select("*").eq("mailbox_id", box.id).eq("name", name).eq("present_on_server", true).limit(1);
  if (data && data[0]) return data[0];
  const created = await imap.command(`CREATE ${quote(encodeMailboxName(name))}`);
  if (created.status !== "OK" && !/ALREADYEXISTS|exist/i.test(created.statusText)) {
    throw new Error(`Création du dossier « ${name} » refusée`);
  }
  await refreshFolders(db, box, imap);
  const { data: again } = await db.from("mail_folders").select("*").eq("mailbox_id", box.id).eq("name", name).limit(1);
  if (!again || !again[0]) throw new Error(`Dossier « ${name} » introuvable après création`);
  return again[0];
}
