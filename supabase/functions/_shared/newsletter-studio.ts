import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { infomaniak, check, type Infomaniak } from "./newsletter-infomaniak.ts";
import { categories, email, text } from "./newsletter.ts";
export function withPreheader(html: string, value: unknown) {
  const preheader = String(value || "").trim();
  if (preheader.length > 200 || /[\r\n]/.test(preheader))
    throw new Error("Prévisualisation limitée à 200 caractères");
  const escaped = preheader
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  const clean = html.replace(
    /<div\b[^>]*id=["']newsletter-preheader["'][^>]*>[\s\S]*?<\/div>/gi,
    "",
  );
  if (!preheader) return clean;
  const hidden = `<div id="newsletter-preheader" style="display:none;font-size:1px;color:transparent;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escaped}</div>`;
  return /<body\b[^>]*>/i.test(clean)
    ? clean.replace(/<body\b[^>]*>/i, (m) => m + hidden)
    : hidden + clean;
}
export function imageBytes(mime: unknown, base64: unknown) {
  const types = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  if (
    typeof mime !== "string" ||
    !(mime in types) ||
    typeof base64 !== "string" ||
    base64.length > 7_000_000
  )
    throw new Error("Image invalide ou trop volumineuse (5 Mo maximum)");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const matches =
    mime === "image/png"
      ? bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "image/gif"
          ? new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/)
          : new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
            new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (!matches || bytes.length > 5 * 1024 * 1024)
    throw new Error("Le fichier ne correspond pas au format image annoncé");
  return { bytes, extension: types[mime as keyof typeof types], mime };
}
type ProviderForm = {
  id: number;
  fields?: { id: number; selected: boolean }[];
  groups?: { id: number }[];
  codes?: { html?: string };
  [key: string]: unknown;
};
export function formMatches(
  actual: ProviderForm,
  expected: Record<string, unknown>,
  groupId: number,
) {
  const fields = expected.fields as
    { id: number; selected: boolean }[] | undefined;
  return (
    Object.entries(expected)
      .filter(([k]) => k !== "fields" && k !== "groups")
      .every(([k, v]) => actual[k] === v) &&
    actual.groups?.some((g) => g.id === groupId) &&
    (!fields ||
      fields.every((f) =>
        actual.fields?.some((a) => a.id === f.id && a.selected === f.selected),
      ))
  );
}
async function saveProviderForm(
  provider: Infomaniak,
  id: number,
  body: Record<string, unknown>,
  groupId: number,
) {
  let failure: unknown;
  try {
    await provider.call(`/webforms/${id}`, "PUT", {
      ...body,
      groups: [groupId],
    });
  } catch (e) {
    failure = e;
  }
  const verified = await provider.call<ProviderForm>(
    `/webforms/${id}?with=fields,groups,codes`,
  );
  if (!formMatches(verified.data, body, groupId))
    throw (
      failure ||
      new Error("Infomaniak n’a pas confirmé l’enregistrement du formulaire.")
    );
}
export async function studioAction(
  db: SupabaseClient,
  userId: string,
  b: Record<string, unknown>,
): Promise<unknown> {
  if (b.action === "asset-upload") {
    const { bytes, extension, mime } = imageBytes(b.mime, b.base64);
    const path = `newsletter/${userId}/${crypto.randomUUID()}.${extension}`;
    check(
      await db.storage
        .from("email-assets")
        .upload(path, bytes, { contentType: mime, upsert: false }),
    );
    return {
      url: db.storage.from("email-assets").getPublicUrl(path).data.publicUrl,
    };
  }
  if (b.action === "forms-list") {
    return {
      forms: check(
        await db
          .from("newsletter_forms")
          .select("*")
          .order("updated_at", { ascending: false }),
      ).data,
    };
  }
  if (b.action === "form-save") {
    const provider = await infomaniak(db);
    const name = text(b.name, 120),
      category = categories([b.category])[0];
    const body = {
      name,
      title: text(b.title, 200),
      subtitle: String(b.subtitle || "").slice(0, 1000),
      button: text(b.button, 80),
      rgpd: true,
      rgpd_msg: text(b.rgpd_msg, 1000),
      design: b.design === "flat" ? "flat" : "classic",
      placeholder: true,
      msg_ok_redir: false,
      msg_ok: "Vérifiez votre boîte mail pour confirmer votre inscription.",
      notify: false,
      email_from_addr: provider.config.sender_email,
      email_from_name: provider.config.sender_name,
      email_title: "Confirmez votre inscription à la newsletter Logisorama",
      fields: [
        {
          id: 2,
          selected: b.firstname === true,
          required: false,
          deleted: false,
        },
        {
          id: 3,
          selected: b.lastname === true,
          required: false,
          deleted: false,
        },
      ],
    };
    if (b.id) {
      const local = check(
        await db.from("newsletter_forms").select("*").eq("id", b.id).single(),
      ).data;
      if (
        !local.provider_form_id ||
        local.provider_domain_id !== provider.config.domain_id
      )
        throw new Error("Formulaire incomplet ou domaine différent");
      // Existing field configuration is managed in Infomaniak: its public update
      // endpoint does not accept the field list reliably. Never report a silent save.
      const { fields: _fields, ...settings } = body;
      await saveProviderForm(
        provider,
        local.provider_form_id,
        settings,
        local.provider_group_id,
      );
      check(
        await db
          .from("newsletter_forms")
          .update({ name, category, updated_at: new Date().toISOString() })
          .eq("id", b.id),
      );
      return { id: b.id };
    }
    // The client supplies a stable id: uncertain creation is never replayed blindly.
    if (!/^[0-9a-f-]{36}$/i.test(String(b.request_id)))
      throw new Error("Identifiant de création requis");
    const existing = check(
      await db
        .from("newsletter_forms")
        .select("id,provider_form_id")
        .eq("id", b.request_id)
        .maybeSingle(),
    ).data;
    if (existing) {
      if (existing.provider_form_id) return { id: existing.id };
      throw new Error(
        "Création précédente à vérifier dans Infomaniak avant une nouvelle tentative.",
      );
    }
    check(
      await db.from("newsletter_forms").insert({
        id: b.request_id,
        name,
        category,
        provider_domain_id: provider.config.domain_id,
        created_by: userId,
      }),
    );
    const group = await provider.call<{ id: number }>("/groups", "POST", {
      name: `Logisorama · ${category} · ${b.request_id}`,
    });
    check(
      await db
        .from("newsletter_forms")
        .update({ provider_group_id: group.data.id })
        .eq("id", b.request_id),
    );
    const creationName = `${name} [${b.request_id}]`;
    let formId: number | undefined;
    let creationError: unknown;
    try {
      const result = await provider.call<{ id: number }>("/webforms", "POST", {
        ...body,
        name: creationName,
        groups: [group.data.id],
      });
      formId = result.data.id;
    } catch (e) {
      creationError = e;
      // Infomaniak may commit creation and return HTTP 500. Reconcile by the
      // unique local request id; never replay POST and create a second form.
      const list = await provider.call<{ id: number; name: string }[]>(
        "/webforms?per_page=1000",
      );
      const matches = list.data.filter((f) => f.name === creationName);
      if (matches.length === 1) formId = matches[0].id;
    }
    if (!formId)
      throw creationError || new Error("Création du formulaire non confirmée");
    check(
      await db
        .from("newsletter_forms")
        .update({ provider_form_id: formId })
        .eq("id", b.request_id),
    );
    const verified = await provider.call<ProviderForm>(
      `/webforms/${formId}?with=fields,groups,codes`,
    );
    if (
      !formMatches(
        verified.data,
        { ...body, name: creationName },
        group.data.id,
      )
    )
      throw new Error(
        "Formulaire créé mais incomplet : vérifiez les réglages dans Infomaniak.",
      );
    check(
      await db
        .from("newsletter_forms")
        .update({ provider_form_id: formId })
        .eq("id", b.request_id),
    );
    return { id: b.request_id };
  }
  if (b.action === "form-get" || b.action === "form-sync") {
    const local = check(
      await db.from("newsletter_forms").select("*").eq("id", b.id).single(),
    ).data;
    const provider = await infomaniak(db);
    if (
      !local.provider_form_id ||
      local.provider_domain_id !== provider.config.domain_id
    )
      throw new Error("Formulaire incomplet ou domaine différent");
    if (b.action === "form-get") {
      const remote = await provider.call(
        `/webforms/${local.provider_form_id}?with=codes,fields,groups,statistics`,
      );
      return { local, form: remote.data };
    }
    await provider.syncOptouts(db);
    const active = (
      await provider.subscribers(
        `/groups/${local.provider_group_id}/subscribers`,
      )
    ).filter((s) => s.status === "active");
    let imported = 0;
    for (let i = 0; i < active.length; i += 500) {
      const r = check(
        await db.rpc("newsletter_import_contacts", {
          p_rows: active
            .slice(i, i + 500)
            .map((s) => ({ email: email(s.email) })),
          p_kind: "prospect",
          p_categories: [local.category],
          p_source: `infomaniak_form:${local.provider_form_id}`,
        }),
      );
      imported += Number(r.data || 0);
    }
    return { imported };
  }
  throw new Error("Action studio inconnue");
}
