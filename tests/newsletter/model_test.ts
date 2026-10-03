import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  parseContactCsv,
  filterContacts,
  type Contact,
} from "../../src/features/newsletter/model.ts";
import {
  cleanHtml,
  email,
  recipientHtml,
  retryStatus,
} from "../../supabase/functions/_shared/newsletter.ts";
import { resendOptouts } from "../../supabase/functions/_shared/newsletter-optouts.ts";
import { assertRejects } from "jsr:@std/assert@1";
Deno.test(
  "CSV Excel : BOM, accents, point-virgule, champ multilignes et guillemets",
  () => {
    const r = parseContactCsv(
      '\uFEFFemail;prénom;nom\r\n"A@EXAMPLE.COM";"Anne; Marie";"Du\nPont"\r\nb@example.ch;Jean;"Le ""Grand"""',
    );
    assertEquals(r.rows, [
      {
        email: "a@example.com",
        first_name: "Anne; Marie",
        last_name: "Du\nPont",
      },
      { email: "b@example.ch", first_name: "Jean", last_name: 'Le "Grand"' },
    ]);
  },
);
Deno.test("CSV : emails invalides signalés et doublons normalisés", () => {
  const r = parseContactCsv(
    "email,first_name,last_name\na@example.ch,A,B\n A@example.ch ,C,D\nincorrect,E,F",
  );
  assertEquals(r.rows.length, 1);
  assertEquals(r.duplicates, 1);
  assertEquals(r.invalid, [4]);
  assertThrows(() => parseContactCsv("nom,prenom\nA,B"));
  assertThrows(() => parseContactCsv('email\n"unfinished'));
  assertThrows(() =>
    parseContactCsv("email\n" + Array(10001).fill("a@example.ch").join("\n")),
  );
});
Deno.test(
  "Catégories multiples + type de contact restent des filtres indépendants",
  () => {
    const c = {
      id: "1",
      email: "a@example.ch",
      first_name: "Anne",
      last_name: "",
      categories: ["landlord", "seller"],
      kind: "client",
      excluded: false,
      unsubscribed: false,
    } as Contact;
    assertEquals(filterContacts([c], "anne", "client", "seller").length, 1);
    assertEquals(filterContacts([c], "", "prospect", "seller").length, 0);
  },
);
Deno.test(
  "HTML actif supprimé, URLs locales rejetées et mise en page conservée",
  () => {
    const s = cleanHtml(
      '<html><head><style>p{color:green}</style></head><body><script>alert(1)</script><p onclick="alert(1)">Bonjour</p><a href="javascript:alert(1)">Lien</a></body></html>',
    );
    assertEquals(s.includes("<script"), false);
    assertEquals(s.includes("onclick"), false);
    assertEquals(s.includes("javascript:"), false);
    assertEquals(s.includes("p{color:green}"), true);
    assertThrows(() => cleanHtml('<p>Bonjour</p><img src="local.jpg">'));
    assertThrows(() =>
      cleanHtml('<style>@import "https://example.com"</style><p>Bonjour</p>'),
    );
    assertThrows(() => email("user@example.com\nBcc: x@example.com"));
  },
);
Deno.test(
  "Le modèle de référence conserve la charte et les CTA après nettoyage",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../../src/features/newsletter/reference.html", import.meta.url),
    );
    const clean = cleanHtml(source);
    assertEquals(clean.includes("#205a43"), true);
    assertEquals(clean.includes("mso-hide"), false);
    assertEquals(clean.includes("max-width:640px"), true);
    assertEquals(clean.includes("https://logisorama.ch/nouveau-mandat"), true);
    const rendered = recipientHtml(clean, "test-token");
    assertEquals(rendered.includes("unsubscribe?token=test-token"), true);
    assertEquals(rendered.includes("{{unsubscribe_url}}"), false);
  },
);
Deno.test("Les deux syntaxes de désinscription et ajout automatique", () => {
  assertEquals(
    recipientHtml("<p>{{{RESEND_UNSUBSCRIBE_URL}}}</p>", "abc").includes(
      "unsubscribe?token=abc",
    ),
    true,
  );
  assertEquals(
    recipientHtml("<html><body><p>Bonjour</p></body></html>", "abc").indexOf(
      "Se désinscrire",
    ) > 0,
    true,
  );
  assertEquals(retryStatus(2, 429), "pending");
  assertEquals(retryStatus(8, 0), "attention");
  assertEquals(retryStatus(2, 403), "failed");
});
Deno.test("Désinscriptions Resend : lecture et échec fermé", async () => {
  const request = (() =>
    Promise.resolve(
      Response.json({
        data: [
          { id: "1", email: "A@example.ch", unsubscribed: true },
          { id: "2", email: "b@example.ch", unsubscribed: false },
        ],
        has_more: false,
      }),
    )) as typeof fetch;
  assertEquals(await resendOptouts("fake", request), ["a@example.ch"]);
  await assertRejects(() =>
    resendOptouts("fake", (() =>
      Promise.resolve(new Response("", { status: 403 }))) as typeof fetch),
  );
});
