// Tunnel publicitaire « courtiers » : options, mémoire du parcours et événements Meta Pixel.
// Le prospect est enregistré dans la table `leads` (le déclencheur newsletter_shortlist_sync l'ajoute
// automatiquement à la newsletter), puis voit la page de vente du mandat avant /nouveau-mandat.

export type Projet = 'louer' | 'acheter';

export const PROJETS: { value: Projet; label: string; hint: string }[] = [
  { value: 'louer', label: 'Louer', hint: 'Appartement ou maison à louer' },
  { value: 'acheter', label: 'Acheter', hint: 'Devenir propriétaire' },
];

export const REGIONS: { value: string; label: string }[] = [
  { value: 'Lausanne et environs', label: 'Lausanne et environs' },
  { value: 'Riviera / Lavaux', label: 'Riviera · Lavaux' },
  { value: 'La Côte / Nyon', label: 'La Côte · Nyon' },
  { value: 'Nord vaudois / Broye', label: 'Nord vaudois · Broye' },
  { value: 'Genève', label: 'Genève' },
  { value: 'Fribourg / Valais / Neuchâtel', label: 'Fribourg · Valais · Neuchâtel' },
];

export type BudgetOption = { value: string; label: string; max: number | null };

export const BUDGETS_LOUER: BudgetOption[] = [
  { value: '< 1000', label: "Moins de 1'000.-", max: 1000 },
  { value: '1000-1500', label: "1'000.- à 1'500.-", max: 1500 },
  { value: '1500-2000', label: "1'500.- à 2'000.-", max: 2000 },
  { value: '2000-2500', label: "2'000.- à 2'500.-", max: 2500 },
  { value: '2500-3000', label: "2'500.- à 3'000.-", max: 3000 },
  { value: '3000-3500', label: "3'000.- à 3'500.-", max: 3500 },
  { value: '> 3500', label: "Plus de 3'500.-", max: null },
];

export const BUDGETS_ACHETER: BudgetOption[] = [
  { value: '< 100000', label: "Moins de 100'000 CHF", max: 100000 },
  { value: '100000-200000', label: "100'000 à 200'000 CHF", max: 200000 },
  { value: '200000-300000', label: "200'000 à 300'000 CHF", max: 300000 },
  { value: '300000-400000', label: "300'000 à 400'000 CHF", max: 400000 },
  { value: '400000-500000', label: "400'000 à 500'000 CHF", max: 500000 },
  { value: '> 500000', label: "Plus de 500'000 CHF", max: null },
];

export const budgetsFor = (p: Projet | null) => (p === 'acheter' ? BUDGETS_ACHETER : BUDGETS_LOUER);

export type FunnelAnswers = {
  projet: Projet;
  region: string;
  budget: string;
  budgetLabel: string;
  budgetMax: number | null;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
};

const FUNNEL_KEY = 'logisorama.funnel-courtier';
// Brouillon lu par /nouveau-mandat (src/pages/NouveauMandat.tsx, STORAGE_KEY).
const MANDAT_DRAFT_KEY = 'mandat_form_data';

export function saveFunnel(a: FunnelAnswers) {
  try { sessionStorage.setItem(FUNNEL_KEY, JSON.stringify(a)); } catch { /* navigation privée */ }
  try { localStorage.setItem(FUNNEL_KEY, JSON.stringify(a)); } catch { /* navigation privée */ }
}

export function readFunnel(): FunnelAnswers | null {
  for (const store of [() => sessionStorage, () => localStorage]) {
    try {
      const raw = store().getItem(FUNNEL_KEY);
      if (raw) return JSON.parse(raw) as FunnelAnswers;
    } catch { /* ignore */ }
  }
  return null;
}

// Pré-remplit le formulaire de mandat sans écraser un brouillon déjà commencé.
export function prefillMandat(a: FunnelAnswers) {
  try {
    const raw = localStorage.getItem(MANDAT_DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : {};
    const keep = (k: string, v: unknown) => {
      const cur = draft[k];
      if (cur === undefined || cur === null || cur === '' || cur === 0) draft[k] = v;
    };
    keep('prenom', a.prenom);
    keep('nom', a.nom);
    keep('email', a.email);
    keep('telephone', a.telephone);
    keep('region_recherche', a.region);
    if (a.budgetMax) keep('budget_max', a.budgetMax);
    if (!draft.journey) draft.journey = a.projet === 'acheter' ? 'purchase' : 'rental';
    if (!draft.type_recherche || draft.type_recherche === 'Louer') draft.type_recherche = a.projet === 'acheter' ? 'Acheter' : 'Louer';
    keep('decouverte_agence', 'Publicité Facebook / Instagram');
    localStorage.setItem(MANDAT_DRAFT_KEY, JSON.stringify(draft));
  } catch { /* ignore */ }
}

// Meta Pixel (base installée dans index.html, pixel 1270471197464641).
export function trackPixel(event: string, params?: Record<string, unknown>, eventID?: string) {
  const fbq = (window as any).fbq;
  if (typeof fbq !== 'function') return;
  if (eventID) fbq('track', event, params ?? {}, { eventID });
  else fbq('track', event, params ?? {});
}

export function normalizePhone(raw: string): string {
  const s = raw.replace(/[^\d+]/g, '');
  if (s.startsWith('+')) return s;
  if (s.startsWith('00')) return '+' + s.slice(2);
  if (s.startsWith('0') && s.length === 10) return '+41' + s.slice(1);
  return s;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isPhone = (v: string) => normalizePhone(v).replace(/\D/g, '').length >= 9;
