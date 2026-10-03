import {
  assertEquals,
  assertThrows,
  assertStringIncludes,
} from "jsr:@std/assert@1";
import {
  withPreheader,
  imageBytes,
  formMatches,
} from "../../supabase/functions/_shared/newsletter-studio.ts";
Deno.test("Pré-en-tête : échappement, remplacement unique et retrait", () => {
  const source =
    '<html><head><style>@media(max-width:600px){td{display:block}}</style></head><body style="background:#fff"><p>Contenu</p></body></html>';
  const first = withPreheader(source, '<img src=x onerror=alert(1)> & "');
  assertStringIncludes(
    first,
    "&lt;img src=x onerror=alert(1)&gt; &amp; &quot;",
  );
  const next = withPreheader(first, "Suite");
  assertEquals((next.match(/id="newsletter-preheader"/g) || []).length, 1);
  assertEquals(withPreheader(next, ""), source);
  assertThrows(() => withPreheader(source, "x".repeat(201)));
  assertThrows(() => withPreheader(source, "x\ny"));
});
Deno.test(
  "Images : formats vérifiés, fichiers actifs et type mensonger rejetés",
  () => {
    const png = btoa(String.fromCharCode(137, 80, 78, 71, 13, 10, 26, 10));
    assertEquals(imageBytes("image/png", png).extension, "png");
    assertThrows(() => imageBytes("image/svg+xml", btoa("<svg/>")));
    assertThrows(() => imageBytes("image/jpeg", png));
    assertThrows(() =>
      imageBytes("image/png", btoa("<script>alert(1)</script>")),
    );
    assertThrows(() => imageBytes("image/png", "x".repeat(7_000_001)));
  },
);
Deno.test(
  "Formulaire : une erreur API ne vaut succès que si tous les réglages sont relus",
  () => {
    const actual = {
      id: 1,
      title: "Titre",
      groups: [{ id: 42 }],
      fields: [{ id: 2, selected: true }],
    };
    assertEquals(
      formMatches(
        actual,
        { title: "Titre", fields: [{ id: 2, selected: true }] },
        42,
      ),
      true,
    );
    assertEquals(formMatches(actual, { title: "Autre" }, 42), false);
    assertEquals(formMatches(actual, { title: "Titre" }, 43), false);
    assertEquals(
      formMatches(actual, { fields: [{ id: 2, selected: false }] }, 42),
      false,
    );
  },
);

import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertRejects } from "jsr:@std/assert@1";
Deno.test(
  "Studio SQL : migration et formulaires réservés aux administrateurs",
  async () => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql as $$select null::uuid$$;
   create function public.has_role(uuid,text) returns boolean language sql as $$select false$$;
   create table newsletters(id uuid primary key);
   grant usage on schema public,auth to authenticated;
   insert into auth.users values('11111111-1111-4111-8111-111111111111');`);
      await db.exec(
        await Deno.readTextFile(
          new URL(
            "../../supabase/migrations/20261003160000_newsletter_studio.sql",
            import.meta.url,
          ),
        ),
      );
      await db.exec(
        `insert into newsletter_forms(name,category,provider_domain_id,created_by) values('Test','renter',123,'11111111-1111-4111-8111-111111111111'); set role authenticated;`,
      );
      assertEquals(
        (await db.query("select * from newsletter_forms")).rows.length,
        0,
      );
      await assertRejects(() =>
        db.query("update newsletter_forms set name='autre'"),
      );
      await db.exec(
        "reset role; create or replace function public.has_role(uuid,text) returns boolean language sql as $$select true$$; set role authenticated;",
      );
      assertEquals(
        (await db.query("select * from newsletter_forms")).rows.length,
        1,
      );
      await assertRejects(() => db.query("delete from newsletter_forms"));
      await db.exec("reset role; set role anon;");
      await assertRejects(() => db.query("select * from newsletter_forms"));
    } finally {
      await db.close();
    }
  },
);
