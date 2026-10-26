\set ON_ERROR_STOP on
-- À lancer dans une base PostgreSQL jetable : bash tests/sql/run-postulation-jobs.sh
create role anon; create role authenticated; create role service_role;
create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid', true), '')::uuid$$;
create type public.app_role as enum ('admin','agent','client');
create table public.user_roles(user_id uuid, role public.app_role);
create function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer as $$select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)$$;
create table public.clients(id uuid primary key default gen_random_uuid(), user_id uuid, agent_id uuid, created_at timestamptz default now());
create table public.agents(id uuid primary key, user_id uuid);
create function public.is_agent_of_client_record(_client_id uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.clients c join public.agents a on a.id=c.agent_id where c.id=_client_id and a.user_id=auth.uid())$$;
create table public.offres(id uuid primary key default gen_random_uuid(), client_id uuid, statut text, postulation_demandee_at timestamptz);
create table public.candidatures(id uuid primary key default gen_random_uuid(), offre_id uuid, client_id uuid, statut text, message_client text, dossier_complet boolean, created_at timestamptz default now(),
  constraint candidatures_statut_check check (statut in ('en_attente')));
create table public.visites(id uuid primary key default gen_random_uuid(), offre_id uuid, client_id uuid, statut text, date_visite timestamptz, compte_rendu jsonb, compte_rendu_at timestamptz, medias jsonb);
create function private.edge_service_headers() returns jsonb language sql as $$select '{}'::jsonb$$;
grant usage on schema public, auth to authenticated, service_role;
grant select on public.clients, public.agents, public.user_roles to authenticated;
\ir :migration

do $$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); ua uuid := gen_random_uuid(); ux uuid := gen_random_uuid();
  c1 uuid; c2 uuid; ag uuid := gen_random_uuid();
  o_ok uuid; o_novisit uuid; o_other uuid;
  r1 jsonb; r2 jsonb; n int; s text; ok boolean;
begin
  insert into public.agents values (ag, ua);
  insert into public.clients(user_id, agent_id) values (u1, ag) returning id into c1;
  insert into public.clients(user_id) values (u2) returning id into c2;
  insert into public.offres(client_id, statut) values (c1, 'envoyee') returning id into o_ok;
  insert into public.offres(client_id, statut) values (c1, 'envoyee') returning id into o_novisit;
  insert into public.offres(client_id, statut) values (c2, 'visite_effectuee') returning id into o_other;
  insert into public.visites(offre_id, client_id, statut, date_visite) values (o_ok, c1, 'effectuee', now() - interval '1 day');
  insert into public.visites(offre_id, client_id, statut, date_visite) values (o_novisit, c1, 'planifiee', now() + interval '2 days');

  -- Idempotence : deux clics -> une candidature, un job.
  perform set_config('test.uid', u1::text, true);
  r1 := public.request_postulation(o_ok);
  r2 := public.request_postulation(o_ok);
  assert (r1->>'already_requested')::boolean = false, 'premier appel';
  assert (r2->>'already_requested')::boolean = true, 'second appel idempotent';
  assert r1->>'job_id' = r2->>'job_id', 'même job';
  select count(*) into n from public.candidatures where offre_id = o_ok; assert n = 1, 'une seule candidature';
  select statut into s from public.candidatures where offre_id = o_ok; assert s = 'demande_postulation', 'statut candidature';
  select count(*) into n from public.postulation_jobs where offre_id = o_ok and status = 'queued'; assert n = 1, 'un job queued';
  select statut into s from public.offres where id = o_ok; assert s = 'souhaite_postuler', 'offre souhaite_postuler';

  -- Offre d'un autre client : refus.
  ok := false;
  begin perform public.request_postulation(o_other); exception when sqlstate '42501' then ok := true; end;
  assert ok, 'offre d''un autre client refusée';

  -- Sans visite effectuée : refus, rien de créé.
  ok := false;
  begin perform public.request_postulation(o_novisit); exception when sqlstate 'P0001' then ok := true; end;
  assert ok, 'refus sans visite';
  select count(*) into n from public.candidatures where offre_id = o_novisit; assert n = 0, 'aucune candidature sans visite';

  -- Sans authentification : refus.
  perform set_config('test.uid', '', true);
  ok := false;
  begin perform public.request_postulation(o_ok); exception when sqlstate '28000' then ok := true; end;
  assert ok, 'refus anonyme';

  -- Reprise après erreur : claim -> échec -> nouveau clic remet en file.
  select count(*) into n from public.claim_postulation_jobs((r1->>'job_id')::uuid, 1); assert n = 1, 'claim';
  select count(*) into n from public.claim_postulation_jobs((r1->>'job_id')::uuid, 1); assert n = 0, 'pas de double claim';
  update public.postulation_jobs set status = 'failed', last_error = 'x', next_attempt_at = now() + interval '1 hour' where id = (r1->>'job_id')::uuid;
  select count(*) into n from public.claim_postulation_jobs(null, 5); assert n = 0, 'backoff respecté';
  update public.postulation_jobs set next_attempt_at = now() - interval '1 second' where id = (r1->>'job_id')::uuid;
  select count(*) into n from public.claim_postulation_jobs(null, 5); assert n = 1, 'reprise échue';
  update public.postulation_jobs set status = 'failed', attempt_count = 5 where id = (r1->>'job_id')::uuid;
  select count(*) into n from public.claim_postulation_jobs(null, 5); assert n = 0, 'max attempts';
  perform set_config('test.uid', u1::text, true);
  r2 := public.request_postulation(o_ok);
  select status, attempt_count into s, n from public.postulation_jobs where id = (r1->>'job_id')::uuid;
  assert s = 'queued' and n = 0, 'job réactivé par nouveau clic';

  perform set_config('test.ids', u1 || ',' || u2 || ',' || ua || ',' || ux, false);
end $$;

-- Droits : exécution et RLS.
select has_function_privilege('anon', 'public.request_postulation(uuid)', 'execute') = false as anon_no_exec \gset
\if :anon_no_exec \else \echo 'anon peut exécuter request_postulation' \q \endif
select has_function_privilege('authenticated', 'public.claim_postulation_jobs(uuid,integer)', 'execute') = false as auth_no_claim \gset
\if :auth_no_claim \else \echo 'authenticated peut revendiquer' \q \endif

set role authenticated;
do $$
declare ids text[] := string_to_array(current_setting('test.ids'), ','); n int; ok boolean;
begin
  perform set_config('test.uid', ids[1], true);
  select count(*) into n from public.postulation_jobs; assert n = 1, 'client voit son job';
  ok := false;
  begin insert into public.postulation_jobs(offre_id, client_id, idempotency_key) select offre_id, client_id, 'x' from public.postulation_jobs; exception when insufficient_privilege then ok := true; end;
  assert ok, 'insertion directe interdite';
  update public.postulation_jobs set status = 'completed'; get diagnostics n = row_count; assert n = 0, 'client ne peut pas modifier';

  perform set_config('test.uid', ids[2], true);
  select count(*) into n from public.postulation_jobs; assert n = 0, 'autre client ne voit rien';

  perform set_config('test.uid', ids[3], true);
  select count(*) into n from public.postulation_jobs; assert n = 1, 'agent assigné lit';
  update public.postulation_jobs set status = 'completed'; get diagnostics n = row_count; assert n = 1, 'agent assigné met à jour';

  perform set_config('test.uid', ids[4], true);
  select count(*) into n from public.postulation_jobs; assert n = 0, 'agent non assigné ne voit rien';
end $$;
reset role;
\echo 'postulation-jobs: OK'
