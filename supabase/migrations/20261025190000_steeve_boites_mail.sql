-- Steeve, lot 2b : lecture des boîtes e-mail de l'entreprise, strictement limitée au dossier du client.
-- Additive et idempotente.
--  - shared_mailboxes : boîtes lues par Steeve (info@, martins@, relocation@, visites@, boîtes Logisorama…).
--    Mot de passe uniquement dans le coffre (Vault) : jamais relisible depuis l'application.
--  - mailbox_emails : e-mails relevés par la fonction sync-shared-mailboxes (lecture réservée aux admins).
--  - steeve_client_emails : seule porte d'accès de Steeve. Sources d'identité de confiance seulement :
--      * échange direct : l'adresse de connexion confirmée du client est expéditrice ou destinataire
--        (comparaison exacte) → extrait masqué ;
--      * mention : son nom complet (sans homonyme connu) ET l'adresse d'un bien de SES offres ou visites
--        → aucun texte libre, seulement des repères (statut, date, heure) tirés des lignes qui le nomment.
--    Les e-mails internes, de paiement ou de comptabilité ne sont jamais rendus par mention.

-- 1) Boîtes lues par Steeve
CREATE TABLE IF NOT EXISTS public.shared_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  label text,
  imap_host text NOT NULL DEFAULT 'mail.infomaniak.com',
  imap_port integer NOT NULL DEFAULT 993,
  secret_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  uid_validity bigint,
  last_uid bigint,
  pending_count integer,
  last_attempt_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_mailboxes_address_check CHECK (address ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  CONSTRAINT shared_mailboxes_port_check CHECK (imap_port BETWEEN 1 AND 65535)
);
-- Aucune politique : accès uniquement par les fonctions ci-dessous (et la clé de service).
ALTER TABLE public.shared_mailboxes ENABLE ROW LEVEL SECURITY;

INSERT INTO public.shared_mailboxes (address, label, is_active) VALUES
  ('info@immo-rama.ch', 'Info Immo-Rama', true),
  ('martins@immo-rama.ch', 'Martins', false),
  ('relocation@immo-rama.ch', 'Relocation', false),
  ('visites@immo-rama.ch', 'Visites', false)
ON CONFLICT (address) DO NOTHING;

-- Mot de passe d'info@ : copié une seule fois dans le coffre depuis la configuration de réception existante
-- (la plus ancienne, créée avant ce lot ; une configuration ajoutée après ne peut pas s'y substituer).
DO $$
DECLARE
  v_mailbox uuid;
  v_password text;
BEGIN
  SELECT id INTO v_mailbox FROM public.shared_mailboxes WHERE address = 'info@immo-rama.ch' AND secret_id IS NULL;
  IF v_mailbox IS NULL THEN
    RETURN;
  END IF;
  SELECT ic.imap_password INTO v_password
    FROM public.imap_configurations ic
   WHERE lower(ic.imap_user) = 'info@immo-rama.ch'
     AND ic.is_active
     AND coalesce(ic.imap_password, '') <> ''
     AND ic.created_at < timestamptz '2026-10-25 18:00:00+00'
   ORDER BY ic.created_at ASC
   LIMIT 1;
  IF v_password IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.shared_mailboxes
     SET secret_id = vault.create_secret(v_password, 'shared_mailbox_' || v_mailbox::text, 'Mot de passe IMAP info@immo-rama.ch')
   WHERE id = v_mailbox;
END;
$$;

-- 2) Outils de texte (internes : non exécutables depuis l'application)
CREATE OR REPLACE FUNCTION public.steeve_norm(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(translate(coalesce(t, ''),
    'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝýÿ’',
    'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYyy'''));
$$;

-- Motif « mot entier » pour un texte normalisé (caractères spéciaux échappés, espaces souples).
CREATE OR REPLACE FUNCTION public.steeve_word_rx(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '(^|[^a-z0-9])' ||
         regexp_replace(regexp_replace(trim(t), '([!-/:-@[-`{-~])', '\\\1', 'g'), '[[:space:]]+', '[[:space:]]+', 'g') ||
         '($|[^a-z0-9])';
$$;

CREATE OR REPLACE FUNCTION public.steeve_redact(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(coalesce(t, ''),
      '(https?://|www\.)[^[:space:]<>"]+', '[lien]', 'gi'),
      '[A-Za-z0-9._%+-]+[[:space:]]*(@|\(at\)|\[at\])[[:space:]]*[A-Za-z0-9-]+([[:space:]]*(\.|\(dot\)|\[dot\])[[:space:]]*[A-Za-z0-9-]+)+', '[e-mail]', 'gi'),
      '[A-Z]{2}[0-9]{2}([ -]?[0-9A-Z]){11,30}', '[IBAN]', 'g'),
      '756[. ]?[0-9]{4}[. ]?[0-9]{4}[. ]?[0-9]{2}', '[n° AVS]', 'g'),
      '(\+|00)[0-9]{1,3}([ .-]?\(?[0-9]{1,4}\)?){2,6}', '[téléphone]', 'g'),
      '(^|[^0-9])0[0-9]{1,2}([ .-]?[0-9]{2,3}){3,4}($|[^0-9])', '\1[téléphone]\3', 'g');
