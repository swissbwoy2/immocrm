-- Table pour les configurations email SMTP des utilisateurs
CREATE TABLE public.email_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN DEFAULT true,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  email_from TEXT NOT NULL,
  display_name TEXT,
  signature_html TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own email config"
  ON public.email_configurations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email config"
  ON public.email_configurations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email config"
  ON public.email_configurations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email config"
  ON public.email_configurations FOR DELETE
  USING (auth.uid() = user_id);

-- Table pour l'historique des emails envoyés
CREATE TABLE public.sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

-- Policies for sent_emails
CREATE POLICY "Users can view their own sent emails"
  ON public.sent_emails FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can insert their own sent emails"
  ON public.sent_emails FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can view all sent emails"
  ON public.sent_emails FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_email_configurations_updated_at
  BEFORE UPDATE ON public.email_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();