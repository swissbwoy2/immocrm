UPDATE public.visites v
SET statut = 'annulee', updated_at = now()
FROM public.offres o
WHERE v.offre_id = o.id
  AND o.statut = 'refusee'
  AND v.statut = 'planifiee'
  AND v.date_visite >= now();