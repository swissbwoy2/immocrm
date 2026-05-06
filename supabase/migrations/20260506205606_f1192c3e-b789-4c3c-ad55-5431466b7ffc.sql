
-- 1. Insertion/MAJ des 12 nouveaux templates
INSERT INTO whatsapp_message_templates (template_key, template_name_meta, language, category, body_preview, variables_schema, is_active)
VALUES
  ('welcome_activation', 'logisorama_welcome_activation', 'en', 'MARKETING',
   'Bienvenue {{1}} ! Votre mandat de recherche est officiellement activé...',
   '[{"name":"prenom"}]'::jsonb, true),
  ('proposition_visite_client', 'logisorama_proposition_visite_client', 'fr', 'UTILITY',
   'Bonjour {{1}}, Une visite vous est proposée pour {{2}} le {{3}} avec {{4}}',
   '[{"name":"prenom"},{"name":"bien"},{"name":"date"},{"name":"agent"}]'::jsonb, true),
  ('alerte_agent_reponse_visite', 'logisorama_alerte_agent_reponse_visite', 'fr', 'UTILITY',
   'Réponse client visite : {{1}} - {{2}} - {{3}} - {{4}} - {{5}}',
   '[{"name":"client"},{"name":"bien"},{"name":"creneau"},{"name":"reponse"},{"name":"telephone"}]'::jsonb, true),
  ('post_visite_question', 'logisorama_post_visite_question', 'fr', 'MARKETING',
   'Bonjour {{1}}, visite de {{2}} - voulez-vous postuler ?',
   '[{"name":"prenom"},{"name":"bien"}]'::jsonb, true),
  ('candidature_demandee_client', 'logisorama_candidature_demandee_client', 'fr', 'UTILITY',
   'Merci {{1}} ! Candidature pour {{2}} transmise à {{3}}',
   '[{"name":"prenom"},{"name":"bien"},{"name":"agent"}]'::jsonb, true),
  ('candidature_refus_client', 'logisorama_candidature_refus_client', 'fr', 'MARKETING',
   'Bien noté {{1}}, choix enregistré pour {{2}}',
   '[{"name":"prenom"},{"name":"bien"}]'::jsonb, true),
  ('alerte_agent_candidature', 'logisorama_alerte_agent_candidature', 'fr', 'UTILITY',
   'Action requise : {{1}} souhaite postuler pour {{2}} - {{3}}',
   '[{"name":"client"},{"name":"bien"},{"name":"lien"}]'::jsonb, true),
  ('application_accepted', 'application_accepted', 'en', 'UTILITY',
   'Excellente nouvelle {{1}} ! Dossier pour {{2}} ({{3}} CHF/mois) accepté',
   '[{"name":"prenom"},{"name":"adresse"},{"name":"loyer"}]'::jsonb, true),
  ('signature_scheduled', 'logisorama_signature_scheduled', 'en', 'UTILITY',
   'Bonjour {{1}}, signature fixée le {{2}} chez {{3}}',
   '[{"name":"prenom"},{"name":"date"},{"name":"lieu"}]'::jsonb, true),
  ('etat_des_lieux_scheduled', 'logisorama_etat_des_lieux_scheduled', 'en', 'UTILITY',
   'Bonjour {{1}}, état des lieux planifié le {{2}} à {{3}}',
   '[{"name":"prenom"},{"name":"date"},{"name":"adresse"}]'::jsonb, true),
  ('keys_handover', 'logisorama_keys_handover', 'en', 'UTILITY',
   'Félicitations {{1}} pour votre nouveau logement à {{2}}',
   '[{"name":"prenom"},{"name":"adresse"}]'::jsonb, true),
  ('google_review_request', 'logisorama_google_review_request', 'en', 'UTILITY',
   'Bonjour {{1}}, installation réussie ? Si {{2}} a mérité votre confiance...',
   '[{"name":"prenom"},{"name":"agent"}]'::jsonb, true)
