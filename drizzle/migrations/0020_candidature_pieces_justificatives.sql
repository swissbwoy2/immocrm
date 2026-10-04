ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS candidature_id uuid NULL REFERENCES public.candidatures_location(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_documents_candidature_id ON public.documents(candidature_id);

CREATE OR REPLACE FUNCTION public.is_candidature_owner(_cand uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.candidatures_location WHERE id = _cand AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_candidature_piece_path(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.documents WHERE candidature_id IS NOT NULL AND url = _path)
$$;
REVOKE EXECUTE ON FUNCTION public.is_candidature_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_candidature_piece_path(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_candidature_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_candidature_piece_path(text) TO authenticated;

CREATE POLICY candidat_insert_candidature_pieces ON public.documents FOR INSERT TO authenticated
  WITH CHECK (candidature_id IS NOT NULL AND user_id = auth.uid() AND public.is_candidature_owner(candidature_id));
CREATE POLICY candidat_select_candidature_pieces ON public.documents FOR SELECT TO authenticated
  USING (candidature_id IS NOT NULL AND public.is_candidature_owner(candidature_id));
CREATE POLICY candidat_delete_candidature_pieces ON public.documents FOR DELETE TO authenticated
  USING (candidature_id IS NOT NULL AND public.is_candidature_owner(candidature_id));
CREATE POLICY staff_select_candidature_pieces ON public.documents FOR SELECT TO authenticated
  USING (candidature_id IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')));

CREATE POLICY "Agents lisent pieces candidatures location" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(),'agent') AND public.is_candidature_piece_path(name));

CREATE OR REPLACE FUNCTION public.notify_candidature_pieces_completes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean; v_label text;
BEGIN
  IF NEW.candidature_id IS NULL THEN RETURN NEW; END IF;
  SELECT
    (SELECT count(*) FROM documents WHERE candidature_id = NEW.candidature_id AND type_document = 'fiche_salaire') >= 3
    AND NOT EXISTS (SELECT 1 FROM unnest(ARRAY['extrait_poursuites','piece_identite','attestation_domicile','contrat_travail','rc_menage']) t
                    WHERE NOT EXISTS (SELECT 1 FROM documents WHERE candidature_id = NEW.candidature_id AND type_document = t))
  INTO v_ok;
  IF NOT v_ok THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM notifications WHERE type = 'candidature_pieces_completes'
             AND metadata->>'candidature_id' = NEW.candidature_id::text) THEN RETURN NEW; END IF;
  SELECT coalesce(nullif(concat_ws(', ', a.adresse, a.ville), ''), a.titre, 'Candidature')
    INTO v_label FROM candidatures_location c LEFT JOIN annonces_publiques a ON a.id = c.annonce_id
   WHERE c.id = NEW.candidature_id;
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT DISTINCT ur.user_id, 'candidature_pieces_completes', 'Pièces justificatives complètes',
         'Le candidat a fourni toutes ses pièces — ' || coalesce(v_label, ''),
         '/admin/candidatures-relocation/' || NEW.candidature_id,
         jsonb_build_object('candidature_id', NEW.candidature_id)
    FROM user_roles ur WHERE ur.role IN ('admin','agent');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_candidature_pieces_completes AFTER INSERT ON public.documents
  FOR EACH ROW WHEN (NEW.candidature_id IS NOT NULL) EXECUTE FUNCTION public.notify_candidature_pieces_completes();

CREATE OR REPLACE FUNCTION public.staff_valider_preselection(p_candidature_id uuid, p_retenu boolean, p_motif text DEFAULT NULL::text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); r record; v_conv uuid;
        c_imm constant uuid := '4c2ee841-a48b-4d7d-8ed6-3eac9ea124e8';
begin
  if v_uid is null or not (has_role(v_uid,'admin') or has_role(v_uid,'agent')) then
    raise exception 'Réservé au staff';
  end if;
  select * into r from candidatures_location where id = p_candidature_id;
  if not found then raise exception 'Candidature introuvable'; end if;

  if p_retenu then
    update candidatures_location set statut='documents_demandes', date_documents_demandes=now(), updated_at=now()
     where id = p_candidature_id;
    if r.annonce_id is not null then
      v_conv := public._get_or_create_annonce_conv(r.user_id, r.annonce_id);
      perform public._post_msg(v_conv, 'admin', c_imm,
        'Bonne nouvelle ! Votre candidature a été retenue en pré-sélection. Merci de téléverser vos pièces dans votre espace, rubrique « Mes pièces justificatives » de cette candidature : /candidat/candidatures (3 dernières fiches de salaire, extrait des poursuites de moins de 3 mois, pièce d''identité / permis, attestation de domicile, contrat de travail ou attestation employeur, RC ménage).');
    end if;
    if r.user_id is not null then
      insert into public.notifications (user_id, type, title, message, link, metadata)
      values (r.user_id, 'preselection_retenue', 'Candidature retenue en pré-sélection',
              'Merci de fournir vos pièces dans « Mes pièces justificatives ».', '/candidat/candidatures',
              jsonb_build_object('candidature_id', p_candidature_id));
    end if;
    return 'documents_demandes';
  else
    update candidatures_location set statut='refuse', motif_refus=p_motif, date_decision=now(), updated_at=now()
     where id = p_candidature_id;
    if r.user_id is not null then
      insert into public.notifications (user_id, type, title, message, link, metadata)
      values (r.user_id, 'candidature_refusee', 'Mise à jour de votre candidature',
              coalesce(p_motif,'Votre candidature n''a pas été retenue pour cet objet.'), '/candidat/candidatures',
              jsonb_build_object('candidature_id', p_candidature_id));
    end if;
    return 'refuse';
  end if;
end $function$;