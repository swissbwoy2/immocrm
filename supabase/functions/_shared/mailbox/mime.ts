// Lecture et fabrication des e-mails (MIME) pour les boîtes de l'agence.
// Aucune dépendance externe : en-têtes, adresses, encodages, structure IMAP, message à envoyer.
// deno-lint-ignore-file no-explicit-any

export interface MailAddress {
  name: string | null;
  email: string;
}

export interface PartInfo {
  part: string;            // numéro IMAP (ex. "1", "2.1")
  type: string;            // ex. "text/plain"
  charset: string | null;
  encoding: string;        // 7bit, base64, quoted-printable…
  size: number;
  filename: string | null;
  disposition: string | null;
  contentId: string | null;
}

export interface MessageLayout {
  textPart: PartInfo | null;
  htmlPart: PartInfo | null;
  attachments: PartInfo[];
}

const latin1 = new TextDecoder("latin1");
const utf8 = new TextDecoder("utf-8");
const enc = new TextEncoder();

// ---------------------------------------------------------------------------
// Décodage des jeux de caractères
// ---------------------------------------------------------------------------

export function decodeCharset(bytes: Uint8Array, charset: string | null | undefined): string {
  const cs = (charset || "utf-8").toLowerCase().replace(/^"|"$/g, "");
  const label = cs === "us-ascii" || cs === "ascii" ? "utf-8" : cs === "latin1" ? "iso-8859-1" : cs;
  try {
    return new TextDecoder(label).decode(bytes);
  } catch (_) {
    try { return utf8.decode(bytes); } catch (_e) { return latin1.decode(bytes); }
  }
}

function bytesFromBinaryString(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

export function decodeBase64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const usable = clean.length % 4 === 1 ? clean.slice(0, -1) : clean;
  const padded = usable + "===".slice((usable.length + 3) % 4);
  try {
    return bytesFromBinaryString(atob(padded));
  } catch (_) {
    return new Uint8Array(0);
  }
}

export function decodeQuotedPrintableToBytes(input: string): Uint8Array {
  const s = input.replace(/=\r?\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      out.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(s.charCodeAt(i) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Décode le contenu d'une partie selon son encodage de transfert, puis son jeu de caractères. */
export function decodePartText(raw: Uint8Array, encoding: string, charset: string | null): string {
  const e = (encoding || "7bit").toLowerCase();
  let bytes: Uint8Array;
  if (e === "base64") bytes = decodeBase64ToBytes(latin1.decode(raw));
  else if (e === "quoted-printable") bytes = decodeQuotedPrintableToBytes(latin1.decode(raw));
  else bytes = raw;
  return decodeCharset(bytes, charset);
}

// ---------------------------------------------------------------------------
// En-têtes
// ---------------------------------------------------------------------------

/** Décode les mots encodés RFC 2047 (=?utf-8?B?…?= / =?iso-8859-1?Q?…?=). */
export function decodeWords(value: string): string {
  if (!value) return value;
  const joined = value.replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?[^?]+\?[BbQq]\?[^?]*\?=)/g, "$1");
  return joined.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, charset: string, kind: string, text: string) => {
    const cs = charset.split("*")[0];
    let bytes: Uint8Array;
    if (kind.toUpperCase() === "B") bytes = decodeBase64ToBytes(text);
    else bytes = decodeQuotedPrintableToBytes(text.replace(/_/g, " "));
    return decodeCharset(bytes, cs);
  });
}

/** Dictionnaire des en-têtes (noms en minuscules ; valeurs dépliées, mots encodés non décodés). */
export function parseHeaders(raw: Uint8Array | string): Record<string, string[]> {
  let text = typeof raw === "string" ? raw : latin1.decode(raw);
  // Les en-têtes non ASCII bruts (UTF-8 sans encodage) sont fréquents : on tente l'UTF-8.
  if (typeof raw !== "string" && /[\x80-\xff]/.test(text)) {
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(raw); } catch (_) { /* reste en latin1 */ }
  }
  const end = text.search(/\r?\n\r?\n/);
  if (end >= 0) text = text.slice(0, end);
  const unfolded = text.replace(/\r?\n[ \t]+/g, " ");
  const out: Record<string, string[]> = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    (out[name] ||= []).push(value);
  }
  return out;
}

