CREATE OR REPLACE FUNCTION public.protect_candidature_location_staff_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.pipeline_rpc', true) = 'on' THEN RETURN NEW; END IF;
  IF auth.uid() IS NOT NULL AND public.is_candidat(auth.uid())
     AND NOT public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'agent') THEN
    NEW.statut := OLD.statut; NEW.score_dossier := OLD.score_dossier; NEW.note_agent := OLD.note_agent;
    NEW.motif_refus := OLD.motif_refus; NEW.lot_id := OLD.lot_id; NEW.date_visite := OLD.date_visite;
    NEW.user_id := COALESCE(OLD.user_id, auth.uid());
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.candidat_confirmer_visite(p_candidature_id uuid, p_a_visite boolean)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); r record;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  select * into r from candidatures_location where id = p_candidature_id and user_id = v_uid;
  if not found then raise exception 'Candidature introuvable'; end if;
  if coalesce(r.annulee,false) then raise exception 'Cette visite a été annulée'; end if;
  if r.date_visite is null or r.date_visite > now() then raise exception 'La visite n''a pas encore eu lieu'; end if;
  perform set_config('app.pipeline_rpc','on',true);
  update candidatures_location
     set visite_confirmee = p_a_visite,
         visite_confirmee_at = now(),
         statut = case when p_a_visite and statut in ('en_attente','visite_planifiee') then 'visite_effectuee' else statut end,
         updated_at = now()
   where id = p_candidature_id;
  perform set_config('app.pipeline_rpc','off',true);
  return p_a_visite;
end $function$;

CREATE OR REPLACE FUNCTION public.candidat_soumettre_demande(p_candidature_id uuid, p_data jsonb, p_confirme_pret_louer boolean DEFAULT false, p_autorise_references boolean DEFAULT false)
 RETURNS timestamp with time zone LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); r record; v_ts timestamptz := now(); v_nom text; v_adr text; v_conv uuid;
        c_imm constant uuid := '4c2ee841-a48b-4d7d-8ed6-3eac9ea124e8';
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  select * into r from candidatures_location where id = p_candidature_id and user_id = v_uid;
  if not found then raise exception 'Candidature introuvable'; end if;
  if coalesce(r.visite_confirmee,false) <> true or coalesce(r.souhaite_deposer,false) <> true then
    raise exception 'Étapes préalables non remplies';
  end if;
  if p_confirme_pret_louer <> true or p_autorise_references <> true then
    raise exception 'Les deux confirmations sont requises';
  end if;
  perform set_config('app.pipeline_rpc','on',true);
  update candidatures_location set
     demande_data = coalesce(p_data,'{}'::jsonb),
     prenom = coalesce(nullif(p_data->'locataire_principal'->>'prenom',''), nullif(p_data->>'prenom',''), prenom),
     nom = coalesce(nullif(p_data->'locataire_principal'->>'nom',''), nullif(p_data->>'nom',''), nom),
     civilite = coalesce(nullif(p_data->'locataire_principal'->>'etat_civil',''), civilite),
     telephone = coalesce(nullif(p_data->'locataire_principal'->>'portable',''), telephone),
     email = coalesce(nullif(p_data->'locataire_principal'->>'email',''), email),
     adresse_actuelle = coalesce(nullif(p_data->'locataire_principal'->>'adresse',''), adresse_actuelle),
     nationalite = coalesce(nullif(p_data->'locataire_principal'->>'nationalite',''), nationalite),
     type_permis = coalesce(nullif(p_data->'locataire_principal'->>'permis',''), type_permis),
     profession = coalesce(nullif(p_data->'locataire_principal'->>'profession',''), profession),
     employeur = coalesce(nullif(p_data->'locataire_principal'->>'employeur',''), employeur),
     type_contrat = coalesce(nullif(p_data->'locataire_principal'->>'contrat',''), type_contrat),
     confirme_pret_louer = true, autorise_references = true, confirme_at = v_ts,
     statut = 'candidature_deposee', date_depot = coalesce(date_depot, v_ts), updated_at = now()
   where id = p_candidature_id;
  perform set_config('app.pipeline_rpc','off',true);

  v_nom := trim(coalesce(r.prenom,'')||' '||coalesce(r.nom,''));
  select trim(coalesce(a.adresse,'')||', '||coalesce(a.ville,'')) into v_adr from annonces_publiques a where a.id = r.annonce_id;
  insert into public.notifications (user_id, type, title, message, link, metadata)
  select ur.user_id, 'candidature_location', 'Nouvelle demande de location',
         coalesce(nullif(v_nom,''),'Un candidat')||' — '||coalesce(v_adr,'annonce'),
         '/admin/candidatures-relocation', jsonb_build_object('candidature_id', p_candidature_id)
  from public.user_roles ur where ur.role in ('admin','agent');

  if r.annonce_id is not null then
    v_conv := public._get_or_create_annonce_conv(v_uid, r.annonce_id);
    perform public._post_msg(v_conv, 'admin', c_imm,
      'Merci ! Nous avons bien reçu votre demande de candidature et nous vous recontacterons.');
  end if;
  return v_ts;
end $function$;

DROP FUNCTION IF EXISTS public.candidat_soumettre_demande(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.candidat_signer_document(p_document_id uuid, p_signature text, p_lieu text DEFAULT NULL::text)
 RETURNS timestamp with time zone LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); d record; v_ts timestamptz := now();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  select cd.*, cl.user_id as owner_id into d
    from candidature_documents cd join candidatures_location cl on cl.id = cd.candidature_id
   where cd.id = p_document_id;
  if not found or d.owner_id <> v_uid then raise exception 'Document introuvable'; end if;
  if d.statut = 'signe' then raise exception 'Document déjà signé'; end if;
  if p_signature is null or length(p_signature) < 20 then raise exception 'Signature invalide'; end if;
  update candidature_documents
     set signature_data = p_signature, signature_lieu = p_lieu,
         signe_at = v_ts, signe_par = v_uid, statut = 'signe', updated_at = now()
   where id = p_document_id;
  if d.template_code = 'bail_loyer' then
    perform set_config('app.pipeline_rpc','on',true);
    update candidatures_location set date_signature = v_ts, statut = 'bail_signe', updated_at = now()
     where id = d.candidature_id;
    perform set_config('app.pipeline_rpc','off',true);
  end if;
  return v_ts;
end $function$;

ALTER TABLE public.conversations ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_agent_id_requis_client_agent CHECK (conversation_type <> 'client-agent' OR agent_id IS NOT NULL);