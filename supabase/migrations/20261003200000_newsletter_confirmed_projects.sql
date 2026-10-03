alter table public.newsletter_contacts drop constraint newsletter_contacts_categories_check;
alter table public.newsletter_contacts add constraint newsletter_contacts_categories_check check(categories <@ array['landlord','seller','renter','buyer','cleaning','relocation','commerce_buyer']::text[]);
alter table public.newsletter_forms drop constraint newsletter_forms_category_check;
alter table public.newsletter_forms add constraint newsletter_forms_category_check check(category in ('landlord','seller','renter','buyer','cleaning','relocation','commerce_buyer'));
-- Campaign meanings explicitly confirmed by the administrator. Commercial buyers
-- have a separate audience from residential buyers and commercial sellers.
create or replace function public.newsletter_classify(p jsonb) returns jsonb language plpgsql immutable set search_path=public as $$
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
  if contexts ~ '(reloc|trouve ton locataire|resiliation|resil \+|guide pour ex loc)' then cats:=array_append(cats,'relocation'); end if;
  if contexts ~ 'augmentation de loyer' then cats:=array_append(cats,'landlord'); end if;
  if contexts ~ 'acompte[[:space:]]+300' then cats:=array_append(cats,'renter'); end if;
  if contexts ~ 'ti[[:space:]]+kreyol' then cats:=array_append(array_remove(cats,'buyer'),'commerce_buyer'); end if;
  -- Explicit answers take precedence over campaign names, especially mixed seller/buyer forms.
  if cardinality(cats)=0 and not outside then
    if contexts ~ '(renov|construction|terrain|commerce|promotion)' then outside:=true;
    elsif contexts ~ 'nettoy' then cats:=array['cleaning'];
    elsif contexts ~ '(relouer|rdv proprietaire|gestion)' then cats:=case when contexts ~ 'rdv proprietaire' then array['seller'] else array['landlord'] end;
    elsif contexts ~ '(vendeur.*achet|achat/location|achat / location|acheter.*louer)' then null;
    elsif contexts ~ '(vente quali|vente rapide|vendeur|vendre)' then cats:=array['seller'];
    elsif contexts ~ '(reloc|trouve ton locataire|resiliation|resil \+|guide pour ex loc)' then cats:=array['relocation'];
    elsif contexts ~ '(acheteur|achteur|acheter|(^|[ :|])achat([ |]|$))' then cats:=array['buyer'];
    elsif contexts ~ '(logisorama|location|a louer|jessie|eb prmn vue prime|forms2|(^|[ :|])recherche([ |]|$))' then cats:=array['renter']; end if;
  end if;
  return jsonb_build_object('categories',array(select distinct unnest(cats) order by 1),'outside',outside and cardinality(cats)=0);
end $$;

create or replace function public.newsletter_import_contacts(p_rows jsonb, p_kind text, p_categories text[], p_source text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; r jsonb;
begin
  if p_kind not in ('client','prospect') or cardinality(p_categories) = 0 or not p_categories <@ array['landlord','seller','renter','buyer','cleaning','relocation','commerce_buyer']::text[] then
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

