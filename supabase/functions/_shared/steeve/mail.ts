// Envoi d'e-mails par Steeve : client SMTP minimal (TLS implicite, port 465) et construction des messages.
// Un brouillon préparé par une routine est envoyé tel quel (même pièces jointes, même texte) :
// seuls les en-têtes propres aux brouillons sont retirés, la date et l'identifiant sont posés.
// deno-lint-ignore-file no-explicit-any

export interface SmtpTransport {
  read(p: Uint8Array): Promise<number | null>;
  write(p: Uint8Array): Promise<number>;
  close(): void;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Les messages bruts circulent en « latin1 » : un caractère par octet, sans réencodage. Un brouillon
 * contenant des octets 8 bits est ainsi renvoyé à l'identique.
 */
export function latin1(raw: Uint8Array): string {
  let out = '';
  for (let i = 0; i < raw.length; i += 8192) out += String.fromCharCode(...raw.subarray(i, i + 8192));
  return out;
}
export function latin1Bytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
const TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} : délai dépassé`)), TIMEOUT_MS); }),
  ]).finally(() => clearTimeout(timer));
}

async function writeAll(t: SmtpTransport, data: Uint8Array) {
  let off = 0;
  while (off < data.length) off += await t.write(data.subarray(off));
}

export class LeanSmtp {
  private buffer = '';
  constructor(private readonly t: SmtpTransport) {}

  static async connect(host: string, port: number): Promise<LeanSmtp> {
    const conn = await withTimeout(Deno.connectTls({ hostname: host, port }), 'Connexion SMTP');
    const client = new LeanSmtp(conn);
    await client.expect(220, 'accueil');
    return client;
  }

  static async fromTransport(t: SmtpTransport): Promise<LeanSmtp> {
    const client = new LeanSmtp(t);
    await client.expect(220, 'accueil');
    return client;
  }

  /** Lit une réponse complète (multi-lignes « 250-… » puis « 250 … »). */
  private async reply(): Promise<{ code: number; text: string }> {
    const lines: string[] = [];
    for (;;) {
      let idx = this.buffer.indexOf('\r\n');
      while (idx < 0) {
        const chunk = new Uint8Array(4096);
        const n = await withTimeout(this.t.read(chunk), 'Lecture SMTP');
        if (n === null) throw new Error('SMTP : connexion fermée');
        this.buffer += decoder.decode(chunk.subarray(0, n));
        idx = this.buffer.indexOf('\r\n');
      }
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      lines.push(line);
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) {
        return { code: Number(line.slice(0, 3)), text: lines.join('\n') };
      }
    }
  }

  private async expect(code: number | number[], label: string) {
    const r = await this.reply();
    const ok = Array.isArray(code) ? code.includes(r.code) : r.code === code;
    if (!ok) throw new Error(`SMTP ${label} : ${r.text.slice(0, 200)}`);
    return r;
  }

  private async cmd(line: string, code: number | number[], label: string) {
    await writeAll(this.t, encoder.encode(line + '\r\n'));
    return await this.expect(code, label);
  }

  async login(user: string, password: string) {
    await this.cmd('EHLO logisorama.ch', 250, 'EHLO');
    const token = btoa(String.fromCharCode(...encoder.encode(`\u0000${user}\u0000${password}`)));
    await this.cmd(`AUTH PLAIN ${token}`, 235, 'authentification');
  }

  /** Envoie un message brut ; renvoie la réponse du serveur (preuve d'acceptation). */
  async send(from: string, recipients: string[], raw: string): Promise<string> {
    if (!recipients.length) throw new Error('SMTP : aucun destinataire');
    await this.cmd(`MAIL FROM:<${from}>`, 250, 'expéditeur');
    for (const r of recipients) await this.cmd(`RCPT TO:<${r}>`, [250, 251], 'destinataire');
    await this.cmd('DATA', 354, 'DATA');
    const body = raw.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
    await writeAll(this.t, latin1Bytes(body + (body.endsWith('\r\n') ? '' : '\r\n') + '.\r\n'));
    const r = await this.expect(250, 'envoi');
    return r.text.slice(0, 200);
  }

  async quit() {
    try { await this.cmd('QUIT', 221, 'QUIT'); } catch { /* fermeture côté serveur */ } finally {
      try { this.t.close(); } catch { /* déjà fermé */ }
    }
  }
}

// ---------- construction des messages ----------

const EMAIL_RX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const isEmail = (s: unknown): s is string => typeof s === 'string' && s.length <= 254 && EMAIL_RX.test(s);

function encodeWord(s: string): string {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${btoa(String.fromCharCode(...encoder.encode(s)))}?=`;
}

function base64Lines(s: string): string {
  const b = btoa(String.fromCharCode(...encoder.encode(s)));
  return b.match(/.{1,76}/g)?.join('\r\n') ?? '';
}

export function messageId(domain: string): string {
  return `<steeve.${crypto.randomUUID()}@${domain}>`;
}

/** Message texte simple (demandes, relances) depuis une boîte de l'agence. */
export function buildTextEmail(opts: {
  from: string; fromName: string; to: string; subject: string; text: string; date?: Date; id?: string;
}): string {
  if (!isEmail(opts.from) || !isEmail(opts.to)) throw new Error('adresse e-mail invalide');
  const domain = opts.from.split('@')[1];
  return [
    `From: ${encodeWord(opts.fromName)} <${opts.from}>`,
    `To: <${opts.to}>`,
    `Subject: ${encodeWord(opts.subject.replace(/[\r\n]+/g, ' ').slice(0, 250))}`,
    `Date: ${(opts.date ?? new Date()).toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: ${opts.id ?? messageId(domain)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'X-Mailer: Steeve (Logisorama)',
    '',
    base64Lines(opts.text.replace(/\r?\n/g, '\r\n')),
    '',
  ].join('\r\n');
}

// En-têtes propres aux brouillons (Thunderbird, Outlook, Apple Mail, webmails) : jamais envoyés.
const DRAFT_HEADERS = /^(x-mozilla-draft-info|x-mozilla-keys|x-uniform-type-identifier|x-apple-mail-remote-attachments|x-apple-base-url|x-apple-windows-friendly|x-universally-unique-identifier|x-draft-[\w-]*|x-ms-tnef-correlator|x-infomaniak-draft[\w-]*|bcc|date|message-id|x-mailer)\s*:/i;

/**
 * Prépare un brouillon pour l'envoi : en-têtes de brouillon retirés (y compris Bcc), nouvelle date et
 * nouvel identifiant. Le corps et les pièces jointes restent identiques à l'octet près.
 */
export function prepareDraftForSend(raw: string, opts: { date?: Date; id: string }): string {
  const sep = raw.search(/\r?\n\r?\n/);
  if (sep < 0) throw new Error('brouillon illisible');
  const headerText = raw.slice(0, sep);
  const rest = raw.slice(sep);
  // Regroupe les en-têtes repliés pour filtrer par nom, puis les réécrit tels quels.
  const headers: string[] = [];
  for (const line of headerText.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && headers.length) headers[headers.length - 1] += '\r\n' + line;
    else headers.push(line);
  }
  const kept = headers.filter((h) => !DRAFT_HEADERS.test(h));
  kept.push(`Date: ${(opts.date ?? new Date()).toUTCString().replace('GMT', '+0000')}`);
  kept.push(`Message-ID: ${opts.id}`);
  return kept.join('\r\n') + rest;
}
