
-- Apporteurs
CREATE OR REPLACE FUNCTION public.protect_apporteur_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.taux_commission := OLD.taux_commission;
  NEW.minimum_vente := OLD.minimum_vente;
  NEW.minimum_location := OLD.minimum_location;
  NEW.statut := OLD.statut;
  NEW.nombre_clients_referes := OLD.nombre_clients_referes;
  NEW.total_commissions_gagnees := OLD.total_commissions_gagnees;
  NEW.code_parrainage := OLD.code_parrainage;
  NEW.notes_admin := OLD.notes_admin;
  NEW.dispositions_particulieres := OLD.dispositions_particulieres;
  NEW.date_expiration := OLD.date_expiration;
  NEW.user_id := OLD.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_apporteur_sensitive_fields ON public.apporteurs;
CREATE TRIGGER protect_apporteur_sensitive_fields
BEFORE UPDATE ON public.apporteurs
FOR EACH ROW EXECUTE FUNCTION public.protect_apporteur_sensitive_fields();

-- Coursiers
CREATE OR REPLACE FUNCTION public.protect_coursier_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.tarif_horaire := OLD.tarif_horaire;
  NEW.statut := OLD.statut;
  NEW.user_id := OLD.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_coursier_sensitive_fields ON public.coursiers;
CREATE TRIGGER protect_coursier_sensitive_fields
BEFORE UPDATE ON public.coursiers
FOR EACH ROW EXECUTE FUNCTION public.protect_coursier_sensitive_fields();

-- Clients
CREATE OR REPLACE FUNCTION public.protect_client_business_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.is_agent_of_client(NEW.id) THEN
    RETURN NEW;
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.agent_id := OLD.agent_id;
  NEW.statut := OLD.statut;
  NEW.commission_split := OLD.commission_split;
  NEW.refund_eligible := OLD.refund_eligible;
  NEW.refund_status := OLD.refund_status;
  NEW.refund_requested_at := OLD.refund_requested_at;
  NEW.refund_processed_at := OLD.refund_processed_at;
  NEW.etat_avancement := OLD.etat_avancement;
  NEW.priorite := OLD.priorite;
  NEW.note_agent := OLD.note_agent;
  NEW.date_ajout := OLD.date_ajout;
  NEW.date_changement_statut := OLD.date_changement_statut;
  NEW.abaninja_client_uuid := OLD.abaninja_client_uuid;
  NEW.abaninja_invoice_id := OLD.abaninja_invoice_id;
  NEW.abaninja_invoice_ref := OLD.abaninja_invoice_ref;
  NEW.mandat_renewal_count := OLD.mandat_renewal_count;
  NEW.mandate_paused_at := OLD.mandate_paused_at;
  NEW.mandate_pause_days := OLD.mandate_pause_days;
  NEW.mandate_official_end_date := OLD.mandate_official_end_date;
  NEW.anonymise_at := OLD.anonymise_at;
  NEW.anonymise_motif := OLD.anonymise_motif;
  NEW.relance_count := OLD.relance_count;
  NEW.derniere_relance_at := OLD.derniere_relance_at;
  NEW.demande_mandat_id := OLD.demande_mandat_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_client_business_fields ON public.clients;
CREATE TRIGGER protect_client_business_fields
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.protect_client_business_fields();
