import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
export type InfomaniakConfig = {
  api_key: string;
  domain_id: number;
  sender_email: string;
  sender_name: string;
};
export type Subscriber = { id: number; email: string; status: string };
type Envelope<T> = {
  result: string;
  data: T;
  total?: number;
  pages?: number;
  page?: number;
};
export function check<T extends { error: unknown }>(r: T): T {
  if (r.error) {
    throw new Error(
      (r.error as { message?: string }).message || "Erreur de base de données",
    );
  }
  return r;
}
export async function infomaniak(db: SupabaseClient) {
  const { data } = check(await db.rpc("newsletter_infomaniak_credentials"));
  if (
    !data?.api_key || !Number.isSafeInteger(data.domain_id) ||
    !data.sender_email
  ) {
    throw new Error("Infomaniak Newsletter non configuré");
  }
  return new Infomaniak(data);
}
export class Infomaniak {
  private lastRequest = 0;
  constructor(
    readonly config: InfomaniakConfig,
    private request: typeof fetch = fetch,
    private pace = 1100,
  ) {}
  async call<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<Envelope<T>> {
    const delay = this.pace - (Date.now() - this.lastRequest);
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    this.lastRequest = Date.now();
    const response = await this.request(
      `https://api.infomaniak.com/1/newsletters/${this.config.domain_id}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.config.api_key}`,
          Accept: "application/json",
          // Infomaniak rejects GET expansion parameters when an empty request
          // declares a JSON body (422: "with field is prohibited").
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      },
    );
    const result = await response.json();
    if (!response.ok || result.result !== "success") {
      // Provider descriptions may echo inputs. Return only a bounded machine code.
      const code = String(result.error?.code || "réponse_invalide").replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      ).slice(0, 80);
      // Diagnostic minimal et sûr : méthode, chemin sans querystring, statut,
      // code machine et uniquement les NOMS des champs de validation rejetés
      // (jamais leurs valeurs, jamais de corps, destinataires ou secret).
      const endpoint = `${method} ${path.split("?")[0]}`;
      const fieldNames = new Set<string>();
      const collect = (v: unknown) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          for (const k of Object.keys(v as Record<string, unknown>)) {
            if (/^[a-zA-Z0-9_.[\]-]{1,80}$/.test(k)) fieldNames.add(k);
          }
        }
      };
      collect(result.error?.fields);
      collect(result.error?.errors);
      collect(result.error?.validation);
      const fields = [...fieldNames].slice(0, 30).join(",");
      throw new Error(
        `Infomaniak (${response.status}, ${code}) sur ${endpoint}${
          fields ? ` — champs rejetés: ${fields}` : ""
        }. Vérifiez le domaine, les crédits et les droits de la clé.`,
      );
    }
    return result;
  }
  async readiness() {
    const { data } = await this.call<
      { name: string; status: string; can_use_other_domains: boolean }
    >("");
    const senderDomain = this.config.sender_email.split("@")[1];
    const ready = data.status === "enabled" &&
      (senderDomain === data.name || data.can_use_other_domains === true);
    return {
      ready,
      domain: data.name,
      status: data.status,
      sender: this.config.sender_email,
      message: ready
        ? "Infomaniak connecté"
        : `Infomaniak : domaine ${data.name} ${
          data.status === "waiting"
            ? "en attente de validation DNS"
            : data.status
        }. Envois indisponibles.`,
    };
  }
  async assertReady() {
    const status = await this.readiness();
    if (!status.ready) throw new Error(status.message);
  }
  async subscribers(path = "/subscribers"): Promise<Subscriber[]> {
    const rows: Subscriber[] = [];
    for (let page = 1; page <= 10; page++) {
      const b = await this.call<Subscriber[]>(
        `${path}?page=${page}&per_page=1000${
          path === "/subscribers" ? "&filter%5Bstatus%5D=all" : ""
        }&order_by=id`,
      );
      if (
        !Array.isArray(b.data) || !Number.isInteger(b.pages) ||
        !Number.isInteger(b.total) || b.page !== page
      ) {
        throw new Error("Pagination des abonnés Infomaniak invalide");
      }
      rows.push(...b.data);
      if (b.pages! > 10 || b.total! > 10000) {
        throw new Error(
          "Plus de 10 000 abonnés Infomaniak : synchronisation à adapter",
        );
      }
      if (page >= b.pages!) {
        if (rows.length !== b.total) {
          throw new Error(
            "Liste Infomaniak modifiée pendant la lecture : réessayez",
          );
        }
        return rows.map((s) => ({ ...s, email: s.email.toLowerCase() }));
      }
    }
    throw new Error("Liste Infomaniak incomplète");
  }
  async syncOptouts(db: SupabaseClient) {
    const subscribers = await this.subscribers();
    check(
      await db.rpc("newsletter_record_optouts", {
        p_emails: subscribers.filter((s) =>
          s.status === "unsubscribed" || s.status === "junk"
        ).map((s) => s.email),
      }),
    );
    return subscribers;
  }
  campaignBody(
    subject: string,
    html: string,
    sender = this.config.sender_email,
  ) {
    return {
      email_from_addr: sender,
      email_from_name: this.config.sender_name,
      lang: "fr_FR",
      subject,
      content_html: infomaniakHtml(html),
      tracking_link: true,
      tracking_opening: true,
    };
  }
}
export function groupRecipients(groupId: number) {
  return {
    all_subscribers: false,
    groups: { include: [groupId], exclude: [] },
    segments: { include: [], exclude: [] },
    expert: { id: 0, conditions: null },
  };
}
export function sameAudience(expected: string[], actual: string[]) {
  const sorted = [...actual].sort();
  return expected.length > 0 && expected.length === actual.length &&
    new Set(actual).size === actual.length &&
    [...expected].sort().every((s, i) => s === sorted[i]);
}
export function infomaniakHtml(html: string) {
  // Infomaniak inserts its recipient-specific unsubscribe footer automatically.
  // Remove the old local/Resend placeholder link, never send a shared fake token.
  return html.replace(
    /<a\b[^>]*href=["'](?:\{\{unsubscribe_url\}\}|\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\})["'][^>]*>[\s\S]*?<\/a>/gi,
    "",
  )
    .replaceAll("{{unsubscribe_url}}", "").replaceAll(
      "{{{RESEND_UNSUBSCRIBE_URL}}}",
      "",
    );
}
