// Client IMAP minimal, lu octet par octet (les tailles des « littéraux » IMAP sont en octets).
// Utilisé par mailbox-sync et mailbox-action pour les boîtes de l'agence (Infomaniak, IMAP 993 SSL).
// deno-lint-ignore-file no-explicit-any

export interface ImapLine {
  /** Texte de la réponse ; chaque littéral est remplacé par le repère \u0000L<index>\u0000. */
  text: string;
  literals: Uint8Array[];
}

export interface ImapResult {
  tag: string;
  status: "OK" | "NO" | "BAD";
  statusText: string;
  untagged: ImapLine[];
}

export interface ImapListEntry {
  path: string;
  flags: string[];
  delimiter: string | null;
}

export interface FetchedMessage {
  uid: number;
  flags: string[];
  internalDate: string | null;
  size: number | null;
  bodystructure: any[] | null;
  /** Sections lues : clé = section renvoyée par le serveur (ex. "HEADER", "1.2", ""), valeur = octets. */
  sections: Record<string, Uint8Array>;
}

const enc = new TextEncoder();
const latin1 = new TextDecoder("latin1");

/** Repère d'un littéral dans le texte d'une réponse. */
export const litMarker = (i: number) => `\u0000L${i}\u0000`;
const LIT_RE = /\u0000L(\d+)\u0000/;

export class ImapClient {
  private conn: Deno.TlsConn | null = null;
  private buf = new Uint8Array(0);
  private tagNo = 0;
  capabilities: string[] = [];
  /** Délai max d'attente de données du serveur (ms). */
  timeoutMs = 45000;

  async connect(host: string, port: number): Promise<void> {
    this.conn = await Deno.connectTls({ hostname: host, port });
    const greet = await this.readLine();
    if (!/^\* (OK|PREAUTH)/i.test(greet.text)) {
      throw new Error("Serveur IMAP : accueil inattendu");
    }
  }

