-- Add email_sent column to track which notifications have been emailed
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Add index for efficient querying of pending emails
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending 
ON public.notifications (email_sent, created_at) 
WHERE email_sent = false;