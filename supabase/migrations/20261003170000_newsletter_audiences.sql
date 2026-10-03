-- Project intent only: never infer an audience from financial or personal attributes.
alter table public.newsletter_contacts drop constraint newsletter_contacts_categories_check;
alter table public.newsletter_contacts add constraint newsletter_contacts_categories_check check(categories <@ array['landlord','seller','renter','buyer','cleaning']::text[]);
alter table public.newsletter_forms drop constraint newsletter_forms_category_check;
alter table public.newsletter_forms add constraint newsletter_forms_category_check check(category in ('landlord','seller','renter','buyer','cleaning'));
alter table public.newsletter_contacts add column classification_manual boolean not null default false;
-- Existing assignments are human choices and must survive automatic synchronization.
update public.newsletter_contacts set classification_manual=true;

create table public.newsletter_contact_suppressions(email text primary key);
alter table public.newsletter_contact_suppressions enable row level security;
revoke all on public.newsletter_contact_suppressions from public,anon,authenticated;
grant all on public.newsletter_contact_suppressions to service_role;
create table public.newsletter_contact_answers (
  contact_id uuid not null references public.newsletter_contacts(id) on delete cascade,
  source text not null, answers jsonb not null default '{}',
  primary key(contact_id,source)
);
alter table public.newsletter_contact_answers enable row level security;
revoke all on public.newsletter_contact_answers from public,anon,authenticated;
grant all on public.newsletter_contact_answers to service_role;

