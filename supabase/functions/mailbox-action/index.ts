// Actions de l'écran « Boîte mail » (admin) sur les boîtes partagées, et canal d'envoi pour Steeve (clé de service) :
//   read        — ouvre un message (relit le texte au besoin) et le marque lu
//   flags       — lu / non lu / suivi
//   move        — Corbeille, Spam, Réception, Archives ou un dossier (jamais d'effacement définitif)
//   attachment  — télécharge une pièce jointe (lue sur le serveur)
//   send        — nouveau message, réponse ou transfert (SMTP 465 + copie dans « Envoyés »)
//   send_draft  — envoie un brouillon existant tel quel (préparé par ChatGPT, une routine ou l'admin),
//                 puis le range dans « Brouillons envoyés »
//   save_draft  — enregistre un brouillon dans « Brouillons »
//   test        — vérifie la connexion IMAP et SMTP d'une boîte
//   sync        — relève une boîte maintenant
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { LeanSmtp, latin1, latin1Bytes, prepareDraftForSend } from "../_shared/steeve/mail.ts";
import {
  type Box,
  ensureFolderByName,
  fetchTexts,
  folderFor,
  ingest,
  loadBox,
  openImap,
  SENT_DRAFTS_FOLDER,
  syncBox,
} from "../_shared/mailbox/core.ts";
import type { ImapClient } from "../_shared/mailbox/imap.ts";
import {
  analyzeStructure,
  buildMime,
  encodeBase64,
  headerValue,
  type MailAddress,
  newMessageId,
  type OutgoingAttachment,
  parseAddressList,
  parseHeaders,
} from "../_shared/mailbox/mime.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_SEND_BYTES = 20 * 1024 * 1024;
const MAX_DRAFT_BYTES = 25 * 1024 * 1024;
const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