  private async fill(): Promise<boolean> {
    const chunk = new Uint8Array(65536);
    let timer: number | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), this.timeoutMs);
    });
    const n = await Promise.race([this.conn!.read(chunk), timeout]);
    clearTimeout(timer);
    if (n === null || n === undefined) return false;
    const size = n as number;
    const merged = new Uint8Array(this.buf.length + size);
    merged.set(this.buf, 0);
    merged.set(chunk.subarray(0, size), this.buf.length);
    this.buf = merged;
    return true;
  }

  private indexOfCrlf(from = 0): number {
    for (let i = from; i < this.buf.length - 1; i++) {
      if (this.buf[i] === 13 && this.buf[i + 1] === 10) return i;
    }
    return -1;
  }

  private async rawLine(): Promise<string> {
    let idx = this.indexOfCrlf();
    while (idx < 0) {
      const scanFrom = Math.max(0, this.buf.length - 1);
      if (!(await this.fill())) throw new Error("Connexion IMAP interrompue");
      idx = this.indexOfCrlf(scanFrom);
    }
    const line = latin1.decode(this.buf.subarray(0, idx));
    this.buf = this.buf.subarray(idx + 2);
    return line;
  }

  private async rawBytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) {
      if (!(await this.fill())) throw new Error("Connexion IMAP interrompue (littéral)");
    }
    const out = this.buf.slice(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  }

  /** Lit une réponse complète (une ligne logique, littéraux compris). */
  async readLine(): Promise<ImapLine> {
    const literals: Uint8Array[] = [];
    let text = "";
    while (true) {
      const line = await this.rawLine();
      const m = line.match(/~?\{(\d+)\+?\}$/);
      if (m) {
        const size = parseInt(m[1], 10);
        text += line.slice(0, line.length - m[0].length) + litMarker(literals.length);
        literals.push(await this.rawBytes(size));
        continue;
      }
      text += line;
      return { text, literals };
    }
  }

  private nextTag(): string {
    this.tagNo += 1;
    return `M${this.tagNo}`;
  }

  async command(cmd: string): Promise<ImapResult> {
    const tag = this.nextTag();
    await this.conn!.write(enc.encode(`${tag} ${cmd}\r\n`));
    return await this.collect(tag);
  }

  private async collect(tag: string): Promise<ImapResult> {
    const untagged: ImapLine[] = [];
    while (true) {
      const line = await this.readLine();
      if (line.text.startsWith(`${tag} `)) {
        const rest = line.text.slice(tag.length + 1);
        const head = rest.slice(0, 3).toUpperCase();
        const status = head.startsWith("OK") ? "OK" : head.startsWith("NO") ? "NO" : "BAD";
        return { tag, status, statusText: rest, untagged };
      }
      untagged.push(line);
    }
  }

  async expectOk(cmd: string, what: string): Promise<ImapResult> {
    const r = await this.command(cmd);
    if (r.status !== "OK") throw new Error(`${what} : ${r.statusText.slice(0, 200)}`);
    return r;
  }

  async login(user: string, password: string): Promise<void> {
    const r = await this.command(`LOGIN ${quote(user)} ${quote(password)}`);
    if (r.status !== "OK") throw new Error("Identifiant ou mot de passe refusé par le serveur IMAP");
    const cap = await this.command("CAPABILITY");
    const line = cap.untagged.find((l) => l.text.toUpperCase().startsWith("* CAPABILITY"));
    this.capabilities = line ? line.text.slice(13).toUpperCase().split(/\s+/) : [];
  }

  has(cap: string): boolean {
    return this.capabilities.includes(cap.toUpperCase());
  }

  async list(): Promise<ImapListEntry[]> {
    const r = await this.expectOk('LIST "" "*"', "Liste des dossiers");
    const out: ImapListEntry[] = [];
    for (const l of r.untagged) {
      if (!l.text.toUpperCase().startsWith("* LIST ")) continue;
      const m = l.text.match(/^\* LIST \(([^)]*)\) (NIL|"(?:[^"\\]|\\.)*") (.*)$/i);
      if (!m) continue;
      const flags = m[1].split(/\s+/).filter(Boolean);
      const delimiter = m[2].toUpperCase() === "NIL" ? null : unquote(m[2]);
      let name = m[3].trim();
      const lit = name.match(LIT_RE);
      if (lit) name = latin1.decode(l.literals[parseInt(lit[1], 10)]);
      else name = name.startsWith('"') ? unquote(name) : name;
      out.push({ path: name, flags, delimiter });
    }
    return out;
  }

  async status(path: string): Promise<{ messages: number; unseen: number; uidnext: number; uidvalidity: number } | null> {
    const r = await this.command(`STATUS ${quote(path)} (MESSAGES UNSEEN UIDNEXT UIDVALIDITY)`);
    if (r.status !== "OK") return null;
    const line = r.untagged.find((l) => l.text.toUpperCase().startsWith("* STATUS"));
    if (!line) return null;
    const num = (k: string) => {
      const m = line.text.match(new RegExp(`${k} (\\d+)`, "i"));
      return m ? parseInt(m[1], 10) : 0;
    };
    return { messages: num("MESSAGES"), unseen: num("UNSEEN"), uidnext: num("UIDNEXT"), uidvalidity: num("UIDVALIDITY") };
  }

  /** Ouvre un dossier en lecture seule (EXAMINE) ou en écriture (SELECT). */
  async open(path: string, write = false): Promise<{ exists: number; uidvalidity: number; uidnext: number }> {
    const r = await this.expectOk(`${write ? "SELECT" : "EXAMINE"} ${quote(path)}`, `Ouverture du dossier ${path}`);
    let exists = 0, uidvalidity = 0, uidnext = 0;
    for (const l of r.untagged) {
      const e = l.text.match(/^\* (\d+) EXISTS/i);
      if (e) exists = parseInt(e[1], 10);
      const v = l.text.match(/UIDVALIDITY (\d+)/i);
      if (v) uidvalidity = parseInt(v[1], 10);
      const n = l.text.match(/UIDNEXT (\d+)/i);
      if (n) uidnext = parseInt(n[1], 10);
    }
    return { exists, uidvalidity, uidnext };
  }

  async searchUids(criteria: string): Promise<number[]> {
    const r = await this.expectOk(`UID SEARCH ${criteria}`, "Recherche");
    const uids: number[] = [];
    for (const l of r.untagged) {
      if (!l.text.toUpperCase().startsWith("* SEARCH")) continue;
      for (const t of l.text.slice(8).trim().split(/\s+/)) {
        const n = parseInt(t, 10);
        if (Number.isFinite(n)) uids.push(n);
      }
    }
    return uids.sort((a, b) => a - b);
  }

  /** UID FETCH : une entrée par message, littéraux résolus. */
  async fetch(uidSet: string, items: string): Promise<FetchedMessage[]> {
    const r = await this.command(`UID FETCH ${uidSet} (${items})`);
    if (r.status !== "OK") throw new Error(`Lecture des messages : ${r.statusText.slice(0, 200)}`);
    const out: FetchedMessage[] = [];
    for (const l of r.untagged) {
      if (!/^\* \d+ FETCH /i.test(l.text)) continue;
      out.push(parseFetch(l));
    }
    return out;
  }

  async store(uidSet: string, op: "+" | "-", flags: string): Promise<void> {
    await this.expectOk(`UID STORE ${uidSet} ${op}FLAGS.SILENT (${flags})`, "Mise à jour des indicateurs");
  }

  /** Déplace des messages ; sans l'extension MOVE : copie, puis l'original est marqué et retiré. */
  async move(uidSet: string, dest: string): Promise<void> {
    if (this.has("MOVE")) {
      await this.expectOk(`UID MOVE ${uidSet} ${quote(dest)}`, "Déplacement");
      return;
    }
    await this.expectOk(`UID COPY ${uidSet} ${quote(dest)}`, "Copie");
    await this.expungeUids(uidSet);
  }

  /** Retire des messages du dossier ouvert (après copie, ou brouillon remplacé/envoyé). */
  async expungeUids(uidSet: string): Promise<void> {
    await this.store(uidSet, "+", "\\Deleted");
    if (this.has("UIDPLUS")) await this.expectOk(`UID EXPUNGE ${uidSet}`, "Nettoyage");
  }

  /** Dépose un message brut dans un dossier (Envoyés, Brouillons). Renvoie l'UID si le serveur le donne. */
  async append(path: string, flags: string, raw: Uint8Array): Promise<number | null> {
    const tag = this.nextTag();
    await this.conn!.write(enc.encode(`${tag} APPEND ${quote(path)} (${flags}) {${raw.length}}\r\n`));
    const cont = await this.readLine();
    if (!cont.text.startsWith("+")) throw new Error(`Dépôt refusé : ${cont.text.slice(0, 200)}`);
    await writeAll(this.conn!, raw);
    await this.conn!.write(enc.encode("\r\n"));
    const r = await this.collect(tag);
    if (r.status !== "OK") throw new Error(`Dépôt refusé : ${r.statusText.slice(0, 200)}`);
    const m = r.statusText.match(/APPENDUID \d+ (\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  async logout(): Promise<void> {
    try {
      if (this.conn) await this.conn.write(enc.encode(`${this.nextTag()} LOGOUT\r\n`));
    } catch (_) { /* déjà fermé */ }
    try { this.conn?.close(); } catch (_) { /* déjà fermé */ }
    this.conn = null;
  }
}

export async function writeAll(conn: Deno.Conn, data: Uint8Array): Promise<void> {
  let off = 0;
  while (off < data.length) {
    off += await conn.write(data.subarray(off));
  }
}

export function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function unquote(s: string): string {
  if (!s.startsWith('"')) return s;
  return s.slice(1, -1).replace(/\\(.)/g, "$1");
}

// ---- Analyse d'une réponse FETCH (expression parenthésée) ----

export type Tok = string | Uint8Array | Tok[] | null;

export function tokenize(line: ImapLine, start: number): Tok[] {
  const s = line.text;
  const root: Tok[] = [];
  const stack: Tok[][] = [root];
  let i = start;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    if (c === "(") { const arr: Tok[] = []; stack[stack.length - 1].push(arr); stack.push(arr); i++; continue; }
    if (c === ")") { if (stack.length > 1) stack.pop(); i++; continue; }
    if (c === '"') {
      let j = i + 1;
      let out = "";
      while (j < s.length && s[j] !== '"') {
        if (s[j] === "\\" && j + 1 < s.length) { out += s[j + 1]; j += 2; } else { out += s[j]; j++; }
      }
      stack[stack.length - 1].push(out);
      i = j + 1;
      continue;
    }
    if (c === "\u0000") {
      const m = s.slice(i, i + 20).match(/^\u0000L(\d+)\u0000/);
      if (m) { stack[stack.length - 1].push(line.literals[parseInt(m[1], 10)]); i += m[0].length; continue; }
    }
    // atome (peut contenir des crochets : BODY[1.2]<0>)
    let j = i;
    let depth = 0;
    while (j < s.length) {
      const ch = s[j];
      if (ch === "[") depth++;
      else if (ch === "]") depth--;
      else if (depth === 0 && (ch === " " || ch === "(" || ch === ")")) break;
      j++;
    }
    const atom = s.slice(i, j);
    stack[stack.length - 1].push(atom.toUpperCase() === "NIL" ? null : atom);
    i = j;
  }
  return root;
}

export function parseFetch(line: ImapLine): FetchedMessage {
  const open = line.text.indexOf("(");
  const toks = tokenize(line, open);
  const list = (Array.isArray(toks[0]) ? toks[0] : toks) as Tok[];
  const msg: FetchedMessage = { uid: 0, flags: [], internalDate: null, size: null, bodystructure: null, sections: {} };
  for (let i = 0; i < list.length - 1; i += 2) {
    const key = typeof list[i] === "string" ? (list[i] as string).toUpperCase() : "";
    const val = list[i + 1];
    if (key === "UID") msg.uid = parseInt(String(val), 10);
    else if (key === "FLAGS") msg.flags = Array.isArray(val) ? (val as Tok[]).map((f) => String(f)) : [];
    else if (key === "INTERNALDATE") msg.internalDate = typeof val === "string" ? val : null;
    else if (key === "RFC822.SIZE") msg.size = parseInt(String(val), 10);
    else if (key === "BODYSTRUCTURE") msg.bodystructure = Array.isArray(val) ? (val as any[]) : null;
    else if (key.startsWith("BODY[")) {
      const section = key.slice(5, key.indexOf("]"));
      if (val instanceof Uint8Array) msg.sections[section] = val;
      else if (typeof val === "string") msg.sections[section] = enc.encode(val);
      else msg.sections[section] = new Uint8Array(0);
    }
  }
  return msg;
}

// ---- Noms de dossiers en UTF-7 modifié (RFC 3501) ----

export function decodeMailboxName(name: string): string {
  return name.replace(/&([^-]*)-/g, (whole, b64: string) => {
    if (b64 === "") return "&";
    const std = b64.replace(/,/g, "/");
    const pad = std + "===".slice((std.length + 3) % 4);
    try {
      const bin = atob(pad);
      let out = "";
      for (let i = 0; i + 1 < bin.length; i += 2) out += String.fromCharCode((bin.charCodeAt(i) << 8) | bin.charCodeAt(i + 1));
      return out;
    } catch (_) {
      return whole;
    }
  });
}

export function encodeMailboxName(name: string): string {
  let out = "";
  let pending = "";
  const flush = () => {
    if (!pending) return;
    let bin = "";
    for (const ch of pending) {
      const code = ch.charCodeAt(0);
      bin += String.fromCharCode(code >> 8, code & 0xff);
    }
    out += "&" + btoa(bin).replace(/=+$/, "").replace(/\//g, ",") + "-";
    pending = "";
  };
  for (const ch of name) {
    const code = ch.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) {
      flush();
      out += ch === "&" ? "&-" : ch;
    } else {
      // caractères hors BMP : paires de substitution UTF-16
      for (let i = 0; i < ch.length; i++) pending += ch[i];
    }
  }
  flush();
  return out;
}
