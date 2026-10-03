import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
Deno.test(
  "PostgreSQL : import, opt-outs, RLS, envoi atomique et reprise sans doublon",
  async () => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role;
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
      insert into auth.users values ('11111111-1111-4111-8111-111111111111');`);
      await db.exec(
        await Deno.readTextFile(
          new URL(
            "../../supabase/migrations/20261003110000_newsletters.sql",
            import.meta.url,
          ),
        ),
      );
      const one = async (sql: string, args: unknown[] = []) =>
        (await db.query<Record<string, unknown>>(sql, args)).rows[0];
      await db.query(
        "select newsletter_import_contacts($1::jsonb,'client',array['renter'],'application')",
        [
          JSON.stringify([
            { email: "a@example.ch", first_name: "Anne" },
            { email: "b@example.ch" },
            { email: "excluded@example.ch" },
            { email: "later@example.ch" },
          ]),
        ],
      );
      await db.query(
        "select newsletter_import_contacts($1::jsonb,'prospect',array['buyer'],'csv')",
        [JSON.stringify([{ email: "a@example.ch" }])],
      );
      const a = await one(
        "select * from newsletter_contacts where email='a@example.ch'",
      );
      assertEquals(a.kind, "client");
      assertEquals(a.first_name, "Anne");
      assertEquals((a.categories as string[]).sort(), ["buyer", "renter"]);
      await db.exec(
        "update newsletter_contacts set excluded=true where email='excluded@example.ch'; insert into email_unsubscribes(email,source) values ('b@example.ch','test');",
      );
      const c = await one(
        "insert into newsletters(name,subject,html,created_by) values ('Test','Objet','<p>Bonjour</p>','11111111-1111-4111-8111-111111111111') returning id",
      );
      const ids = (
        await db.query<{ id: string }>(
          "select id from newsletter_contacts where email<>'later@example.ch'",
        )
      ).rows.map((x) => x.id);
      assertEquals(
        (
          await one(
            "select newsletter_enqueue($1,1,$2::uuid[],now(),'Logisorama <info@immo-rama.ch>') as n",
            [c.id, ids],
          )
        ).n,
        1,
      );
      await assertRejects(() =>
        db.query("select newsletter_enqueue($1,1,$2::uuid[],now(),'x')", [
          c.id,
          ids,
        ]),
      );
      assertEquals(
        (await one("select count(*)::integer as n from newsletter_deliveries"))
          .n,
        1,
      );
      assertEquals(
        (
          await one(
            "select count(*)::integer as n from email_unsubscribe_tokens",
          )
        ).n,
        1,
      );
      const claim = await one("select * from newsletter_claim()");
      assertEquals(claim.email, "a@example.ch");
      assertEquals(
        (await db.query("select * from newsletter_claim()")).rows.length,
        0,
      );
      await db.exec(
        "update newsletter_deliveries set lease_until=now()-interval '1 second'",
      );
      const retry = await one("select * from newsletter_claim()");
      assertEquals(retry.id, claim.id);
      assertEquals(retry.unsubscribe_token, claim.unsubscribe_token);
      assertEquals(retry.attempts, 2);
      await db.exec(
        "update newsletter_deliveries set first_attempt_at=now()-interval '24 hours',lease_until=now()-interval '1 second'",
      );
      assertEquals(
        (await db.query("select * from newsletter_claim()")).rows.length,
        0,
      );
      assertEquals(
        (await one("select status from newsletter_deliveries")).status,
        "attention",
      );
      await db.exec("select newsletter_finish()");
      assertEquals(
        (await one("select status from newsletters")).status,
        "completed",
      );
      const future = await one(
        "insert into newsletters(name,subject,html,created_by) values ('Future','Objet','<p>Bonjour</p>','11111111-1111-4111-8111-111111111111') returning id",
      );
      await db.query(
        "select newsletter_enqueue($1,1,$2::uuid[],now()+interval '1 day','x')",
        [future.id, [a.id]],
      );
      assertEquals(
        (await db.query("select * from newsletter_claim()")).rows.length,
        0,
      );
      await db.query("select newsletter_cancel($1)", [future.id]);
      assertEquals(
        (await one("select status from newsletters where id=$1", [future.id]))
          .status,
        "cancelled",
      );
      await db.exec(
        "select newsletter_record_optouts(array['A@example.ch']); select newsletter_record_optouts(array['a@example.ch']);",
      );
      assertEquals(
        (
          await one(
            "select count(*)::integer as n from email_unsubscribes where email='a@example.ch'",
          )
        ).n,
        1,
      );
      await db.exec(
        "create or replace function private.newsletter_dispatch_headers() returns jsonb language plpgsql as $$begin raise exception 'missing'; end$$;",
      );
      const blocked = await one(
        "insert into newsletters(name,subject,html,created_by) values ('Blocked','Objet','<p>Bonjour</p>','11111111-1111-4111-8111-111111111111') returning id",
      );
      await assertRejects(() =>
        db.query("select newsletter_enqueue($1,1,$2::uuid[],now(),'x')", [
          blocked.id,
          [a.id],
        ]),
      );
      assertEquals(
        (await one("select status from newsletters where id=$1", [blocked.id]))
          .status,
        "draft",
      );
      assertEquals(
        (
          await one(
            "select count(*)::integer as n from newsletter_deliveries where newsletter_id=$1",
            [blocked.id],
          )
        ).n,
        0,
      );
      assertEquals(
        (await one("select newsletter_verify_dispatch('invalid') as allowed"))
          .allowed,
        false,
      );
      assertEquals(
        (
          await one(
            "select newsletter_verify_dispatch((select decrypted_secret from vault.secrets limit 1)) as allowed",
          )
        ).allowed,
        true,
      );
      await db.exec("set role authenticated");
      assertEquals(
        (await db.query("select * from newsletter_contacts")).rows.length,
        0,
      );
      await assertRejects(() => db.query("select * from newsletter_claim()"));
      await assertRejects(() =>
        db.query("select newsletter_verify_dispatch('invalid')"),
      );
      await assertRejects(() =>
        db.query(
          "insert into newsletter_contacts(email) values ('hack@example.ch')",
        ),
      );
      await db.exec("reset role");
      await db.exec(
        "create or replace function public.has_role(uuid,text) returns boolean language sql as $$select true$$;set role authenticated",
      );
      assertEquals(
        (await db.query("select * from newsletter_contacts")).rows.length,
        4,
      );
      await assertRejects(() =>
        db.query("select newsletter_cancel($1)", [future.id]),
      );
      await db.exec("reset role");
    } finally {
      await db.close();
    }
  },
);
