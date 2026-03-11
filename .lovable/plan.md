

## Plan: Cleanup and Secret Configuration

Two actions to perform:

### 1. Delete orphaned file
Delete `supabase/functions/_shared/result-ingestion.ts` — it is the only file in `_shared/` and is not imported by any function (logic was inlined into both edge functions).

### 2. Add `AI_RELOCATION_WEBHOOK_SECRET` secret
Use the `add_secret` tool to prompt for the webhook secret value. This is required before the `ai-relocation-webhook` function can authenticate incoming requests.

Generate a strong value with: `openssl rand -hex 32`

### Technical note (no action now)
The duplicated inline shared logic (`ingestResults`, `buildCriteriaSnapshot`) in both `ai-relocation-api` and `ai-relocation-webhook` is accepted for now. A refactoring to deduplicate this should be planned for a future step to prevent drift.

