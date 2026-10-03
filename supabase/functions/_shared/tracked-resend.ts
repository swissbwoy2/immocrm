import { Resend as BaseResend } from "https://esm.sh/resend@2.0.0";
import { prepareEmailTracking } from "./communication-email.ts";

// Preserve Resend's transport, attachments, headers, errors and idempotency behavior.
export class Resend extends BaseResend {
  constructor(key: string, source = "Email automatique") {
    super(key);
    const send = this.emails.send.bind(this.emails);
    this.emails.send = async (payload, options) => {
      const tracking = await prepareEmailTracking(
        payload,
        "resend",
        source,
        (options as { idempotencyKey?: string } | undefined)?.idempotencyKey,
      );
      try {
        const result = await send(
          tracking.html ? { ...payload, html: tracking.html } : payload,
          options,
        );
        await tracking.finish(
          result.error ? "failed" : "sent",
          result.data?.id,
          result.error?.message,
        );
        return result;
      } catch (error) {
        await tracking.finish("failed", null, "Échec du transport Resend");
        throw error;
      }
    };
  }
}
export function trackedResendFetch(source: string): typeof fetch {
  return async (input, init) => {
    if (
      String(input) !== "https://api.resend.com/emails" ||
      typeof init?.body !== "string"
    ) return fetch(input, init);
    const payload = JSON.parse(init.body);
    const tracking = await prepareEmailTracking(
      payload,
      "resend",
      source,
      new Headers(init.headers).get("Idempotency-Key") || undefined,
    );
    try {
      const response = await fetch(input, {
        ...init,
        body: JSON.stringify({ ...payload, html: tracking.html }),
      });
      const data = await response.clone().json().catch(() => ({}));
      await tracking.finish(
        response.ok ? "sent" : "failed",
        data.id,
        response.ok ? null : `Resend HTTP ${response.status}`,
      );
      return response;
    } catch (error) {
      await tracking.finish("failed", null, "Échec du transport Resend");
      throw error;
    }
  };
}