export function headerValue(h: Record<string, string[]>, name: string): string | null {
  const v = h[name.toLowerCase()];
  return v && v.length ? v[0] : null;
}

/** Découpe une liste d'adresses en respectant les guillemets et les chevrons. */
export function parseAddressList(value: string | null): MailAddress[] {
  if (!value) return [];
  const parts: string[] = [];
  let cur = "", inQuote = false, depth = 0;
  for (const ch of value) {
    if (ch === '"' && depth === 0) inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "<") depth++;
      if (ch === ">") depth = Math.max(0, depth - 1);
      if ((ch === "," || ch === ";") && depth === 0) { parts.push(cur); cur = ""; continue; }
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  const out: MailAddress[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    const m = s.match(/^(.*)<([^>]+)>\s*$/);
    if (m) {
      const name = decodeWords(m[1].trim().replace(/^"|"$/g, "").replace(/\\"/g, '"')).trim();
      out.push({ name: name || null, email: m[2].trim().toLowerCase() });
    } else if (s.includes("@")) {
      out.push({ name: null, email: s.replace(/^"|"$/g, "").trim().toLowerCase() });
    }
  }
  return out;
}

export function parseMessageIdList(value: string | null): string[] {
  if (!value) return [];
  return (value.match(/<[^>]+>/g) || []).map((s) => s.trim());
}

export function parseMailDate(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\([^)]*\)/g, "").trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Date IMAP INTERNALDATE « 17-Jul-1996 02:44:25 -0700 ». */
export function parseInternalDate(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/^\s*(\d{1,2})-(\w{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/);
  if (!m) return parseMailDate(value);
  const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const iso = `${m[3]}-${months[m[2].toLowerCase()] || "01"}-${m[1].padStart(2, "0")}T${m[4]}:${m[5]}:${m[6]}${m[7].slice(0, 3)}:${m[7].slice(3)}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Structure du message (BODYSTRUCTURE IMAP)
// ---------------------------------------------------------------------------

function str(v: any): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Uint8Array) return latin1.decode(v);
  if (typeof v === "string") return v;
  return null;
}

function paramList(v: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(v)) return out;
  for (let i = 0; i + 1 < v.length; i += 2) {
    const k = str(v[i]);
    const val = str(v[i + 1]);
    if (k && val !== null) out[k.toLowerCase()] = val;
  }
  return out;
}

/** Nom de fichier : paramètres RFC 2231 (filename*=utf-8''…, découpés en *0*, *1*) ou RFC 2047. */
function pickFilename(params: Record<string, string>, key: string): string | null {
  if (params[`${key}*`]) return decode2231(params[`${key}*`]);
  const pieces = Object.keys(params)
    .filter((k) => k.startsWith(`${key}*`) && /\*\d+\*?$/.test(k))
    .sort((a, b) => parseInt(a.split("*")[1], 10) - parseInt(b.split("*")[1], 10));
  if (pieces.length) {
    const encoded = pieces.some((k) => k.endsWith("*") && /\*\d+\*$/.test(k));
    const joined = pieces.map((k) => params[k]).join("");
    return encoded ? decode2231(joined) : decodeWords(joined);
  }
  if (params[key]) return decodeWords(params[key]);
  return null;
}

function decode2231(v: string): string {
  const m = v.match(/^([^']*)'[^']*'(.*)$/);
  const charset = m ? m[1] || "utf-8" : "utf-8";
  const body = m ? m[2] : v;
  try {
    const bytes = decodeQuotedPrintableToBytes(body.replace(/%([0-9A-Fa-f]{2})/g, "=$1"));
    return decodeCharset(bytes, charset);
  } catch (_) {
    return body;
  }
}

export function analyzeStructure(bs: any[] | null): MessageLayout {
  const layout: MessageLayout = { textPart: null, htmlPart: null, attachments: [] };
  if (!bs) return layout;

  const walk = (node: any[], num: string, inAlternative: boolean) => {
    if (Array.isArray(node[0])) {
      // multipart : enfants puis sous-type
      let i = 0;
      const children: any[][] = [];
      while (i < node.length && Array.isArray(node[i])) { children.push(node[i]); i++; }
      const subtype = (str(node[i]) || "").toLowerCase();
      children.forEach((child, idx) => {
        const childNum = num ? `${num}.${idx + 1}` : `${idx + 1}`;
        walk(child, childNum, subtype === "alternative" || inAlternative);
      });
      return;
    }
    const type = (str(node[0]) || "application").toLowerCase();
    const subtype = (str(node[1]) || "octet-stream").toLowerCase();
    const params = paramList(node[2]);
    const contentId = str(node[3]);
    const encoding = (str(node[5]) || "7bit").toLowerCase();
    const size = parseInt(str(node[6]) || "0", 10) || 0;
    let extStart = 7;
    if (type === "text") extStart = 8;
    else if (type === "message" && subtype === "rfc822") extStart = 10;
    const disp = Array.isArray(node[extStart + 1]) ? node[extStart + 1] : null;
    const disposition = disp ? (str(disp[0]) || "").toLowerCase() : null;
    const dispParams = disp ? paramList(disp[1]) : {};
    const filename = pickFilename(dispParams, "filename") || pickFilename(params, "name");
    const info: PartInfo = {
      part: num || "1",
      type: `${type}/${subtype}`,
      charset: params["charset"] || null,
      encoding,
      size,
      filename,
      disposition,
      contentId: contentId ? contentId.replace(/^<|>$/g, "") : null,
    };
    const isAttachment = disposition === "attachment" || (!!filename && type !== "text") || (type === "message" && subtype === "rfc822");
    if (!isAttachment && type === "text" && subtype === "plain" && !layout.textPart) { layout.textPart = info; return; }
    if (!isAttachment && type === "text" && subtype === "html" && !layout.htmlPart) { layout.htmlPart = info; return; }
    if (type === "text" && !isAttachment && !filename) return; // autres textes (calendrier…) ignorés
    if (type === "multipart") return;
    if (type === "message" && subtype === "rfc822" && !info.filename) info.filename = "message-joint.eml";
    if (!info.filename) info.filename = info.contentId ? `image-${info.part}.${subtype}` : `piece-jointe-${info.part}.${subtype}`;
    layout.attachments.push(info);
  };

  walk(bs, "", false);
  return layout;
}

// ---------------------------------------------------------------------------
// Texte utilitaire
// ---------------------------------------------------------------------------

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function makeSnippet(text: string | null, html: string | null): string {
  const base = text && text.trim() ? text : html ? htmlToText(html) : "";
  return base.replace(/\s+/g, " ").trim().slice(0, 220);
}

/** Supprime les caractères refusés par Postgres (NUL). */
export function pgSafe(s: string | null | undefined, max?: number): string | null {
  if (s === null || s === undefined) return null;
  const clean = s.replace(/\u0000/g, "");
  return max && clean.length > max ? clean.slice(0, max) : clean;
}

// ---------------------------------------------------------------------------
// Fabrication d'un message à envoyer
// ---------------------------------------------------------------------------

export interface OutgoingAttachment {
  filename: string;
  mime: string;
  content: Uint8Array;
}

export interface OutgoingMessage {
  from: MailAddress;
  to: MailAddress[];
  cc?: MailAddress[];
  subject: string;
  html: string;
  text?: string;
  inReplyTo?: string | null;
  references?: string | null;
  attachments?: OutgoingAttachment[];
  messageId?: string;
}

function needsEncoding(s: string): boolean {
  return /[^\x20-\x7e]/.test(s);
}

function b64Utf8(s: string): string {
  return encodeBase64(enc.encode(s));
}

export function encodeHeaderWord(s: string): string {
  if (!needsEncoding(s)) return s;
  // Mots encodés de 45 caractères max avant encodage pour rester sous 76 colonnes.
  const chunks: string[] = [];
  let cur = "";
  for (const ch of s) {
    if (enc.encode(cur + ch).length > 45) { chunks.push(cur); cur = ""; }
    cur += ch;
  }
  if (cur) chunks.push(cur);
  return chunks.map((c) => `=?UTF-8?B?${b64Utf8(c)}?=`).join("\r\n ");
}

export function formatAddress(a: MailAddress): string {
  if (!a.name) return a.email;
  const name = needsEncoding(a.name) ? encodeHeaderWord(a.name) : `"${a.name.replace(/(["\\])/g, "\\$1")}"`;
  return `${name} <${a.email}>`;
}

