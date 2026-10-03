-- Rental campaign mappings explicitly confirmed by the administrator.
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
  -- Explicit answers take precedence over campaign names, especially mixed seller/buyer forms.
  if cardinality(cats)=0 and not outside then
    if contexts ~ '(renov|construction|terrain|commerce|promotion)' then outside:=true;
    elsif contexts ~ 'nettoy' then cats:=array['cleaning'];
    elsif contexts ~ '(relouer|rdv proprietaire|gestion)' then cats:=case when contexts ~ 'rdv proprietaire' then array['seller'] else array['landlord'] end;
    elsif contexts ~ '(vendeur.*achet|achat/location|achat / location|acheter.*louer)' then null;
    elsif contexts ~ '(vente quali|vente rapide|vendeur|vendre)' then cats:=array['seller'];
    elsif contexts ~ '(acheteur|achteur|acheter|(^|[ :|])achat([ |]|$))' then cats:=array['buyer'];
    elsif contexts ~ '(logisorama|location|a louer|jessie|eb prmn vue prime|forms2|(^|[ :|])recherche([ |]|$))' then cats:=array['renter']; end if;
  end if;
  return jsonb_build_object('categories',array(select distinct unnest(cats) order by 1),'outside',outside and cardinality(cats)=0);
end $$;

