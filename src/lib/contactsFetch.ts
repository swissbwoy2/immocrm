import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/components/contacts/contactTypes";

/** Nombre maximal de contacts chargés dans les pages Contacts (admin et agent). */
export const CONTACTS_MAX = 10000;
/** La base renvoie au plus 1000 lignes par requête : on lit par pages. */
const PAGE = 1000;
/** Nombre de fiches affichées d'un coup ; le bouton « Afficher plus » en ajoute autant. */
export const CONTACTS_PAGE_AFFICHAGE = 60;

/** Charge jusqu'à CONTACTS_MAX contacts, triés par nom. agentId = seulement ceux de cet agent. */
export async function fetchAllContacts(agentId?: string): Promise<{ data: Contact[]; error: unknown }> {
  const all: Contact[] = [];
  for (let from = 0; from < CONTACTS_MAX; from += PAGE) {
    let q = supabase.from("contacts").select("*");
    if (agentId) q = q.eq("agent_id", agentId);
    const { data, error } = await q
      .order("nom", { ascending: true })
      .order("id", { ascending: true })
      .range(from, Math.min(from + PAGE, CONTACTS_MAX) - 1);
    if (error) return { data: all, error };
    all.push(...((data as Contact[]) || []));
    if (!data || data.length < PAGE) break;
  }
  return { data: all, error: null };
}

/** Recherche texte commune : nom, prénom, e-mail, téléphone, entreprise, ville, étiquettes. */
export function contactMatchesSearch(c: Contact, search: string): boolean {
  const s = search.toLowerCase();
  return (
    c.nom.toLowerCase().includes(s) ||
    !!c.prenom?.toLowerCase().includes(s) ||
    !!c.email?.toLowerCase().includes(s) ||
    !!c.telephone?.includes(search) ||
    !!c.entreprise?.toLowerCase().includes(s) ||
    !!c.ville?.toLowerCase().includes(s) ||
    !!c.tags?.some((t) => t.toLowerCase().includes(s))
  );
}