/** Base64 par blocs (multiples de 3 octets) avec btoa natif : rapide même pour de grosses pièces jointes. */
export function encodeBase64(bytes: Uint8Array): string {
  const CHUNK = 3 * 8192;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    parts.push(btoa(String.fromCharCode(...sub)));
  }
  return parts.join("");
}

function wrap76(s: string): string {
  const lines: string[] = [];
  for (let i = 0; i < s.length; i += 76) lines.push(s.slice(i, i + 76));
  return lines.join("\r\n");
}

function rfc2822Date(d = new Date()): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

function boundary(tag: string): string {
  return `----=_LogisoramaMail_${tag}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function newMessageId(domain: string): string {
  return `<${crypto.randomUUID()}@${domain}>`;
}

function asciiFilename(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
}

/** Message MIME complet (CRLF), prêt pour SMTP et pour un dépôt IMAP (Envoyés/Brouillons). */
export function buildMime(msg: OutgoingMessage): { raw: Uint8Array; messageId: string } {
  const domain = msg.from.email.split("@")[1] || "immo-rama.ch";
  const messageId = msg.messageId || newMessageId(domain);
  const text = msg.text ?? htmlToText(msg.html);
  const headers: string[] = [
    `From: ${formatAddress(msg.from)}`,
    `To: ${msg.to.map(formatAddress).join(", ")}`,
  ];
  if (msg.cc && msg.cc.length) headers.push(`Cc: ${msg.cc.map(formatAddress).join(", ")}`);
  headers.push(`Subject: ${encodeHeaderWord(msg.subject || "")}`);
  headers.push(`Date: ${rfc2822Date()}`);
  headers.push(`Message-ID: ${messageId}`);
  if (msg.inReplyTo) headers.push(`In-Reply-To: ${msg.inReplyTo}`);
  if (msg.references) headers.push(`References: ${msg.references}`);
  headers.push("MIME-Version: 1.0");
  headers.push("X-Mailer: Logisorama");

  const altB = boundary("alt");
  const alternative = [
    `--${altB}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64Utf8(text)),
    `--${altB}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64Utf8(msg.html)),
    `--${altB}--`,
    "",
  ].join("\r\n");

  let body: string;
  const atts = msg.attachments || [];
  if (atts.length === 0) {
    headers.push(`Content-Type: multipart/alternative; boundary="${altB}"`);
    body = alternative;
  } else {
    const mixB = boundary("mix");
    headers.push(`Content-Type: multipart/mixed; boundary="${mixB}"`);
    const parts: string[] = [`--${mixB}`, `Content-Type: multipart/alternative; boundary="${altB}"`, "", alternative];
    for (const a of atts) {
      const plain = !needsEncoding(a.filename);
      const typeName = plain ? `"${asciiFilename(a.filename)}"` : `"=?UTF-8?B?${b64Utf8(a.filename)}?="`;
      const dispName = plain ? `filename="${asciiFilename(a.filename)}"` : `filename*=UTF-8''${encodeURIComponent(a.filename)}`;
      parts.push(`--${mixB}`);
      parts.push(`Content-Type: ${a.mime || "application/octet-stream"}; name=${typeName}`);
      parts.push("Content-Transfer-Encoding: base64");
      parts.push(`Content-Disposition: attachment; ${dispName}`);
      parts.push("");
      parts.push(wrap76(encodeBase64(a.content)));
    }
    parts.push(`--${mixB}--`, "");
    body = parts.join("\r\n");
  }
  const raw = headers.join("\r\n") + "\r\n\r\n" + body;
  return { raw: enc.encode(raw), messageId };
}
