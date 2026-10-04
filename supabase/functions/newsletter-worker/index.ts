import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import {
  check,
  InfomaniakError,
  groupRecipients,
  infomaniak,
  immediateScheduleStart,
  sameAudience,
} from "../_shared/newsletter-infomaniak.ts";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Unauthorized", { status: 403 });
  }
  const token = req.headers.get("x-newsletter-dispatch-token") || "";
  let authorized = false;
  if (/^[0-9a-f-]{72}$/.test(token)) {
    const verified = await db.rpc("newsletter_verify_dispatch", {
      p_token: token,
    });
    authorized = !verified.error && verified.data === true;
  } else {
    const caller = await verifyInternalCaller(req);
    authorized = caller.ok && ["service", "secret"].includes(caller.kind);
  }
  if (!authorized) return new Response("Unauthorized", { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "check") {
    try {
      return Response.json(await (await infomaniak(db)).readiness());
    } catch (e) {
      return Response.json({
        error: e instanceof Error ? e.message : "Configuration indisponible",
      }, { status: 503 });
    }
  }
  const { data: claimed, error } = await db.rpc("newsletter_infomaniak_claim");
  if (error) {
    return Response.json({ error: "File Newsletter indisponible" }, {
      status: 500,
    });
  }
  const c = claimed?.[0];
  if (!c) return Response.json({ processed: 0 });
  const lease = { p_id: c.id, p_token: c.dispatch_token };
  let submitting = false;
  const update = async (values: Record<string, unknown>) =>
    check(
      await db.from("newsletters").update(values).eq("id", c.id).eq(
        "dispatch_token",
        c.dispatch_token,
      ),
    );
  try {
    const provider = await infomaniak(db);
    if (provider.config.domain_id !== c.provider_domain_id) {
      throw new Error("Le domaine Infomaniak a changé depuis la programmation");
    }
    await provider.assertReady();
    const subscribers = await provider.syncOptouts(db);
    const byEmail = new Map(subscribers.map((s) => [s.email, s]));
    let { data: recipients } = check(
      await db.rpc("newsletter_infomaniak_recipients", lease),
    );
    let audience = (recipients || []) as { id: string; email: string }[];
    // Only create absent subscribers. Never update/re-activate an existing opt-out.
    const missing = audience.filter((r) => !byEmail.has(r.email));
    if (missing.length) {
      for (const r of missing.slice(0, 50)) {
        try {
          await provider.call("/subscribers", "POST", { email: r.email });
        } catch (e) {
          // Only a definitive email-format rejection is recipient-specific.
          // Auth, quota, transient and unknown validation failures still stop the batch.
          if (!(e instanceof InfomaniakError) || !e.invalidEmail) throw e;
          check(await db.rpc("newsletter_infomaniak_skip", {
            ...lease, p_emails: [r.email],
            p_reason: "Adresse email invalide selon Infomaniak : correction nécessaire avant un nouvel envoi.",
          }));
        }
      }
      await update({
        worker_error: `Préparation des contacts Infomaniak : ${
          Math.max(0, missing.length - 50)
        } restants.`,
        dispatch_retry_at: new Date(Date.now() + 1000).toISOString(),
      });
      return Response.json({ preparing: true });
    }
    // Prepare recipients ahead of time, but do not hand off to the provider early.
    // This also keeps future campaigns cancellable during contact preparation.
    const scheduled = Date.parse(c.scheduled_at);
    if (!Number.isFinite(scheduled)) throw new Error("Date de programmation invalide");
    if (scheduled > Date.now() + 180000) {
      await update({ worker_error: null, dispatch_retry_at: new Date(scheduled - 180000).toISOString() });
      return Response.json({ prepared: audience.length });
    }
    const blocked = audience.filter((r) =>
      byEmail.get(r.email)?.status !== "active"
    ).map((r) => r.email);
    if (blocked.length) {
      check(
        await db.rpc("newsletter_infomaniak_skip", {
          ...lease,
          p_emails: blocked,
          p_reason:
            "Abonné non actif chez Infomaniak (désinscrit, adresse rejetée ou non confirmée)",
        }),
      );
    }
    ({ data: recipients } = check(
      await db.rpc("newsletter_infomaniak_recipients", lease),
    ));
    audience = recipients || [];
    if (!audience.length) {
      await update({
        status: "completed",
        dispatch_state: "accepted",
        worker_error: "Aucun destinataire éligible : aucun envoi.",
      });
      return Response.json({ processed: 0 });
    }
    let groupId = c.provider_group_id as number | null;
    if (!groupId) {
      const { data: group } = await provider.call<{ id: number }>(
        "/groups",
        "POST",
        { name: `Logisorama ${c.id}` },
      );
      if (!Number.isSafeInteger(group?.id)) {
        throw new Error("Groupe Infomaniak invalide");
      }
      groupId = group.id;
      await update({ provider_group_id: groupId });
    }
    const emails = audience.map((r) => r.email);
    const current = await provider.subscribers(
      `/groups/${groupId}/subscribers`,
    );
    const extra = current.filter((s) => !emails.includes(s.email)).map((s) =>
      s.id
    );
    if (extra.length) {
      await provider.call(`/groups/${groupId}/subscribers/unassign`, "POST", {
        subscriber_ids: extra,
      });
    }
    const add = audience.filter((r) =>
      !current.some((s) => s.email === r.email)
    ).map((r) => byEmail.get(r.email)!.id);
    if (add.length) {
      await provider.call(`/groups/${groupId}/subscribers/assign`, "POST", {
        subscriber_ids: add,
      });
    }
    const verified = await provider.subscribers(
      `/groups/${groupId}/subscribers`,
    );
    if (
      !sameAudience(
        emails,
        verified.filter((s) => s.status === "active").map((s) => s.email),
      )
    ) {
      throw new Error(
        "Le groupe Infomaniak ne correspond pas aux destinataires : envoi suspendu",
      );
    }
    let campaignId = c.provider_campaign_id as number | null;
    const payload = {
      ...provider.campaignBody(c.subject, c.html, c.sender),
      recipients: groupRecipients(groupId),
    };
    if (!campaignId) {
      const { data: remote } = await provider.call<{ id: number }>(
        "/campaigns",
        "POST",
        payload,
      );
      if (!Number.isSafeInteger(remote?.id)) {
        throw new Error("Campagne Infomaniak invalide");
      }
      campaignId = remote.id;
      await update({ provider_campaign_id: campaignId });
    } else {
      const { data: remote } = await provider.call<{ status: string }>(
        `/campaigns/${campaignId}`,
      );
      if (remote.status !== "draft") {
        throw new Error(
          "Campagne déjà modifiée chez Infomaniak : vérification manuelle nécessaire",
        );
      }
      await provider.call(`/campaigns/${campaignId}`, "PUT", payload);
    }
    const { data: remote } = await provider.call<
      {
        status: string;
        subscribers_count: number;
        recipients: {
          all_subscribers: boolean;
          groups: { include: { id: number }[]; exclude: unknown[] };
          segments: { include: unknown[]; exclude: unknown[] };
          expert: { id: number; conditions: unknown };
        };
      }
    >(`/campaigns/${campaignId}?with=content,recipients`);
    const target = remote.recipients;
    if (
      remote.status !== "draft" || remote.subscribers_count !== emails.length ||
      target?.all_subscribers !== false || target.groups.include.length !== 1 ||
      target.groups.include[0].id !== groupId || target.groups.exclude.length ||
      target.segments.include.length || target.segments.exclude.length ||
      target.expert.conditions || target.expert.id
    ) {
      throw new Error(
        "Ciblage de campagne Infomaniak non conforme : envoi suspendu",
      );
    }
    check(
      await db.rpc("newsletter_infomaniak_begin_send", {
        ...lease,
        p_emails: emails,
      }),
    );
    await update({ tracking_enabled: true });
    submitting = true;
    const result = await provider.call<boolean>(
      `/campaigns/${campaignId}/schedule`,
      "PUT",
      { started_at: Math.max(Math.ceil(scheduled / 1000), immediateScheduleStart()) },
    );
    if (result.data !== true) {
      throw new Error("Infomaniak n’a pas confirmé la prise en charge");
    }
    check(await db.rpc("newsletter_infomaniak_accept", lease));
    return Response.json({ processed: emails.length, provider_id: campaignId });
  } catch (e) {
    const detail = e instanceof Error
      ? e.message.slice(0, 300)
      : "Erreur inattendue";
    await update({
      worker_error: submitting
        ? `${detail} Résultat incertain : vérifier Infomaniak avant toute relance.`
        : detail,
      ...(submitting
        ? { dispatch_state: "attention" }
        : { dispatch_retry_at: new Date(Date.now() + 300000).toISOString() }),
    });
    return Response.json({
      error: "Traitement suspendu, consulter le suivi de la campagne",
    }, { status: 503 });
  } finally {
    await db.from("newsletters").update({ dispatch_lease: null }).eq("id", c.id)
      .eq("dispatch_token", c.dispatch_token).eq("dispatch_state", "preparing");
  }
});
