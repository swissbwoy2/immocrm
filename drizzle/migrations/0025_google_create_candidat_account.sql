-- Création explicite d'un compte candidat après une première connexion Google.
-- N'attribue jamais d'autre rôle que 'candidat' ; refuse tout compte existant (rôle ou profil déjà présent).
CREATE OR REPLACE FUNCTION public.google_create_candidat_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _u record;
  _prenom text;
  _nom text;
  _full text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = _uid AND provider = 'google') THEN
    RAISE EXCEPTION 'google_identity_required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
     OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
    RAISE EXCEPTION 'account_already_exists';
  END IF;

  SELECT email, raw_user_meta_data AS m INTO _u FROM auth.users WHERE id = _uid;
  _full := COALESCE(_u.m->>'full_name', _u.m->>'name', '');
  _prenom := COALESCE(NULLIF(_u.m->>'given_name', ''), NULLIF(split_part(_full, ' ', 1), ''), '');
  _nom := COALESCE(NULLIF(_u.m->>'family_name', ''),
                   NULLIF(btrim(substr(_full, length(split_part(_full, ' ', 1)) + 1)), ''), '');

  INSERT INTO public.profiles (id, prenom, nom, email, actif)
  VALUES (_uid, _prenom, _nom, COALESCE(_u.email, ''), false);

  -- Le trigger grant_credits_on_role crée la ligne de crédits (0 jour, 'aucun').
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'candidat'::app_role);
END;
$$;

REVOKE ALL ON FUNCTION public.google_create_candidat_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.google_create_candidat_account() TO authenticated;