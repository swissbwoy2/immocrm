-- Steeve retrouve une offre du client quelle que soit son ancienneté et la façon dont il écrit l'adresse
-- (« Avenue de Recordon 10 », « recordon 10 », « av. Recordon 10, Lausanne », lien ou numéro d'annonce).

-- Adresse réduite à ses mots utiles : sans accents, sans type de voie ni articles (« Avenue de Recordon 10 » → « recordon 10 »).
CREATE OR REPLACE FUNCTION public.steeve_norm_adresse(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(regexp_replace(regexp_replace(regexp_replace(
           translate(lower(coalesce(p, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœ''’-.,;:/()', 'aaaaaaceeeeiiiinooooouuuuyyo          '),
           '\m(avenue|av|rue|route|rte|chemin|ch|place|pl|boulevard|bd|allee|impasse|imp|quai|sentier|passage|promenade|esplanade|esp|square|de|du|des|la|le|les|l|d|sur|pres|vd|ge|fr|ne|vs)\M', ' ', 'g'),
           '\m(\d{4})\M', ' ', 'g'),
         '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.steeve_client_offres_match(p_client_id uuid, p_ref text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ref AS (
    SELECT trim(coalesce(p_ref, '')) AS brut,
           public.steeve_norm_adresse(p_ref) AS n,
           (regexp_match(coalesce(p_ref, ''), '(\d{6,})'))[1] AS num
  ), mots AS (
    SELECT array_agg(w) AS w FROM ref, regexp_split_to_table(ref.n, ' ') w WHERE length(w) >= 2 OR w ~ '^\d+[a-z]?$'
  )
  SELECT coalesce(jsonb_agg(m ORDER BY m._t DESC), '[]'::jsonb) FROM (
    SELECT o.id AS offre_id, o.adresse, o.statut, o.prix, o.pieces, o.surface, o.disponibilite, o.lien_annonce,
           to_char(coalesce(o.date_envoi, o.created_at) AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY') AS envoyee_le,
           coalesce(o.date_envoi, o.created_at) AS _t
      FROM public.offres o, ref, mots
     WHERE o.client_id = p_client_id AND coalesce(o.statut, '') <> 'doublon'
       AND length(ref.brut) >= 2
       AND (
             o.id::text = ref.brut
          OR (ref.num IS NOT NULL AND coalesce(o.lien_annonce, '') LIKE '%' || ref.num || '%')
          OR lower(coalesce(o.adresse, '')) LIKE '%' || lower(ref.brut) || '%'
          -- Tous les mots utiles de la demande (rue et numéro) dans l'adresse, quel que soit l'ordre.
          OR (coalesce(array_length(mots.w, 1), 0) > 0
              AND NOT EXISTS (SELECT 1 FROM unnest(mots.w) x
                               WHERE (' ' || public.steeve_norm_adresse(o.adresse) || ' ') NOT LIKE '% ' || x || ' %'))
           )
     ORDER BY coalesce(o.date_envoi, o.created_at) DESC
     LIMIT 8) m;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_offres_match(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_offres_match(uuid, text) TO service_role;

-- Coût par client et par jour : relevé pour que Steeve ne s'arrête pas après quelques réponses (Sonnet 5.5,
-- ~0,10 à 0,20 USD par réponse avec outils). Les plafonds globaux (jour, mois) restent en place.
INSERT INTO public.app_config (key, value) VALUES ('steeve_client_day_usd', '3')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
