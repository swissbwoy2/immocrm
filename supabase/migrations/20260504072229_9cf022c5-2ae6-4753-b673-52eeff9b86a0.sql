CREATE OR REPLACE FUNCTION public.purge_old_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cron_deleted bigint;
  v_http_deleted bigint;
  v_notif_deleted bigint;
  v_emails_deleted bigint;
BEGIN
  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
  GET DIAGNOSTICS v_cron_deleted = ROW_COUNT;

  DELETE FROM net._http_response WHERE created < now() - interval '3 days';
  GET DIAGNOSTICS v_http_deleted = ROW_COUNT;

  DELETE FROM public.notifications
  WHERE (is_read = true AND read_at < now() - interval '30 days')
     OR (is_read = false AND created_at < now() - interval '90 days');
  GET DIAGNOSTICS v_notif_deleted = ROW_COUNT;

  DELETE FROM public.received_emails WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_emails_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'cron_job_run_details_deleted', v_cron_deleted,
    'net_http_response_deleted', v_http_deleted,
    'notifications_deleted', v_notif_deleted,
    'received_emails_deleted', v_emails_deleted,
    'executed_at', now()
  );
END;
$$;