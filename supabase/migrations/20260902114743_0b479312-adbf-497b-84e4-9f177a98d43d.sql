SELECT cron.alter_job(3, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-etat-lieux-reminders', headers := private.edge_service_headers(), body := '{}'::jsonb);
$cmd$);
SELECT cron.alter_job(4, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-signature-reminders', headers := private.edge_service_headers(), body := '{}'::jsonb);
$cmd$);
SELECT cron.alter_job(5, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/smart-followups', headers := private.edge_service_headers(), body := '{}'::jsonb);
$cmd$);
SELECT cron.alter_job(6, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-document-update-reminders', headers := private.edge_service_headers(), body := '{"triggered_by": "cron"}'::jsonb);
$cmd$);
SELECT cron.alter_job(7, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-phone-appointment-reminders', headers := private.edge_service_headers(), body := '{}'::jsonb);
$cmd$);
SELECT cron.alter_job(8, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-payslip-update-reminders', headers := private.edge_service_headers(), body := jsonb_build_object('triggered_at', now()));
$cmd$);
SELECT cron.alter_job(9, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-document-update-reminders', headers := private.edge_service_headers(), body := jsonb_build_object('triggered_at', now()));
$cmd$);
SELECT cron.alter_job(10, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-document-update-reminders', headers := private.edge_service_headers(), body := jsonb_build_object('triggered_at', now()));
$cmd$);
SELECT cron.alter_job(14, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/sync-all-imap-emails', headers := private.edge_service_headers(), body := '{"source": "cron"}'::jsonb);
$cmd$);
SELECT cron.alter_job(15, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-visit-reminders', headers := private.edge_service_headers(), body := '{}'::jsonb);
$cmd$);
SELECT cron.alter_job(24, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/cron-comptes-rendus-retard', headers := private.edge_service_headers(), body := '{}'::jsonb);
$cmd$);
SELECT cron.alter_job(71, command => $cmd$
  SELECT net.http_post(url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/auto-offers-daily-digest', headers := private.edge_service_headers(), body := '{"trigger":"cron"}'::jsonb);
$cmd$);