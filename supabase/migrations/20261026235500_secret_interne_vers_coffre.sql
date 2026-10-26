-- Secret interne (x-internal-secret) retiré du code des fonctions de la base.
-- Avant : la valeur était écrite en clair dans private.edge_service_headers() et public.create_notification().
-- Après : elle est rangée dans le coffre (vault, nom « internal_function_secret ») et lue par son nom.
-- La valeur ne change pas : les fonctions serveur (INTERNAL_FUNCTION_SECRET) continuent d'accepter les appels.
-- Tout se fait côté base, la valeur n'est ni affichée ni recopiée. En cas d'écart, tout est annulé.
-- Appliquée en base le 26.10.2026.

DO $migration$
DECLARE
  v_old text;
  v_def text;
  v_new_def text;
  v_oid oid;
BEGIN
  -- 1. Valeur actuelle, lue dans le code de la fonction (rien n'est affiché).
  SELECT substring(p.prosrc FROM '''x-internal-secret'',\s*''([0-9a-f]{24,})''')
    INTO v_old
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'private' AND p.proname = 'edge_service_headers';

  IF v_old IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'internal_function_secret') THEN
    PERFORM vault.create_secret(v_old, 'internal_function_secret',
      'Secret interne des appels base vers fonctions serveur (en-tête x-internal-secret)');
  END IF;

  -- 2. En-têtes des appels internes : clé de service si présente au coffre, sinon secret interne du coffre.
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION private.edge_service_headers()
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
    AS $body$
    declare
      v_service_key text;
      v_internal text;
    begin
      select decrypted_secret into v_service_key
        from vault.decrypted_secrets
       where name = 'email_queue_service_role_key'
       order by updated_at desc limit 1;
      if coalesce(v_service_key, '') <> '' then
        return jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key);
      end if;
      -- Secret interne (accepté par verifyInternalCaller), lu au coffre par son nom.
      select decrypted_secret into v_internal
        from vault.decrypted_secrets
       where name = 'internal_function_secret'
       order by updated_at desc limit 1;
      return jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', coalesce(v_internal, ''));
    end;
    $body$
  $fn$;

  -- Contrôle : mêmes en-têtes qu'avant (sinon tout est annulé).
  IF v_old IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' AND coalesce(decrypted_secret, '') <> '')
     AND coalesce(private.edge_service_headers() ->> 'x-internal-secret', '') <> v_old THEN
    RAISE EXCEPTION 'edge_service_headers : le secret lu au coffre ne correspond pas, migration annulée';
  END IF;

  -- 3. create_notification : en-têtes en clair remplacés par private.edge_service_headers().
  SELECT p.oid INTO v_oid
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'create_notification'
     AND p.prosrc ~ '''x-internal-secret'',\s*''[0-9a-f]{24,}''';

  IF v_oid IS NOT NULL THEN
    v_def := pg_get_functiondef(v_oid);
    v_new_def := regexp_replace(
      v_def,
      'jsonb_build_object\(\s*''Content-Type'',\s*''application/json'',\s*''x-internal-secret'',\s*''[0-9a-f]{24,}''\s*\)',
      'private.edge_service_headers()');
    IF v_new_def = v_def OR v_new_def ~ '[0-9a-f]{40,}' THEN
      RAISE EXCEPTION 'create_notification : remplacement impossible, migration annulée';
    END IF;
    EXECUTE v_new_def;
  END IF;

  -- 4. Plus aucune fonction ne doit contenir la valeur en clair.
  IF v_old IS NOT NULL AND EXISTS (SELECT 1 FROM pg_proc WHERE prosrc LIKE '%' || v_old || '%') THEN
    RAISE EXCEPTION 'Le secret est encore écrit en clair dans une fonction, migration annulée';
  END IF;
END
$migration$;