class UserError extends Error {}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const caller = await verifyInternalCaller(req);
  const isAdmin = caller.kind === "staff" && (caller.roles || []).includes("admin");
  const isServer = caller.kind === "service" || caller.kind === "secret";
  if (!caller.ok || !(isAdmin || isServer)) return json({ error: "Accès refusé" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const actor = { userId: caller.userId ?? null, source: isServer ? (body?.source === "steeve" ? "steeve" : "routine") : "admin" };

  try {
    switch (action) {
      case "read": return json(await actionRead(db, body));
      case "flags": return json(await actionFlags(db, body));
      case "move": return json(await actionMove(db, body));
      case "attachment": return json(await actionAttachment(db, body));
      case "send": return json(await actionSend(db, body, actor));
      case "send_draft": return json(await actionSendDraft(db, body, actor));
      case "save_draft": return json(await actionSaveDraft(db, body));
      case "test": return json(await actionTest(db, body));
      case "sync": {
        const box = await loadBox(db, String(body.mailbox_id || ""));
        const stats = await syncBox(db, box, { deadline: Date.now() + 40_000, messageBudget: 40 });
        return json({ success: true, stats });
      }
      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[mailbox-action]", action, message);
    return json({ error: message }, e instanceof UserError ? 400 : 500);
  }
});

// ---------------------------------------------------------------------------

async function loadMessage(db: any, id: string) {
  const { data: msg } = await db.from("mail_messages").select("*, folder:mail_folders(*)").eq("id", id).maybeSingle();
  if (!msg) throw new UserError("Message introuvable");
  return msg;
}

async function withBox<T>(db: any, mailboxId: string, fn: (box: Box, imap: ImapClient) => Promise<T>): Promise<T> {
  const box = await loadBox(db, mailboxId);
  const imap = await openImap(box);
  try {
    return await fn(box, imap);
  } finally {
    await imap.logout();
  }
}

async function actionRead(db: any, body: any) {
  const msg = await loadMessage(db, String(body.message_id || ""));
  const needsBody = msg.body_text === null && msg.body_html === null;
  const markSeen = body.mark_seen !== false && !msg.is_seen;
  if (!needsBody && !markSeen) return { message: msg };
  await withBox(db, msg.mailbox_id, async (_box, imap) => {
    await imap.open(msg.folder.path, markSeen);
    if (needsBody) {
      const [m] = await imap.fetch(String(msg.uid), "UID BODYSTRUCTURE");
      if (m) {
        const layout = analyzeStructure(m.bodystructure);
        const t = await fetchTexts(imap, msg.uid, layout.textPart, layout.htmlPart);
        msg.body_text = t.text;
        msg.body_html = t.html;
        await db.from("mail_messages").update({ body_text: t.text, body_html: t.html, body_truncated: t.truncated }).eq("id", msg.id);
      }
    }
    if (markSeen) {
      await imap.store(String(msg.uid), "+", "\\Seen");
      msg.is_seen = true;
      await db.from("mail_messages").update({ is_seen: true, updated_at: new Date().toISOString() }).eq("id", msg.id);
    }
  });
  if (markSeen && msg.folder?.unseen_count > 0) {
    await db.from("mail_folders").update({ unseen_count: msg.folder.unseen_count - 1 }).eq("id", msg.folder.id);
  }
  return { message: msg };
}

function groupByFolder(rows: any[]) {
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const k = r.folder_id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return groups;
}

async function loadMessages(db: any, ids: unknown): Promise<any[]> {
  const list = Array.isArray(ids) ? ids.map(String).slice(0, 200) : [];
  if (!list.length) throw new UserError("Aucun message sélectionné");
  const { data } = await db.from("mail_messages").select("id, mailbox_id, folder_id, uid, folder:mail_folders(id, path, role)").in("id", list);
  if (!data || !data.length) throw new UserError("Messages introuvables");
  const boxes = new Set(data.map((d: any) => d.mailbox_id));
  if (boxes.size > 1) throw new UserError("Sélection sur plusieurs boîtes : une boîte à la fois");
  return data;
}

async function actionFlags(db: any, body: any) {
  const rows = await loadMessages(db, body.message_ids);
  const patch: any = {};
  await withBox(db, rows[0].mailbox_id, async (_box, imap) => {
    for (const [, group] of groupByFolder(rows)) {
      await imap.open(group[0].folder.path, true);
      const set = group.map((g: any) => g.uid).join(",");
      if (typeof body.seen === "boolean") {
        await imap.store(set, body.seen ? "+" : "-", "\\Seen");
        patch.is_seen = body.seen;
      }
      if (typeof body.flagged === "boolean") {
        await imap.store(set, body.flagged ? "+" : "-", "\\Flagged");
        patch.is_flagged = body.flagged;
      }
    }
  });
  if (Object.keys(patch).length) {
    await db.from("mail_messages").update({ ...patch, updated_at: new Date().toISOString() }).in("id", rows.map((r) => r.id));
  }
  return { success: true };
}

async function actionMove(db: any, body: any) {
  const rows = await loadMessages(db, body.message_ids);
  const target = String(body.target || "");
  let moved = 0;
  await withBox(db, rows[0].mailbox_id, async (box, imap) => {
    let dest: any = null;
    if (["trash", "spam", "inbox", "archive"].includes(target)) {
      const createName = target === "archive" ? "Archives" : target === "trash" ? "Trash" : target === "spam" ? "Spam" : undefined;
      dest = await folderFor(db, box, imap, target as any, createName);
    } else if (target) {
      const { data } = await db.from("mail_folders").select("*").eq("id", target).eq("mailbox_id", box.id).maybeSingle();
      dest = data;
    }
    if (!dest) throw new UserError("Dossier de destination introuvable");
    for (const [folderId, group] of groupByFolder(rows)) {
      if (folderId === dest.id) continue;
      await imap.open(group[0].folder.path, true);
      await imap.move(group.map((g: any) => g.uid).join(","), dest.path);
      moved += group.length;
    }
    // Le dossier d'arrivée sera relu au prochain passage : on force la lecture des nouveaux messages.
    await db.from("mail_folders").update({ updated_at: new Date().toISOString() }).eq("id", dest.id);
  });
  await db.from("mail_messages").update({ deleted_on_server: true, updated_at: new Date().toISOString() }).in("id", rows.map((r) => r.id));
  return { success: true, moved };
}

async function actionAttachment(db: any, body: any) {
  const msg = await loadMessage(db, String(body.message_id || ""));
  const part = String(body.part || "");
  const att = (msg.attachments || []).find((a: any) => a.part === part);
  if (!att) throw new UserError("Pièce jointe introuvable");
  const content = await readPart(db, msg, part);
  return { filename: att.filename, mime: att.mime, base64: encodeBase64(decodeTransfer(content, att.encoding)) };
}

async function readPart(db: any, msg: any, part: string): Promise<Uint8Array> {
  return await withBox(db, msg.mailbox_id, async (_box, imap) => {
    await imap.open(msg.folder.path, false);
    const [m] = await imap.fetch(String(msg.uid), `UID BODY.PEEK[${part}]`);
    const content = m?.sections[part];
    if (!content) throw new Error("Pièce jointe illisible sur le serveur");
    return content;
  });
}

function decodeTransfer(raw: Uint8Array, encoding: string): Uint8Array {
  const e = (encoding || "").toLowerCase();
  if (e === "base64") {
    const text = latin1(raw).replace(/[^A-Za-z0-9+/]/g, "");
    const usable = text.length % 4 === 1 ? text.slice(0, -1) : text;
    return latin1Bytes(atob(usable + "===".slice((usable.length + 3) % 4)));
  }
  if (e === "quoted-printable") {
    const s = latin1(raw).replace(/=\r?\n/g, "");
    const out: number[] = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) { out.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
      else out.push(s.charCodeAt(i) & 0xff);
    }
    return new Uint8Array(out);
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Envoi

function cleanList(v: unknown): MailAddress[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  const out: MailAddress[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      for (const a of parseAddressList(item)) if (EMAIL_RX.test(a.email)) out.push(a);
    } else if (item && typeof item === "object" && EMAIL_RX.test(String((item as any).email || ""))) {
      out.push({ name: (item as any).name ? String((item as any).name) : null, email: String((item as any).email).toLowerCase() });
    }
  }
  return out;
}

async function collectAttachments(db: any, list: unknown): Promise<OutgoingAttachment[]> {
  const items = Array.isArray(list) ? list.slice(0, 20) : [];
  const out: OutgoingAttachment[] = [];
  let total = 0;
  for (const a of items as any[]) {
    let content: Uint8Array | null = null;
    let filename = String(a?.filename || "piece-jointe");
    let mime = String(a?.mime || "application/octet-stream");
    if (a?.bucket && a?.path) {
      const bucket = String(a.bucket);
      if (!["mail-attachments", "client-documents", "documents"].includes(bucket)) throw new UserError(`Emplacement non autorisé : ${bucket}`);
      const { data, error } = await db.storage.from(bucket).download(String(a.path));
      if (error || !data) throw new UserError(`Pièce jointe introuvable : ${filename}`);
      content = new Uint8Array(await data.arrayBuffer());
      if (!a.mime && data.type) mime = data.type;
    } else if (a?.message_id && a?.part) {
      const msg = await loadMessage(db, String(a.message_id));
      const att = (msg.attachments || []).find((x: any) => x.part === String(a.part));
      if (!att) throw new UserError("Pièce jointe d'origine introuvable");
      filename = att.filename || filename;
      mime = att.mime || mime;
      content = decodeTransfer(await readPart(db, msg, String(a.part)), att.encoding);
    }
    if (!content) continue;
    total += content.length;
    if (total > MAX_SEND_BYTES) throw new UserError("Pièces jointes trop lourdes (20 Mo au maximum)");
    out.push({ filename, mime, content });
  }
  return out;
}

function withSignature(html: string, box: Box, add: boolean): string {
  if (!add || !box.signature_html) return html;
  return `${html}<br><br>${box.signature_html}`;
}

async function smtpSend(box: Box, recipients: string[], raw: string): Promise<string> {
  const smtp = await LeanSmtp.connect(box.imap_host || "mail.infomaniak.com", box.smtp_port || 465);
  try {
    await smtp.login(box.address, box.password);
    return await smtp.send(box.address, recipients, raw);
  } finally {
    await smtp.quit();
  }
}

async function journal(db: any, row: any) {
  const { data } = await db.from("mail_outbox").insert(row).select("id").maybeSingle();
  return data?.id as string | undefined;
}

async function actionSend(db: any, body: any, actor: { userId: string | null; source: string }) {
  const box = await loadBox(db, String(body.mailbox_id || ""));
  const to = cleanList(body.to);
  const cc = cleanList(body.cc);
  const bcc = cleanList(body.bcc);
  if (!to.length && !cc.length && !bcc.length) throw new UserError("Ajoutez au moins un destinataire valide");
  const subject = String(body.subject || "").replace(/[\r\n]+/g, " ").slice(0, 500);
  const html = withSignature(String(body.html || ""), box, body.signature !== false);
  let inReplyTo: string | null = null;
  let references: string | null = null;
  let original: any = null;
  if (body.reply_to_message_id) {
    original = await loadMessage(db, String(body.reply_to_message_id));
    inReplyTo = original.message_id || null;
    references = [original.references_header, original.message_id].filter(Boolean).join(" ").slice(-3000) || null;
  }
  const attachments = await collectAttachments(db, body.attachments);
  const { raw, messageId } = buildMime({
    from: { name: box.display_name || box.label || null, email: box.address },
    to, cc, subject, html, text: body.text ? String(body.text) : undefined,
    inReplyTo, references, attachments, messageId: newMessageId(box.address.split("@")[1]),
  });
  const kind = body.kind && ["postulation", "reponse", "transfert", "autre"].includes(body.kind) ? body.kind : (original ? "reponse" : "autre");
  const logId = await journal(db, {
    mailbox_id: box.id, source: actor.source, kind, statut: "envoi_en_cours",
    to_list: to, cc_list: cc, bcc_list: bcc, subject,
    attachments: attachments.map((a) => ({ filename: a.filename, mime: a.mime, size: a.content.length })),
    reply_to_message_id: original?.id ?? null, draft_message_id: body.draft_message_id ?? null, created_by: actor.userId,
  });
  const rawText = latin1(raw);
  let reply = "";
  try {
    reply = await smtpSend(box, [...to, ...cc, ...bcc].map((a) => a.email), rawText);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (logId) await db.from("mail_outbox").update({ statut: "erreur", error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", logId);
    throw new Error(`Envoi refusé : ${message}`);
  }
  if (logId) await db.from("mail_outbox").update({ statut: "envoye", sent_message_id: messageId, smtp_reply: reply, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", logId);

  // Copie dans « Envoyés », réponse marquée, ancien brouillon rangé : un échec ici n'annule pas l'envoi.
  const warnings: string[] = [];
  try {
    const imap = await openImap(box);
    try {
      const sent = await folderFor(db, box, imap, "sent", "Sent");
      if (sent) {
        const uid = await imap.append(sent.path, "\\Seen", raw);
        if (uid) await ingest(db, imap, box, sent, Number((await imap.open(sent.path, false)).uidvalidity), [uid]);
      }
      if (original && original.folder?.path) {
        await imap.open(original.folder.path, true);
        await imap.store(String(original.uid), "+", "\\Answered");
        await db.from("mail_messages").update({ is_answered: true }).eq("id", original.id);
      }
      if (body.draft_message_id) await archiveDraft(db, box, imap, String(body.draft_message_id));
    } finally {
      await imap.logout();
    }
  } catch (e) {
    warnings.push(`Copie dans « Envoyés » : ${e instanceof Error ? e.message : String(e)}`);
  }
  return { success: true, message_id: messageId, warnings };
}

async function archiveDraft(db: any, box: Box, imap: ImapClient, draftId: string) {
  const { data: draft } = await db.from("mail_messages").select("id, uid, folder:mail_folders(path)").eq("id", draftId).maybeSingle();
  if (!draft?.folder?.path) return;
  const dest = await ensureFolderByName(db, box, imap, SENT_DRAFTS_FOLDER);
  await imap.open(draft.folder.path, true);
  await imap.move(String(draft.uid), dest.path);
  await db.from("mail_messages").update({ deleted_on_server: true, updated_at: new Date().toISOString() }).eq("id", draft.id);
}

async function actionSendDraft(db: any, body: any, actor: { userId: string | null; source: string }) {
  const draft = await loadMessage(db, String(body.message_id || ""));
  if (draft.folder?.role !== "drafts") throw new UserError("Ce message n'est pas un brouillon");
  const box = await loadBox(db, draft.mailbox_id);
  const imap = await openImap(box);
  try {
    await imap.open(draft.folder.path, true);
    const [m] = await imap.fetch(String(draft.uid), "UID RFC822.SIZE BODY.PEEK[]");
    if (!m) throw new UserError("Brouillon introuvable sur le serveur (déjà envoyé ou déplacé ?)");
    if ((m.size || 0) > MAX_DRAFT_BYTES) throw new UserError("Brouillon trop lourd (25 Mo au maximum)");
    const rawDraft = latin1(m.sections[""] || new Uint8Array(0));
    const h = parseHeaders(m.sections[""] || new Uint8Array(0));
    const to = parseAddressList(headerValue(h, "to"));
    const cc = parseAddressList(headerValue(h, "cc"));
    const bcc = parseAddressList(headerValue(h, "bcc"));
    const recipients = [...to, ...cc, ...bcc].map((a) => a.email).filter((e) => EMAIL_RX.test(e));
    if (!recipients.length) throw new UserError("Le brouillon n'a pas de destinataire");
    const messageId = newMessageId(box.address.split("@")[1]);
    const ready = prepareDraftForSend(rawDraft, { id: messageId });
    const logId = await journal(db, {
      mailbox_id: box.id, source: actor.source, kind: "brouillon_valide", statut: "envoi_en_cours",
      to_list: to, cc_list: cc, bcc_list: bcc, subject: draft.subject,
      attachments: (draft.attachments || []).map((a: any) => ({ filename: a.filename, mime: a.mime, size: a.size })),
      draft_message_id: draft.id, created_by: actor.userId,
    });
    let reply = "";
    try {
      reply = await smtpSend(box, recipients, ready);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (logId) await db.from("mail_outbox").update({ statut: "erreur", error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", logId);
      throw new Error(`Envoi refusé : ${message}`);
    }
    if (logId) await db.from("mail_outbox").update({ statut: "envoye", sent_message_id: messageId, smtp_reply: reply, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", logId);
    const warnings: string[] = [];
    try {
      const sent = await folderFor(db, box, imap, "sent", "Sent");
      if (sent) await imap.append(sent.path, "\\Seen", latin1Bytes(ready));
      await archiveDraft(db, box, imap, draft.id);
    } catch (e) {
      warnings.push(`Rangement après envoi : ${e instanceof Error ? e.message : String(e)}`);
    }
    return { success: true, message_id: messageId, recipients, warnings };
  } finally {
    await imap.logout();
  }
}

async function actionSaveDraft(db: any, body: any) {
  const box = await loadBox(db, String(body.mailbox_id || ""));
  const to = cleanList(body.to);
  const cc = cleanList(body.cc);
  const subject = String(body.subject || "").replace(/[\r\n]+/g, " ").slice(0, 500);
  const attachments = await collectAttachments(db, body.attachments);
  let inReplyTo: string | null = null;
  let references: string | null = null;
  if (body.reply_to_message_id) {
    const original = await loadMessage(db, String(body.reply_to_message_id));
    inReplyTo = original.message_id || null;
    references = [original.references_header, original.message_id].filter(Boolean).join(" ").slice(-3000) || null;
  }
  const { raw } = buildMime({
    from: { name: box.display_name || box.label || null, email: box.address },
    to, cc, subject, html: String(body.html || ""), inReplyTo, references, attachments,
  });
  const imap = await openImap(box);
  try {
    const drafts = await folderFor(db, box, imap, "drafts", "Drafts");
    if (!drafts) throw new Error("Dossier Brouillons introuvable");
    const uid = await imap.append(drafts.path, "\\Draft \\Seen", raw);
    // L'ancienne version du brouillon est rangée dans la Corbeille (pas d'effacement définitif).
    if (body.draft_message_id) {
      const { data: old } = await db.from("mail_messages").select("id, uid, folder_id").eq("id", String(body.draft_message_id)).maybeSingle();
      if (old && old.folder_id === drafts.id) {
        const trash = await folderFor(db, box, imap, "trash", "Trash");
        await imap.open(drafts.path, true);
        if (trash) await imap.move(String(old.uid), trash.path);
        await db.from("mail_messages").update({ deleted_on_server: true }).eq("id", old.id);
      }
    }
    let saved: string | null = null;
    if (uid) {
      const info = await imap.open(drafts.path, false);
      await ingest(db, imap, box, drafts, info.uidvalidity, [uid]);
      const { data } = await db.from("mail_messages").select("id").eq("folder_id", drafts.id).eq("uid", uid).eq("uidvalidity", info.uidvalidity).maybeSingle();
      saved = data?.id ?? null;
    }
    return { success: true, draft_message_id: saved };
  } finally {
    await imap.logout();
  }
}

async function actionTest(db: any, body: any) {
  const box = await loadBox(db, String(body.mailbox_id || ""));
  const result: { imap: string; smtp: string } = { imap: "", smtp: "" };
  try {
    const imap = await openImap(box);
    const folders = await imap.list();
    await imap.logout();
    result.imap = `ok (${folders.length} dossiers)`;
  } catch (e) {
    result.imap = `erreur : ${e instanceof Error ? e.message : String(e)}`;
  }
  try {
    const smtp = await LeanSmtp.connect(box.imap_host || "mail.infomaniak.com", box.smtp_port || 465);
    try { await smtp.login(box.address, box.password); result.smtp = "ok"; } finally { await smtp.quit(); }
  } catch (e) {
    result.smtp = `erreur : ${e instanceof Error ? e.message : String(e)}`;
  }
  return result;
}
