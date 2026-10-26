-- Invitation calendrier à la création d'une visite (déclencheur notify_on_new_visit) :
-- l'appel à send-calendar-invite part avec les en-têtes internes (private.edge_service_headers())
-- au lieu de la clé publique, pour que la fonction puisse refuser les appels anonymes.
-- Rien d'autre ne change dans le déclencheur. En cas d'écart, rien n'est modifié.
-- Appliquée en base le 26.10.2026.
DO $migration$
DECLARE
  v_oid oid;
  v_def text;
  v_new_def text;
BEGIN
  SELECT p.oid INTO v_oid
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'notify_on_new_visit';
  IF v_oid IS NULL THEN
    RETURN;
  END IF;
  v_def := pg_get_functiondef(v_oid);
  IF position('private.edge_service_headers()' in v_def) > 0 THEN
    RETURN;
  END IF;
  v_new_def := regexp_replace(
    v_def,
    'v_headers\s*:=\s*jsonb_build_object\(\s*''Content-Type'',\s*''application/json'',\s*''apikey'',\s*v_anon_key,\s*''Authorization'',\s*''Bearer ''\s*\|\|\s*v_anon_key\s*\)',
    'v_headers := private.edge_service_headers()');
  IF v_new_def = v_def THEN
    RAISE EXCEPTION 'notify_on_new_visit : en-têtes introuvables, rien n''est modifié';
  END IF;
  EXECUTE v_new_def;
END
$migration$;
