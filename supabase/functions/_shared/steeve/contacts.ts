// Steeve, 27.10.2026 : adresse e-mail des régies d'immobilier.ch trouvée côté serveur, sans la routine Chrome.
// La page de l'annonce donne la page de l'agence (/fr/agences/<canton>/<ville>/<agence>-<id>), qui publie en clair
// l'adresse de contact de la régie (lien mailto). Le formulaire de contact de l'annonce (reCAPTCHA) n'est jamais utilisé.
// Annonce retirée (page 404) : la demande de visite est annulée au lieu de rester bloquée.

// deno-lint-ignore no-explicit-any
type Db = any;

const BASE = 'https://www.immobilier.ch';
const MOTIF_BLOQUE = 'Aucune adresse vérifiée de l\'annonceur%';
/** Une recherche par demande et par jour au plus. */
const EVT = 'contact_cherche_serveur';

/** Adresse de la régie la plus adaptée à une demande de visite : service location d'abord. */
export function bestAgencyEmail(emails: string[]): string | null {
  const list = [...new Set(emails.map((e) => e.toLowerCase().trim()))]
    .filter((e) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e) && !/@(user\.)?(immobilier|homegate|flatfox|immoscout24|immo-rama|logisorama)\.ch$/.test(e));
  const rank = (e: string) => {
    const local = e.split('@')[0];
    if (/^location/.test(local) || /location/.test(local)) return 0;
    if (/^(gerance|g[ée]rance|immo|regie|lausanne|vevey|yverdon)/.test(local)) return 1;
    if (/^(info|contact|accueil|reception|office)/.test(local)) return 2;
    if (/^(direction|admin)/.test(local)) return 3;
    if (/^(ppe|vente|ventes|renovation|presse|compta|rh|jobs)/.test(local)) return 9;
    return 5; // adresse nominative : en dernier recours
  };
  const sorted = list.filter((e) => rank(e) < 9).sort((a, b) => rank(a) - rank(b));
  return sorted[0] ?? null;
}

const decode = (s: string) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Page de l'agence citée par l'annonce, et nom / e-mails publiés sur cette page. */
export function agencyPathOf(listingHtml: string): string | null {
  const m = listingHtml.match(/agences[\\/]+[a-z-]+[\\/]+[a-z0-9-]+[\\/]+[a-z0-9-]+-\d+/);
  return m ? `/fr/${m[0].replace(/\\/g, '')}` : null;
}
export function agencyContact(agencyHtml: string): { nom: string | null; emails: string[] } {
  const emails = [...agencyHtml.matchAll(/mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,})/g)].map((m) => m[1]);
  const t = agencyHtml.match(/<title>([^<|]+)/)?.[1];
  return { nom: t ? decode(t).replace(/\s*-\s*[^-]+$/, '').trim().slice(0, 120) : null, emails };
}

/**
 * Demandes de visite bloquées faute d'adresse, annonces immobilier.ch : cherche l'adresse publiée de la régie et
 * l'enregistre (carnet + reprise de toutes les demandes de la même agence), ou annule si l'annonce a disparu.
 */
export async function findImmobilierContacts(db: Db, fetchFn: typeof fetch, now: Date, limit = 12): Promise<{ agences: number; reprises: number; retirees: number; sans_email: number }> {
  const res = { agences: 0, reprises: 0, retirees: 0, sans_email: 0 };
  const { data: rows } = await db.from('steeve_actions').select('id, offre_id, etapes').eq('kind', 'demande_visite').eq('statut', 'bloque')
    .ilike('motif', MOTIF_BLOQUE).order('created_at', { ascending: true }).limit(80);
  const jour = now.toISOString().slice(0, 10);
  const todo = (rows ?? []).filter((r: any) => !(Array.isArray(r.etapes) && r.etapes.some((e: any) => e?.evt === EVT && String(e?.le ?? '').slice(0, 10) === jour)));
  if (!todo.length) return res;
  const { data: offres } = await db.from('offres').select('id, lien_annonce').in('id', [...new Set(todo.map((r: any) => r.offre_id))]);
  const lien = new Map<string, string>((offres ?? []).map((o: any) => [o.id, String(o.lien_annonce ?? '')]));
  const agenceFaite = new Map<string, boolean>();
  let essais = 0;
  for (const r of todo) {
    const url = lien.get(r.offre_id) ?? '';
    if (!/^https:\/\/www\.immobilier\.ch\/(fr|de|en|it)\/louer\//.test(url)) continue;
    if (essais >= limit) break;
    essais++;
    const marquer = async () => {
      const etapes = [...(Array.isArray(r.etapes) ? r.etapes : []), { le: now.toISOString(), evt: EVT }];
      await db.from('steeve_actions').update({ etapes }).eq('id', r.id);
    };
    try {
      const page = await fetchFn(url, { headers: { 'accept-language': 'fr-CH,fr;q=0.9' } });
      if (page.status === 404 || page.status === 410) {
        await db.from('steeve_actions').update({ statut: 'annule', motif: `Annonce retirée d'immobilier.ch (page introuvable le ${now.toISOString().slice(0, 10)}) : bien probablement loué, demande non envoyée.`, updated_at: now.toISOString() })
          .eq('offre_id', r.offre_id).in('kind', ['demande_visite', 'recherche_contact']).in('statut', ['bloque', 'a_faire']);
        res.retirees++;
        continue;
      }
      if (!page.ok) { await marquer(); continue; }
      const path = agencyPathOf(await page.text());
      if (!path) { await marquer(); res.sans_email++; continue; }
      if (agenceFaite.has(path)) { await marquer(); continue; }
      const ag = await fetchFn(`${BASE}${path}`, { headers: { 'accept-language': 'fr-CH,fr;q=0.9' } });
      const { nom, emails } = ag.ok ? agencyContact(await ag.text()) : { nom: null, emails: [] };
      const email = bestAgencyEmail(emails);
      agenceFaite.set(path, Boolean(email));
      if (!email) { await marquer(); res.sans_email++; continue; }
      const { data } = await db.rpc('steeve_contact_annonceur_enregistrer', { p_offre_id: r.offre_id, p_email: email, p_telephone: null, p_nom: nom, p_source: 'annonce' });
      if (data?.ok) { res.agences++; res.reprises += Number(data.demandes_reprises ?? 0); } else await marquer();
    } catch {
      await marquer();
    }
  }
  return res;
}