ON CONFLICT (template_key) DO UPDATE SET
  template_name_meta = EXCLUDED.template_name_meta,
  language = EXCLUDED.language,
  category = EXCLUDED.category,
  body_preview = EXCLUDED.body_preview,
  variables_schema = EXCLUDED.variables_schema,
  is_active = true,
  updated_at = now();

-- 2. Activer mandate_expiring_30d
UPDATE whatsapp_message_templates SET is_active = true, updated_at = now()
WHERE template_key = 'mandate_expiring_30d';

-- 3. Colonnes idempotency
ALTER TABLE visites ADD COLUMN IF NOT EXISTS post_visit_question_sent BOOLEAN DEFAULT false;
ALTER TABLE visites ADD COLUMN IF NOT EXISTS post_visit_question_sent_at TIMESTAMPTZ;
ALTER TABLE candidatures ADD COLUMN IF NOT EXISTS cles_recues_confirme BOOLEAN DEFAULT false;
ALTER TABLE candidatures ADD COLUMN IF NOT EXISTS cles_recues_confirme_at TIMESTAMPTZ;

-- 4. Fonction trigger générique
CREATE OR REPLACE FUNCTION public.trigger_wa_lifecycle_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E';
  v_fn_name TEXT := TG_ARGV[0];
  v_id_field TEXT := TG_ARGV[1];
BEGIN
  PERFORM net.http_post(
    url := concat('https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/', v_fn_name),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(v_id_field, NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_wa_lifecycle_event failed for %: %', v_fn_name, SQLERRM;
  RETURN NEW;
END;
$$;

-- 5. Triggers
DROP TRIGGER IF EXISTS trg_wa_proposition_visite ON visites;
CREATE TRIGGER trg_wa_proposition_visite
  AFTER INSERT ON visites
  FOR EACH ROW
  WHEN (NEW.statut = 'proposee')
  EXECUTE FUNCTION public.trigger_wa_lifecycle_event('wa-send-proposition-visite', 'visite_id');

DROP TRIGGER IF EXISTS trg_wa_application_accepted ON candidatures;
CREATE TRIGGER trg_wa_application_accepted
  AFTER UPDATE OF agent_valide_regie ON candidatures
  FOR EACH ROW
  WHEN (NEW.agent_valide_regie = true AND OLD.agent_valide_regie IS DISTINCT FROM NEW.agent_valide_regie)
  EXECUTE FUNCTION public.trigger_wa_lifecycle_event('wa-send-application-accepted', 'candidature_id');

DROP TRIGGER IF EXISTS trg_wa_signature_scheduled ON candidatures;
CREATE TRIGGER trg_wa_signature_scheduled
  AFTER UPDATE OF date_signature_choisie ON candidatures
  FOR EACH ROW
  WHEN (NEW.date_signature_choisie IS NOT NULL AND OLD.date_signature_choisie IS DISTINCT FROM NEW.date_signature_choisie)
  EXECUTE FUNCTION public.trigger_wa_lifecycle_event('wa-send-signature-scheduled', 'candidature_id');

DROP TRIGGER IF EXISTS trg_wa_edl_scheduled ON candidatures;
CREATE TRIGGER trg_wa_edl_scheduled
  AFTER UPDATE OF date_etat_lieux ON candidatures
  FOR EACH ROW
  WHEN (NEW.date_etat_lieux IS NOT NULL AND OLD.date_etat_lieux IS DISTINCT FROM NEW.date_etat_lieux)
  EXECUTE FUNCTION public.trigger_wa_lifecycle_event('wa-send-edl-scheduled', 'candidature_id');

DROP TRIGGER IF EXISTS trg_wa_keys_handover ON candidatures;
CREATE TRIGGER trg_wa_keys_handover
  AFTER UPDATE OF cles_remises ON candidatures
  FOR EACH ROW
  WHEN (NEW.cles_remises = true AND OLD.cles_remises IS DISTINCT FROM NEW.cles_remises)
  EXECUTE FUNCTION public.trigger_wa_lifecycle_event('wa-send-keys-handover', 'candidature_id');
