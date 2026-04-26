
-- ============================================================
-- DEMO ACCOUNT WRITE-LOCK : filet de sécurité backend ultime
-- ============================================================
-- Bloque toute modification de profile, mot de passe ou email
-- pour les comptes marqués is_demo_account = true, même si le
-- frontend est contourné.
-- ============================================================

-- 1) Helper : retourne true si le user_id donné est un compte démo
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_demo_account FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

-- 2) Trigger sur profiles : bloque tout UPDATE / DELETE sur le profil démo par lui-même
CREATE OR REPLACE FUNCTION public.prevent_demo_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le profil concerné est un compte démo ET que l'appelant EST ce compte démo
  IF COALESCE(OLD.is_demo_account, false) = true
     AND auth.uid() = OLD.id THEN
    RAISE EXCEPTION 'DEMO_READONLY: Le compte de démonstration est en lecture seule.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Empêche aussi quiconque (sauf service_role) de retirer le flag is_demo_account
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.is_demo_account, false) = true
     AND COALESCE(NEW.is_demo_account, false) = false
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'DEMO_FLAG_PROTECTED: Le statut démo ne peut pas être retiré côté client.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_demo_profile_changes ON public.profiles;
CREATE TRIGGER trg_prevent_demo_profile_changes
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_demo_profile_changes();

-- 3) Trigger sur auth.users : bloque changement email/encrypted_password par le compte démo lui-même
CREATE OR REPLACE FUNCTION public.prevent_demo_auth_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_demo boolean;
BEGIN
  -- Vérifie si l'utilisateur modifié est un compte démo
  SELECT COALESCE(is_demo_account, false) INTO is_demo
  FROM public.profiles WHERE id = OLD.id;

  IF is_demo IS TRUE AND auth.uid() = OLD.id THEN
    -- Bloque changement email
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'DEMO_READONLY: L''email du compte démo ne peut pas être modifié.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Bloque changement mot de passe
    IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
      RAISE EXCEPTION 'DEMO_READONLY: Le mot de passe du compte démo ne peut pas être modifié.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Bloque changement téléphone
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      RAISE EXCEPTION 'DEMO_READONLY: Le téléphone du compte démo ne peut pas être modifié.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_demo_auth_changes ON auth.users;
CREATE TRIGGER trg_prevent_demo_auth_changes
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_demo_auth_changes();

-- 4) Politique générique réutilisable : bloque les écritures du compte démo
--    sur les tables sensibles (messages, candidatures, offres, documents, visites, clients)
--    via une fonction de check à utiliser dans des policies RESTRICTIVE existantes/futures.
CREATE OR REPLACE FUNCTION public.assert_not_demo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT public.is_demo_user(auth.uid());
$$;

-- 5) Politique RESTRICTIVE sur messages : bloque INSERT/UPDATE/DELETE par le compte démo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages') THEN
    DROP POLICY IF EXISTS "Demo account cannot write messages" ON public.messages;
    CREATE POLICY "Demo account cannot write messages"
      ON public.messages
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.assert_not_demo())
      WITH CHECK (public.assert_not_demo());
  END IF;
END $$;

-- 6) Idem pour candidatures, offres, client_documents, visites, clients
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'candidatures', 'offres', 'client_documents', 'documents',
    'visites', 'clients', 'conversations', 'rental_applications'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Demo account cannot write %I" ON public.%I', t, t);
      EXECUTE format(
        'CREATE POLICY "Demo account cannot write %I" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.assert_not_demo()) WITH CHECK (public.assert_not_demo())',
        t, t
      );
    END IF;
  END LOOP;
END $$;
