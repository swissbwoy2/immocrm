-- Visit registrations are an additional audience, independent of project classification.
alter table public.newsletter_contacts drop constraint newsletter_contacts_categories_check;
alter table public.newsletter_contacts add constraint newsletter_contacts_categories_check check(categories <@ array['landlord','seller','renter','buyer','cleaning','relocation','commerce_buyer','visit']::text[]);
alter table public.newsletter_forms drop constraint newsletter_forms_category_check;
alter table public.newsletter_forms add constraint newsletter_forms_category_check check(category in ('landlord','seller','renter','buyer','cleaning','relocation','commerce_buyer','visit'));

create or replace function public.newsletter_import_contacts(p_rows jsonb, p_kind text, p_categories text[], p_source text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; r jsonb;
begin
  if p_kind not in ('client','prospect') or cardinality(p_categories) = 0 or not p_categories <@ array['landlord','seller','renter','buyer','cleaning','relocation','commerce_buyer','visit']::text[] then
    raise exception 'Catégorie ou type invalide';
  end if;
  insert into newsletter_contact_suppressions(email)
  select lower(trim(x.email)) from jsonb_to_recordset(p_rows) as x(email text,suppressed boolean) where x.suppressed on conflict do nothing;
  insert into newsletter_contacts(email, first_name, last_name, kind, categories, source, classification_manual, excluded)
  select lower(trim(x.email)), coalesce(x.first_name,''), coalesce(x.last_name,''), p_kind, p_categories, p_source, true, exists(select 1 from newsletter_contact_suppressions where email=lower(trim(x.email)))
  from jsonb_to_recordset(p_rows) as x(email text, first_name text, last_name text, suppressed boolean)
  on conflict (email) do update set
    first_name = coalesce(nullif(excluded.first_name,''), newsletter_contacts.first_name),
    last_name = coalesce(nullif(excluded.last_name,''), newsletter_contacts.last_name),
    kind = case when newsletter_contacts.kind = 'client' then 'client' else excluded.kind end,
    categories = array(select distinct unnest(newsletter_contacts.categories || excluded.categories)),
    excluded = newsletter_contacts.excluded or excluded.excluded,
    classification_manual = true,
    updated_at = now();
  get diagnostics n = row_count;
  for r in select * from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(r->'form_answers')='object' and r->'form_answers'<>'{}'::jsonb then
      insert into newsletter_contact_answers(contact_id,source,answers) select id,p_source,r->'form_answers' from newsletter_contacts where email=lower(trim(r->>'email'))
      on conflict(contact_id,source) do update set answers=newsletter_contact_answers.answers || excluded.answers;
    end if;
  end loop;
  return n;
end $$;


-- Match the same registrations shown in Admin > Visites. Past/inactive slots
-- still represent contact provenance; they do not mean current attendance.
create function public.newsletter_import_visit(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare r record; e text; contact_id uuid; blocked boolean;
begin
  select c.*, s.date_heure, a.titre as annonce_titre into r
  from candidatures_location c join annonce_creneaux s on s.id=c.creneau_id
  left join annonces_publiques a on a.id=s.annonce_id where c.id=p_id;
  if not found then return false; end if;
  e:=lower(trim(r.email));
  if e is null or length(e)>254 or e !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then return false; end if;
  if exists(select 1 from profiles p where (p.id=r.user_id or lower(trim(p.email))=e) and p.anonymise_at is not null)
     or exists(select 1 from clients c where c.user_id=r.user_id and c.anonymise_at is not null) then return false; end if;
  -- New visitor accounts intentionally have actif=false; this is not an opt-out.
  blocked:=exists(select 1 from newsletter_contact_suppressions s where s.email=e)
    or exists(select 1 from email_unsubscribes u where lower(trim(u.email))=e)
    or exists(select 1 from profiles p where (p.id=r.user_id or lower(trim(p.email))=e) and p.notifications_email=false);
  insert into newsletter_contacts(email,first_name,last_name,kind,categories,source,excluded)
  values(e,left(coalesce(r.prenom,''),150),left(coalesce(r.nom,''),150),
    case when exists(select 1 from clients c where c.user_id=r.user_id and c.anonymise_at is null) then 'client' else 'prospect' end,
    array['renter','visit'],'visites',blocked)
  on conflict(email) do update set
    first_name=coalesce(nullif(newsletter_contacts.first_name,''),excluded.first_name),
    last_name=coalesce(nullif(newsletter_contacts.last_name,''),excluded.last_name),
    kind=case when newsletter_contacts.kind='client' then 'client' else excluded.kind end,
    categories=array(select distinct unnest(newsletter_contacts.categories ||
      case when newsletter_contacts.classification_manual then array['visit'] else array['renter','visit'] end) order by 1),
    excluded=newsletter_contacts.excluded or excluded.excluded,
    updated_at=now()
  returning id into contact_id;
  -- Store visit context only, never the candidate's financial dossier.
  insert into newsletter_contact_answers(contact_id,source,answers)
  values(contact_id,'visites',jsonb_build_object(p_id::text,jsonb_build_object(
    'annonce',r.annonce_titre,'date_visite',r.date_heure,'statut',r.statut)))
  on conflict on constraint newsletter_contact_answers_pkey do update set
    answers=newsletter_contact_answers.answers || excluded.answers;
  return true;
end $$;

create function public.newsletter_sync_visits() returns jsonb
language plpgsql security definer set search_path=public as $$
declare r record; imported integer=0; skipped integer=0;
begin
  for r in select c.id from candidatures_location c join annonce_creneaux s on s.id=c.creneau_id order by c.created_at,c.id loop
    if newsletter_import_visit(r.id) then imported:=imported+1; else skipped:=skipped+1; end if;
  end loop;
  return jsonb_build_object('registrations',imported,'skipped',skipped);
end $$;
create function public.newsletter_visit_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform newsletter_import_visit(new.id);
  return new;
end $$;
create trigger newsletter_visit_sync after insert or update of email,prenom,nom,creneau_id,user_id,statut
on public.candidatures_location for each row execute function public.newsletter_visit_changed();

create or replace function public.newsletter_sync_leads() returns jsonb language plpgsql security definer set search_path=public as $$
declare a jsonb; b jsonb; c jsonb;
begin
  select newsletter_import_auto(coalesce(jsonb_agg(jsonb_build_object('email',email,'first_name',prenom,'last_name',nom,'classification_input',jsonb_build_object('type_recherche',type_recherche,'formulaire',formulaire,'utm_campaign',utm_campaign))),'[]'::jsonb),'prospect','shortlist') into a from leads;
  select newsletter_import_auto(coalesce(jsonb_agg(jsonb_build_object('email',email,'first_name',first_name,'last_name',last_name,'classification_input',jsonb_build_object('form_name',form_name,'campaign_name',campaign_name,'raw_answers',raw_answers,'raw_meta_payload',raw_meta_payload))),'[]'::jsonb),'prospect','meta') into b from meta_leads;
  c:=newsletter_sync_visits();
  return jsonb_build_object('shortlist',a,'meta',b,'visites',c);
end $$;
revoke all on function public.newsletter_import_visit(uuid),public.newsletter_sync_visits(),public.newsletter_visit_changed() from public,anon,authenticated;
grant execute on function public.newsletter_sync_visits() to service_role;
