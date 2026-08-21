-- Security hardening: privileged RPCs must never inherit Postgres' default
-- EXECUTE grant to PUBLIC. Keep this migration idempotent and explicit so the
-- deployed ACL cannot silently drift from the repository again.

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_data()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_match_score(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_approval_request(
  public.approval_type, uuid, text, text, uuid, uuid, text, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.renovation_lock_analysis_job(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.renovation_replace_quote_items(uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_old_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_match_score(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_approval_request(
  public.approval_type, uuid, text, text, uuid, uuid, text, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.renovation_lock_analysis_job(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.renovation_replace_quote_items(uuid, jsonb, jsonb) TO service_role;

-- New functions are private by default. Public RPCs must opt in with an
-- explicit GRANT in the migration that creates them.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
