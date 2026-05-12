
DROP VIEW IF EXISTS public.available_phone_slots;
DROP VIEW IF EXISTS public.annonceurs_public;

-- Slot availability: only times, no PII
CREATE OR REPLACE FUNCTION public.get_available_phone_slots(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(slot_start timestamptz, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT slot_start, status
  FROM public.lead_phone_appointments
  WHERE status <> 'annule'
    AND slot_start >= GREATEST(p_from, now())
    AND slot_start <= p_to;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_phone_slots(timestamptz, timestamptz) TO anon, authenticated;

-- Public annonceurs: safe columns only, no email/phone/address
CREATE OR REPLACE FUNCTION public.get_public_annonceurs()
RETURNS TABLE(
  id uuid,
  type_annonceur text,
  nom_entreprise text,
  nom text,
  prenom text,
  ville text,
  canton text,
  logo_url text,
  note_moyenne numeric,
  nb_avis integer,
  est_verifie boolean,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, type_annonceur, nom_entreprise, nom, prenom, ville, canton,
         logo_url, note_moyenne, nb_avis, est_verifie, created_at
  FROM public.annonceurs
  WHERE statut = 'actif';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_annonceurs() TO anon, authenticated;
