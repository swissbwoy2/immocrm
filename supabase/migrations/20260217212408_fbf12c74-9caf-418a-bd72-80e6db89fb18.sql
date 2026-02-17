
-- Create google_calendar_tokens table to store OAuth tokens per user
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Each user can only see and manage their own tokens
CREATE POLICY "Users can view their own Google Calendar tokens"
ON public.google_calendar_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google Calendar tokens"
ON public.google_calendar_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google Calendar tokens"
ON public.google_calendar_tokens
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google Calendar tokens"
ON public.google_calendar_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Allow edge functions (service role) to manage tokens
CREATE POLICY "Service role can manage all Google Calendar tokens"
ON public.google_calendar_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
