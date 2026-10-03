import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { TEMPLATES } from "../../supabase/functions/_shared/transactional-email-templates/registry.ts";
import { RecoveryEmail } from "../../supabase/functions/_shared/email-templates/recovery.tsx";
import { SignupEmail } from "../../supabase/functions/_shared/email-templates/signup.tsx";
import { InviteEmail } from "../../supabase/functions/_shared/email-templates/invite.tsx";
import { MagicLinkEmail } from "../../supabase/functions/_shared/email-templates/magic-link.tsx";
import { EmailChangeEmail } from "../../supabase/functions/_shared/email-templates/email-change.tsx";
import { ReauthenticationEmail } from "../../supabase/functions/_shared/email-templates/reauthentication.tsx";
import {
  EMAIL_BRAND,
  emailButton,
  renderCorporateEmail,
  renderNotificationEmail,
} from "../../supabase/functions/_shared/email-brand.ts";

Deno.test("Seven transactional templates: common identity, dynamic data and CTA preserved", async () => {
  for (const [name, t] of Object.entries(TEMPLATES)) {
    const html = await renderAsync(
      React.createElement(t.component, t.previewData),
    );
    assertStringIncludes(html, EMAIL_BRAND.logo, name);
    assertStringIncludes(html, "max-width:640px", name);
    assertStringIncludes(html, "#205a43", name);
    assert(!html.includes("linear-gradient"), name);
    assert(!html.includes("undefined"), name);
    assertEquals((html.match(/alt="Immo-rama"/g) || []).length, 1, name);
    if (name === "candidat-visite-confirmation") {
      assertStringIncludes(html, t.previewData!.dateLabel);
      assertStringIncludes(html, t.previewData!.tempPassword);
      assertStringIncludes(html, "/login?redirect=/candidat");
    }
    if (name === "candidature-relocation-etape") {
      assertStringIncludes(html, "/candidat/candidatures");
    }
  }
  const html = await renderAsync(
    React.createElement(TEMPLATES["candidat-visite-confirmation"].component, {
      prenom: "<script>alert(1)</script>",
      dateLabel: "Dimanche à 14 h",
    }),
  );
  assert(!html.includes("<script>"));
  assert(!html.includes("Mot de passe provisoire"));
  assertStringIncludes(html, "Dimanche à 14 h");
});
Deno.test("Six authentication templates retain tokens, emails and signed URLs", async () => {
  const props = {
    siteName: "Logisorama",
    siteUrl: "https://logisorama.ch",
    confirmationUrl: "https://logisorama.ch/auth?token=a%2Bb&type=recovery",
    recipient: "new@example.test",
    oldEmail: "old@example.test",
    email: "new@example.test",
    newEmail: "new@example.test",
    token: "123456",
  };
  for (
    const c of [
      RecoveryEmail,
      SignupEmail,
      InviteEmail,
      MagicLinkEmail,
      EmailChangeEmail,
      ReauthenticationEmail,
    ]
  ) {
    const html = await renderAsync(
      React.createElement(c as React.ComponentType<typeof props>, props),
    );
    assertStringIncludes(html, EMAIL_BRAND.logo);
    if (c === ReauthenticationEmail) assertStringIncludes(html, "123456");
    else assertStringIncludes(html, "token=a%2Bb&amp;type=recovery");
    if (c === EmailChangeEmail) {
      assertStringIncludes(html, "old@example.test");
      assertStringIncludes(html, "new@example.test");
    }
  }
});
Deno.test("Generic notifications: escaped content, relative/absolute links, app links and responsive frame", () => {
  const html = renderNotificationEmail(
    "Visite <confirmée>",
    "Une ligne\n<script>bad</script>",
    "new_visit",
    "/client/visites",
    "Marie & Paul",
  );
  assertStringIncludes(html, "https://logisorama.ch/client/visites");
  assertStringIncludes(html, "Marie &amp; Paul");
  assert(!html.includes("<script>"));
  assertStringIncludes(html, "Une ligne<br>");
  assertStringIncludes(
    renderNotificationEmail(
      "A",
      "B",
      "new_offer",
      "https://logisorama.ch/client/offres",
    ),
    'href="https://logisorama.ch/client/offres"',
  );
  assert(!emailButton("Open", "javascript:alert(1)").includes("javascript:"));
  assertStringIncludes(
    renderNotificationEmail("Mise à jour", "B", "app_update"),
    "https://apps.apple.com/app/id6756940233",
  );
  assertStringIncludes(
    renderCorporateEmail({
      title: "Titre",
      bodyHtml: emailButton("Action", "/login"),
    }),
    "@media screen and (max-width:520px)",
  );
});
