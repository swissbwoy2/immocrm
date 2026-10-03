import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertEquals } from "jsr:@std/assert@1";
import { parseContactCsv } from "../../src/features/newsletter/model.ts";
Deno.test("HubSpot : 1841 lignes, questionnaire et désinscription dans un doublon", () => {
  const csv =
    "E-mail;Prénom;Souhaitez-vous acheter ou louer ?;Désabonné de tous les e-mails\n" +
    Array.from({ length: 1840 }, (_, i) => `a${i}@example.ch;Anne;acheter;`)
      .join("\n") +
    "\na0@example.ch;Anne;;true";
  const parsed = parseContactCsv(csv);
  assertEquals(parsed.rows.length, 1840);
  assertEquals(parsed.duplicates, 1);
  assertEquals(parsed.rows[0].suppressed, true);
  assertEquals(
    parsed.rows[0].classification_input?.["Souhaitez-vous acheter ou louer ?"],
    "acheter",
  );
  assertEquals(
    parsed.rows[0].form_answers?.["Souhaitez-vous acheter ou louer ?"],
    "acheter",
  );
});
Deno.test("Classement PostgreSQL : intentions, ambiguïtés, synchronisation, exclusions, choix manuels", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role;
  create table newsletter_contacts(id uuid primary key default gen_random_uuid(),email text unique,first_name text,last_name text,kind text,categories text[] constraint newsletter_contacts_categories_check check(categories <@ array['renter','buyer','seller','landlord']),source text,excluded boolean default false,updated_at timestamptz);
  create table newsletter_forms(category text constraint newsletter_forms_category_check check(category in ('renter','buyer','seller','landlord')));
  create table leads(id uuid default gen_random_uuid(),email text,prenom text,nom text,type_recherche text,formulaire text,utm_campaign text);
  create table meta_leads(id uuid default gen_random_uuid(),email text,first_name text,last_name text,form_name text,campaign_name text,raw_answers jsonb,raw_meta_payload jsonb);`,
    );
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../supabase/migrations/20261003170000_newsletter_audiences.sql",
          import.meta.url,
        ),
      ),
    );
    const classify = async (input: unknown) =>
      (await db.query<{ c: { categories: string[]; outside: boolean } }>(
        "select newsletter_classify($1::jsonb) c",
        [JSON.stringify(input)],
      )).rows[0].c;
    assertEquals(await classify({ type_recherche: "Louer" }), {
      categories: ["renter"],
      outside: false,
    });
    assertEquals(
      await classify({
        form_name: "vendeurs vs Acheteurs atifs-copy",
        raw_meta_payload: { type_recherche: "Acheter" },
      }),
      { categories: ["buyer"], outside: false },
    );
    assertEquals(
      await classify({ form_name: "vendeurs vs Acheteurs atifs-copy" }),
      { categories: [], outside: false },
    );
    assertEquals(
      await classify({ "Quand souhaitez-vous vendre ?": "3 mois" }),
      { categories: ["seller"], outside: false },
    );
    assertEquals(
      await classify({
        "Quel est votre projet concernant ce bien ?": "pas_de_vente_prévue",
      }),
      { categories: [], outside: false },
    );
    assertEquals(
      await classify({
        "Quel type de commerce souhaitez-vous vendre ?": "restaurant",
      }),
      { categories: [], outside: true },
    );
    assertEquals(await classify({ "Type de nettoyage": "logement" }), {
      categories: ["cleaning"],
      outside: false,
    });
    assertEquals(await classify({ formulaire: "relouer-mon-appartement" }), {
      categories: ["landlord"],
      outside: false,
    });
    assertEquals(await classify({ formulaire: "RENOV IA" }), {
      categories: [],
      outside: true,
    });
    assertEquals(
      await classify({
        raw_meta_payload: {
          field_data: [{
            name: "Souhaitez-vous acheter ou louer ?",
            values: ["louer"],
          }],
        },
      }),
      { categories: ["renter"], outside: false },
    );
    const imp = async (rows: unknown[]) =>
      await db.query("select newsletter_import_auto($1::jsonb)", [
        JSON.stringify(rows),
      ]);
    await db.exec(
      "insert into leads(email,type_recherche) values('a@example.ch','location'),('invalid','achat'); insert into meta_leads(email,form_name) values('b@example.ch','RENOV IA')",
    );
    await imp([{
      email: "a@example.ch",
      suppressed: true,
      kind: "client",
      form_answers: { question: "answer" },
      classification_input: { type_recherche: "achat" },
    }]);
    await db.exec("select newsletter_sync_leads()");
    let rows = (await db.query(
      "select email,kind,categories,excluded from newsletter_contacts",
    )).rows;
    assertEquals(rows, [{
      email: "a@example.ch",
      kind: "client",
      categories: ["buyer", "renter"],
      excluded: true,
    }]);
    assertEquals(
      (await db.query<{ n: number }>(
        "select count(*)::int n from newsletter_contact_answers",
      )).rows[0].n,
      1,
    );
    await imp([{
      email: "outside@example.ch",
      suppressed: true,
      classification_input: { formulaire: "RENOV IA" },
    }]);
    await db.exec(
      "insert into leads(email,type_recherche) values('outside@example.ch','location')",
    );
    assertEquals(
      (await db.query<{ excluded: boolean }>(
        "select excluded from newsletter_contacts where email='outside@example.ch'",
      )).rows[0].excluded,
      true,
    );
    await db.exec(
      "delete from newsletter_contacts where email='outside@example.ch'; delete from leads where email='outside@example.ch'",
    );
    await db.exec(
      "update newsletter_contacts set categories=array['cleaning'],classification_manual=true; update leads set type_recherche='vente' where email='a@example.ch'; select newsletter_sync_leads()",
    );
    rows =
      (await db.query("select categories,excluded from newsletter_contacts"))
        .rows;
    assertEquals(rows, [{ categories: ["cleaning"], excluded: true }]);
    await db.query(
      "select newsletter_import_contacts($1::jsonb,'prospect',array['cleaning'],'csv')",
      [JSON.stringify([{ email: "c@example.ch" }])],
    );
    assertEquals(
      (await db.query<{ classification_manual: boolean }>(
        "select classification_manual from newsletter_contacts where email='c@example.ch'",
      )).rows[0].classification_manual,
      true,
    );
  } finally {
    await db.close();
  }
});
