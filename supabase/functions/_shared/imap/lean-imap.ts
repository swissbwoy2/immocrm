// Client IMAP minimal pour la relève des boîtes partagées (sync-shared-mailboxes).
// Lecture au niveau des octets : les littéraux IMAP ({n}) sont lus à la taille exacte annoncée,
// sans conversion intermédiaire en texte. Le corps est demandé tronqué (BODY.PEEK[]<0.N>), ce qui borne
// la mémoire et le calcul quelle que soit la taille des pièces jointes.

export interface ImapTransport {
  read(buf: Uint8Array): Promise<number | null>;
  write(data: Uint8Array): Promise<number>;
  close(): void;
}

export interface UntaggedResponse {
  text: string;
  literals: Uint8Array[];
}

export interface SelectInfo {
  exists: number;
  uidValidity: number | null;
  uidNext: number | null;
}

export interface FetchedMessage {
  uid: number;
  internalDate: string | null;
  raw: Uint8Array;
}

const CRLF = [13, 10];
const latin1 = new TextDecoder('latin1');
const encoder = new TextEncoder();

/** Chaîne IMAP entre guillemets (barres obliques inverses et guillemets échappés). Refuse CR, LF et NUL. */
export function imapQuote(value: string): string {
  if (/[\r\n\0]/.test(value)) throw new Error('Caractère interdit dans une valeur IMAP');
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Promesse limitée dans le temps (un serveur muet ne bloque pas la relève). */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        onTimeout?.();
        reject(new Error(`${label} : délai dépassé`));
      }, ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const READ_TIMEOUT_MS = 20_000;

