import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { RC_CAMPAIGN_HTML } from "../../src/features/newsletter/rc-campaign.ts";
import { cleanHtml } from "../../supabase/functions/_shared/newsletter.ts";
import { infomaniakHtml } from "../../supabase/functions/_shared/newsletter-infomaniak.ts";

Deno.test("RC email keeps both secure form links and the new artwork after sanitization", () => {
  const html = cleanHtml(RC_CAMPAIGN_HTML);
  const ctas = [...html.matchAll(/<a href="([^"]+)"[^>]*>Recevoir une offre gratuite/g)];
  assertEquals(ctas.length, 2);
  for (const [, value] of ctas) {
    const url = new URL(value.replaceAll("&amp;", "&"));
    assertEquals(url.origin + url.pathname, "https://logisorama.ch/offre-rc");
    assertEquals(url.hash, "#demande");
    assertEquals(url.searchParams.get("utm_campaign"), "rc-dossier-beton");
  }
  assertMatch(html, /newsletter\/rc-2026-10\/dossier-beton.jpg/);
  assertMatch(html, /demande d’offre est gratuite/);
  assertMatch(html, /assurance est payante/);
  assertEquals(/<form\b/i.test(html), false);
  assertMatch(html, /\{\{unsubscribe_url\}\}/);
  assertEquals(infomaniakHtml(html).includes("{{unsubscribe_url}}"), false);
});
