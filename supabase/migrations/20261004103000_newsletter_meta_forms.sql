-- Each newly observed Meta form is discovered automatically. Unknown intent stays unclassified.
create table public.newsletter_meta_forms (
  form_id text primary key,
  page_id text,
  form_name text not null default '',
  category_override text check(category_override in ('landlord','seller','renter','buyer','cleaning','relocation','commerce_buyer','outside')),
  question_names jsonb not null default '[]',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.newsletter_meta_forms enable row level security;
revoke all on public.newsletter_meta_forms from anon,authenticated;
grant all on public.newsletter_meta_forms to service_role;

create function public.newsletter_classify_meta(p jsonb) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb; override text; k text; v text; answers jsonb:=coalesce(p->'raw_answers','{}'); name text:=newsletter_normalize(p->>'form_name');
begin
  select category_override into override from newsletter_meta_forms where form_id=p->>'form_id';
  if override is not null then
    return jsonb_build_object('categories',case when override='outside' then '[]'::jsonb else jsonb_build_array(override) end,'outside',override='outside');
  end if;
  -- Explicit mappings confirmed by the administrator remain authoritative.
  if name ~ '(new 2026 reloc|trouve ton locataire|one reloc)' then return '{"categories":["relocation"],"outside":false}'; end if;
  if jsonb_typeof(answers)='object' then
    for k,v in select key,newsletter_normalize(case when jsonb_typeof(value)='array' then (select string_agg(x,' ') from jsonb_array_elements_text(value) x) else value#>>'{}' end) from jsonb_each(answers) loop
      k:=newsletter_normalize(k);
      if k ~ '(type.*bien|projet)' and v ~ '(terrain|construction|renovation|promotion)' then return '{"categories":[],"outside":true}'; end if;
      if k ~ 'proprietaire.*bien locatif' and v ~ '^oui' then return '{"categories":["landlord"],"outside":false}'; end if;
      if k ~ 'proprietaire.*(vendre|estimer)' and v ~ '^oui' then return '{"categories":["seller"],"outside":false}'; end if;
    end loop;
  end if;
  result:=newsletter_classify(p);
  if result->'categories'='[]'::jsonb and not (result->>'outside')::boolean then
    if name ~ '^etes vous solvable' then return '{"categories":["renter"],"outside":false}'; end if;
  end if;
  return result;
end $$;
revoke all on function public.newsletter_classify_meta(jsonb) from public,anon,authenticated;
grant execute on function public.newsletter_classify_meta(jsonb) to service_role;

create or replace function public.newsletter_lead_changed() returns trigger
language plpgsql security definer set search_path=public as $$
declare r jsonb:=to_jsonb(new); input jsonb; classified jsonb; c text; contact uuid;
begin
  if tg_table_name='leads' then
    input:=jsonb_build_object('type_recherche',r->'type_recherche','formulaire',r->'formulaire','utm_campaign',r->'utm_campaign');
  else
    if coalesce(r->>'form_id','')<>'' then
      insert into newsletter_meta_forms(form_id,page_id,form_name,question_names)
      values(r->>'form_id',r->>'page_id',coalesce(r->>'form_name',''),case when jsonb_typeof(r->'raw_answers')='object' then (select coalesce(jsonb_agg(key),'[]') from jsonb_object_keys(r->'raw_answers') key) else '[]'::jsonb end)
      on conflict(form_id) do update set page_id=coalesce(excluded.page_id,newsletter_meta_forms.page_id),form_name=coalesce(nullif(excluded.form_name,''),newsletter_meta_forms.form_name),question_names=excluded.question_names,last_seen_at=now();
    end if;
    classified:=newsletter_classify_meta(r);
    if (classified->>'outside')::boolean then return new; end if;
    -- Import without replacing existing manual classifications; apply only recognized categories below.
    input:='{}';
  end if;
  perform newsletter_import_auto(jsonb_build_array(jsonb_build_object('email',r->'email','first_name',coalesce(r->'prenom',r->'first_name'),'last_name',coalesce(r->'nom',r->'last_name'),'classification_input',input,'form_answers',case when tg_table_name='meta_leads' then coalesce(r->'raw_answers','{}') || jsonb_build_object('Formulaire',r->'form_name','Identifiant du formulaire',r->'form_id') else '{}' end)),'prospect',case when tg_table_name='leads' then 'shortlist' else 'meta' end);
  if tg_table_name='meta_leads' then
    update newsletter_contacts set categories=array(select distinct unnest(categories || array(select jsonb_array_elements_text(classified->'categories'))) order by 1),updated_at=now()
    where email=lower(trim(r->>'email')) and not classification_manual;
  end if;
  return new;
end $$;

-- Manual resynchronisation must use the same form-aware classification as live arrivals.
create or replace function public.newsletter_sync_leads() returns jsonb language plpgsql security definer set search_path=public as $$
declare a jsonb; c jsonb; n integer;
begin
  select newsletter_import_auto(coalesce(jsonb_agg(jsonb_build_object('email',email,'first_name',prenom,'last_name',nom,'classification_input',jsonb_build_object('type_recherche',type_recherche,'formulaire',formulaire,'utm_campaign',utm_campaign))),'[]'::jsonb),'prospect','shortlist') into a from leads;
  update meta_leads set raw_answers=raw_answers;
  get diagnostics n=row_count;
  c:=newsletter_sync_visits();
  return jsonb_build_object('shortlist',a,'meta',jsonb_build_object('imported',n),'visites',c);
end $$;
