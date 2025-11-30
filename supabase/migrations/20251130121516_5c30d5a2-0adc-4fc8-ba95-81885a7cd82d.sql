-- Add email notification preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notifications_email boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.notifications_email IS 'Preference for receiving notification emails';