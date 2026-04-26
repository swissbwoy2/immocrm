-- 1. Colonne pour compter les renouvellements
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS mandat_renewal_count INTEGER NOT NULL DEFAULT 0;

-- 2. Table : historique des actions de renouvellement
CREATE TABLE IF NOT EXISTS public.mandate_renewal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('renewed', 'cancelled', 'auto_renewed')),
  triggered_by TEXT NOT NULL DEFAULT 'system' CHECK (triggered_by IN ('client', 'system', 'admin')),
  previous_signature_date TIMESTAMPTZ,
  new_signature_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_renewal_actions_client ON public.mandate_renewal_actions(client_id, created_at DESC);
ALTER TABLE public.mandate_renewal_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all renewal actions"
  ON public.mandate_renewal_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can view actions of their clients"
  ON public.mandate_renewal_actions FOR SELECT TO authenticated
  USING (public.is_agent_of_client_record(client_id));
CREATE POLICY "Clients can view their own renewal actions"
  ON public.mandate_renewal_actions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.user_id = auth.uid()));

-- 3. Table : journal des relances envoyées (anti-doublon journalier)
CREATE TABLE IF NOT EXISTS public.mandate_renewal_reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  days_remaining INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'notification', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, reminder_date)
);
CREATE INDEX IF NOT EXISTS idx_reminders_log_date ON public.mandate_renewal_reminders_log(reminder_date);
ALTER TABLE public.mandate_renewal_reminders_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all reminder logs"
  ON public.mandate_renewal_reminders_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Table : tokens pour les CTA "Renouveler"/"Annuler" dans les emails
CREATE TABLE IF NOT EXISTS public.mandate_renewal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 days'),
  used_at TIMESTAMPTZ,
  used_action TEXT CHECK (used_action IN ('renewed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_renewal_tokens_token ON public.mandate_renewal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_renewal_tokens_client ON public.mandate_renewal_tokens(client_id);
ALTER TABLE public.mandate_renewal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all renewal tokens"
  ON public.mandate_renewal_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));