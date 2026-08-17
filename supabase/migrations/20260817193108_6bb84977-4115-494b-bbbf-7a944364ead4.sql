-- 1) Visite-medias : lecture strictement liée à la visite
DROP POLICY IF EXISTS "vmedias auth read" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_read_visite_media(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visite_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN true;
  END IF;

  IF (storage.foldername(_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    _visite_id := ((storage.foldername(_name))[1])::uuid;
  ELSE
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.visites v
    LEFT JOIN public.agents a ON a.id = v.agent_id
    LEFT JOIN public.clients c ON c.id = v.client_id
    WHERE v.id = _visite_id
      AND (
        a.user_id = auth.uid()
        OR c.user_id = auth.uid()
        OR public.is_coursier_of_visite(v.id)
        OR EXISTS (
          SELECT 1
          FROM public.client_agents ca
          JOIN public.agents ag ON ag.id = ca.agent_id
          WHERE ca.client_id = v.client_id AND ag.user_id = auth.uid()
        )
      )
  );
END;
$$;

CREATE POLICY "visite_medias_scoped_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'visite-medias' AND public.can_read_visite_media(name));

-- 2) Pièces jointes d'offres : plus de lecture ouverte à tous les connectés
DROP POLICY IF EXISTS "offer_attachments_select_authenticated" ON storage.objects;

CREATE OR REPLACE FUNCTION public.can_read_offer_attachment(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'agent'::app_role)
     OR has_role(auth.uid(), 'coursier'::app_role) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.offres o
    JOIN public.clients c ON c.id = o.client_id
    WHERE c.user_id = auth.uid()
      AND o.medias_galerie::text LIKE '%' || _name || '%'
  );
END;
$$;

CREATE POLICY "offer_attachments_scoped_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = 'offers'
  AND public.can_read_offer_attachment(name)
);