SELECT cron.schedule(
  'extract-offre-images-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/extract-offre-images',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"limit": 10}'::jsonb
  );
  $$
);