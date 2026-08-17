
-- 1. Grants missing on messaging tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations_annonces TO authenticated;
GRANT ALL ON public.conversations_annonces TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages_annonces TO authenticated;
GRANT ALL ON public.messages_annonces TO service_role;

-- 2. Dedup conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_annonces_unique
  ON public.conversations_annonces (annonce_id, participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_msg_annonces_conv ON public.messages_annonces (conversation_id, created_at);

-- 3. Realtime
ALTER TABLE public.messages_annonces REPLICA IDENTITY FULL;
ALTER TABLE public.conversations_annonces REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_annonces;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations_annonces;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 4. Notify on new message
CREATE OR REPLACE FUNCTION public.notify_on_new_annonce_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.conversations_annonces%ROWTYPE;
  v_recipient uuid;
  v_titre text;
  v_owner uuid;
  v_link text;
BEGIN
  SELECT * INTO v_conv FROM public.conversations_annonces WHERE id = NEW.conversation_id;
  IF v_conv.id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.conversations_annonces
     SET dernier_message_at = COALESCE(NEW.created_at, now())
   WHERE id = v_conv.id;

  v_recipient := CASE WHEN NEW.expediteur_id = v_conv.participant_1_id
                      THEN v_conv.participant_2_id ELSE v_conv.participant_1_id END;
  IF v_recipient IS NULL THEN RETURN NEW; END IF;

  SELECT a.titre, an.user_id INTO v_titre, v_owner
    FROM public.annonces_publiques a
    LEFT JOIN public.annonceurs an ON an.id = a.annonceur_id
   WHERE a.id = v_conv.annonce_id;

  IF v_recipient = v_owner THEN
    v_link := '/espace-annonceur/messages/' || v_conv.id;
  ELSE
    v_link := '/mes-messages-annonces?c=' || v_conv.id;
  END IF;

  PERFORM public.create_notification(
    v_recipient,
    'new_message',
    'Nouveau message',
    COALESCE(v_titre, 'Annonce') || ' — ' || left(COALESCE(NEW.contenu, ''), 120),
    v_link,
    jsonb_build_object('conversation_annonce_id', v_conv.id, 'annonce_id', v_conv.annonce_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_annonce_message ON public.messages_annonces;
CREATE TRIGGER trg_notify_on_new_annonce_message
AFTER INSERT ON public.messages_annonces
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_annonce_message();

-- 5. Alertes
CREATE TABLE IF NOT EXISTS public.alertes_annonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  nom text,
  criteres jsonb NOT NULL DEFAULT '{}'::jsonb,
  actif boolean NOT NULL DEFAULT true,
  frequence text NOT NULL DEFAULT 'instantane',
  derniere_notif_at timestamptz,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertes_annonces TO authenticated;
GRANT INSERT ON public.alertes_annonces TO anon;
GRANT ALL ON public.alertes_annonces TO service_role;

ALTER TABLE public.alertes_annonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alertes"
  ON public.alertes_annonces FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Guests can create alertes"
  ON public.alertes_annonces FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND email IS NOT NULL);

CREATE POLICY "Admins manage alertes"
  ON public.alertes_annonces FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_alertes_annonces_updated_at
BEFORE UPDATE ON public.alertes_annonces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_alertes_annonces_actif ON public.alertes_annonces (actif) WHERE actif;
CREATE INDEX IF NOT EXISTS idx_alertes_annonces_user ON public.alertes_annonces (user_id);

CREATE TABLE IF NOT EXISTS public.alertes_annonces_envois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerte_id uuid NOT NULL REFERENCES public.alertes_annonces(id) ON DELETE CASCADE,
  annonce_id uuid NOT NULL REFERENCES public.annonces_publiques(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alerte_id, annonce_id)
);

GRANT SELECT ON public.alertes_annonces_envois TO authenticated;
GRANT ALL ON public.alertes_annonces_envois TO service_role;
ALTER TABLE public.alertes_annonces_envois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own alerte envois"
  ON public.alertes_annonces_envois FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alertes_annonces a WHERE a.id = alerte_id AND a.user_id = auth.uid()));
