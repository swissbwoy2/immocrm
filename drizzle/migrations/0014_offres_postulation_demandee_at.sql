ALTER TABLE public.offres ADD COLUMN IF NOT EXISTS postulation_demandee_at timestamptz;

UPDATE public.offres o SET postulation_demandee_at = COALESCE(
  (SELECT max(v.client_decision_at) FROM public.visites v WHERE v.offre_id = o.id AND v.client_decision = 'souhaite_postuler'),
  (SELECT max(m.created_at) FROM public.messages m WHERE m.offre_id = o.id AND (m.content ILIKE '%candidature%' OR m.content ILIKE '%postuler%')),
  o.date_envoi,
  o.created_at
)
WHERE o.statut IN ('souhaite_postuler','candidature_deposee') AND o.postulation_demandee_at IS NULL;