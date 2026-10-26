/**
 * Modèle partagé du menu « Finances » de l'admin (Transactions, Factures AbaNinja,
 * Registre des commissions, Salaires par agent).
 * Fonctions pures : formats suisses, étapes de travail, prochaine action, retards.
 * Aucune donnée n'est écrite ici : tout est calculé à partir de ce qui est déjà chargé.
 */
import { differenceInDays, format, startOfMonth, startOfYear, subMonths, endOfMonth } from 'date-fns';

export type Ton = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export const TON_TEXTE: Record<Ton, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

const nf0 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** « CHF 12’400 » (apostrophe suisse, sans décimales). */
export function chf(n: number | null | undefined): string {
  return `CHF ${nf0.format(Number(n) || 0)}`;
}

/** « 12’400.00 » (registre comptable, deux décimales) ; « — » si vide. */
export function montant2(n: number | null | undefined): string {
  return n == null ? '—' : nf2.format(Number(n));
}

/** Date JJ.MM.AAAA ; « — » si vide ou invalide. */
export function dateCH(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : format(x, 'dd.MM.yyyy');
}

export function joursDepuis(d: string | null | undefined): number {
  if (!d) return 0;
  return Math.max(0, differenceInDays(new Date(), new Date(d)));
}

export function libelleJours(j: number): string {
  return j === 0 ? 'aujourd’hui' : j === 1 ? 'il y a 1 j' : `il y a ${j} j`;
}

export function estCeMois(d: string | null | undefined): boolean {
  if (!d) return false;
  const x = new Date(d);
  const now = new Date();
  return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth();
}

export function pluriel(n: number, mot: string, motPluriel = `${mot}s`): string {
  return `${n} ${n > 1 ? motPluriel : mot}`;
}

/* ───────────────────────── Périodes ───────────────────────── */

export type PeriodeKey = 'all' | 'mois' | 'mois_prec' | '3m' | 'annee' | '12m';

export const PERIODES: { key: PeriodeKey; label: string }[] = [
  { key: 'all', label: 'Toutes les dates' },
  { key: 'mois', label: 'Ce mois' },
  { key: 'mois_prec', label: 'Mois précédent' },
  { key: '3m', label: '3 derniers mois' },
  { key: 'annee', label: 'Cette année' },
  { key: '12m', label: '12 derniers mois' },
];

/** Bornes (AAAA-MM-JJ) d'une période ; null = sans borne. */
export function bornesPeriode(p: PeriodeKey): { from: string | null; to: string | null } {
  const now = new Date();
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (p) {
    case 'mois': return { from: iso(startOfMonth(now)), to: null };
    case 'mois_prec': { const m = subMonths(now, 1); return { from: iso(startOfMonth(m)), to: iso(endOfMonth(m)) }; }
    case '3m': return { from: iso(subMonths(now, 3)), to: null };
    case 'annee': return { from: iso(startOfYear(now)), to: null };
    case '12m': return { from: iso(subMonths(now, 12)), to: null };
    default: return { from: null, to: null };
  }
}

export function dansPeriode(d: string | null | undefined, p: PeriodeKey): boolean {
  if (p === 'all') return true;
  if (!d) return false;
  const { from, to } = bornesPeriode(p);
  const k = String(d).slice(0, 10);
  return (!from || k >= from) && (!to || k <= to);
}

/* ───────────────────────── Transactions (commissions) ───────────────────────── */

/** Au-delà de ce délai après la conclusion, une commission non payée est « en retard ». */
export const RETARD_COMMISSION_JOURS = 30;

export type EtapeTransaction = 'en_retard' | 'a_encaisser' | 'en_cours' | 'payees' | 'annulees';

export type ProchaineAction = { texte: string; tone: Ton; urgent?: boolean };

export function etapeTransaction(t: any): EtapeTransaction {
  if (t.statut === 'en_cours') return 'en_cours';
  if (t.statut !== 'conclue') return 'annulees';
  if (t.commission_payee) return 'payees';
  return joursDepuis(t.date_transaction) > RETARD_COMMISSION_JOURS ? 'en_retard' : 'a_encaisser';
}

