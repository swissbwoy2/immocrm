-- Boîte mail de l'admin : toutes les boîtes partagées (shared_mailboxes) avec leurs dossiers complets
-- (Réception, Envoyés, Brouillons, Spam, Corbeille, Archives, dossiers perso), lecture, envoi et brouillons.
-- S'appuie sur les boîtes et les mots de passe déjà gérés par shared_mailboxes (coffre Vault, écran Steeve).
-- Additif uniquement : aucune table existante n'est modifiée en dehors de colonnes ajoutées à shared_mailboxes.
-- Accès : administrateurs. Les fonctions mailbox-sync et mailbox-action écrivent avec la clé de service.

-- 1) Compléments des boîtes partagées : nom d'expéditeur, signature, état de la relève complète.
ALTER TABLE public.shared_mailboxes ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.shared_mailboxes ADD COLUMN IF NOT EXISTS signature_html text;
ALTER TABLE public.shared_mailboxes ADD COLUMN IF NOT EXISTS smtp_port integer NOT NULL DEFAULT 465;
ALTER TABLE public.shared_mailboxes ADD COLUMN IF NOT EXISTS full_sync_at timestamptz;
ALTER TABLE public.shared_mailboxes ADD COLUMN IF NOT EXISTS full_sync_error text;

-- support@immo-rama.ch (demandé) en plus de support@logisorama.ch déjà présent ; mot de passe à saisir.
INSERT INTO public.shared_mailboxes (address, label, is_active) VALUES
  ('support@immo-rama.ch', 'Support Immo-Rama', false)
ON CONFLICT (address) DO NOTHING;

UPDATE public.shared_mailboxes SET display_name = CASE address
    WHEN 'info@immo-rama.ch' THEN 'Immo-Rama.ch'
    WHEN 'visites@immo-rama.ch' THEN 'Immo-rama.ch – Relocation'
    WHEN 'relocation@immo-rama.ch' THEN 'Immo-rama.ch – Relocation'
    WHEN 'martins@immo-rama.ch' THEN 'Immo-rama.ch'
    WHEN 'support@immo-rama.ch' THEN 'Support Immo-rama.ch'
    WHEN 'support@logisorama.ch' THEN 'Support Logisorama'
    ELSE coalesce(label, address) END
 WHERE display_name IS NULL;

-- 2) Dossiers de chaque boîte.
CREATE TABLE IF NOT EXISTS public.mail_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES public.shared_mailboxes(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'other'
    CHECK (role IN ('inbox','sent','drafts','spam','trash','archive','other')),
  delimiter text,
  selectable boolean NOT NULL DEFAULT true,
  uidvalidity bigint,
  uidnext bigint,
  last_uid bigint NOT NULL DEFAULT 0,
  min_uid bigint,
  backfill_done boolean NOT NULL DEFAULT false,
  total_count integer NOT NULL DEFAULT 0,
  unseen_count integer NOT NULL DEFAULT 0,
  present_on_server boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mailbox_id, path)
);

