CREATE OR REPLACE FUNCTION public.ensure_annonceur_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _p record;
  _email text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO _id FROM public.annonceurs WHERE user_id = _uid LIMIT 1;

  IF _id IS NULL THEN
    SELECT prenom, nom, email, telephone INTO _p FROM public.profiles WHERE id = _uid;
    SELECT email INTO _email FROM auth.users WHERE id = _uid;
    INSERT INTO public.annonceurs (user_id, type_annonceur, prenom, nom, email, telephone)
    VALUES (
      _uid, 'particulier', NULLIF(_p.prenom, ''),
      COALESCE(NULLIF(_p.nom, ''), split_part(COALESCE(_p.email, _email, ''), '@', 1), 'Annonceur'),
      COALESCE(NULLIF(_p.email, ''), _email, ''),
      NULLIF(_p.telephone, '')
    )
    RETURNING id INTO _id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'annonceur'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_annonceur_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_annonceur_profile() TO authenticated;