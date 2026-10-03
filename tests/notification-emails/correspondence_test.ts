import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { renderCorrespondenceEmail } from "../../supabase/functions/_shared/correspondence-email.ts";
import {
  EMAIL_BRAND,
  renderCorporateEmail,
} from "../../supabase/functions/_shared/email-brand.ts";
Deno.test("Manual and dossier email branding preserves plain text, subject and personal signature", () => {
  const html = renderCorrespondenceEmail(
    "Candidature <Lausanne>",
    "Bonjour,\n\nVoici le dossier de Marie & Paul.\nBudget < 2500 CHF",
    '<strong>Christ Ramazani</strong><br><a href="tel:+41000000000">Téléphone</a>',
  );
  assertStringIncludes(html, EMAIL_BRAND.logo);
  assertStringIncludes(
    html,
    "Bonjour,<br><br>Voici le dossier de Marie &amp; Paul.",
  );
  assertStringIncludes(html, "Budget &lt; 2500 CHF");
  assertStringIncludes(html, "Candidature &lt;Lausanne&gt;");
  assertEquals((html.match(/Christ Ramazani/g) || []).length, 1);
  assert(!html.includes("L’équipe Logisorama"));
  assertStringIncludes(html, 'href="tel:+41000000000"');
});
Deno.test("Rich text and full documents keep tables, links and quoted messages without nested documents", () => {
  const html = renderCorrespondenceEmail(
    "Réponse",
    '<!doctype html><html><head><title>Old</title></head><body><p>Bonjour</p><table><tr><td>Document</td></tr>\n<tr><td><a href="https://example.test/document?token=abc&amp;download=1">Ouvrir</a></td></tr></table><blockquote>Message précédent</blockquote></body></html>',
  );
  assertEquals((html.match(/<html\b/g) || []).length, 1);
  assertEquals((html.match(/<body\b/g) || []).length, 1);
  assert(!html.includes("</tr><br>"));
  assertStringIncludes(html, "token=abc&amp;download=1");
  assertStringIncludes(html, "<blockquote>Message précédent</blockquote>");
});

Deno.test("Preformatted system emails are not wrapped twice; quoted messages still receive an outer frame", () => {
  const ready = renderCorporateEmail({
    title: "Offres",
    bodyHtml: "<p>Une offre</p>",
  });
  assertEquals(renderCorrespondenceEmail("Offres", ready), ready);
  const reply = renderCorrespondenceEmail(
    "Re: Offres",
    "Bonjour,<br>Merci.<blockquote>" + ready + "</blockquote>",
  );
  assertEquals((reply.match(/<html\b/g) || []).length, 1);
  assertStringIncludes(reply, "CORRESPONDANCE");
  assertStringIncludes(reply, "Bonjour,<br>Merci.");
});
