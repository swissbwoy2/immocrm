-- Parcours ACHAT aligné sur la location (25.10.2026)
-- Idempotente. Uniquement additive : n'invalide aucune ligne existante.

-- 1) Types de documents : la contrainte n'acceptait que les types location.
--    Les dépôts du parcours achat (client : Mes documents / Mon dossier ; admin : fiche client)
--    étaient donc refusés (fiches de salaire 1-3, 3e pilier, LPP, fonds propres, taxation…).
--    « demande_location » (formulaire de demande de location) était refusé lui aussi.
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_document_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_document_check CHECK (
  type_document IS NULL OR type_document = ANY (ARRAY[
    -- location (inchangé)
    'fiche_salaire', 'extrait_poursuites', 'piece_identite', 'attestation_domicile', 'rc_menage',
    'contrat_travail', 'attestation_employeur', 'copie_bail', 'attestation_garantie_loyer',
    'dossier_complet', 'autre', 'demande_location',
    -- achat : identité et revenus
    'permis_sejour', 'certificat_salaire', 'fiche_salaire_1', 'fiche_salaire_2', 'fiche_salaire_3',
    -- achat : fonds propres et prévoyance
    'releve_bancaire_fonds_propres', 'attestation_fonds_propres', 'attestation_pilier',
    'attestation_3a', 'attestation_lpp', 'attestation_epl', 'attestation_libre_passage',
    'justificatif_placements', 'justificatif_donation', 'justificatif_avance_hoirie',
    -- achat : charges et engagements
    'decompte_credits', 'justificatif_credit_prive', 'justificatif_leasing', 'justificatif_carte_credit',
    'justificatif_pension_alimentaire', 'justificatif_charges_fixes',
    -- achat : fiscalité et autorisations
    'avis_taxation', 'decision_taxation', 'declaration_fiscale', 'accord_transmission', 'consentement_donnees'
  ]::text[])
);

-- 2) Notification client au changement de statut d'une offre : libellés du parcours achat.
--    (le lien /client/offres-recues est redirigé vers « Biens proposés » côté app pour un acheteur)
CREATE OR REPLACE FUNCTION public.notify_offre_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_label text;
BEGIN
  IF NEW.statut IS NOT DISTINCT FROM OLD.statut THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.user_id INTO v_user_id FROM public.clients c WHERE c.id = NEW.client_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_label := CASE NEW.statut
    WHEN 'envoyee' THEN 'Nouvelle offre reçue'
    WHEN 'interesse' THEN 'Intérêt enregistré'
    WHEN 'visite_planifiee' THEN 'Visite planifiée'
    WHEN 'visite_confirmee' THEN 'Visite confirmée'
    WHEN 'visite_effectuee' THEN 'Visite effectuée'
    WHEN 'souhaite_postuler' THEN 'Vous souhaitez postuler'
    WHEN 'offre_envisagee' THEN 'Offre d''achat envisagée'
    WHEN 'candidature_deposee' THEN 'Candidature déposée'
    WHEN 'acceptee' THEN 'Offre acceptée'
    WHEN 'refusee' THEN 'Offre refusée'
    ELSE 'Statut mis à jour: ' || NEW.statut
  END;

  PERFORM public.create_notification(
    p_user_id  => v_user_id,
    p_type     => 'offre_status_change',
    p_title    => v_label,
    p_message  => COALESCE(NEW.adresse, ''),
    p_link     => '/client/offres-recues',
    p_metadata => jsonb_build_object('offre_id', NEW.id, 'statut', NEW.statut)
  );

  RETURN NEW;
END;
$function$;
