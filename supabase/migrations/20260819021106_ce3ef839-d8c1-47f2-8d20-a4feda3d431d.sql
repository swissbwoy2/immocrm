ALTER TABLE public.conversations_annonces
  ALTER COLUMN participant_1_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_nom text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_telephone text;

ALTER TABLE public.messages_annonces
  ALTER COLUMN expediteur_id DROP NOT NULL;

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
  v_title text;
BEGIN
  SELECT * INTO v_conv FROM public.conversations_annonces WHERE id = NEW.conversation_id;
  IF v_conv.id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.conversations_annonces
     SET dernier_message_at = COALESCE(NEW.created_at, now())
   WHERE id = v_conv.id;

  IF NEW.expediteur_id IS NULL THEN
    v_recipient := v_conv.participant_2_id;
  ELSIF NEW.expediteur_id = v_conv.participant_1_id THEN
    v_recipient := v_conv.participant_2_id;
  ELSE
    v_recipient := v_conv.participant_1_id;
  END IF;
  IF v_recipient IS NULL THEN RETURN NEW; END IF;

  SELECT a.titre, an.user_id INTO v_titre, v_owner
    FROM public.annonces_publiques a
    LEFT JOIN public.annonceurs an ON an.id = a.annonceur_id
   WHERE a.id = v_conv.annonce_id;

  IF v_recipient = v_owner THEN
    v_link := '/espace-annonceur/messages/' || v_conv.id;
  ELSE
    v_link := '/mes-messages-annonces/' || v_conv.id;
  END IF;

  v_title := CASE WHEN NEW.expediteur_id IS NULL THEN 'Nouvelle demande de contact' ELSE 'Nouveau message' END;

  PERFORM public.create_notification(
    v_recipient,
    'new_message',
    v_title,
    COALESCE(v_titre, 'Annonce') || ' — ' || left(COALESCE(NEW.contenu, ''), 120),
    v_link,
    NULL
  );

  RETURN NEW;
END;
$$;