create function public.newsletter_normalize(v text) returns text language sql immutable set search_path='' as $$
select regexp_replace(translate(lower(coalesce(v,'')), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc'), '[_’''-]+', ' ', 'g')
$$;
create function public.newsletter_classify(p jsonb) returns jsonb language plpgsql immutable set search_path=public as $$
declare k text; v text; cats text[]='{}'; contexts text=''; outside boolean=false; item jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' then return jsonb_build_object('categories',cats,'outside',false); end if;
  -- Flatten the two Meta answer formats without treating arbitrary payload text as intent.
  for k,item in select * from jsonb_each(p) loop
    if k in ('raw_meta_payload','raw_answers') and jsonb_typeof(item)='object' then
      item:=newsletter_classify(item); cats:=cats || array(select jsonb_array_elements_text(item->'categories')); outside:=outside or (item->>'outside')::boolean;
    elsif k='field_data' and jsonb_typeof(item)='array' then
      for item in select * from jsonb_array_elements(item) loop
        if jsonb_typeof(item)<>'object' or coalesce(item->>'name','')='' then continue; end if;
        item:=newsletter_classify(jsonb_build_object(item->>'name',item->'values'));
        cats:=cats || array(select jsonb_array_elements_text(item->'categories')); outside:=outside or (item->>'outside')::boolean;
      end loop;
    else
      k:=newsletter_normalize(k);
      v:=newsletter_normalize(case when jsonb_typeof(item)='array' then (select string_agg(value,' ') from jsonb_array_elements_text(item)) else item#>>'{}' end);
      if v is null or trim(v)='' then continue; end if;
      if k ~ '(formulaire|form name|original formulaire|premiere conversion|conversion recente|campaign name|campaign key|utm campaign)' then
        contexts:=contexts || ' | ' || v;
      elsif k ~ '(type recherche|journey type|souhaitez|souhaites|souhaiter|vous souhaitez|quand.*proprietaire|type de nettoyage|objectif.*projet|projet concernant)' then
        if k ~ '(renov|construction|commerce|valoriser)' or v ~ '(renov|construction|mon terrain|projet.*terrain)' then outside:=true;
        elsif k ~ 'nettoyage' or v ~ 'nettoy' then cats:=array_append(cats,'cleaning');
        elsif k ~ '(gestion|gerer)' or k ~ 'louer votre logement' then cats:=array_append(cats,'landlord');
        elsif k ~ '(vendre|vente)' and v !~ '(pas de vente|ne.*vendre|^non$)' then
          if v ~ 'terrain' then outside:=true; else cats:=array_append(cats,'seller'); end if;
        elsif k ~ '(acheter|devenir proprietaire)' and k !~ '(louer|vendeur|vendre)' then cats:=array_append(cats,'buyer');
        elsif v ~ '^(achat|acheter|acheter un appartement|acheteur|buy)$' or v ~ '^acheter ' then cats:=array_append(cats,'buyer');
        elsif v ~ '^(location|louer|louer un appartement|locataire|rent)$' or v ~ '^louer un ' then cats:=array_append(cats,'renter');
        elsif v ~ '^(vente|vendre|vendeur)$' or (k ~ 'projet concernant' and v ~ '^vente ') then cats:=array_append(cats,'seller');
        elsif v ~ '(bailleur|relouer|mise en location|gestion locative)' then cats:=array_append(cats,'landlord'); end if;
      end if;
    end if;
  end loop;
  -- Explicit answers take precedence over campaign names, especially mixed seller/buyer forms.
  if cardinality(cats)=0 and not outside then
    if contexts ~ '(renov|construction|terrain|commerce|promotion)' then outside:=true;
    elsif contexts ~ 'nettoy' then cats:=array['cleaning'];
    elsif contexts ~ '(relouer|rdv proprietaire|gestion)' then cats:=case when contexts ~ 'rdv proprietaire' then array['seller'] else array['landlord'] end;
    elsif contexts ~ '(vendeur.*achet|achat/location|achat / location|acheter.*louer)' then null;
    elsif contexts ~ '(vente quali|vendeur|vendre)' then cats:=array['seller'];
    elsif contexts ~ '(acheteur|acheter)' then cats:=array['buyer'];
    elsif contexts ~ '(logisorama|location|a louer)' then cats:=array['renter']; end if;
  end if;
  return jsonb_build_object('categories',array(select distinct unnest(cats) order by 1),'outside',outside and cardinality(cats)=0);
end $$;

create function public.newsletter_import_auto(p_rows jsonb,p_kind text default 'prospect',p_source text default 'csv')
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; c jsonb; e text; n integer=0; skipped integer=0; invalid integer=0; cats text[];
begin
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 or p_kind not in ('client','prospect') then raise exception 'Import invalide'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    e:=lower(trim(r->>'email'));
    if e is null or length(e)>254 or e !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then invalid:=invalid+1; continue; end if;
    if coalesce((r->>'suppressed')::boolean,false) then
      insert into newsletter_contact_suppressions values(e) on conflict do nothing;
      update newsletter_contacts set excluded=true where email=e;
    end if;
    c:=newsletter_classify(coalesce(r->'classification_input','{}'::jsonb));
    if (c->>'outside')::boolean then skipped:=skipped+1; continue; end if;
    cats:=array(select jsonb_array_elements_text(c->'categories'));
    insert into newsletter_contacts(email,first_name,last_name,kind,categories,source,excluded)
    values(e,left(coalesce(r->>'first_name',''),150),left(coalesce(r->>'last_name',''),150),
      case when r->>'kind'='client' then 'client' else p_kind end,cats,p_source,exists(select 1 from newsletter_contact_suppressions where email=e))
    on conflict(email) do update set
      first_name=coalesce(nullif(excluded.first_name,''),newsletter_contacts.first_name),
      last_name=coalesce(nullif(excluded.last_name,''),newsletter_contacts.last_name),
      kind=case when newsletter_contacts.kind='client' then 'client' else excluded.kind end,
      categories=case when newsletter_contacts.classification_manual then newsletter_contacts.categories else array(select distinct unnest(newsletter_contacts.categories || excluded.categories) order by 1) end,
      excluded=newsletter_contacts.excluded or excluded.excluded,
      updated_at=now();
    if jsonb_typeof(r->'form_answers')='object' and r->'form_answers'<>'{}'::jsonb then
      insert into newsletter_contact_answers(contact_id,source,answers) select id,p_source,r->'form_answers' from newsletter_contacts where email=e
      on conflict(contact_id,source) do update set answers=newsletter_contact_answers.answers || excluded.answers;
    end if;
    n:=n+1;
  end loop;
  return jsonb_build_object('imported',n,'out_of_scope',skipped,'invalid',invalid);
end $$;
create function public.newsletter_sync_leads() returns jsonb language plpgsql security definer set search_path=public as $$
declare a jsonb; b jsonb;
begin
  select newsletter_import_auto(coalesce(jsonb_agg(jsonb_build_object('email',email,'first_name',prenom,'last_name',nom,'classification_input',jsonb_build_object('type_recherche',type_recherche,'formulaire',formulaire,'utm_campaign',utm_campaign))),'[]'::jsonb),'prospect','shortlist') into a from leads;
  select newsletter_import_auto(coalesce(jsonb_agg(jsonb_build_object('email',email,'first_name',first_name,'last_name',last_name,'classification_input',jsonb_build_object('form_name',form_name,'campaign_name',campaign_name,'raw_answers',raw_answers,'raw_meta_payload',raw_meta_payload))),'[]'::jsonb),'prospect','meta') into b from meta_leads;
  return jsonb_build_object('shortlist',a,'meta',b);
end $$;
create function public.newsletter_lead_changed() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb:=to_jsonb(new); input jsonb;
begin
  if tg_table_name='leads' then input:=jsonb_build_object('type_recherche',r->'type_recherche','formulaire',r->'formulaire','utm_campaign',r->'utm_campaign');
  else input:=jsonb_build_object('form_name',r->'form_name','campaign_name',r->'campaign_name','raw_answers',r->'raw_answers','raw_meta_payload',r->'raw_meta_payload'); end if;
  perform newsletter_import_auto(jsonb_build_array(jsonb_build_object('email',r->'email','first_name',coalesce(r->'prenom',r->'first_name'),'last_name',coalesce(r->'nom',r->'last_name'),'classification_input',input)),'prospect',case when tg_table_name='leads' then 'shortlist' else 'meta' end);
  return new;
end $$;
create trigger newsletter_shortlist_sync after insert or update of email,prenom,nom,type_recherche,formulaire,utm_campaign on public.leads for each row execute function public.newsletter_lead_changed();
create trigger newsletter_meta_sync after insert or update of email,first_name,last_name,form_name,campaign_name,raw_answers,raw_meta_payload on public.meta_leads for each row execute function public.newsletter_lead_changed();
revoke all on function public.newsletter_import_auto(jsonb,text,text),public.newsletter_sync_leads(),public.newsletter_lead_changed() from public,anon,authenticated;
grant execute on function public.newsletter_import_auto(jsonb,text,text),public.newsletter_sync_leads() to service_role;

create or replace function public.newsletter_import_contacts(p_rows jsonb, p_kind text, p_categories text[], p_source text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; r jsonb;
begin
  if p_kind not in ('client','prospect') or cardinality(p_categories) = 0 or not p_categories <@ array['landlord','seller','renter','buyer','cleaning']::text[] then
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

