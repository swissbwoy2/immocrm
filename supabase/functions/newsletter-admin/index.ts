import { createClient } from "npm:@supabase/supabase-js@2";
import { resendOptouts } from "../_shared/newsletter-optouts.ts";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import {
  categories,
  cleanHtml,
  email,
  text,
  recipientHtml,
} from "../_shared/newsletter.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
function check<T extends { error: unknown }>(result: T): T {
  if (result.error)
    throw new Error(
      (result.error as { message?: string }).message ||
        "Erreur de base de données",
    );
  return result;
}
const sender = () =>
  Deno.env.get("NEWSLETTER_FROM_EMAIL") || "Logisorama <info@immo-rama.ch>";
async function all(table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset <= 10000; offset += 1000) {
    const { data } = check(
      await db
        .from(table)
        .select(columns)
        .order("id")
        .range(offset, offset + 999),
    );
    rows.push(...((data || []) as unknown as Record<string, unknown>[]));
    if (rows.length > 10000)
      throw new Error(
        "Plus de 10 000 contacts : scindez la sélection avant de poursuivre.",
      );
    if (!data || data.length < 1000) return rows;
  }
  return rows;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return json({ error: "Méthode non autorisée" }, 405);
  const auth = await verifyInternalCaller(req);
  if (!auth.ok || !auth.userId || !auth.roles?.includes("admin"))
    return json({ error: "Accès administrateur requis" }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 2_000_000)
      return json({ error: "Fichier trop volumineux" }, 413);
    const b = JSON.parse(raw);
    switch (b.action) {
      case "contacts": {
        const contacts = await all(
          "newsletter_contacts",
          "id,email,first_name,last_name,kind,categories,source,excluded",
        );
        const unsub = await all("email_unsubscribes", "id,email");
        const blocked = new Set(
          unsub.map((x) => String(x.email).toLowerCase()),
        );
        return json({
          contacts: contacts.map((c) => ({
            ...c,
            unsubscribed: blocked.has(String(c.email)),
          })),
        });
      }
      case "clients": {
        const clients = await all(
          "clients",
          "id,user_id,type_recherche,journey_type,anonymise_at",
        );
        const profiles = await all(
          "profiles",
          "id,email,prenom,nom,actif,anonymise_at,notifications_email",
        );
        const eligible = new Map(
          clients.filter((c) => !c.anonymise_at).map((c) => [c.user_id, c]),
        );
        return json({
          clients: profiles
            .filter(
              (p) =>
                eligible.has(p.id) &&
                p.actif !== false &&
                !p.anonymise_at &&
                p.notifications_email !== false,
            )
            .map((p) => ({
              email: p.email,
              first_name: p.prenom,
              last_name: p.nom,
              id: p.id,
            })),
        });
      }
      case "import": {
        if (!Array.isArray(b.rows) || !b.rows.length || b.rows.length > 1000)
          throw new Error("Importez de 1 à 1 000 contacts par lot");
        if (!["client", "prospect"].includes(b.kind))
          throw new Error("Type de contact invalide");
        const rows = [
          ...new Map(
            b.rows.map((r: Record<string, unknown>) => {
              const e = email(r.email);
              return [
                e,
                {
                  email: e,
                  first_name: String(r.first_name || "").slice(0, 150),
                  last_name: String(r.last_name || "").slice(0, 150),
                },
              ];
            }),
          ).values(),
        ];
        const { data } = check(
          await db.rpc("newsletter_import_contacts", {
            p_rows: rows,
            p_kind: b.kind,
            p_categories: categories(b.categories),
            p_source: b.source === "application" ? "application" : "csv",
          }),
        );
        return json({ imported: data });
      }
      case "contact-update": {
        const { data } = check(
          await db
            .from("newsletter_contacts")
            .update({
              categories: categories(b.categories),
              kind: b.kind === "client" ? "client" : "prospect",
              excluded: b.excluded === true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", b.id)
            .select("id")
            .single(),
        );
        return json(data);
      }
      case "list": {
        const { data } = check(
          await db
            .from("newsletters")
            .select("id,name,subject,status,revision,scheduled_at,updated_at")
            .order("updated_at", { ascending: false })
            .limit(100),
        );
        return json({ campaigns: data });
      }
      case "get": {
        const { data } = check(
          await db.from("newsletters").select("*").eq("id", b.id).single(),
        );
        const counts: Record<string, number> = {};
        for (const s of [
          "pending",
          "processing",
          "sent",
          "failed",
          "skipped",
          "attention",
        ]) {
          const r = check(
            await db
              .from("newsletter_deliveries")
              .select("id", { count: "exact", head: true })
              .eq("newsletter_id", b.id)
              .eq("status", s),
          );
          counts[s] = r.count || 0;
        }
        const { data: issues } = check(
          await db
            .from("newsletter_deliveries")
            .select("email,status,error")
            .eq("newsletter_id", b.id)
            .in("status", ["failed", "attention", "skipped"])
            .limit(100),
        );
        return json({ campaign: data, counts, issues });
      }
      case "save": {
        const draft = {
          name: text(b.name, 120),
          subject: text(b.subject, 200),
          html: cleanHtml(b.html),
          updated_at: new Date().toISOString(),
        };
        if (!b.id) {
          const { data } = check(
            await db
              .from("newsletters")
              .insert({ ...draft, created_by: auth.userId })
              .select("*")
              .single(),
          );
          return json({ campaign: data });
        }
        const { data } = check(
          await db
            .from("newsletters")
            .update({ ...draft, revision: Number(b.revision) + 1 })
            .eq("id", b.id)
            .eq("revision", b.revision)
            .eq("status", "draft")
            .select("*")
            .maybeSingle(),
        );
        if (!data)
          throw new Error(
            "Brouillon modifié ailleurs ou déjà programmé. Rechargez la page.",
          );
        return json({ campaign: data });
      }
      case "queue": {
        if (!Deno.env.get("RESEND_API_KEY"))
          throw new Error("Resend n’est pas configuré côté serveur");
        check(
          await db.rpc("newsletter_record_optouts", {
            p_emails: await resendOptouts(Deno.env.get("RESEND_API_KEY")!),
          }),
        );
        const { data: c } = check(
          await db.from("newsletters").select("html").eq("id", b.id).single(),
        );
        if (!c) throw new Error("Newsletter introuvable");
        cleanHtml(c.html);
        const date = b.scheduled_at ? new Date(b.scheduled_at) : new Date();
        if (!Number.isFinite(date.getTime())) throw new Error("Date invalide");
        const { data } = check(
          await db.rpc("newsletter_enqueue", {
            p_id: b.id,
            p_revision: b.revision,
            p_ids: b.contact_ids,
            p_scheduled: date.toISOString(),
            p_sender: sender(),
          }),
        );
        return json({ queued: data });
      }
      case "cancel":
        check(await db.rpc("newsletter_cancel", { p_id: b.id }));
        return json({ success: true });
      case "test": {
        const to = email(b.email);
        const html = cleanHtml(b.html);
        const subject = text(b.subject, 200);
        const key = Deno.env.get("RESEND_API_KEY");
        if (!key) throw new Error("Resend n’est pas configuré");
        if (!/^[0-9a-f-]{36}$/i.test(b.request_id || ""))
          throw new Error("Identifiant de test manquant");
        const token = b.request_id;
        check(
          await db
            .from("email_unsubscribe_tokens")
            .upsert(
              { email: to, token },
              { onConflict: "token", ignoreDuplicates: true },
            ),
        );
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `newsletter-test/${auth.userId}/${b.request_id}`,
          },
          body: JSON.stringify({
            from: sender(),
            to: [to],
            subject: `[TEST] ${subject}`,
            html: recipientHtml(html, token),
          }),
          signal: AbortSignal.timeout(15000),
        });
        const result = await res.json();
        if (!res.ok)
          return json(
            { error: result.message || "Envoi refusé par Resend" },
            502,
          );
        return json({ success: true, provider_id: result.id });
      }
      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Erreur inattendue" },
      400,
    );
  }
});
