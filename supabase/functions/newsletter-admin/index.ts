import { createClient } from "npm:@supabase/supabase-js@2";
import { studioAction, withPreheader } from "../_shared/newsletter-studio.ts";
import { infomaniak } from "../_shared/newsletter-infomaniak.ts";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { categories, cleanHtml, email, text } from "../_shared/newsletter.ts";
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
  if (result.error) {
    throw new Error(
      (result.error as { message?: string }).message ||
        "Erreur de base de données",
    );
  }
  return result;
}
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
    if (rows.length > 10000) {
      throw new Error(
        "Plus de 10 000 contacts : scindez la sélection avant de poursuivre.",
      );
    }
    if (!data || data.length < 1000) return rows;
  }
  return rows;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json({ error: "Méthode non autorisée" }, 405);
  }
  const auth = await verifyInternalCaller(req);
  if (!auth.ok || !auth.userId || !auth.roles?.includes("admin")) {
    return json({ error: "Accès administrateur requis" }, 403);
  }
  try {
    const raw = await req.text();
    if (raw.length > 7_200_000) {
      return json({ error: "Fichier trop volumineux" }, 413);
    }
    const b = JSON.parse(raw);
    switch (b.action) {
      case "asset-upload":
      case "forms-list":
      case "form-save":
      case "form-get":
      case "form-sync":
        return json(await studioAction(db, auth.userId, b));
      case "connection": {
        const provider = await infomaniak(db);
        return json(await provider.readiness());
      }
      case "sync-leads": {
        return json(check(await db.rpc("newsletter_sync_leads")).data);
      }
      case "contact-answers": {
        const { data: contact } = check(
          await db.from("newsletter_contacts").select("email").eq("id", b.id)
            .single(),
        );
        if (!contact) throw new Error("Contact introuvable");
        const { data: shortlist } = check(
          await db.from("leads").select(
            "formulaire,type_recherche,localite,budget,notes,statut_emploi,permis_nationalite,poursuites,a_garant,accord_bancaire,apport_personnel,type_bien,statut_suisse,situation_pro,poursuites_statut,nb_pieces,localite_recherche,budget_max_chf,revenu_net_mensuel_chf",
          ).ilike("email", String(contact.email).replace(/[\\%_]/g, "\\$&")),
        );
        const { data: meta } = check(
          await db.from("meta_leads").select(
            "form_name,raw_answers,raw_meta_payload",
          ).ilike("email", String(contact.email).replace(/[\\%_]/g, "\\$&")),
        );
        const { data: imports } = check(
          await db.from("newsletter_contact_answers").select("source,answers")
            .eq("contact_id", b.id),
        );
        const internal =
          /^(id|email|prenom|nom|telephone|created|updated|statut|status|source|utm_|meta_|assigned|sync|last_|hubspot|convert|client_id|user_id)/;
        return json({
          shortlist: (shortlist || []).map((r: Record<string, unknown>) =>
            Object.fromEntries(
              Object.entries(r).filter(([k, v]) =>
                !internal.test(k) && v !== null && v !== ""
              ),
            )
          ),
          meta: (meta || []).map((r: Record<string, unknown>) => {
            const payload = r.raw_meta_payload as
              | Record<string, unknown>
              | null;
            const fields = Array.isArray(payload?.field_data)
              ? payload.field_data
              : [];
            const answers = {
              ...Object.fromEntries(
                Object.entries(payload || {}).filter(([k, v]) =>
                  !/^(original_|import_|utm_|campaign_|ad_|adset_|form_|field_data|id$)/
                    .test(k) && v !== null
                ),
              ),
              ...Object.fromEntries(
                fields.filter((x) => x && typeof x.name === "string").map(
                  (x) => [x.name, x.values],
                ),
              ),
              ...(r.raw_answers as Record<string, unknown> || {}),
            };
            return { form_name: r.form_name, answers };
          }),
          imports,
        });
      }
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
              classification_input: eligible.get(p.id),
            })),
        });
      }
      case "import": {
        if (!Array.isArray(b.rows) || !b.rows.length || b.rows.length > 1000) {
          throw new Error("Importez de 1 à 1 000 contacts par lot");
        }
        if (!["client", "prospect"].includes(b.kind)) {
          throw new Error("Type de contact invalide");
        }
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
                  classification_input: r.classification_input || {},
                  form_answers: r.form_answers || {},
                  suppressed: r.suppressed === true,
                  kind: r.kind === "client" ? "client" : b.kind,
                },
              ];
            }),
          ).values(),
        ];
        if (b.automatic === true) {
          return json(
            check(
              await db.rpc("newsletter_import_auto", {
                p_rows: rows,
                p_kind: b.kind,
                p_source: b.source === "application" ? "application" : "csv",
              }),
            ).data,
          );
        }
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
              classification_manual: true,
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
        for (
          const s of [
            "pending",
            "processing",
            "sent",
            "failed",
            "skipped",
            "attention",
          ]
        ) {
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
          html: withPreheader(cleanHtml(b.html), b.preheader),
          preheader: String(b.preheader || "").trim(),
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
        if (!data) {
          throw new Error(
            "Brouillon modifié ailleurs ou déjà programmé. Rechargez la page.",
          );
        }
        return json({ campaign: data });
      }
      case "queue": {
        const provider = await infomaniak(db);
        await provider.assertReady();
        await provider.syncOptouts(db);
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
            p_sender: provider.config.sender_email,
          }),
        );
        return json({ queued: data });
      }
      case "cancel":
        check(await db.rpc("newsletter_cancel", { p_id: b.id }));
        return json({ success: true });
      case "test": {
        const to = email(b.email);
        const html = withPreheader(cleanHtml(b.html), b.preheader);
        const subject = text(b.subject, 200);
        if (!/^[0-9a-f-]{36}$/i.test(b.request_id || "")) {
          throw new Error("Identifiant de test manquant");
        }
        const provider = await infomaniak(db);
        await provider.assertReady();
        const inserted = await db.from("newsletter_test_requests").insert({
          id: b.request_id,
          created_by: auth.userId,
        });
        if (inserted.error) {
          if (inserted.error.code !== "23505") check(inserted);
          const { data: previous } = check(
            await db
              .from("newsletter_test_requests")
              .select("state,provider_campaign_id")
              .eq("id", b.request_id)
              .eq("created_by", auth.userId)
              .single(),
          );
          if (previous?.state === "accepted") {
            return json({
              success: true,
              provider_id: previous.provider_campaign_id,
            });
          }
          throw new Error(
            "Test déjà demandé ou résultat incertain. Vérifiez Infomaniak avant une nouvelle demande.",
          );
        }
        try {
          const { data: remote } = await provider.call<{ id: number }>(
            "/campaigns",
            "POST",
            provider.campaignBody(`[TEST] ${subject}`, html),
          );
          if (!Number.isSafeInteger(remote?.id)) {
            throw new Error("Identifiant de campagne Infomaniak invalide");
          }
          check(
            await db
              .from("newsletter_test_requests")
              .update({
                state: "submitting",
                provider_campaign_id: remote.id,
              })
              .eq("id", b.request_id),
          );
          const result = await provider.call<boolean>(
            `/campaigns/${remote.id}/test`,
            "POST",
            { email: to },
          );
          if (result.data !== true) {
            throw new Error("Infomaniak n’a pas confirmé le test");
          }
          check(
            await db
              .from("newsletter_test_requests")
              .update({
                state: "accepted",
              })
              .eq("id", b.request_id),
          );
          return json({ success: true, provider_id: remote.id });
        } catch (error) {
          await db
            .from("newsletter_test_requests")
            .update({
              state: "attention",
              error:
                "Résultat du test à vérifier chez Infomaniak avant toute relance.",
            })
            .eq("id", b.request_id);
          throw new Error(
            `${
              error instanceof Error ? error.message : "Erreur Infomaniak"
            } Résultat du test à vérifier avant toute relance.`,
          );
        }
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
