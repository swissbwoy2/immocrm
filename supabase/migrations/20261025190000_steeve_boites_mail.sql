-- Steeve, lot 2b : lecture des boîtes e-mail de l'entreprise, limitée au dossier du client.
-- Additive et idempotente.
--  - shared_mailboxes : boîtes lues par Steeve (info@, martins@, relocation@, visites@, boîtes Logisorama…).
--    Le mot de passe est rangé dans le coffre (Vault) ; il n'est jamais relisible depuis l'application.
--    Une boîte sans mot de passe propre utilise la configuration IMAP existante de la même adresse (info@).
--  - mailbox_emails : e-mails relevés par la fonction sync-shared-mailboxes (réservés aux admins).
--  - steeve_client_emails : seule porte d'accès de Steeve. Elle ne renvoie que les e-mails qui concernent
--    le client (ses adresses ou son nom complet), sous forme d'extraits masqués.

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
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_mailboxes_address_check CHECK (address ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  CONSTRAINT shared_mailboxes_port_check CHECK (imap_port BETWEEN 1 AND 65535)
);
-- Aucune politique : lecture et écriture uniquement par les fonctions ci-dessous (et la clé de service).
ALTER TABLE public.shared_mailboxes ENABLE ROW LEVEL SECURITY;

INSERT INTO public.shared_mailboxes (address, label, is_active) VALUES
  ('info@immo-rama.ch', 'Info Immo-Rama', true),
  ('martins@immo-rama.ch', 'Martins', false),
  ('relocation@immo-rama.ch', 'Relocation', false),
  ('visites@immo-rama.ch', 'Visites', false)
ON CONFLICT (address) DO NOTHING;

-- 2) E-mails relevés
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
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mailbox_emails_uid_key UNIQUE (mailbox_id, uid_validity, uid)
);
CREATE INDEX IF NOT EXISTS mailbox_emails_received_idx ON public.mailbox_emails (received_at DESC);
CREATE INDEX IF NOT EXISTS mailbox_emails_key_idx ON public.mailbox_emails (message_key);

ALTER TABLE public.mailbox_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent les e-mails des boîtes partagées" ON public.mailbox_emails;
CREATE POLICY "Admins lisent les e-mails des boîtes partagées" ON public.mailbox_emails
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Gestion par un admin (écran « Boîtes e-mail lues par Steeve »)
CREATE OR REPLACE FUNCTION public.admin_list_shared_mailboxes()
RETURNS TABLE (
  id uuid, address text, label text, imap_host text, imap_port integer, is_active boolean,
  has_password boolean, uses_inbox_config boolean, last_sync_at timestamptz, last_error text,
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
  SELECT m.id, m.address, m.label, m.imap_host, m.imap_port, m.is_active,
         m.secret_id IS NOT NULL,
         m.secret_id IS NULL AND EXISTS (
           SELECT 1 FROM public.imap_configurations ic
            WHERE lower(ic.imap_user) = lower(m.address) AND ic.is_active AND coalesce(ic.imap_password, '') <> ''),
         m.last_sync_at, m.last_error, m.pending_count,
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
  v_secret uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.shared_mailboxes (address, label, imap_host, imap_port, is_active)
    VALUES (v_address, nullif(trim(coalesce(p_label, '')), ''), coalesce(nullif(trim(p_imap_host), ''), 'mail.infomaniak.com'),
            coalesce(p_imap_port, 993), coalesce(p_is_active, true))
    RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_old FROM public.shared_mailboxes WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Boîte introuvable' USING ERRCODE = 'P0002';
    END IF;
    UPDATE public.shared_mailboxes
       SET address = v_address,
           label = nullif(trim(coalesce(p_label, '')), ''),
           imap_host = coalesce(nullif(trim(p_imap_host), ''), 'mail.infomaniak.com'),
           imap_port = coalesce(p_imap_port, 993),
           is_active = coalesce(p_is_active, true),
           last_error = NULL,
           updated_at = now(),
           -- Autre adresse ou autre serveur : la relève repart de zéro pour cette boîte.
           uid_validity = CASE WHEN v_old.address <> v_address OR v_old.imap_host <> coalesce(nullif(trim(p_imap_host), ''), 'mail.infomaniak.com')
                               THEN NULL ELSE uid_validity END,
           last_uid = CASE WHEN v_old.address <> v_address OR v_old.imap_host <> coalesce(nullif(trim(p_imap_host), ''), 'mail.infomaniak.com')
                           THEN NULL ELSE last_uid END
     WHERE id = v_id;
  END IF;

  IF coalesce(p_password, '') <> '' THEN
    SELECT secret_id INTO v_secret FROM public.shared_mailboxes WHERE id = v_id;
    IF v_secret IS NULL THEN
      v_secret := vault.create_secret(p_password, 'shared_mailbox_' || v_id::text, 'Mot de passe IMAP ' || v_address);
      UPDATE public.shared_mailboxes SET secret_id = v_secret WHERE id = v_id;
    ELSE
      PERFORM vault.update_secret(v_secret, p_password);
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

-- 4) Mot de passe d'une boîte, pour la seule fonction de relève (clé de service).
CREATE OR REPLACE FUNCTION public.shared_mailbox_credentials(p_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.shared_mailboxes%ROWTYPE;
  v_password text;
BEGIN
  SELECT * INTO v FROM public.shared_mailboxes WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v.secret_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_password FROM vault.decrypted_secrets WHERE id = v.secret_id;
  ELSE
    SELECT ic.imap_password INTO v_password
      FROM public.imap_configurations ic
     WHERE lower(ic.imap_user) = lower(v.address) AND ic.is_active
     ORDER BY ic.updated_at DESC NULLS LAST
     LIMIT 1;
  END IF;
  RETURN nullif(v_password, '');
END;
$$;
REVOKE ALL ON FUNCTION public.shared_mailbox_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shared_mailbox_credentials(uuid) TO service_role;

-- 5) Outils de texte : comparaison sans accents, masquage des coordonnées.
CREATE OR REPLACE FUNCTION public.steeve_norm(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(translate(coalesce(t, ''),
    'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝýÿ’',
    'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYyy'''));
$$;

CREATE OR REPLACE FUNCTION public.steeve_redact(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(t, ''),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[e-mail]', 'g'),
    'CH[0-9]{2} ?([0-9A-Z]{4} ?){4}[0-9A-Z]', '[IBAN]', 'gi'),
    '756[. ]?[0-9]{4}[. ]?[0-9]{4}[. ]?[0-9]{2}', '[n° AVS]', 'g'),
    '((\+|00)(41|33)[ .-]?)?\(?0?\)?[0-9]{2}[ .-]?[0-9]{3}[ .-]?[0-9]{2}[ .-]?[0-9]{2}', '[téléphone]', 'g');
