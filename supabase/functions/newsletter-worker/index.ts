import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { resendOptouts } from "../_shared/newsletter-optouts.ts";
import { recipientHtml, retryStatus } from "../_shared/newsletter.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
function check<T extends { error: unknown }>(r: T): T {
  if (r.error) throw r.error;
  return r;
}
Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Unauthorized", { status: 403 });
  const dispatchToken = req.headers.get("x-newsletter-dispatch-token") || "";
  let authorized = false;
  if (/^[0-9a-f-]{72}$/.test(dispatchToken)) {
    const verified = await db.rpc("newsletter_verify_dispatch", {
      p_token: dispatchToken,
    });
    authorized = !verified.error && verified.data === true;
  } else {
    const caller = await verifyInternalCaller(req);
    authorized = caller.ok && ["service", "secret"].includes(caller.kind);
  }
  if (!authorized) return new Response("Unauthorized", { status: 403 });
  const key = Deno.env.get("RESEND_API_KEY");

  let processed = 0;
  try {
    const { data: due } = check(
      await db
        .from("newsletters")
        .select("id")
        .eq("status", "queued")
        .lte("scheduled_at", new Date().toISOString())
        .limit(1),
    );
    if (!due?.length) return Response.json({ processed: 0 });
    if (!key) throw new Error("RESEND_API_KEY missing");
    check(
      await db.rpc("newsletter_record_optouts", {
        p_emails: await resendOptouts(key),
      }),
    );
    check(
      await db
        .from("newsletters")
        .update({ worker_error: null })
        .eq("status", "queued"),
    );
    const start = Date.now();
    // Keep each invocation bounded. pg_cron continues the queue after the app closes.
    while (processed < 50 && Date.now() - start < 45000) {
      const { data } = check(await db.rpc("newsletter_claim"));
      const d = data?.[0];
      if (!d) break;
      try {
        const { data: c } = check(
          await db
            .from("newsletters")
            .select("subject,html,sender,status")
            .eq("id", d.newsletter_id)
            .single(),
        );
        const { data: contact } = check(
          await db
            .from("newsletter_contacts")
            .select("excluded")
            .eq("id", d.contact_id)
            .single(),
        );
        const { data: unsub } = check(
          await db
            .from("email_unsubscribes")
            .select("id")
            .ilike("email", d.email)
            .limit(1),
        );
        if (!c || !contact)
          throw new Error("Newsletter ou contact introuvable");
        if (c.status !== "queued" || contact.excluded || unsub?.length) {
          check(
            await db
              .from("newsletter_deliveries")
              .update({
                status: "skipped",
                error: "Contact exclu ou désinscrit",
                lease_until: null,
              })
              .eq("id", d.id),
          );
          processed++;
          continue;
        }
        let httpStatus = 0;
        let providerId: string | null = null;
        let problem = "Résultat Resend inconnu";
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `newsletter/${d.id}`,
            },
            body: JSON.stringify({
              from: c.sender,
              to: [d.email],
              subject: c.subject,
              html: recipientHtml(c.html, d.unsubscribe_token),
              headers: {
                "List-Unsubscribe": `<${url}/functions/v1/handle-email-unsubscribe?token=${d.unsubscribe_token}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }),
            signal: AbortSignal.timeout(15000),
          });
          httpStatus = res.status;
          const result = await res.json();
          if (res.ok && result.id) providerId = result.id;
          else if (res.ok) httpStatus = 0;
          else
            problem = String(result.message || `Resend ${res.status}`).slice(
              0,
              400,
            );
        } catch {
          httpStatus = 0;
          problem =
            "Connexion Resend interrompue ; nouvelle tentative avec la même clé.";
        }
        const status = providerId
          ? "sent"
          : retryStatus(d.attempts, httpStatus);
        check(
          await db
            .from("newsletter_deliveries")
            .update({
              status,
              provider_id: providerId,
              error: providerId ? null : problem,
              lease_until: null,
              sent_at: providerId ? new Date().toISOString() : null,
              retry_at: new Date(
                Date.now() + Math.min(60, d.attempts * 5) * 60000,
              ).toISOString(),
            })
            .eq("id", d.id),
        );
      } catch {
        // Do not turn an unknown provider result into a fresh send. Keep the lease;
        // the next invocation recovers it with the exact same idempotency key.
        console.error("newsletter-worker: recipient lease retained", d.id);
      }
      processed++;
      await new Promise((r) => setTimeout(r, 600));
    }
    check(await db.rpc("newsletter_finish"));
    return Response.json({ processed });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 300) : "Erreur de base de données";
    await db
      .from("newsletters")
      .update({
        worker_error:
          `Envoi suspendu : ${detail}. Reprise automatique au prochain passage.`,
      })
      .eq("status", "queued")
      .lte("scheduled_at", new Date().toISOString());
    return Response.json(
      { error: "Traitement interrompu, reprise automatique", processed },
      { status: 500 },
    );
  }
});
