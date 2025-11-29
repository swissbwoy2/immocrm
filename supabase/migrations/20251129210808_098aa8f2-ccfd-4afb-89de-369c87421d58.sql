-- Table pour stocker les emails reçus
CREATE TABLE public.received_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  folder TEXT DEFAULT 'INBOX',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Table pour la configuration IMAP
CREATE TABLE public.imap_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_user TEXT NOT NULL,
  imap_password TEXT NOT NULL,
  imap_secure BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.received_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imap_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies for received_emails
CREATE POLICY "Users can view their own received emails"
ON public.received_emails FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own received emails"
ON public.received_emails FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own received emails"
ON public.received_emails FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own received emails"
ON public.received_emails FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for imap_configurations
CREATE POLICY "Users can view their own imap config"
ON public.imap_configurations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imap config"
ON public.imap_configurations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imap config"
ON public.imap_configurations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imap config"
ON public.imap_configurations FOR DELETE
USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX idx_received_emails_user_id ON public.received_emails(user_id);
CREATE INDEX idx_received_emails_received_at ON public.received_emails(received_at DESC);
CREATE INDEX idx_received_emails_is_read ON public.received_emails(user_id, is_read);