alter table public.newsletters add column preheader text not null default '' check (length(preheader)<=200);
create table public.newsletter_forms (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 category text not null check(category in ('landlord','seller','renter','buyer')),
 provider_domain_id bigint not null,
 provider_form_id bigint,
 provider_group_id bigint,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.newsletter_forms enable row level security;
create policy newsletter_forms_admin_read on public.newsletter_forms for select to authenticated using(public.has_role(auth.uid(),'admin'));
revoke all on public.newsletter_forms from anon,authenticated;
grant select on public.newsletter_forms to authenticated;
grant all on public.newsletter_forms to service_role;