/** Date au format de recherche IMAP (« 25-Sep-2026 »). */
export function imapDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export class LeanImap {
  // Tampon de lecture : données utiles entre start et end ; compactage et agrandissement au besoin,
  // sans recopier tout le tampon à chaque ligne lue.
  private store = new Uint8Array(65536);
  private start = 0;
  private end = 0;
  private tagCounter = 0;
  private readonly chunk = new Uint8Array(65536);

  constructor(private readonly transport: ImapTransport, private readonly maxResponseBytes = 8 * 1024 * 1024) {}

  static async connect(host: string, port: number): Promise<LeanImap> {
    const conn = await withTimeout(Deno.connectTls({ hostname: host, port }), READ_TIMEOUT_MS, 'Connexion IMAP');
    const client = new LeanImap(conn);
    const greeting = await client.readLine();
    if (!greeting.startsWith('* OK') && !greeting.startsWith('* PREAUTH')) {
      client.close();
      throw new Error(`Serveur IMAP : accueil inattendu (${greeting.slice(0, 80)})`);
    }
    return client;
  }

  /** Pour les tests : client déjà connecté (l'accueil est lu ici). */
  static async fromTransport(transport: ImapTransport): Promise<LeanImap> {
    const client = new LeanImap(transport);
    await client.readLine();
    return client;
  }

  close() {
    try {
      this.transport.close();
    } catch {
      // déjà fermé
    }
  }

  private get available() {
    return this.end - this.start;
  }

  private async fill(): Promise<boolean> {
    const n = await withTimeout(this.transport.read(this.chunk), READ_TIMEOUT_MS, 'Lecture IMAP', () => this.close());
    if (n === null || n === 0) return false;
    const live = this.available;
    if (this.store.length - this.end < n) {
      if (this.store.length - live >= n) {
        this.store.copyWithin(0, this.start, this.end);
      } else {
        const bigger = new Uint8Array(Math.max(this.store.length * 2, live + n));
        bigger.set(this.store.subarray(this.start, this.end));
        this.store = bigger;
      }
      this.start = 0;
      this.end = live;
    }
    this.store.set(this.chunk.subarray(0, n), this.end);
    this.end += n;
    return true;
  }

  /** Position (relative à start) du prochain CRLF à partir de « from », ou -1. */
  private indexOfCrlf(from: number): number {
    for (let i = this.start + from; i < this.end - 1; i++) {
      if (this.store[i] === CRLF[0] && this.store[i + 1] === CRLF[1]) return i - this.start;
    }
    return -1;
  }

  async readLine(): Promise<string> {
    let searchFrom = 0;
    for (;;) {
      const idx = this.indexOfCrlf(searchFrom);
      if (idx >= 0) {
        const line = latin1.decode(this.store.subarray(this.start, this.start + idx));
        this.start += idx + 2;
        return line;
      }
      searchFrom = Math.max(0, this.available - 1);
      if (this.available > this.maxResponseBytes) throw new Error('Réponse IMAP trop longue');
      if (!(await this.fill())) throw new Error('Connexion IMAP fermée');
    }
  }

  async readExact(n: number): Promise<Uint8Array> {
    if (n > this.maxResponseBytes) throw new Error('Littéral IMAP trop long');
    while (this.available < n) {
      if (!(await this.fill())) throw new Error('Connexion IMAP fermée');
    }
    const out = this.store.slice(this.start, this.start + n);
    this.start += n;
    return out;
  }

  /** Envoie une commande et renvoie les réponses non étiquetées ; lève une erreur si le serveur répond NO ou BAD. */
  async command(cmd: string, redacted?: string): Promise<UntaggedResponse[]> {
    const tag = `S${++this.tagCounter}`;
    await this.transport.write(encoder.encode(`${tag} ${cmd}\r\n`));
    const responses: UntaggedResponse[] = [];
    let current: UntaggedResponse | null = null;
    let continuation = false;
    let total = 0;
    for (;;) {
      const line = await this.readLine();
      total += line.length;
      if (!continuation && line.startsWith(`${tag} `)) {
        const status = line.slice(tag.length + 1);
        if (!status.startsWith('OK')) {
          throw new Error(`IMAP ${(redacted ?? cmd).split(' ')[0]} : ${status.slice(0, 160)}`);
        }
        return responses;
      }
      if (continuation && current) {
        current.text += line;
      } else if (line.startsWith('* ')) {
        current = { text: line, literals: [] };
        responses.push(current);
      } else if (line.startsWith('+')) {
        throw new Error('IMAP : demande de suite inattendue');
      } else if (current) {
        current.text += line;
      }
      const lit = line.match(/\{(\d+)\}$/);
      if (lit && current) {
        const size = Number(lit[1]);
        total += size;
        if (total > this.maxResponseBytes) throw new Error('Réponse IMAP trop longue');
        current.literals.push(await this.readExact(size));
        current.text += `\u0000LIT${current.literals.length - 1}\u0000`;
        continuation = true;
      } else {
        continuation = false;
      }
    }
  }

  async login(user: string, password: string): Promise<void> {
    await this.command(`LOGIN ${imapQuote(user)} ${imapQuote(password)}`, 'LOGIN');
  }

  async selectInbox(): Promise<SelectInfo> {
    return await this.select('INBOX');
  }

  /** Ouvre un dossier (lecture-écriture). */
  async select(folder: string): Promise<SelectInfo> {
    const res = await this.command(`SELECT ${folder === 'INBOX' ? 'INBOX' : imapQuote(folder)}`);
    const info: SelectInfo = { exists: 0, uidValidity: null, uidNext: null };
    for (const r of res) {
      const exists = r.text.match(/^\* (\d+) EXISTS/i);
      if (exists) info.exists = Number(exists[1]);
      const validity = r.text.match(/\[UIDVALIDITY (\d+)\]/i);
      if (validity) info.uidValidity = Number(validity[1]);
      const next = r.text.match(/\[UIDNEXT (\d+)\]/i);
      if (next) info.uidNext = Number(next[1]);
    }
    return info;
  }

  async uidSearch(criteria: string): Promise<number[]> {
    const res = await this.command(`UID SEARCH ${criteria}`);
    const uids: number[] = [];
    for (const r of res) {
      const m = r.text.match(/^\* SEARCH\b(.*)$/i);
      if (!m) continue;
      for (const part of m[1].trim().split(/\s+/)) {
        const n = Number(part);
        if (Number.isInteger(n) && n > 0) uids.push(n);
      }
    }
    return [...new Set(uids)].sort((a, b) => a - b);
  }

  async uidFetchRaw(uids: number[], maxBytes: number): Promise<FetchedMessage[]> {
    if (uids.length === 0) return [];
    const res = await this.command(`UID FETCH ${uids.join(',')} (UID INTERNALDATE BODY.PEEK[]<0.${maxBytes}>)`);
    const out: FetchedMessage[] = [];
    for (const r of res) {
      if (!/^\* \d+ FETCH/i.test(r.text)) continue;
      const uid = r.text.match(/\bUID (\d+)/i);
      if (!uid || r.literals.length === 0) continue;
      const date = r.text.match(/INTERNALDATE "([^"]+)"/i);
      out.push({ uid: Number(uid[1]), internalDate: date ? date[1] : null, raw: r.literals[r.literals.length - 1] });
    }
    return out;
  }

  /** Dossiers de la boîte avec leurs attributs (\\Drafts, \\Sent…). */
  async listFolders(): Promise<{ name: string; flags: string[] }[]> {
    const res = await this.command('LIST "" "*"');
    const out: { name: string; flags: string[] }[] = [];
    for (const r of res) {
      const m = r.text.match(/^\* LIST \(([^)]*)\) (?:"[^"]*"|NIL) (.+)$/i);
      if (!m) continue;
      let name = m[2].trim();
      if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1).replace(/\\(["\\])/g, '$1');
      out.push({ name, flags: m[1].split(/\s+/).filter(Boolean) });
    }
    return out;
  }

  async createFolder(folder: string): Promise<void> {
    try {
      await this.command(`CREATE ${imapQuote(folder)}`);
    } catch (err) {
      // déjà existant : sans gravité
      if (!/ALREADYEXISTS|exist/i.test(String(err))) throw err;
    }
  }

  /** Déplace des messages du dossier ouvert (MOVE, sinon copie + suppression marquée). */
  async uidMove(uids: number[], folder: string): Promise<void> {
    if (uids.length === 0) return;
    try {
      await this.command(`UID MOVE ${uids.join(',')} ${imapQuote(folder)}`);
    } catch {
      await this.command(`UID COPY ${uids.join(',')} ${imapQuote(folder)}`);
      await this.command(`UID STORE ${uids.join(',')} +FLAGS.SILENT (\\Deleted)`);
      await this.command(`UID EXPUNGE ${uids.join(',')}`);
    }
  }

  /** Ajoute un message brut dans un dossier (ex. copie dans « Envoyés »). */
  async append(folder: string, raw: Uint8Array, flags = '\\Seen'): Promise<void> {
    const tag = `S${++this.tagCounter}`;
    await this.transport.write(encoder.encode(`${tag} APPEND ${imapQuote(folder)} (${flags}) {${raw.length}}\r\n`));
    for (;;) {
      const line = await this.readLine();
      if (line.startsWith('+')) break;
      if (line.startsWith(`${tag} `)) throw new Error(`IMAP APPEND : ${line.slice(tag.length + 1, 160)}`);
    }
    await this.transport.write(raw);
    await this.transport.write(encoder.encode('\r\n'));
    for (;;) {
      const line = await this.readLine();
      if (line.startsWith(`${tag} `)) {
        if (!line.slice(tag.length + 1).startsWith('OK')) throw new Error(`IMAP APPEND : ${line.slice(tag.length + 1, 160)}`);
        return;
      }
    }
  }

  async logout(): Promise<void> {
    try {
      await this.command('LOGOUT');
    } catch {
      // le serveur peut fermer avant la réponse étiquetée
    } finally {
      this.close();
    }
  }
}

/** Date IMAP INTERNALDATE (« 25-Oct-2026 10:15:00 +0100 ») en ISO, ou null. */
export function parseInternalDate(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/^\s*(\d{1,2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})/);
  if (!m) return null;
  const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const month = months[m[2].toLowerCase()];
  if (month === undefined) return null;
  const utc = Date.UTC(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6]));
  const offset = (Number(m[8]) * 60 + Number(m[9])) * (m[7] === '+' ? 1 : -1);
  return new Date(utc - offset * 60000).toISOString();
}
