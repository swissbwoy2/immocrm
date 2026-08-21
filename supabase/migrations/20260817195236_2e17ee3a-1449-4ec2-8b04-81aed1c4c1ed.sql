-- Intentionally neutralized: the original migration embedded a shared secret
-- in source control and in cron commands. Its behavior is superseded by
-- 20260821213000_secure_internal_dispatch.sql, which resolves the service
-- credential from Supabase Vault at execution time.
SELECT 1;
