import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
Deno.test("Infomaniak SQL : secrets réservés, verrou, exclusions tardives et aucun renvoi incertain", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role;
      create schema auth; create schema cron; create schema private; create schema vault;
      create table vault.secrets(name text, decrypted_secret text, updated_at timestamptz default now());
      create view vault.decrypted_secrets as select * from vault.secrets;
      create function vault.create_secret(secret text, name text, description text) returns void language sql as $$insert into vault.secrets(name,decrypted_secret) values(name,secret)$$;

      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select null::uuid$$;
      create function public.has_role(uuid,text) returns boolean language sql as $$select false$$;
      create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
      create table public.email_unsubscribe_tokens(id uuid primary key default gen_random_uuid(),email text not null,token text not null unique);
      create table public.email_unsubscribes(id uuid primary key default gen_random_uuid(),email text not null,campaign_key text,source text);
      insert into auth.users values ('11111111-1111-4111-8111-111111111111');`,
    );
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../supabase/migrations/20261003110000_newsletters.sql",
          import.meta.url,
        ),
      ),
    );

    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../supabase/migrations/20261003140000_newsletter_infomaniak.sql",
          import.meta.url,
        ),
      ),
    );
    await db.exec(
      `insert into vault.secrets(name,decrypted_secret) values ('infomaniak_newsletter_api_key','test-key'),('infomaniak_newsletter_config','{"domain_id":123,"sender_email":"support@example.ch","sender_name":"Logisorama"}');`,
    );
    const one = async (sql: string, args: unknown[] = []) =>
      (await db.query<Record<string, unknown>>(sql, args)).rows[0];
    const a = await one(
      "insert into newsletter_contacts(email) values ('a@example.ch') returning id",
    );
    const b = await one(
      "insert into newsletter_contacts(email) values ('b@example.ch') returning id",
    );
    const c = await one(
      "insert into newsletters(name,subject,html,created_by) values ('Test','Objet','<p>Test</p>','11111111-1111-4111-8111-111111111111') returning id",
    );
    await db.query(
      "select newsletter_enqueue($1,1,$2::uuid[],now(),'ignored')",
      [c.id, [a.id, b.id]],
    );
    let lease = await one("select * from newsletter_infomaniak_claim()");
    assertEquals(lease.sender, "support@example.ch");
    assertEquals(lease.provider, "infomaniak");
    assertEquals(lease.provider_domain_id, 123);
    assertEquals(
      (await db.query("select * from newsletter_infomaniak_claim()")).rows
        .length,
      0,
    );
    await assertRejects(() => db.query("select * from newsletter_claim()"));
    await db.query(
      "update newsletters set provider_campaign_id=456 where id=$1",
      [c.id],
    );
    await db.exec(
      "insert into email_unsubscribes(email) values ('b@example.ch')",
    );
    await assertRejects(() =>
      db.query("select newsletter_infomaniak_begin_send($1,$2,$3::text[])", [
        c.id,
        lease.dispatch_token,
        ["a@example.ch", "b@example.ch"],
      ])
    );
    const eligible = await one(
      "select newsletter_infomaniak_recipients($1,$2) as recipients",
      [c.id, lease.dispatch_token],
    );
    assertEquals(
      (eligible.recipients as { email: string }[]).map((r) => r.email),
      ["a@example.ch"],
    );
    await db.query(
      "select newsletter_infomaniak_begin_send($1,$2,$3::text[])",
      [c.id, lease.dispatch_token, ["a@example.ch"]],
    );
    await db.exec(
      "update newsletters set dispatch_lease=now()-interval '1 second'",
    );
    assertEquals(
      (await db.query("select * from newsletter_infomaniak_claim()")).rows
        .length,
      0,
    );
    assertEquals(
      (await one("select dispatch_state from newsletters")).dispatch_state,
      "attention",
    );
    assertEquals(
      (await one(
        "select status from newsletter_deliveries where email='a@example.ch'",
      )).status,
      "attention",
    );
    // A successful provider response commits the campaign and deliveries atomically.
    await db.exec(
      "update newsletters set dispatch_state='preparing',dispatch_lease=null; update newsletter_deliveries set status='pending' where email='a@example.ch'",
    );
    lease = await one("select * from newsletter_infomaniak_claim()");
    await db.query(
      "select newsletter_infomaniak_begin_send($1,$2,$3::text[])",
      [c.id, lease.dispatch_token, ["a@example.ch"]],
    );
    await db.query("select newsletter_infomaniak_accept($1,$2)", [
      c.id,
      lease.dispatch_token,
    ]);
    assertEquals(
      (await one("select status from newsletters")).status,
      "completed",
    );
    assertEquals(
      (await one(
        "select status from newsletter_deliveries where email='a@example.ch'",
      )).status,
      "sent",
    );
    assertEquals(
      (await db.query("select * from newsletter_infomaniak_claim()")).rows
        .length,
      0,
    );
    await db.exec("set role authenticated");
    await assertRejects(() =>
      db.query("select newsletter_infomaniak_credentials()")
    );
    await assertRejects(() => db.query("select newsletter_infomaniak_claim()"));
    await assertRejects(() =>
      db.query("select * from newsletter_test_requests")
    );
    await db.exec("reset role; set role anon");
    await assertRejects(() =>
      db.query("select newsletter_infomaniak_credentials()")
    );
  } finally {
    await db.close();
  }
});
