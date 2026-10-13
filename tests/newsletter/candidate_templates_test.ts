import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { CANDIDATE_NEWSLETTER_TEMPLATES } from "../../src/features/newsletter/candidate-sequence.ts";
import { cleanHtml } from "../../supabase/functions/_shared/newsletter.ts";

Deno.test("Candidate copy survives email sanitization with distinct artwork and activation links", () => {
  const images = new Set<string>();
  for (const [i, template] of CANDIDATE_NEWSLETTER_TEMPLATES.entries()) {
    const html = cleanHtml(template.html);
    const ctas = [...html.matchAll(/<a href="([^"]+)"[^>]*>Activer ma recherche maintenant<\/a>/g)];
    assertEquals(ctas.length, 2);
    for (const [, encoded] of ctas) {
      const url = new URL(encoded.replaceAll("&amp;", "&"));
      assertEquals(url.origin + url.pathname, "https://logisorama.ch/nouveau-mandat");
      assertEquals(url.searchParams.get("utm_content"), `etape-${i + 1}`);
    }
    assertMatch(html, /\{\{unsubscribe_url\}\}/);
    assertMatch(html, /https:\/\/logisorama.ch\/email\/logo-logisorama.png/);
    images.add(template.image);
  }
  assertEquals(images.size, 6);
});

Deno.test("Replacing renter copy preserves enabled state, start date, owner and every other audience", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table newsletter_sequences(category text primary key,steps jsonb,enabled boolean,starts_at timestamptz,created_by text,updated_at timestamptz);
      insert into newsletter_sequences values('renter','[]',false,'2026-10-04','admin','2026-10-04'),('buyer','[{"subject":"Keep me"}]',true,'2026-10-05','another-admin','2026-10-05');`);
    const buyer = (await db.query("select * from newsletter_sequences where category='buyer'")).rows;
    const sql = await Deno.readTextFile(new URL("../../supabase/migrations/20261013120000_candidate_conversion_templates.sql", import.meta.url));
    await db.exec(sql);
    const renter = (await db.query<any>("select * from newsletter_sequences where category='renter'")).rows[0];
    assertEquals(renter.enabled, false);
    assertEquals(renter.created_by, "admin");
    assertEquals(new Date(renter.starts_at).toISOString(), "2026-10-04T00:00:00.000Z");
    assertEquals(renter.steps.map((s: any) => s.subject), CANDIDATE_NEWSLETTER_TEMPLATES.map(t => t.subject));
    assertEquals((await db.query("select * from newsletter_sequences where category='buyer'")).rows, buyer);
    await db.exec(sql);
    assertEquals((await db.query<any>("select jsonb_array_length(steps) n from newsletter_sequences where category='renter'")).rows[0].n, 6);
  } finally {
    await db.close();
  }
});
