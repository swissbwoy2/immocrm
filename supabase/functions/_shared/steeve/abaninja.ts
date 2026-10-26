// Factures AbaNinja pour Steeve (lecture, renvoi par AbaNinja à l'adresse de la facture).
/* eslint-disable @typescript-eslint/no-explicit-any -- réponses JSON de l’API AbaNinja, lues champ par champ */
// Clé et compte côté serveur seulement (ABANINJA_API_KEY, ABANINJA_ACCOUNT_UUID) ; aucune création ni modification de facture.
// API : https://docs.abaninja.ch/api/documents/document-invoices/ (liste paginée, montant ouvert « openAmount »,
// destinataire « receiver », envoi par l'action « email »).
// deno-lint-ignore-file no-explicit-any

export interface Facture {
  uuid: string;
  numero: string | null;
  date: string | null;
  echeance: string | null;
  montant_chf: number | null;
  ouvert_chf: number | null;
  payee: boolean;
  statut: string | null;
  envoi: string | null;
  destinataire_email: string | null;
}

export interface AbaNinjaPort {
  /** Factures récentes (toutes pages utiles). */
  listInvoices(): Promise<any[]>;
  /** Envoi de la facture par AbaNinja, au destinataire enregistré sur la facture. */
  sendInvoice(uuid: string): Promise<{ ok: boolean; detail: string }>;
}

const BASE = 'https://api.abaninja.ch/accounts';
const PAGE = 400;
const MAX_PAGES = 5;

export function abaninjaFromEnv(fetcher: typeof fetch = fetch): AbaNinjaPort | null {
  const env = (globalThis as any).Deno?.env;
  const key = env?.get('ABANINJA_API_KEY') ?? '';
  const account = env?.get('ABANINJA_ACCOUNT_UUID') ?? '';
  if (!key || !account) return null;
  return abaninjaPort(key, account, fetcher);
}

export function abaninjaPort(key: string, account: string, fetcher: typeof fetch = fetch): AbaNinjaPort {
  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const base = `${BASE}/${account}/documents/v2/invoices`;
  return {
    async listInvoices() {
      const since = new Date(Date.now() - 400 * 86400_000).toISOString().slice(0, 10);
      const all: any[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const r = await fetcher(`${base}?limit=${PAGE}&page=${page}&updatedSince=${since}`, { headers, signal: AbortSignal.timeout(20_000) });
        if (!r.ok) throw new Error(`AbaNinja ${r.status}`);
        const j: any = await r.json();
        const rows: any[] = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : Array.isArray(j?.documents) ? j.documents : Array.isArray(j?.items) ? j.items : [];
        all.push(...rows);
        if (rows.length < PAGE) break;
      }
      return all;
    },
    async sendInvoice(uuid: string) {
      if (!/^[0-9a-f-]{36}$/i.test(uuid)) return { ok: false, detail: 'identifiant invalide' };
      const r = await fetcher(`${base}/${uuid}/actions/email`, { method: 'PATCH', headers, body: '{}', signal: AbortSignal.timeout(20_000) });
      if (r.ok) return { ok: true, detail: 'action email' };
      // Ancienne route d'envoi, utilisée à la création des factures.
      const alt = await fetcher(`${base}/${uuid}/send`, { method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(20_000) });
      return alt.ok ? { ok: true, detail: 'send' } : { ok: false, detail: `AbaNinja ${r.status}/${alt.status}` };
    },
  };
}

const num = (v: any): number | null => {
  const n = typeof v === 'object' && v !== null ? Number(v.amount ?? v.value) : Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Brouillon, annulée, extournée ou modèle : jamais renvoyée ni montrée comme due. */
export function factureEmise(inv: any): boolean {
  if (inv?.isTemplate || inv?.is_template) return false;
  const st = String(inv?.status ?? '').toLowerCase();
  return !/(draft|brouillon|entwurf|cancel|annul|storn|void|delete)/.test(st);
}

export function toFacture(inv: any): Facture {
  const total = num(inv?.documentTotal ?? inv?.total);
  const open = num(inv?.openAmount ?? inv?.open_amount);
  const email = inv?.receiver?.email ?? inv?.receiver?.receiverInformation?.email ?? null;
  return {
    uuid: String(inv?.uuid ?? inv?.id ?? ''),
    numero: inv?.invoiceNumber ?? inv?.systemInvoiceNumber ?? inv?.number ?? null,
    date: inv?.invoiceDate ? String(inv.invoiceDate).slice(0, 10) : null,
    echeance: inv?.dueDate ? String(inv.dueDate).slice(0, 10) : null,
    montant_chf: total,
    ouvert_chf: open,
    payee: total !== null && total > 0 && open !== null && open <= 0,
    statut: inv?.status ?? null,
    envoi: inv?.sentStatus ?? null,
    destinataire_email: email ? String(email).toLowerCase() : null,
  };
}

/**
 * Factures du client : par l'adresse e-mail de son compte ou une facture déjà liée à son dossier. Le nom seul n'est
 * accepté que pour l'admin (parNom), jamais pour un client : un homonyme ne doit jamais voir la facture d'un autre.
 */
export function facturesDuClient(invoices: any[], ident: { emails: string[]; nom: string | null; factures_connues: string[] }, opts: { parNom?: boolean } = {}): Facture[] {
  const emails = new Set((ident.emails ?? []).map((e) => e.toLowerCase()));
  const known = new Set(ident.factures_connues ?? []);
  const nom = norm(ident.nom);
  return invoices
    .filter((inv) => {
      if (!factureEmise(inv)) return false;
      const f = toFacture(inv);
      if (known.has(f.uuid)) return true;
      if (f.destinataire_email && emails.has(f.destinataire_email)) return true;
      const rn = norm(inv?.receiver?.name);
      return opts.parNom === true && nom.length >= 5 && rn === nom;
    })
    .map(toFacture)
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, 10);
}
