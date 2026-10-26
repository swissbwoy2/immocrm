// Accès réel aux boîtes de l'agence pour Steeve opérateur : identifiants lus dans le coffre (Vault) par
/* eslint-disable @typescript-eslint/no-explicit-any -- réponses JSON des fonctions de la base et de l’API, validées champ par champ */
// shared_mailbox_credentials, lecture des brouillons en IMAP, envoi en SMTP (Infomaniak, port 465),
// copie dans « Envoyés » et rangement du brouillon dans « Steeve - envoyés » (jamais de suppression).
// deno-lint-ignore-file no-explicit-any
import { LeanImap } from '../imap/lean-imap.ts';
import { LeanSmtp, latin1Bytes } from './mail.ts';
import type { DraftMessage, MailPort } from './operator.ts';

const SMTP_PORT = 465;
const ARCHIVE_FOLDER = 'Steeve - envoyés';
const MAX_DRAFT_BYTES = 25 * 1024 * 1024;

interface Box { id: string; address: string; imap_host: string; imap_port: number; password: string }

export function realMailPort(db: any): MailPort {
  const cache = new Map<string, Box | null>();

  async function box(address: string): Promise<Box | null> {
    if (cache.has(address)) return cache.get(address)!;
    const { data: row } = await db.from('shared_mailboxes').select('id, address, imap_host, imap_port, secret_id').eq('address', address).maybeSingle();
    let found: Box | null = null;
    if (row?.secret_id) {
      const { data: password } = await db.rpc('shared_mailbox_credentials', { p_id: row.id });
      if (typeof password === 'string' && password) {
        found = { id: row.id, address: row.address, imap_host: row.imap_host || 'mail.infomaniak.com', imap_port: row.imap_port || 993, password };
      }
    }
    cache.set(address, found);
    return found;
  }

  async function withImap<T>(address: string, fn: (imap: LeanImap, folders: { name: string; flags: string[] }[]) => Promise<T>): Promise<T> {
    const b = await box(address);
    if (!b) throw new Error(`boîte ${address} non branchée`);
    const imap = await LeanImap.connect(b.imap_host, b.imap_port);
    try {
      await imap.login(b.address, b.password);
      const folders = await imap.listFolders();
      return await fn(imap, folders);
    } finally {
      await imap.logout();
    }
  }

  const special = (folders: { name: string; flags: string[] }[], flag: string, fallbacks: string[]) =>
    folders.find((f) => f.flags.some((x) => x.toLowerCase() === flag))?.name
    ?? folders.find((f) => fallbacks.includes(f.name.toLowerCase()))?.name
    ?? null;

  return {
    async ready(address) {
      return Boolean(await box(address));
    },

    async send(address, recipients, raw) {
      const b = await box(address);
      if (!b) throw new Error(`boîte ${address} non branchée`);
      const smtp = await LeanSmtp.connect(b.imap_host, SMTP_PORT);
      try {
        await smtp.login(b.address, b.password);
        return await smtp.send(b.address, recipients, raw);
      } finally {
        await smtp.quit();
      }
    },

    async drafts(address, limit): Promise<DraftMessage[]> {
      return await withImap(address, async (imap, folders) => {
        const drafts = special(folders, '\\drafts', ['drafts', 'brouillons', 'inbox.drafts']);
        if (!drafts) return [];
        await imap.select(drafts);
        const uids = (await imap.uidSearch('UNDELETED')).slice(-limit);
        const out: DraftMessage[] = [];
        // Un par un : un brouillon avec de grosses pièces jointes ne fait pas déborder la mémoire.
        for (const uid of uids.reverse()) {
          const [m] = await imap.uidFetchRaw([uid], MAX_DRAFT_BYTES);
          if (m?.raw?.length) out.push({ uid, raw: m.raw });
        }
        return out;
      });
    },

    async saveSent(address, raw) {
      await withImap(address, async (imap, folders) => {
        const sent = special(folders, '\\sent', ['sent', 'envoyés', 'sent items', 'inbox.sent']);
        if (sent) await imap.append(sent, latin1Bytes(raw));
      });
    },

    async findSent(address, id) {
      const clean = String(id).replace(/[^A-Za-z0-9.@<>_+-]/g, '');
      if (!clean) return null;
      return await withImap(address, async (imap, folders) => {
        const sent = special(folders, '\\sent', ['sent', 'envoyés', 'sent items', 'inbox.sent']);
        if (!sent) return null;
        await imap.select(sent);
        const uids = await imap.uidSearch(`HEADER Message-ID "${clean}"`);
        return uids.length > 0;
      });
    },

    async archiveDraft(address, uid, sentRaw) {
      await withImap(address, async (imap, folders) => {
        const sent = special(folders, '\\sent', ['sent', 'envoyés', 'sent items', 'inbox.sent']);
        if (sent) await imap.append(sent, latin1Bytes(sentRaw));
        const drafts = special(folders, '\\drafts', ['drafts', 'brouillons', 'inbox.drafts']);
        if (!drafts) return;
        await imap.createFolder(ARCHIVE_FOLDER);
        await imap.select(drafts);
        await imap.uidMove([uid], ARCHIVE_FOLDER);
      });
    },
  };
}
