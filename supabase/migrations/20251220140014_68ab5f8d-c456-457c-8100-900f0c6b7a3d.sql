-- Add presence tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Create index for presence queries
CREATE INDEX IF NOT EXISTS idx_profiles_presence ON public.profiles(is_online, last_seen_at);

-- Function to update user presence (called every 60s by active users)
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET last_seen_at = now(), is_online = true
  WHERE id = auth.uid();
END;
$$;

-- Function to set user offline
CREATE OR REPLACE FUNCTION public.set_user_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET is_online = false
  WHERE id = auth.uid();
END;
$$;

-- Function to auto-mark users offline after 2 minutes of inactivity
-- This can be called by a cron job or scheduled function
CREATE OR REPLACE FUNCTION public.mark_inactive_users_offline()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE profiles 
  SET is_online = false
  WHERE is_online = true 
    AND last_seen_at < now() - interval '2 minutes';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;