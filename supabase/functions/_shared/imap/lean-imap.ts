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

/** Chaîne IMAP entre guillemets (barres obliques inverses et guillemets échappés). */
export function imapQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Date au format de recherche IMAP (« 25-Sep-2026 »). */
export function imapDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export class LeanImap {
  private buffer = new Uint8Array(0);
  private tagCounter = 0;
  private readonly chunk = new Uint8Array(65536);

  constructor(private readonly transport: ImapTransport, private readonly maxResponseBytes = 8 * 1024 * 1024) {}

  static async connect(host: string, port: number): Promise<LeanImap> {
    const conn = await Deno.connectTls({ hostname: host, port });
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

  private async fill(): Promise<boolean> {
    const n = await this.transport.read(this.chunk);
    if (n === null || n === 0) return false;
    const merged = new Uint8Array(this.buffer.length + n);
    merged.set(this.buffer);
    merged.set(this.chunk.subarray(0, n), this.buffer.length);
    this.buffer = merged;
    return true;
  }

  private indexOfCrlf(from: number): number {
    for (let i = from; i < this.buffer.length - 1; i++) {
      if (this.buffer[i] === CRLF[0] && this.buffer[i + 1] === CRLF[1]) return i;
    }
    return -1;
  }

  async readLine(): Promise<string> {
    let searchFrom = 0;
    for (;;) {
      const idx = this.indexOfCrlf(searchFrom);
      if (idx >= 0) {
        const line = latin1.decode(this.buffer.subarray(0, idx));
        this.buffer = this.buffer.slice(idx + 2);
        return line;
      }
      searchFrom = Math.max(0, this.buffer.length - 1);
      if (this.buffer.length > this.maxResponseBytes) throw new Error('Réponse IMAP trop longue');
      if (!(await this.fill())) throw new Error('Connexion IMAP fermée');
    }
  }

  async readExact(n: number): Promise<Uint8Array> {
    if (n > this.maxResponseBytes) throw new Error('Littéral IMAP trop long');
    while (this.buffer.length < n) {
      if (!(await this.fill())) throw new Error('Connexion IMAP fermée');
    }
    const out = this.buffer.slice(0, n);
    this.buffer = this.buffer.slice(n);
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
    const res = await this.command('SELECT INBOX');
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
