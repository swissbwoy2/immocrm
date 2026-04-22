-- Migrate CSV leads from `leads` to `meta_leads`
INSERT INTO public.meta_leads (
  leadgen_id, source, form_name, email, phone, first_name, last_name,
  full_name, city, lead_status, notes, imported_at, created_at,
  raw_meta_payload
)
SELECT
  'csv_' || l.id::text,
  'csv_import',
  l.formulaire,
  l.email,
  l.telephone,
  l.prenom,
  l.nom,
  NULLIF(trim(coalesce(l.prenom,'') || ' ' || coalesce(l.nom,'')), ''),
  l.localite,
  CASE
    WHEN l.is_qualified IS TRUE THEN 'qualified'
    WHEN l.contacted IS TRUE THEN 'contacted'
    ELSE 'new'
  END,
  l.notes,
  l.created_at,
  l.created_at,
  jsonb_build_object(
    'original_lead_id', l.id,
    'budget', l.budget,
    'type_recherche', l.type_recherche,
    'utm_source', l.utm_source,
    'utm_campaign', l.utm_campaign,
    'utm_medium', l.utm_medium,
    'utm_content', l.utm_content,
    'utm_term', l.utm_term,
    'original_source', l.source,
    'original_formulaire', l.formulaire
  )
FROM public.leads l
WHERE l.source = 'Payé'
ON CONFLICT (leadgen_id) DO NOTHING;

-- Delete migrated leads from `leads`
DELETE FROM public.leads WHERE source = 'Payé';