$$;

-- Texte utile d'un e-mail : sans les lignes citées (« > ») ni l'historique de la discussion.
CREATE OR REPLACE FUNCTION public.steeve_email_top(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH s AS (
    SELECT regexp_replace(coalesce(t, ''), '(^|\n)>[^\n]*', '', 'g') AS b
  ), cut AS (
    SELECT b, regexp_instr(b,
      '\n[ \t]*(-{2,}[ \t]*(Original Message|Message d.origine|Ursprüngliche Nachricht)|Le [^\n]{4,120} a écrit ?:|On [^\n]{4,120} wrote:|Am [^\n]{4,120} schrieb|De ?:[^\n]*\n[ \t]*(Envoyé|Date) ?:|From:[^\n]*\n[ \t]*(Sent|Date):)',
      1, 1, 0, 'i') AS p
    FROM s
  )
  SELECT CASE WHEN p > 0 THEN left(b, p - 1) ELSE b END FROM cut;
$$;

-- 6) E-mails qui concernent un client, pour Steeve uniquement (clé de service).
--    Correspondance : une adresse du client ou d'une personne de son dossier (expéditeur, destinataires),
--    ou son nom complet dans l'objet ou le texte. Les e-mails internes (immo-rama.ch, logisorama.ch) ne sont
--    retenus que si le client en est destinataire. Seules les boîtes déclarées dans shared_mailboxes sont lues.
CREATE OR REPLACE FUNCTION public.steeve_client_emails(p_client_id uuid, p_limit integer DEFAULT 8, p_days integer DEFAULT 120)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_addresses text[];
  v_names text[];
  v_limit integer := least(greatest(coalesce(p_limit, 8), 1), 15);
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 120), 1), 365));
  v_result jsonb;
