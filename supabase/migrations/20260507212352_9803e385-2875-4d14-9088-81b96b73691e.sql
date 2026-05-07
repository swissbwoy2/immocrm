-- 1. Colonnes idempotency pour rappel J-1
ALTER TABLE public.visites ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE public.visites ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ;

-- 2. Unschedule existing (idempotent)
DO $$
DECLARE
  j TEXT;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'wa-visit-reminder-daily',
    'wa-post-visite-tick',
    'wa-google-review-daily',
    'wa-mandate-expiring-daily'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(j);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 3. Schedule cron jobs (UTC times; 08:00 UTC ≈ 09:00-10:00 Europe/Zurich)
SELECT cron.schedule(
  'wa-visit-reminder-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/wa-send-visit-reminder-24h',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'wa-post-visite-tick',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/wa-send-post-visite',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'wa-google-review-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/wa-send-google-review',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'wa-mandate-expiring-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/wa-send-mandate-expiring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E'
    ),
    body := '{}'::jsonb
  );
  $$
);