$$;

-- Texte utile d'un e-mail : sans lignes citées (« > ») ni historique ou message transféré.
CREATE OR REPLACE FUNCTION public.steeve_email_top(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH s AS (
    SELECT E'\n' || regexp_replace(replace(coalesce(t, ''), E'\r', ''), '(^|\n)[ \t]*>[^\n]*', '', 'g') AS b
  ), cut AS (
    SELECT b, regexp_instr(b,
      '\n[ \t]*(-{2,}[^\n]{0,20}(Original Message|Message d.origine|Ursprüngliche Nachricht|Forwarded message|Message transféré|Weitergeleitete Nachricht)'
      '|Début du message (réexpédié|transféré)'
      '|Le [^\n]{4,200}(\n[^\n]{0,200})?a écrit[ \t]*:'
      '|On [^\n]{4,200}(\n[^\n]{0,200})?wrote[ \t]*:'
      '|Am [^\n]{4,200}(\n[^\n]{0,200})?schrieb'
      '|(De|From|Von)[ \t]*:[^\n]*\n[ \t]*(Envoyé|Date|Sent|Gesendet|Datum|À|To|An)[ \t]*:)',
      1, 1, 0, 'i') AS p
    FROM s
  )
  SELECT btrim(CASE WHEN p > 0 THEN left(b, p - 1) ELSE b END, E' \n\t') FROM cut;
$$;

REVOKE ALL ON FUNCTION public.steeve_norm(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.steeve_word_rx(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.steeve_redact(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.steeve_email_top(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_norm(text), public.steeve_word_rx(text), public.steeve_redact(text), public.steeve_email_top(text) TO service_role;

-- 3) E-mails relevés (adresses, texte utile et texte normalisé calculés à l'enregistrement)
CREATE TABLE IF NOT EXISTS public.mailbox_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES public.shared_mailboxes(id) ON DELETE CASCADE,
  mailbox text NOT NULL,
  uid bigint NOT NULL,
  uid_validity bigint NOT NULL,
  message_key text,
  from_email text,
  from_name text,
  to_emails text,
  cc_emails text,
  subject text,
  body_text text,
  received_at timestamptz,
  addrs text[] NOT NULL DEFAULT '{}',
  top_text text,
  norm_top text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mailbox_emails_uid_key UNIQUE (mailbox_id, uid_validity, uid)
);
CREATE INDEX IF NOT EXISTS mailbox_emails_received_idx ON public.mailbox_emails (received_at DESC);
CREATE INDEX IF NOT EXISTS mailbox_emails_addrs_idx ON public.mailbox_emails USING gin (addrs);

ALTER TABLE public.mailbox_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent les e-mails des boîtes partagées" ON public.mailbox_emails;
CREATE POLICY "Admins lisent les e-mails des boîtes partagées" ON public.mailbox_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.mailbox_emails_prepare()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.from_email := nullif(lower(trim(NEW.from_email)), '');
  NEW.addrs := ARRAY(
    SELECT DISTINCT lower(trim(x))
      FROM unnest(string_to_array(coalesce(NEW.from_email, '') || ',' || coalesce(NEW.to_emails, '') || ',' || coalesce(NEW.cc_emails, ''), ',')) x
     WHERE trim(x) ~ '^[^@[:space:]]+@[^@[:space:]]+$'
     ORDER BY 1
  );
  NEW.top_text := left(public.steeve_email_top(NEW.body_text), 20000);
  NEW.norm_top := public.steeve_norm(coalesce(NEW.subject, '') || E'\n' || coalesce(NEW.top_text, ''));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_mailbox_emails_prepare ON public.mailbox_emails;
CREATE TRIGGER trg_mailbox_emails_prepare
  BEFORE INSERT OR UPDATE OF from_email, to_emails, cc_emails, subject, body_text ON public.mailbox_emails
  FOR EACH ROW EXECUTE FUNCTION public.mailbox_emails_prepare();

-- 4) Gestion par un admin (écran « Boîtes e-mail lues par Steeve »)
CREATE OR REPLACE FUNCTION public.admin_list_shared_mailboxes()
RETURNS TABLE (
  id uuid, address text, label text, imap_host text, imap_port integer, is_active boolean,
  has_password boolean, last_sync_at timestamptz, last_attempt_at timestamptz, last_error text,
  pending_count integer, emails_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT m.id, m.address, m.label, m.imap_host, m.imap_port, m.is_active, m.secret_id IS NOT NULL,
         m.last_sync_at, m.last_attempt_at, m.last_error, m.pending_count,
         (SELECT count(*) FROM public.mailbox_emails e WHERE e.mailbox_id = m.id)
    FROM public.shared_mailboxes m
   ORDER BY m.address;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_shared_mailbox(
  p_id uuid,
  p_address text,
  p_label text,
  p_imap_host text,
  p_imap_port integer,
  p_is_active boolean,
  p_password text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := p_id;
  v_old public.shared_mailboxes%ROWTYPE;
  v_address text := lower(trim(coalesce(p_address, '')));
  v_host text := lower(coalesce(nullif(trim(p_imap_host), ''), 'mail.infomaniak.com'));
  v_port integer := coalesce(p_imap_port, 993);
  v_password text := nullif(p_password, '');
  v_moved boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF v_host !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'Serveur IMAP invalide' USING ERRCODE = '22023';
  END IF;
  IF v_password IS NOT NULL AND v_password ~ '[\r\n\x01-\x08\x0b\x0c\x0e-\x1f]' THEN
    RAISE EXCEPTION 'Mot de passe invalide (caractère de contrôle)' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.shared_mailboxes (address, label, imap_host, imap_port, is_active)
    VALUES (v_address, nullif(trim(coalesce(p_label, '')), ''), v_host, v_port, coalesce(p_is_active, true))
    RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_old FROM public.shared_mailboxes WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Boîte introuvable' USING ERRCODE = 'P0002';
    END IF;
    v_moved := v_old.address <> v_address OR v_old.imap_host <> v_host OR v_old.imap_port <> v_port;
    -- Le mot de passe enregistré ne part jamais vers une autre adresse ou un autre serveur.
    IF v_moved AND v_old.secret_id IS NOT NULL THEN
      IF v_password IS NULL THEN
        RAISE EXCEPTION 'Nouveau mot de passe requis quand l''adresse, le serveur ou le port change' USING ERRCODE = '22023';
      END IF;
      DELETE FROM vault.secrets WHERE id = v_old.secret_id;
      UPDATE public.shared_mailboxes SET secret_id = NULL WHERE id = v_id;
    END IF;
    UPDATE public.shared_mailboxes
       SET address = v_address,
           label = nullif(trim(coalesce(p_label, '')), ''),
           imap_host = v_host,
           imap_port = v_port,
           is_active = coalesce(p_is_active, true),
           last_error = NULL,
           updated_at = now(),
           uid_validity = CASE WHEN v_moved THEN NULL ELSE uid_validity END,
           last_uid = CASE WHEN v_moved THEN NULL ELSE last_uid END
     WHERE id = v_id;
  END IF;

  IF v_password IS NOT NULL THEN
    IF (SELECT secret_id FROM public.shared_mailboxes WHERE id = v_id) IS NULL THEN
      UPDATE public.shared_mailboxes
         SET secret_id = vault.create_secret(v_password, 'shared_mailbox_' || v_id::text || '_' || extract(epoch FROM clock_timestamp())::bigint, 'Mot de passe IMAP ' || v_address)
       WHERE id = v_id;
    ELSE
      PERFORM vault.update_secret((SELECT secret_id FROM public.shared_mailboxes WHERE id = v_id), v_password);
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_shared_mailbox(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.shared_mailboxes WHERE id = p_id RETURNING secret_id INTO v_secret;
  IF v_secret IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_shared_mailboxes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_shared_mailboxes() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_save_shared_mailbox(uuid, text, text, text, integer, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_shared_mailbox(uuid, text, text, text, integer, boolean, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_shared_mailbox(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_shared_mailbox(uuid) TO authenticated;

-- 5) Mot de passe d'une boîte, pour la seule fonction de relève (clé de service), depuis le coffre uniquement.
CREATE OR REPLACE FUNCTION public.shared_mailbox_credentials(p_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(d.decrypted_secret, '')
    FROM public.shared_mailboxes m
    JOIN vault.decrypted_secrets d ON d.id = m.secret_id
   WHERE m.id = p_id;
$$;
REVOKE ALL ON FUNCTION public.shared_mailbox_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shared_mailbox_credentials(uuid) TO service_role;

-- 6) E-mails qui concernent un client, pour Steeve uniquement (clé de service).
CREATE OR REPLACE FUNCTION public.steeve_client_emails(p_client_id uuid, p_limit integer DEFAULT 8, p_days integer DEFAULT 120)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_email text;
  v_prenom text;
  v_nom text;
  v_name text;
  v_name_rev text;
  v_name_rx text;
  v_name_rev_rx text;
  v_streets text[];
  v_staff text[];
  v_boxes text[];
  v_limit integer := least(greatest(coalesce(p_limit, 8), 1), 15);
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 120), 1), 365));
  v_internal_rx constant text := '@([a-z0-9-]+\.)*(immo-rama|logisorama)\.ch$';
  v_finance_rx constant text := '@([a-z0-9-]+\.)*(stripe\.com|twint\.ch|postfinance\.ch|ubs\.com|credit-suisse\.com|raiffeisen\.ch|bcv\.ch|intrum\.(com|ch)|lowell\.(com|ch)|creditreform\.ch|bexio\.com|banana\.ch|vd\.ch|ge\.ch|admin\.ch)$';
  v_sensitive_rx constant text := '(factur|paiement|paye|payer|virement|versement|acompte|honorair|commission|rembours|impaye|arriere|rappel|mise en demeure|poursuite|commandement de payer|recouvrement|encaiss|contentieux|tribunal|conciliation|avocat|huissier|litige|plainte|expulsion|resiliation|dette|iban|salaire|comptab)';
  v_signal_rx constant text := '(visites?|confirm[a-z]*|annul[a-z]*|report[a-z]*|retenue?s?|refus[a-z]*|accept[a-z]*|attribu[a-z]*|dossier complet|dossier incomplet|candidature|contrat|bail|signature|cles|etat des lieux|liste d.attente|plus disponible|disponible|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|[0-9]{1,2}[./][0-9]{1,2}([./][0-9]{2,4})?|[0-9]{1,2} ?(h|:) ?[0-9]{2})';
  v_stop constant text[] := ARRAY['les', 'des', 'van', 'von', 'del', 'dos', 'das', 'madame', 'monsieur', 'client', 'cliente', 'test', 'admin', 'info', 'contact', 'demo'];
  v_result jsonb;
BEGIN
  SELECT c.user_id INTO v_user FROM public.clients c WHERE c.id = p_client_id;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'emails', '[]'::jsonb);
  END IF;

  SELECT array_agg(lower(address)) INTO v_boxes FROM public.shared_mailboxes;
  SELECT array_agg(DISTINCT lower(u.email)) INTO v_staff
    FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
   WHERE r.role::text IN ('admin', 'agent', 'coursier', 'closeur', 'automation_operator') AND u.email IS NOT NULL;
  v_boxes := coalesce(v_boxes, '{}');
  v_staff := coalesce(v_staff, '{}');

  -- Adresse de connexion confirmée : la seule adresse de confiance (profil et personnes rattachées
  -- sont modifiables par le client). Jamais une adresse de l'agence, d'une boîte ou du personnel.
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_user AND u.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL OR v_email ~ v_internal_rx OR v_email = ANY (v_boxes) OR v_email = ANY (v_staff) THEN
    v_email := NULL;
  END IF;

  -- Nom complet : seulement s'il est distinctif et n'appartient à aucune autre personne connue
  -- (homonyme réel, ou nom repris d'un autre client : aucune correspondance par le nom).
  SELECT trim(p.prenom), trim(p.nom) INTO v_prenom, v_nom FROM public.profiles p WHERE p.id = v_user;
  IF length(coalesce(v_prenom, '')) >= 3 AND length(coalesce(v_nom, '')) >= 3
     AND NOT (public.steeve_norm(v_prenom) = ANY (v_stop)) AND NOT (public.steeve_norm(v_nom) = ANY (v_stop)) THEN
    v_name := public.steeve_norm(v_prenom || ' ' || v_nom);
    v_name_rev := public.steeve_norm(v_nom || ' ' || v_prenom);
    IF EXISTS (SELECT 1 FROM public.profiles p
                WHERE p.id <> v_user
                  AND public.steeve_norm(trim(coalesce(p.prenom, '')) || ' ' || trim(coalesce(p.nom, ''))) IN (v_name, v_name_rev))
       OR EXISTS (SELECT 1 FROM public.client_candidates cc
                   WHERE public.steeve_norm(trim(coalesce(cc.prenom, '')) || ' ' || trim(coalesce(cc.nom, ''))) IN (v_name, v_name_rev)) THEN
      v_name := NULL;
    END IF;
  END IF;
  IF v_name IS NOT NULL THEN
    v_name_rx := public.steeve_word_rx(v_name);
    v_name_rev_rx := public.steeve_word_rx(v_name_rev);
    -- Adresses des biens de SES offres et visites (rue et numéro), saisies par l'agence.
    SELECT array_agg(DISTINCT public.steeve_word_rx(s)) INTO v_streets
      FROM (
        SELECT public.steeve_norm(substring(split_part(a, ',', 1) FROM '^([^0-9]*[0-9]+)')) AS s
          FROM (
            SELECT o.adresse AS a FROM public.offres o WHERE o.client_id::text = p_client_id::text
            UNION
            SELECT v.adresse FROM public.visites v WHERE v.client_id::text = p_client_id::text
          ) x
         WHERE a IS NOT NULL
      ) y
     WHERE length(coalesce(s, '')) >= 8 AND s ~ '[a-z]{3}';
  END IF;

  IF v_email IS NULL AND v_streets IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'emails', '[]'::jsonb);
  END IF;

  WITH boxes AS (
    SELECT id FROM public.shared_mailboxes WHERE is_active
  ), base AS (
    SELECT m.*,
           (v_email IS NOT NULL AND m.addrs @> ARRAY[v_email]) AS direct,
           (v_email IS NOT NULL AND m.from_email = v_email) AS from_client,
           (coalesce(m.from_email, '') ~ v_internal_rx OR m.from_email = ANY (v_staff) OR m.from_email = ANY (v_boxes)) AS internal_sender
      FROM public.mailbox_emails m
      JOIN boxes b ON b.id = m.mailbox_id
     WHERE m.received_at >= v_since AND m.received_at <= now() + interval '1 day'
  ), matched AS (
    SELECT b.*,
           (NOT b.direct AND v_streets IS NOT NULL
             AND NOT b.internal_sender
             AND coalesce(b.from_email, '') !~ v_finance_rx
             AND (b.norm_top ~ v_name_rx OR b.norm_top ~ v_name_rev_rx)
             AND EXISTS (SELECT 1 FROM unnest(v_streets) s WHERE b.norm_top ~ s)) AS mention
      FROM base b
     WHERE b.direct OR v_streets IS NOT NULL
  ), kept AS (
    SELECT DISTINCT ON (coalesce(message_key, id::text), coalesce(from_email, '')) *
      FROM matched
     WHERE direct OR mention
     ORDER BY coalesce(message_key, id::text), coalesce(from_email, ''), received_at
  ), ranked AS (
    SELECT *, count(*) OVER () AS total FROM kept ORDER BY received_at DESC NULLS LAST LIMIT v_limit
  ), windowed AS (
    -- Mention : seules comptent les lignes qui nomment le client (une ligne voisine peut concerner
    -- une autre personne : elle n'est jamais lue).
    SELECT r.*,
      CASE WHEN r.direct THEN r.norm_top ELSE (
        SELECT string_agg(l, E'\n' ORDER BY i)
          FROM unnest(string_to_array(r.norm_top, E'\n')) WITH ORDINALITY t(l, i)
         WHERE t.l ~ v_name_rx OR t.l ~ v_name_rev_rx
      ) END AS win
      FROM ranked r
  ), described AS (
    SELECT w.*,
      (coalesce(w.win, '') ~ v_sensitive_rx OR coalesce(w.from_email, '') ~ v_finance_rx) AS sensible,
      CASE
        WHEN w.from_client THEN 'le client lui-même'
        WHEN w.internal_sender THEN 'équipe Logisorama / Immo-Rama'
        WHEN coalesce(w.from_email, '') ~ '@([a-z0-9-]+\.)*(flatfox|homegate|immobilier|comparis|realadvisor|immoscout24|newhome|anibis|swissmarketplace|acheter-louer)\.(ch|com)$' THEN 'portail immobilier'
        ELSE 'régie, bailleur ou autre expéditeur'
      END AS expediteur,
      CASE WHEN w.mention AND w.win IS NOT NULL THEN (
        SELECT array_agg(DISTINCT sig[1] ORDER BY sig[1]) FROM regexp_matches(w.win, v_signal_rx, 'g') AS sig
      ) END AS signaux
      FROM windowed w
  )
  SELECT jsonb_build_object(
    'total', coalesce(max(total), 0),
    'emails', coalesce(jsonb_agg(
      CASE WHEN direct THEN jsonb_build_object(
        'type', 'échange direct avec le client',
        'date', to_char(received_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
        'expediteur', expediteur,
        'objet', left(public.steeve_redact(subject), 200),
        'extrait', left(public.steeve_redact(regexp_replace(coalesce(top_text, ''), '[[:space:]]+', ' ', 'g')), 900),
        'sensible', sensible)
      ELSE jsonb_build_object(
        'type', 'e-mail reçu par l''agence qui mentionne le client',
        'date', to_char(received_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
        'expediteur', expediteur,
        'reperes', CASE WHEN sensible THEN '[]'::jsonb ELSE to_jsonb(coalesce(signaux, '{}'::text[])) END,
        'sensible', sensible)
      END ORDER BY received_at DESC NULLS LAST), '[]'::jsonb)
  ) INTO v_result
  FROM described;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_emails(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_emails(uuid, integer, integer) TO service_role;

-- 7) Relève toutes les 5 minutes ; e-mails relevés conservés 180 jours.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-shared-mailboxes') THEN
    PERFORM cron.schedule('sync-shared-mailboxes', '1-59/5 * * * *',
      $cmd$SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/sync-shared-mailboxes', headers := private.edge_service_headers(), body := '{"source":"cron"}'::jsonb, timeout_milliseconds := 120000);$cmd$);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-mailbox-emails') THEN
    PERFORM cron.schedule('purge-mailbox-emails', '23 3 * * *',
      $cmd$DELETE FROM public.mailbox_emails WHERE received_at < now() - interval '180 days';$cmd$);
  END IF;
END;
$$;