BEGIN
  WITH people AS (
    SELECT p.email, p.prenom, p.nom
      FROM public.clients c JOIN public.profiles p ON p.id = c.user_id
     WHERE c.id = p_client_id
    UNION ALL
    SELECT cc.email, cc.prenom, cc.nom FROM public.client_candidates cc WHERE cc.client_id = p_client_id
  )
  SELECT
    array_agg(DISTINCT lower(trim(email))) FILTER (WHERE trim(coalesce(email, '')) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$'),
    array_agg(DISTINCT n) FILTER (WHERE n IS NOT NULL)
    INTO v_addresses, v_names
    FROM people
    LEFT JOIN LATERAL (
      SELECT unnest(ARRAY[
        public.steeve_norm(trim(prenom) || ' ' || trim(nom)),
        public.steeve_norm(trim(nom) || ' ' || trim(prenom))
      ]) AS n
      WHERE length(trim(coalesce(prenom, ''))) >= 2 AND length(trim(coalesce(nom, ''))) >= 2
    ) names ON true;

  IF coalesce(array_length(v_addresses, 1), 0) = 0 AND coalesce(array_length(v_names, 1), 0) = 0 THEN
    RETURN jsonb_build_object('total', 0, 'emails', '[]'::jsonb);
  END IF;
  v_addresses := coalesce(v_addresses, '{}');
  v_names := coalesce(v_names, '{}');

  WITH boxes AS (
    SELECT id, lower(address) AS address FROM public.shared_mailboxes WHERE is_active
  ), src AS (
    SELECT 1 AS prio, m.mailbox, coalesce(m.message_key, m.id::text) AS k,
           lower(coalesce(m.from_email, '')) AS from_e,
           lower(coalesce(m.to_emails, '') || ' ' || coalesce(m.cc_emails, '')) AS rcpt,
           coalesce(m.subject, '') AS subject, public.steeve_email_top(m.body_text) AS body, m.received_at
      FROM public.mailbox_emails m JOIN boxes b ON b.id = m.mailbox_id
     WHERE m.received_at >= v_since
    UNION ALL
    -- Historique de la relève existante (info@) : même boîte, mêmes règles.
    SELECT 2, ic.imap_user,
           CASE WHEN left(r.message_id, length(ic.imap_user) + 1) = ic.imap_user || '_'
                THEN substr(r.message_id, length(ic.imap_user) + 2) ELSE r.message_id END,
           lower(coalesce(r.from_email, '')), lower(coalesce(r.to_email, '')),
           coalesce(r.subject, ''), public.steeve_email_top(r.body_text), r.received_at
      FROM public.received_emails r
      JOIN public.imap_configurations ic ON ic.user_id = r.user_id
      JOIN boxes b ON b.address = lower(ic.imap_user)
     WHERE r.received_at >= v_since
  ), scored AS (
    SELECT s.*,
           EXISTS (SELECT 1 FROM unnest(v_addresses) a WHERE s.from_e = a OR position(a IN s.from_e) > 0) AS from_client,
           EXISTS (SELECT 1 FROM unnest(v_addresses) a WHERE position(a IN s.rcpt) > 0) AS to_client,
           (SELECT min(nullif(position(n IN public.steeve_norm(s.subject || E'\n' || s.body)), 0)) FROM unnest(v_names) n) AS name_pos,
           split_part(s.from_e, '@', 2) AS from_domain
      FROM src s
  ), kept AS (
    SELECT DISTINCT ON (k) *
      FROM scored
     WHERE (from_client OR to_client OR name_pos IS NOT NULL)
       AND NOT (from_domain IN ('immo-rama.ch', 'logisorama.ch') AND NOT to_client)
     ORDER BY k, prio, received_at DESC
  ), ranked AS (
    SELECT *, count(*) OVER () AS total FROM kept ORDER BY received_at DESC NULLS LAST LIMIT v_limit
  )
  SELECT jsonb_build_object(
    'total', coalesce(max(total), 0),
    'emails', coalesce(jsonb_agg(jsonb_build_object(
      'date', to_char(received_at AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
      'boite', mailbox,
      'expediteur', CASE
        WHEN from_client THEN 'le client ou une personne de son dossier'
        WHEN from_domain IN ('immo-rama.ch', 'logisorama.ch') THEN 'équipe Logisorama / Immo-Rama'
        WHEN from_domain ~ '(flatfox|homegate|immobilier\.ch|comparis|realadvisor|immoscout24|newhome|anibis|swissmarketplace|acheter-louer)' THEN 'portail immobilier'
        ELSE 'régie, bailleur ou autre expéditeur' END,
      'objet', left(public.steeve_redact(subject), 200),
      'extrait', public.steeve_redact(regexp_replace(
        CASE WHEN name_pos IS NOT NULL
             THEN substr(subject || E'\n' || body, greatest(1, name_pos - 300), 900)
             ELSE left(body, 900) END,
        '[[:space:]]+', ' ', 'g')),
      'sensible', (public.steeve_norm(subject || ' ' || body) ~
        '(facture|paiement|rappel de paiement|mise en demeure|poursuite|commandement de payer|recouvrement|encaissement|contentieux|tribunal|avocat|litige|plainte|dette)'
        OR from_domain IN ('intrum.com', 'intrum.ch', 'lowell.ch', 'lowell.com', 'creditreform.ch'))
    ) ORDER BY received_at DESC NULLS LAST), '[]'::jsonb)
  ) INTO v_result
  FROM ranked;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.steeve_client_emails(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.steeve_client_emails(uuid, integer, integer) TO service_role;

-- 7) Relève des boîtes toutes les 5 minutes (fonction sync-shared-mailboxes).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-shared-mailboxes') THEN
    PERFORM cron.schedule('sync-shared-mailboxes', '1-59/5 * * * *',
      $cmd$SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/sync-shared-mailboxes', headers := private.edge_service_headers(), body := '{"source":"cron"}'::jsonb, timeout_milliseconds := 60000);$cmd$);
  END IF;
END;
$$;
