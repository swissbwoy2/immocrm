-- Final safe backfill for admin-invited buyers: normalize classification and provision missing purchase records.

WITH buyer_clients AS (
  SELECT c.id, c.user_id, c.agent_id
  FROM public.clients c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE lower(trim(coalesce(c.type_recherche, ''))) IN ('acheter', 'achat', 'purchase', 'purchase_search')
     OR c.journey_type = 'purchase_search'
     OR EXISTS (
       SELECT 1 FROM public.purchase_projects pp
       WHERE pp.client_id = c.id OR (pp.user_id IS NOT NULL AND pp.user_id = c.user_id)
     )
     OR (lower(coalesce(p.prenom, '')) = 'elijah' AND lower(coalesce(p.nom, '')) = 'olela')
     OR (lower(coalesce(p.prenom, '')) = 'stana' AND lower(coalesce(p.nom, '')) = 'maksimovic')
), normalized_clients AS (
  UPDATE public.clients c
  SET type_recherche = 'Acheter',
      journey_type = 'purchase_search',
      priorite = 'haute',
      statut = CASE WHEN c.statut IS NULL OR c.statut IN ('inactif', 'nouveau') THEN 'en_attente' ELSE c.statut END
  FROM buyer_clients b
  WHERE c.id = b.id
  RETURNING c.id, c.user_id, c.agent_id
), created_projects AS (
  INSERT INTO public.purchase_projects (
    client_id, user_id, assigned_agent_id, statut, statut_mandat, statut_acompte,
    montant_mandat, montant_acompte, duree_progression_jours, date_debut_progression
  )
  SELECT n.id, n.user_id, n.agent_id, 'en_attente_activation', 'a_signer', 'a_payer', 4999, 2499, 60, NULL
  FROM normalized_clients n
  WHERE NOT EXISTS (
    SELECT 1 FROM public.purchase_projects pp
    WHERE pp.client_id = n.id OR (pp.user_id IS NOT NULL AND pp.user_id = n.user_id)
  )
  RETURNING id, client_id, user_id
), all_projects AS (
  SELECT pp.id, c.id AS client_id, c.user_id, c.agent_id
  FROM public.purchase_projects pp
  JOIN normalized_clients c ON pp.client_id = c.id OR (pp.user_id IS NOT NULL AND pp.user_id = c.user_id)
)
UPDATE public.purchase_projects pp
SET client_id = COALESCE(pp.client_id, ap.client_id),
    user_id = COALESCE(pp.user_id, ap.user_id),
    assigned_agent_id = COALESCE(pp.assigned_agent_id, ap.agent_id),
    statut = COALESCE(pp.statut, 'en_attente_activation'),
    statut_mandat = COALESCE(pp.statut_mandat, 'a_signer'),
    statut_acompte = COALESCE(pp.statut_acompte, 'a_payer'),
    montant_mandat = 4999,
    montant_acompte = 2499,
    duree_progression_jours = 60
FROM all_projects ap
WHERE pp.id = ap.id;

INSERT INTO public.purchase_financing_profiles (project_id, statut_bancaire)
SELECT pp.id, 'a_evaluer'
FROM public.purchase_projects pp
JOIN public.clients c ON c.id = pp.client_id
WHERE c.journey_type = 'purchase_search'
  AND NOT EXISTS (SELECT 1 FROM public.purchase_financing_profiles pf WHERE pf.project_id = pp.id);

WITH achat_steps(step_key, label, ordre) AS (
  VALUES
    ('acompte_paye',          'Acompte payé (CHF 2''499)',                         1),
    ('mandat_signe',          'Mandat d''accompagnement signé',                    2),
    ('kickoff',               'Rendez-vous de cadrage avec votre conseiller',       3),
    ('documents_financement', 'Documents financiers transmis',                     4),
    ('analyse_capacite',      'Capacité d''achat calculée',                        5),
    ('envoi_banque',          'Dossier envoyé au partenaire bancaire',              6),
    ('validation_bancaire',   'Validation bancaire reçue (24-48 h)',               7),
    ('criteres_definis',      'Critères de recherche définis',                     8),
    ('biens_selectionnes',    'Biens sélectionnés analysés',                       9),
    ('visite_courtier',       'Visite par notre courtier',                         10),
    ('rapport_visite',        'Rapport de visite remis',                           11),
    ('contre_visite',         'Contre-visite avec vous',                           12),
    ('offre_envoyee',         'Offre d''achat envoyée',                            13),
    ('negociation',           'Négociation aboutie',                               14),
    ('rdv_notaire',           'Rendez-vous notaire planifié',                      15),
    ('signature_notariee',    'Signature de l''acte authentique',                  16),
    ('remise_cles',           'Remise des clés',                                   17)
)
INSERT INTO public.purchase_project_steps (project_id, step_key, label, ordre, statut)
SELECT pp.id, s.step_key, s.label, s.ordre, 'a_faire'
FROM public.purchase_projects pp
JOIN public.clients c ON c.id = pp.client_id
CROSS JOIN achat_steps s
WHERE c.journey_type = 'purchase_search'
ON CONFLICT (project_id, step_key) DO NOTHING;

UPDATE public.documents d
SET purchase_project_id = pp.id,
    client_id = COALESCE(d.client_id, c.id),
    purchase_category = COALESCE(d.purchase_category, 'autres_documents_bancaires')
FROM public.purchase_projects pp
JOIN public.clients c ON c.id = pp.client_id
WHERE c.journey_type = 'purchase_search'
  AND d.user_id = c.user_id
  AND d.purchase_project_id IS NULL;