-- 3) Messages : en-têtes et texte copiés ; pièces jointes lues sur le serveur à la demande.
CREATE TABLE IF NOT EXISTS public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES public.shared_mailboxes(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.mail_folders(id) ON DELETE CASCADE,
  uid bigint NOT NULL,
  uidvalidity bigint NOT NULL,
  message_id text,
  in_reply_to text,
  references_header text,
  subject text,
  from_email text,
  from_name text,
  to_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  bcc_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  reply_to jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at timestamptz,
  internal_date timestamptz,
  snippet text,
  body_text text,
  body_html text,
  body_truncated boolean NOT NULL DEFAULT false,
  has_attachments boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  size_bytes integer,
  is_seen boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  is_answered boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  deleted_on_server boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, uidvalidity, uid)
);
CREATE INDEX IF NOT EXISTS mail_messages_liste_idx ON public.mail_messages (folder_id, deleted_on_server, sent_at DESC);
CREATE INDEX IF NOT EXISTS mail_messages_boite_idx ON public.mail_messages (mailbox_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS mail_messages_msgid_idx ON public.mail_messages (message_id);

-- 4) Journal des envois faits depuis l'app (admin, Steeve, routines) et brouillons préparés dans l'app.
CREATE TABLE IF NOT EXISTS public.mail_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES public.shared_mailboxes(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','steeve','chatgpt','routine','agent')),
  kind text NOT NULL DEFAULT 'autre' CHECK (kind IN ('postulation','reponse','transfert','brouillon_valide','autre')),
  statut text NOT NULL DEFAULT 'envoi_en_cours'
    CHECK (statut IN ('brouillon','a_valider','envoi_en_cours','envoye','erreur','annule')),
  to_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  bcc_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  reply_to_message_id uuid REFERENCES public.mail_messages(id) ON DELETE SET NULL,
  draft_message_id uuid REFERENCES public.mail_messages(id) ON DELETE SET NULL,
  sent_message_id text,
  smtp_reply text,
  sent_at timestamptz,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_outbox_recent_idx ON public.mail_outbox (created_at DESC);

ALTER TABLE public.mail_folders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_outbox   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins lisent les dossiers mail" ON public.mail_folders;
CREATE POLICY "Admins lisent les dossiers mail" ON public.mail_folders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins lisent les messages" ON public.mail_messages;
CREATE POLICY "Admins lisent les messages" ON public.mail_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins lisent le journal mail" ON public.mail_outbox;
CREATE POLICY "Admins lisent le journal mail" ON public.mail_outbox
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.mail_folders, public.mail_messages, public.mail_outbox FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.mail_folders, public.mail_messages, public.mail_outbox FROM authenticated;

-- 5) Liste des boîtes pour l'écran Boîte mail (admin), avec l'état de la relève complète.
CREATE OR REPLACE FUNCTION public.admin_mail_boxes()
RETURNS TABLE (
  id uuid, address text, label text, display_name text, signature_html text, is_active boolean,
  has_password boolean, full_sync_at timestamptz, full_sync_error text, inbox_unseen integer, drafts_count integer
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
  SELECT m.id, m.address, m.label, coalesce(m.display_name, m.label, m.address), m.signature_html, m.is_active,
         m.secret_id IS NOT NULL, m.full_sync_at, m.full_sync_error,
         coalesce((SELECT f.unseen_count FROM public.mail_folders f WHERE f.mailbox_id = m.id AND f.role = 'inbox' ORDER BY f.path LIMIT 1), 0),
         coalesce((SELECT f.total_count FROM public.mail_folders f WHERE f.mailbox_id = m.id AND f.role = 'drafts' ORDER BY f.path LIMIT 1), 0)
    FROM public.shared_mailboxes m
   ORDER BY CASE m.address WHEN 'info@immo-rama.ch' THEN 1 WHEN 'visites@immo-rama.ch' THEN 2 WHEN 'relocation@immo-rama.ch' THEN 3
                           WHEN 'martins@immo-rama.ch' THEN 4 WHEN 'support@immo-rama.ch' THEN 5 ELSE 9 END, m.address;
END;
$$;

-- Nom d'expéditeur et signature d'une boîte (admin).
CREATE OR REPLACE FUNCTION public.admin_mail_box_profile(p_id uuid, p_display_name text, p_signature_html text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  UPDATE public.shared_mailboxes
     SET display_name = nullif(trim(coalesce(p_display_name, '')), ''),
         signature_html = nullif(p_signature_html, ''),
         updated_at = now()
   WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mail_boxes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mail_boxes() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_mail_box_profile(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mail_box_profile(uuid, text, text) TO authenticated;

-- 6) Pièces jointes ajoutées depuis l'écran de rédaction (bucket privé, admin).
INSERT INTO storage.buckets (id, name, public) VALUES ('mail-attachments', 'mail-attachments', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Admins déposent les pièces jointes mail" ON storage.objects;
CREATE POLICY "Admins déposent les pièces jointes mail" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mail-attachments' AND public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins lisent les pièces jointes mail" ON storage.objects;
CREATE POLICY "Admins lisent les pièces jointes mail" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'mail-attachments' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 7) Relève complète toutes les 5 minutes (minutes 3, 8, 13… : décalée des autres relèves).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mailbox-sync-admin') THEN
    PERFORM cron.schedule('mailbox-sync-admin', '3-59/5 * * * *',
      $cmd$SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/mailbox-sync', headers := private.edge_service_headers(), body := '{"source":"cron"}'::jsonb, timeout_milliseconds := 120000);$cmd$);
  END IF;
END;
$$;
