-- Liens de postulation generes par l'admin.
-- Permettent d'envoyer a une personne qui n'arrive pas a postuler un acces direct
-- au formulaire de demande de location, avec creation du compte candidat au passage.

CREATE TABLE IF NOT EXISTS public.postulation_liens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  annonce_id uuid NOT NULL REFERENCES public.annonces_publiques(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  note text,
  actif boolean NOT NULL DEFAULT true,
  utilisations integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS postulation_liens_annonce_idx ON public.postulation_liens(annonce_id);

ALTER TABLE public.postulation_liens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerent les liens de postulation" ON public.postulation_liens;
CREATE POLICY "Admins gerent les liens de postulation"
  ON public.postulation_liens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Lecture publique du strict minimum : valider le lien et nommer le bien.
CREATE OR REPLACE FUNCTION public.postulation_lien_info(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE l record; a record;
BEGIN
  SELECT * INTO l FROM postulation_liens WHERE token = p_token;
  IF NOT FOUND OR NOT l.actif OR l.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'lien_invalide');
  END IF;
  SELECT id, titre, adresse, ville, prix, nombre_pieces, surface_habitable, slug, statut
    INTO a FROM annonces_publiques WHERE id = l.annonce_id;
  IF a.id IS NULL OR a.statut <> 'publie' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'annonce_indisponible');
  END IF;
  RETURN jsonb_build_object('ok', true, 'annonce', jsonb_build_object(
    'id', a.id, 'titre', a.titre, 'adresse', a.adresse, 'ville', a.ville,
    'prix', a.prix, 'pieces', a.nombre_pieces, 'surface', a.surface_habitable, 'slug', a.slug));
END $fn$;

REVOKE ALL ON FUNCTION public.postulation_lien_info(text) FROM public;
GRANT EXECUTE ON FUNCTION public.postulation_lien_info(text) TO anon, authenticated;

-- Consommation : la personne est deja authentifiee (lien de connexion a usage unique).
-- Cree le profil et le role candidat si besoin, puis ouvre une candidature pour l'annonce.
CREATE OR REPLACE FUNCTION public.postulation_lien_consommer(
  p_token text,
  p_prenom text DEFAULT NULL,
  p_nom text DEFAULT NULL,
  p_telephone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  l record; a record;
  v_cand uuid;
  v_email text; v_prenom text; v_nom text; v_tel text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'non_connecte');
  END IF;

  SELECT * INTO l FROM postulation_liens WHERE token = p_token;
  IF NOT FOUND OR NOT l.actif OR l.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'lien_invalide');
  END IF;

  SELECT id, statut INTO a FROM annonces_publiques WHERE id = l.annonce_id;
  IF a.id IS NULL OR a.statut <> 'publie' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'annonce_indisponible');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT prenom, nom, telephone INTO v_prenom, v_nom, v_tel FROM profiles WHERE id = v_uid;

  v_prenom := coalesce(nullif(btrim(coalesce(v_prenom, '')), ''), nullif(btrim(coalesce(p_prenom, '')), ''));
  v_nom    := coalesce(nullif(btrim(coalesce(v_nom, '')), ''),    nullif(btrim(coalesce(p_nom, '')), ''));
  v_tel    := coalesce(nullif(btrim(coalesce(v_tel, '')), ''),    nullif(btrim(coalesce(p_telephone, '')), ''));

  IF v_prenom IS NULL OR v_nom IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'identite_manquante');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    INSERT INTO profiles (id, email, prenom, nom, telephone, actif)
    VALUES (v_uid, v_email, v_prenom, v_nom, v_tel, false);
  ELSE
    UPDATE profiles SET
      prenom = coalesce(nullif(btrim(coalesce(prenom, '')), ''), v_prenom),
      nom = coalesce(nullif(btrim(coalesce(nom, '')), ''), v_nom),
      telephone = coalesce(nullif(btrim(coalesce(telephone, '')), ''), v_tel)
    WHERE id = v_uid;
  END IF;

  -- Role candidat uniquement, et jamais sur un compte qui porte deja un role.
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid) THEN
    INSERT INTO user_roles (user_id, role) VALUES (v_uid, 'candidat')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  SELECT id INTO v_cand FROM candidatures_location
   WHERE user_id = v_uid AND annonce_id = l.annonce_id AND coalesce(annulee, false) = false
   ORDER BY created_at DESC LIMIT 1;

  IF v_cand IS NULL THEN
    INSERT INTO candidatures_location (user_id, annonce_id, prenom, nom, email, telephone, statut)
    VALUES (v_uid, l.annonce_id, v_prenom, v_nom, v_email, v_tel, 'en_attente')
    RETURNING id INTO v_cand;
    UPDATE postulation_liens SET utilisations = utilisations + 1 WHERE id = l.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'candidature_id', v_cand);
END $fn$;

REVOKE ALL ON FUNCTION public.postulation_lien_consommer(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.postulation_lien_consommer(text, text, text, text) TO authenticated;
