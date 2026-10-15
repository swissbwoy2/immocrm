-- Garant saisi dans l'espace candidat → recopié dans le dossier client (client_candidates).
-- AJOUT SEUL : on n'écrase jamais un garant existant, on ne supprime rien.
-- Les erreurs éventuelles n'interrompent jamais l'opération d'origine.

CREATE OR REPLACE FUNCTION public.copy_candidat_garant_to_client(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_client_id uuid;
  v_nom text;
  v_prenom text;
  v_full text;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT * INTO r FROM public.candidat_criteres WHERE user_id = p_user_id;
  IF NOT FOUND OR coalesce(r.garant_revenus, 0) <= 0 THEN RETURN; END IF;

  SELECT id INTO v_client_id FROM public.clients
   WHERE user_id = p_user_id AND anonymise_at IS NULL
   ORDER BY created_at LIMIT 1;
  IF v_client_id IS NULL THEN RETURN; END IF;

  -- Déjà un garant dans le dossier : on ne touche à rien.
  IF EXISTS (SELECT 1 FROM public.client_candidates k WHERE k.client_id = v_client_id AND k.type ILIKE '%garant%') THEN
    RETURN;
  END IF;

  v_full := nullif(trim(coalesce(r.garant_nom, '')), '');
  IF v_full IS NULL THEN
    v_nom := '(à compléter)';
    v_prenom := '(à compléter)';
  ELSIF position(' ' in v_full) > 0 THEN
    v_nom := split_part(v_full, ' ', 1);
    v_prenom := trim(substr(v_full, length(v_nom) + 2));
  ELSE
    v_nom := v_full;
    v_prenom := '(à compléter)';
  END IF;

  INSERT INTO public.client_candidates
    (client_id, type, prenom, nom, nationalite, type_permis, revenus_mensuels, poursuites, lien_avec_client)
  VALUES
    (v_client_id, 'garant', v_prenom, v_nom,
     CASE WHEN lower(coalesce(r.garant_permis, '')) = 'suisse' THEN 'Suisse' ELSE NULL END,
     nullif(trim(coalesce(r.garant_permis, '')), ''),
     r.garant_revenus,
     coalesce(r.garant_poursuites, false) OR coalesce(r.garant_actes_defaut, false),
     coalesce(nullif(trim(coalesce(r.garant_lien, '')), ''), 'Garant') || ' — repris de l''espace candidat');
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'copy_candidat_garant_to_client(%): %', p_user_id, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.copy_candidat_garant_to_client(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_copy_candidat_garant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.copy_candidat_garant_to_client(NEW.user_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_copy_candidat_garant() FROM PUBLIC, anon, authenticated;

-- 1) Le candidat saisit ou modifie son garant alors qu'il a déjà un dossier client.
DROP TRIGGER IF EXISTS trg_candidat_garant_to_client ON public.candidat_criteres;
CREATE TRIGGER trg_candidat_garant_to_client
  AFTER INSERT OR UPDATE OF garant_nom, garant_revenus, garant_permis, garant_lien, garant_poursuites, garant_actes_defaut
  ON public.candidat_criteres
  FOR EACH ROW EXECUTE FUNCTION public.trg_copy_candidat_garant();

-- 2) Le dossier client est créé (démarrage de l'essai) alors que le garant existe déjà côté candidat.
DROP TRIGGER IF EXISTS trg_client_created_copy_garant ON public.clients;
CREATE TRIGGER trg_client_created_copy_garant
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_copy_candidat_garant();