export function prochaineActionTransaction(t: any): ProchaineAction {
  const j = joursDepuis(t.date_transaction);
  switch (etapeTransaction(t)) {
    case 'en_retard': return { texte: `Commission attendue depuis ${j} j : relancer le paiement`, tone: 'warning', urgent: true };
    case 'a_encaisser': return { texte: 'Commission à encaisser : marquer payée à réception', tone: 'primary' };
    case 'en_cours': return { texte: 'Transaction en cours : suivre la conclusion', tone: 'muted' };
    case 'payees': return { texte: `Commission payée le ${dateCH(t.date_paiement_commission)}`, tone: 'success' };
    default: return { texte: 'Transaction annulée', tone: 'muted' };
  }
}

export type EtapeAcompte = 'a_decider' | 'acquis' | 'ristournes';

export function etapeAcompte(a: any): EtapeAcompte {
  if (a.statut === 'acquis') return 'acquis';
  if (a.statut === 'ristourne') return 'ristournes';
  return 'a_decider';
}

export function prochaineActionAcompte(a: any): ProchaineAction {
  switch (etapeAcompte(a)) {
    case 'acquis': return { texte: 'Acompte acquis (revenu de l’agence)', tone: 'success' };
    case 'ristournes': return { texte: `Ristourné le ${dateCH(a.date_ristourne)}`, tone: 'muted' };
    default: return { texte: 'À décider : acquis si la recherche est arrêtée, sinon ristourner', tone: 'primary' };
  }
}

/* ───────────────────────── Factures AbaNinja ───────────────────────── */

/** Règle existante de la page : une facture envoyée non payée depuis plus de 7 jours est en retard. */
export const RETARD_FACTURE_JOURS = 7;

export type EtapeFacture = 'a_envoyer' | 'envoyees' | 'en_retard' | 'payees';

export function etapeFacture(d: { statut: string; created_at: string }): EtapeFacture {
  if (d.statut === 'paye' || d.statut === 'active') return 'payees';
  if (d.statut === 'facture_envoyee') {
    return joursDepuis(d.created_at) > RETARD_FACTURE_JOURS ? 'en_retard' : 'envoyees';
  }
  return 'a_envoyer';
}

export function prochaineActionFacture(d: { statut: string; created_at: string; date_paiement: string | null; abaninja_invoice_id: string | null }): ProchaineAction {
  const j = joursDepuis(d.created_at);
  switch (etapeFacture(d)) {
    case 'en_retard': return { texte: `Impayée depuis ${j} j : relancer le paiement`, tone: 'warning', urgent: true };
    case 'envoyees': return { texte: 'Envoyée : marquer payée à réception du paiement', tone: 'primary' };
    case 'payees': return { texte: d.date_paiement ? `Payée le ${dateCH(d.date_paiement)}` : 'Payée', tone: 'success' };
    default: return {
      texte: d.abaninja_invoice_id ? 'Facture créée, pas encore envoyée : vérifier la demande' : 'Facture à émettre : ouvrir la demande d’activation',
      tone: 'warning',
    };
  }
}

/* ───────────────────────── Registre des commissions ───────────────────────── */

export type LigneRegistre = {
  id: string;
  date_conclusion: string | null;
  agent_id?: string | null;
  agent_prenom: string | null;
  agent_nom: string | null;
  commission_agent: number | null;
  statut_paiement: string | null;
};

export function nomAgent(r: { agent_prenom: string | null; agent_nom: string | null }): string {
  return `${r.agent_prenom ?? ''} ${r.agent_nom ?? ''}`.trim();
}

/** Totaux par agent (pour la synthèse en tête), triés par montant à payer puis total. */
export function totauxParAgent<T extends LigneRegistre>(rows: T[]) {
  const map = new Map<string, { agent: string; nb: number; total: number; paye: number; du: number }>();
  for (const r of rows) {
    const agent = nomAgent(r) || '(agent inconnu)';
    const g = map.get(agent) ?? { agent, nb: 0, total: 0, paye: 0, du: 0 };
    const c = r.commission_agent ?? 0;
    g.nb += 1; g.total += c;
    if (r.statut_paiement === 'paye') g.paye += c; else g.du += c;
    map.set(agent, g);
  }
  return Array.from(map.values()).sort((a, b) => b.du - a.du || b.total - a.total);
}
