
CREATE TABLE IF NOT EXISTS public.whatsapp_unknown_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE,
  display_name text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'nouveau',
  assigned_to_client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_unknown_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_unknown_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  content text NOT NULL,
  meta_message_id text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_unknown_msgs_conv ON public.whatsapp_unknown_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_unknown_conv_last ON public.whatsapp_unknown_conversations(last_message_at DESC);

ALTER TABLE public.whatsapp_unknown_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_unknown_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view unknown conversations"
  ON public.whatsapp_unknown_conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE POLICY "Staff can update unknown conversations"
  ON public.whatsapp_unknown_conversations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE POLICY "Staff can view unknown messages"
  ON public.whatsapp_unknown_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE POLICY "Staff can update unknown messages"
  ON public.whatsapp_unknown_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE TRIGGER trg_wa_unknown_conv_updated
  BEFORE UPDATE ON public.whatsapp_unknown_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_unknown_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_unknown_conversations;
