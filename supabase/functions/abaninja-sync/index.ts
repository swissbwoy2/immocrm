// Synchronisation AbaNinja → Logisorama.
// Lit toutes les factures AbaNinja, en garde une copie (abaninja_invoices),
// puis aligne Logisorama sur la vérité d'AbaNinja :
//  - demande de mandat en attente dont la facture est payée → « paye » + date de paiement ;
//  - acompte « en_attente » dont la facture est payée → « paye » + date de paiement.
// Tout ce qui ne peut pas être corrigé sans risque (acompte marqué non payé par l'admin
// alors qu'AbaNinja dit payé, paiement sans trace dans Logisorama, etc.) est noté comme écart,
// jamais modifié. Aucun e-mail n'est envoyé au client ; seuls les admins sont notifiés.
// Appel : cron horaire (clé service) ou bouton admin (JWT admin).
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const ABANINJA_API = "https://api.abaninja.ch";
const PAGE_SIZE = 100;
const MAX_PAGES = 40;
const DEMANDES_A_REGLER = ["en_attente", "facture_envoyee"];
const DEMANDES_PAYEES = ["paye", "active"];

type Facture = {
  uuid: string;
  numero: string | null;
  reference: string | null;
  titre: string | null;
  statut: string;
  statutEnvoi: string | null;
  total: number;
  ouvert: number;
  payee: boolean;
  annulee: boolean;
  /** Facture d'acompte de mandat (MANDAT-…), par opposition aux soldes et commissions. */
  mandat: boolean;
  modele: boolean;
  nom: string | null;
  email: string | null;
  date: string | null;
  echeance: string | null;
  majLe: string | null;
  raw: any;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const jour = (v: unknown) => {
  const s = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const instant = (v: unknown) => {
  const d = new Date(String(v ?? ""));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

function estPayee(statut: string, total: number, ouvert: number, annulee: boolean, modele: boolean): boolean {
  if (annulee || modele || total <= 0) return false;
  if (statut === "paid" || statut === "fully_paid") return true;
  if (statut.includes("draft") || statut.includes("partial")) return false;
  return ouvert === 0;
}

function lireFacture(d: any): Facture | null {
  if (!d?.uuid) return null;
  const statut = norm(d.status);
  const total = num(d.documentTotal);
  const ouvert = num(d.openAmount);
  const annulee = d.isCancelled === true || statut.includes("cancel");
  const modele = d.isTemplate === true;
  return {
    uuid: String(d.uuid),
    numero: d.invoiceNumber || d.systemInvoiceNumber || d.importedInvoiceNumber || null,
    reference: d.reference || null,
    titre: d.title || null,
    statut,
    statutEnvoi: d.sentStatus || null,
    total,
    ouvert,
    payee: estPayee(statut, total, ouvert, annulee, modele),
    annulee,
    mandat: /^MANDAT-/i.test(String(d.reference ?? "")) || /^Mandat de recherche/i.test(String(d.title ?? "")),
    modele,
    nom: d.receiver?.name || null,
    email: d.receiver?.email ? norm(d.receiver.email) : null,
    date: jour(d.invoiceDate),
    echeance: jour(d.dueDate),
    majLe: instant(d.updatedAt),
    raw: d,
  };
}

async function lireToutesLesFactures(accountUuid: string, apiKey: string): Promise<Facture[]> {
  const out: Facture[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${ABANINJA_API}/accounts/${accountUuid}/documents/v2/invoices?limit=${PAGE_SIZE}&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
    const text = await res.text();
    if (!res.ok) throw new Error(`AbaNinja liste factures ${res.status}: ${text.slice(0, 200)}`);
    const body = JSON.parse(text || "{}");
    const docs: any[] = body?.data?.documents ?? (Array.isArray(body?.data) ? body.data : body?.documents ?? []);
    for (const d of docs) {
      const f = lireFacture(d);
      if (f && !f.modele) out.push(f);
    }
    if (docs.length < PAGE_SIZE) break;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const caller = await verifyInternalCaller(req);
  const estAdmin = caller.kind === "staff" && (caller.roles ?? []).includes("admin");
  if (!caller.ok || (caller.kind === "staff" && !estAdmin)) return json({ success: false, error: "Non autorisé" }, 401);

  const apiKey = Deno.env.get("ABANINJA_API_KEY");
  const accountUuid = Deno.env.get("ABANINJA_ACCOUNT_UUID");
  if (!apiKey || !accountUuid) return json({ success: false, error: "AbaNinja non configuré" }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let source = "cron";
  try {
    const body = await req.json();
    if (body?.source) source = String(body.source).slice(0, 20);
  } catch { /* corps vide */ }
  if (estAdmin) source = "bouton";

  const { data: run } = await admin.from("abaninja_sync_runs").insert({ source }).select("id").single();
  const corrections: any[] = [];
  const ecarts: any[] = [];

  try {
    const factures = await lireToutesLesFactures(accountUuid, apiKey);
    const parUuid = new Map(factures.map((f) => [f.uuid, f]));
    const parNumero = new Map<string, Facture>();
    for (const f of factures) {
      if (f.numero) parNumero.set(norm(f.numero), f);
      if (f.reference) parNumero.set(norm(f.reference), f);
    }
    const payeesParEmail = new Map<string, Facture[]>();
    for (const f of factures) {
      if (!f.payee || !f.email || !f.mandat) continue;
      const arr = payeesParEmail.get(f.email) ?? [];
      arr.push(f);
      payeesParEmail.set(f.email, arr);
    }
    // Factures d'acompte encore ouvertes (envoyées, dues, relancées), par e-mail
    const ouvertesParEmail = new Map<string, Facture[]>();
    for (const f of factures) {
      if (f.payee || f.annulee || !f.email || !f.mandat || f.ouvert <= 0 || f.statut.includes("draft")) continue;
      const arr = ouvertesParEmail.get(f.email) ?? [];
      arr.push(f);
      ouvertesParEmail.set(f.email, arr);
    }
    const factureUtilisee = new Set<string>();
    const trouverFacture = (uuid?: string | null, numero?: string | null): Facture | undefined =>
      (uuid ? parUuid.get(uuid) : undefined) ?? (numero ? parNumero.get(norm(numero)) : undefined);

    // Copie locale (on garde la première date à laquelle la facture a été vue payée)
    const { data: dejaVues } = await admin.from("abaninja_invoices").select("uuid, payee_detectee_le");
    const detectee = new Map((dejaVues ?? []).map((r: any) => [r.uuid, r.payee_detectee_le]));
    const maintenant = new Date().toISOString();
    const lignes = factures.map((f) => ({
      uuid: f.uuid,
      invoice_number: f.numero,
      reference: f.reference,
      title: f.titre,
      status: f.statut,
      sent_status: f.statutEnvoi,
      document_total: f.total,
      open_amount: f.ouvert,
      est_payee: f.payee,
      is_cancelled: f.annulee,
      receiver_name: f.nom,
      receiver_email: f.email,
      invoice_date: f.date,
      due_date: f.echeance,
      aba_updated_at: f.majLe,
      payee_detectee_le: f.payee ? (detectee.get(f.uuid) ?? maintenant) : null,
      raw: f.raw,
      synced_at: maintenant,
    }));
    for (let i = 0; i < lignes.length; i += 200) {
      const { error } = await admin.from("abaninja_invoices").upsert(lignes.slice(i, i + 200), { onConflict: "uuid" });
      if (error) throw new Error(`Copie locale: ${error.message}`);
    }
    const datePaiement = (f: Facture) => f.majLe ?? detectee.get(f.uuid) ?? maintenant;

    // ── Demandes de mandat ──
    const { data: demandes } = await admin
      .from("demandes_mandat")
      .select("id, prenom, nom, email, statut, date_paiement, created_at, montant_acompte, abaninja_invoice_id, abaninja_invoice_ref");
    const notifs: string[] = [];
    // E-mails qui ont déjà une demande payée/active : une 2e demande du même client est un doublon,
    // elle ne doit jamais être passée en « payé » (sinon le paiement est compté deux fois).
    const emailsDejaPayes = new Set(
      (demandes ?? []).filter((x: any) => DEMANDES_PAYEES.includes(x.statut) && x.email).map((x: any) => norm(x.email)),
    );

    for (const d of demandes ?? []) {
      if (d.statut === "doublon") continue;
      let f: Facture | undefined = trouverFacture(d.abaninja_invoice_id, d.abaninja_invoice_ref);
      let lienParEmail = false;
      if (!f && d.email) {
        const depuis = new Date(d.created_at).getTime() - 86400000;
        f = (payeesParEmail.get(norm(d.email)) ?? []).find(
          (x) => !factureUtilisee.has(x.uuid) && (!x.date || new Date(x.date).getTime() >= depuis),
        );
        lienParEmail = !!f;
      }
      if (!f) {
        if (DEMANDES_PAYEES.includes(d.statut) && !d.date_paiement) {
          ecarts.push({ type: "demande_payee_sans_facture", demande_id: d.id, client: `${d.prenom} ${d.nom}`, email: d.email });
        }
        continue;
      }
      factureUtilisee.add(f.uuid);
      const nom = `${d.prenom ?? ""} ${d.nom ?? ""}`.trim();

      const lien: Record<string, unknown> = {};
      if (!d.abaninja_invoice_id) lien.abaninja_invoice_id = f.uuid;
      if (!d.abaninja_invoice_ref && f.numero) lien.abaninja_invoice_ref = f.numero;

      if (f.payee && DEMANDES_A_REGLER.includes(d.statut) && lienParEmail && emailsDejaPayes.has(norm(d.email))) {
        factureUtilisee.delete(f.uuid);
        ecarts.push({ type: "demande_doublon_client_deja_paye", demande_id: d.id, client: nom, facture: f.numero });
        continue;
      }
      if (f.payee && DEMANDES_A_REGLER.includes(d.statut)) {
        const { error } = await admin.from("demandes_mandat")
          .update({ ...lien, statut: "paye", date_paiement: datePaiement(f) })
          .eq("id", d.id);
        if (!error) {
          corrections.push({ type: "demande_payee", demande_id: d.id, client: nom, facture: f.numero, montant: f.total, par_email: lienParEmail });
          notifs.push(`${nom} : facture ${f.numero ?? ""} payée (${f.total} CHF)`);
        }
      } else {
        if (Object.keys(lien).length) await admin.from("demandes_mandat").update(lien).eq("id", d.id);
        if (DEMANDES_PAYEES.includes(d.statut) && !f.payee && !f.annulee && d.date_paiement) {
          ecarts.push({ type: "demande_payee_facture_ouverte", demande_id: d.id, client: nom, facture: f.numero, reste: f.ouvert });
        }
      }
      await admin.from("abaninja_invoices").update({ demande_mandat_id: d.id }).eq("uuid", f.uuid);
    }

    // ── Acomptes ──
    const { data: acomptes } = await admin
      .from("acomptes")
      .select("id, client_id, montant, statut, date_paiement, notes, abaninja_invoice_id, abaninja_invoice_number, clients!acomptes_client_id_fkey(user_id)");
    const userIds = [...new Set((acomptes ?? []).map((a: any) => a.clients?.user_id).filter(Boolean))];
    const emailParUser = new Map<string, string>();
    for (let i = 0; i < userIds.length; i += 200) {
      const { data: profs } = await admin.from("profiles").select("id, email, prenom, nom").in("id", userIds.slice(i, i + 200));
      for (const p of profs ?? []) emailParUser.set(p.id, norm(p.email));
    }

    for (const a of acomptes ?? []) {
      const email = emailParUser.get((a as any).clients?.user_id) ?? null;
      let f: Facture | undefined = trouverFacture(a.abaninja_invoice_id, a.abaninja_invoice_number);
      let libre = !!f;
      if (!f && email) {
        const candidates = (payeesParEmail.get(email) ?? []).filter((x) => x.total <= 300);
        const nonUtilisee = candidates.find((x) => !factureUtilisee.has(x.uuid));
        // Pour corriger un acompte en attente, la facture ne doit servir qu'une fois ;
        // pour la simple comparaison, n'importe quelle facture payée du client suffit.
        f = nonUtilisee ?? (a.statut === "en_attente" ? undefined : candidates[0]);
        libre = !!nonUtilisee;
      }
      const montant = num(a.montant);

      if (a.statut === "en_attente") {
        if (f?.payee && libre) {
          const { error } = await admin.from("acomptes").update({
            statut: "paye",
            date_paiement: datePaiement(f),
            montant: montant > 0 ? montant : f.total,
            abaninja_invoice_id: f.uuid,
            abaninja_invoice_number: f.numero,
            notes: `${a.notes ?? ""}\nPayé selon AbaNinja (facture ${f.numero ?? f.uuid}) — synchro du ${maintenant.slice(0, 10)}`.trim(),
          }).eq("id", a.id);
          if (!error) {
            factureUtilisee.add(f.uuid);
            corrections.push({ type: "acompte_paye", acompte_id: a.id, email, facture: f.numero, montant: f.total });
            await admin.from("abaninja_invoices").update({ acompte_id: a.id }).eq("uuid", f.uuid);
          }
        } else if (f && !a.abaninja_invoice_id) {
          await admin.from("acomptes").update({ abaninja_invoice_id: f.uuid, abaninja_invoice_number: f.numero }).eq("id", a.id);
        }
        continue;
      }

      // Acomptes déjà tranchés : on compare, on ne modifie pas.
      if (f?.payee && montant === 0 && a.statut === "paye") {
        ecarts.push({ type: "acompte_non_paye_mais_facture_payee", acompte_id: a.id, email, facture: f.numero, montant: f.total });
      } else if (!f?.payee && !f?.annulee && montant > 0 && a.statut !== "ristourne" && (f || (email && ouvertesParEmail.has(email)))) {
        f = f ?? ouvertesParEmail.get(email!)![0];
        // Payé selon la banque mais encore ouvert dans AbaNinja : à marquer payé dans AbaNinja
        // (sinon AbaNinja peut relancer un client qui a déjà payé).
        ecarts.push({ type: "a_marquer_payee_dans_abaninja", acompte_id: a.id, email, facture: f.numero, reste: f.ouvert });
      }
      if (f) factureUtilisee.add(f.uuid);
    }

    // ── Paiements AbaNinja sans aucune trace dans Logisorama ──
    for (const f of factures) {
      if (f.payee && f.mandat && !factureUtilisee.has(f.uuid)) {
        ecarts.push({ type: "facture_payee_sans_trace", facture: f.numero, client: f.nom, email: f.email, montant: f.total, date: f.date });
      }
    }

    // Notification admins (uniquement s'il y a du nouveau)
    if (notifs.length || corrections.some((c) => c.type === "acompte_paye")) {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      const nbAcomptes = corrections.filter((c) => c.type === "acompte_paye").length;
      const message = [
        ...notifs,
        nbAcomptes ? `${nbAcomptes} acompte${nbAcomptes > 1 ? "s" : ""} passé${nbAcomptes > 1 ? "s" : ""} en payé` : "",
      ].filter(Boolean).join(" · ").slice(0, 900);
      for (const a of admins ?? []) {
        await admin.from("notifications").insert({
          user_id: a.user_id,
          type: "paiement_recu",
          title: "Paiements AbaNinja reçus",
          message,
          link: "/admin/demandes-activation",
        });
      }
    }

    const statutsVus = [...new Set(factures.map((f) => f.statut))];
    if (run?.id) {
      await admin.from("abaninja_sync_runs").update({
        finished_at: new Date().toISOString(),
        ok: true,
        factures_lues: factures.length,
        corrections,
        ecarts,
      }).eq("id", run.id);
    }
    return json({
      success: true,
      factures_lues: factures.length,
      payees: factures.filter((f) => f.payee).length,
      corrections: corrections.length,
      ecarts: ecarts.length,
      statuts_vus: statutsVus,
      detail: { corrections, ecarts },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("abaninja-sync:", msg);
    if (run?.id) {
      await admin.from("abaninja_sync_runs").update({ finished_at: new Date().toISOString(), ok: false, erreur: msg.slice(0, 1000), corrections, ecarts }).eq("id", run.id);
    }
    return json({ success: false, error: "Synchronisation AbaNinja impossible", detail: msg.slice(0, 300) }, 500);
  }
});
