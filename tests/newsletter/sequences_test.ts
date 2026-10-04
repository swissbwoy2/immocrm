import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
const uid = "11111111-1111-4111-8111-111111111111";
Deno.test("Séquences : nouvelles entrées, six étapes, doublons, conversion et exclusions tardives", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role;
 create schema auth; create schema cron; create schema private; create schema vault;
 create table auth.users(id uuid primary key); insert into auth.users values('${uid}');
 create function auth.uid() returns uuid language sql as $$select '${uid}'::uuid$$;
 create function has_role(uuid,text) returns boolean language sql as $$select true$$;
 create table vault.secrets(name text,decrypted_secret text,updated_at timestamptz default now());
 create view vault.decrypted_secrets as select * from vault.secrets;
 create function vault.create_secret(secret text,name text,description text) returns void language sql as $$insert into vault.secrets(name,decrypted_secret) values(name,secret)$$;
 create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
 create table email_unsubscribe_tokens(email text unique,token text unique);
 create table email_unsubscribes(email text,campaign_key text,source text);
 create table newsletter_contact_suppressions(email text);
 create table profiles(id uuid primary key,email text,actif boolean,notifications_email boolean);
 create table clients(user_id uuid,statut text,mandat_signature_data text,mandat_date_signature timestamptz,demande_mandat_id uuid);
 create table demandes_mandat(id uuid primary key,email text,signature_data text,cgv_acceptees boolean,statut text);
 create table mandates(email text,status text,signed_at timestamptz,signature_data text,activation_deposit_paid boolean);
 create table proprietaires(user_id uuid,statut text);
 create table meta_leads(id uuid primary key default gen_random_uuid(),email text,form_id text,campaign_id text,source text default 'meta_leadgen',lead_created_time_meta timestamptz default now(),raw_answers jsonb);
 create function newsletter_classify_meta(p jsonb) returns jsonb language sql as $$select '{"categories":["renter"],"outside":false}'::jsonb$$;`,
    );
    for (
      const f of [
        "20261003110000_newsletters.sql",
        "20261003140000_newsletter_infomaniak.sql",
        "20261003233000_newsletter_repeat_recipients.sql",
      ]
    ) {
      let sql = await Deno.readTextFile(
        new URL("../../supabase/migrations/" + f, import.meta.url),
      );
      if (f.includes("repeat_recipients")) {
        sql = sql.replace(
          "email_unsubscribe_tokens_email_key",
          "email_unsubscribe_tokens_email_key",
        );
      }
      await db.exec(sql);
    }
    await db.exec(
      `alter table newsletters add preheader text; alter table newsletter_contacts add classification_manual boolean default false;
 insert into vault.secrets(name,decrypted_secret) values('infomaniak_newsletter_api_key','test'),('infomaniak_newsletter_config','{"domain_id":123,"sender_email":"support@example.ch"}');`,
    );
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../supabase/migrations/20261004160000_newsletter_sequences.sql",
          import.meta.url,
        ),
      ),
    );
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../supabase/migrations/20261004170000_newsletter_campaign_welcome.sql",
          import.meta.url,
        ),
      ),
    );
    const one = async (sql: string, args: unknown[] = []) =>
      (await db.query<Record<string, any>>(sql, args)).rows[0];
    const steps = Array.from(
      { length: 6 },
      (_, i) => ({
        subject: `Étape ${i}`,
        html: "<p>" + ("Texte ".repeat(30)) + "</p>",
      }),
    );
    await db.query("select newsletter_sequence_configure($1,true,$2)", [
      "renter",
      JSON.stringify(steps),
    ]);
    await assertRejects(() =>
      db.query("select newsletter_sequence_configure($1,true,$2)", [
        "renter",
        "[]",
      ])
    );
    const lead = async (
      email: string,
      source = "meta_leadgen",
      old = false,
    ) => {
      const c = await one(
        `insert into newsletter_contacts(email) values($1) on conflict(email) do update set email=excluded.email returning id`,
        [email],
      );
      await db.query(
        `insert into meta_leads(email,form_id,source,lead_created_time_meta) values($1,'form-1',$2,now()-make_interval(days=>$3))`,
        [email, source, old ? 10 : 0],
      );
      return c.id;
    };
    const a = await lead("visit@example.ch");
    await lead("visit@example.ch"); // duplicate lead, same email
    await lead("old@example.ch", "meta_export_20261004");
    await lead("delayed@example.ch", "meta_leadgen", true);
    assertEquals(
      (await one("select count(*)::int n from newsletter_sequence_enrollments"))
        .n,
      1,
    );
    assertEquals(
      (await one("select count(*)::int n from newsletter_sequence_messages")).n,
      6,
    );
    // Active profile/client role without signature stays enrolled (candidate trial).
    await db.query(
      `insert into profiles values($1,'visit@example.ch',true,true)`,
      [uid],
    );
    await db.query(`insert into clients(user_id,statut) values($1,'actif')`, [
      uid,
    ]);
    assertEquals(
      (await one(
        "select newsletter_conversion_reason('visit@example.ch') reason",
      )).reason,
      null,
    );
    await db.query("select newsletter_sequence_tick()");
    await db.query("select newsletter_sequence_tick()");
    assertEquals((await one("select count(*)::int n from newsletters")).n, 1);
    let lease = await one("select * from newsletter_infomaniak_claim()");
    assertEquals(
      (await one("select newsletter_infomaniak_recipients($1,$2) r", [
        lease.id,
        lease.dispatch_token,
      ])).r.length,
      1,
    );
    // Signature alone with pending activation must still nurture.
    const dm = await one(
      `insert into demandes_mandat values(gen_random_uuid(),'visit@example.ch','signed',true,'nouvelle') returning id`,
    );
    await db.query(
      `update clients set mandat_signature_data='signed',mandat_date_signature=now(),demande_mandat_id=$1`,
      [dm.id],
    );
    assertEquals(
      (await one(
        "select newsletter_conversion_reason('visit@example.ch') reason",
      )).reason,
      null,
    );
    // Conversion between preparing the audience and final send prevents the handoff.
    await db.query(`update demandes_mandat set statut='active' where id=$1`, [
      dm.id,
    ]);
    await db.query(
      "update newsletters set provider_campaign_id=42 where id=$1",
      [lease.id],
    );
    await assertRejects(() =>
      db.query("select newsletter_infomaniak_begin_send($1,$2,$3)", [
        lease.id,
        lease.dispatch_token,
        ["visit@example.ch"],
      ])
    );
    assertEquals(
      (await one("select newsletter_infomaniak_recipients($1,$2) r", [
        lease.id,
        lease.dispatch_token,
      ])).r.length,
      0,
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select state from newsletter_sequence_enrollments where contact_id=$1",
        [a],
      )).state,
      "stopped",
    );
    // Manual account, not from nouveau-mandat: signed client contract + active service is enough.
    await db.query("update clients set demande_mandat_id=null");
    assertEquals(
      (await one(
        "select newsletter_conversion_reason('visit@example.ch') reason",
      )).reason,
      "Mandat signé et service activé",
    );
    const b = await lead("new@example.ch");
    await db.query("select newsletter_sequence_tick()");
    const e = await one(
      "select id from newsletter_sequence_enrollments where contact_id=$1",
      [b],
    );
    const msg = await one(
      "select newsletter_id from newsletter_sequence_messages where enrollment_id=$1 and step=0",
      [e.id],
    );
    await db.query(
      `update newsletter_deliveries set status='sent',sent_at=now()-interval '25 hours' where newsletter_id=$1`,
      [msg.newsletter_id],
    );
    await db.query(`update newsletters set status='completed' where id=$1`, [
      msg.newsletter_id,
    ]);
    await db.query(
      `update newsletter_sequence_messages set due_at=now()-interval '1 day' where enrollment_id=$1`,
      [e.id],
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages where enrollment_id=$1 and newsletter_id is not null",
        [e.id],
      )).n,
      2,
    );
    // Does not send all overdue steps together.
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages where enrollment_id=$1 and newsletter_id is not null",
        [e.id],
      )).n,
      2,
    );
    await db.query(
      "insert into email_unsubscribes(email) values('new@example.ch')",
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select state from newsletter_sequence_enrollments where id=$1",
        [e.id],
      )).state,
      "stopped",
    );
    await lead("test@example.ch");
    await db.query(
      "insert into newsletter_contact_suppressions values('test@example.ch')",
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_deliveries where email='test@example.ch'",
      )).n,
      0,
    );

    // An exact campaign match adds a welcome; reusing the form in another campaign does not.
    await db.query(
      `insert into newsletter_sequence_welcomes(campaign_id,name,subject,html,enabled,starts_at) values('druey','Druey 18','Votre visite Druey', $1,true,now()-interval '1 day')`,
      [steps[0].html],
    );
    const campaignLead = async (email: string, campaign: string) => {
      await db.query(
        `insert into newsletter_contacts(email) values($1) on conflict(email) do nothing`,
        [email],
      );
      await db.query(
        `insert into meta_leads(email,form_id,campaign_id) values($1,'shared-form',$2)`,
        [email, campaign],
      );
      return one(
        `select e.id from newsletter_sequence_enrollments e join newsletter_contacts c on c.id=e.contact_id where c.email=$1`,
        [email],
      );
    };
    const druey = await campaignLead("druey@example.ch", "druey");
    await campaignLead("druey@example.ch", "druey");
    const other = await campaignLead("other-campaign@example.ch", "other");
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages where enrollment_id=$1",
        [druey.id],
      )).n,
      7,
    );
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages where enrollment_id=$1",
        [other.id],
      )).n,
      6,
    );
    assertEquals(
      (await one(
        `select extract(epoch from (max(due_at) filter(where step=0)-max(due_at) filter(where step=-1)))::int seconds from newsletter_sequence_messages where enrollment_id=$1`,
        [druey.id],
      )).seconds,
      86400,
    );
    await db.query("select newsletter_sequence_tick()");
    const welcome = await one(
      `select n.id,n.subject from newsletter_sequence_messages m join newsletters n on n.id=m.newsletter_id where m.enrollment_id=$1 and m.step=-1`,
      [druey.id],
    );
    assertEquals(welcome.subject, "Votre visite Druey");
    // Even all overdue steps must wait until 24h AFTER actual provider acceptance of the invitation.
    await db.query(
      `update newsletter_sequence_messages set due_at=now()-interval '1 day' where enrollment_id=$1`,
      [druey.id],
    );
    await db.query(
      `update newsletter_deliveries set status='sent',sent_at=now() where newsletter_id=$1`,
      [welcome.id],
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages where enrollment_id=$1 and newsletter_id is not null",
        [druey.id],
      )).n,
      1,
    );
    await db.query(
      `update newsletter_deliveries set sent_at=now()-interval '25 hours' where newsletter_id=$1`,
      [welcome.id],
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages where enrollment_id=$1 and newsletter_id is not null",
        [druey.id],
      )).n,
      2,
    );
    assertEquals(
      (await one(
        `select n.subject from newsletter_sequence_messages m join newsletters n on n.id=m.newsletter_id where m.enrollment_id=$1 and m.step=0`,
        [druey.id],
      )).subject,
      "Étape 0",
    );
    await db.query(
      `insert into email_unsubscribes(email) values('druey@example.ch')`,
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select state from newsletter_sequence_enrollments where id=$1",
        [druey.id],
      )).state,
      "stopped",
    );

    // Unknown form is visible for review, not silently dropped or guessed.
    await db.exec(
      `create or replace function newsletter_classify_meta(p jsonb) returns jsonb language sql as $$select '{"categories":[],"outside":false}'::jsonb$$`,
    );
    await lead("unknown@example.ch");
    assertEquals(
      (await one(
        "select state from newsletter_sequence_enrollments e join newsletter_contacts c on c.id=e.contact_id where c.email='unknown@example.ch'",
      )).state,
      "review",
    );
    // Inbox inquiries use the same delivery proof, cadence and conversion guards.
    await db.exec(
      `create table received_emails(id uuid primary key default gen_random_uuid(),user_id uuid,message_id text,from_email text,to_email text,subject text,body_text text,body_html text,received_at timestamptz default now(),created_at timestamptz default now());
 create table imap_configurations(user_id uuid,imap_user text,is_active boolean);
 insert into imap_configurations values('${uid}','info@immo-rama.ch',true);
 create table annonces_publiques(id uuid primary key,reference text,titre text,adresse text,code_postal text,ville text,slug text,type_transaction text,statut text,date_expiration timestamptz);
 insert into annonces_publiques(id,titre,slug,type_transaction,statut) values('1338e6b7-2014-47d0-818a-35122b2a753b','Druey','druey','location','publie');
 create table newsletter_contact_answers(contact_id uuid,source text,answers jsonb,primary key(contact_id,source));`,
    );
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../supabase/migrations/20261004190000_portal_visit_autoreply.sql",
          import.meta.url,
        ),
      ),
    );
    await db.exec(
      `update portal_visit_automation set enabled=true; update newsletter_sequence_welcomes set enabled=true,html='<a href="https://logisorama.ch/annonces/druey">Visite</a>'; update newsletter_sequences set enabled=true;`,
    );
    const portal = async (email: string, reason = "") => {
      const message = await one(
        `insert into received_emails(user_id,from_email,to_email,subject) values('${uid}','interested@homegate.ch','info@immo-rama.ch','Nouvelle demande') returning id`,
      );
      const args = [
        message.id,
        "homegate.ch",
        email,
        "Test",
        "Prospect",
        "1338e6b7-2014-47d0-818a-35122b2a753b",
        reason,
        "Votre visite",
        '<a href="https://logisorama.ch/annonces/druey">Visite</a>',
      ];
      const result = await one(
        "select portal_visit_process($1,$2,$3,$4,$5,$6,$7,$8,$9) result",
        args,
      );
      return { args, result: result.result };
    };
    const inbox = await portal("inbox@example.ch");
    assertEquals(inbox.result.status, "queued");
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages m join newsletter_sequence_enrollments e on e.id=m.enrollment_id join newsletter_contacts c on c.id=e.contact_id where c.email='inbox@example.ch'",
      )).n,
      7,
    );
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_sequence_messages m join newsletter_sequence_enrollments e on e.id=m.enrollment_id join newsletter_contacts c on c.id=e.contact_id where c.email='inbox@example.ch' and m.newsletter_id is not null",
      )).n,
      1,
    );
    assertEquals((await portal("inbox@example.ch")).result.status, "skipped");
    assertEquals(
      (await one(
        "select portal_visit_process($1,$2,$3,$4,$5,$6,$7,$8,$9) result",
        inbox.args,
      )).result.id,
      inbox.result.id,
    );
    assertEquals(
      (await portal("ambiguous@example.ch", "Bien ambigu")).result.status,
      "review",
    );
    assertEquals(
      (await one(
        "select count(*)::int n from newsletter_contacts where email='ambiguous@example.ch'",
      )).n,
      0,
    );
    // Existing Meta enrollment receives the visit answer but never a second six-message sequence.
    await portal("fresh@example.ch");
    const conversion = await portal("excluded-inbox@example.ch");
    await db.exec(
      `update newsletter_contacts set excluded=true where email='excluded-inbox@example.ch'`,
    );
    await db.query("select newsletter_sequence_tick()");
    assertEquals(
      (await one(
        "select state from newsletter_sequence_enrollments e join newsletter_contacts c on c.id=e.contact_id where c.email='excluded-inbox@example.ch'",
      )).state,
      "stopped",
    );
    await db.exec(`update portal_visit_automation set enabled=false`);
    assertEquals(
      (await portal("disabled@example.ch")).result.status,
      "disabled",
    );
    await db.exec("set role authenticated");
    await assertRejects(() => db.query("select newsletter_sequence_tick()"));
    await db.exec(
      "reset role; create or replace function has_role(uuid,text) returns boolean language sql as $$select false$$",
    );
    await assertRejects(() =>
      db.query("select newsletter_sequence_configure($1,true,$2)", [
        "renter",
        JSON.stringify(steps),
      ])
    );
  } finally {
    await db.close();
  }
});
