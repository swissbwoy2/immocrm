

## Plan: Configure AI_RELOCATION_WEBHOOK_SECRET

### Action

Use the `add_secret` tool to store the webhook secret with:

- **Name**: `AI_RELOCATION_WEBHOOK_SECRET`  
- **Value**: `1ad850b6a6ff50271ac8266a4029ef71d84c3e5bcf77fc890d094fe22d09b337`

This will make the secret available to both `ai-relocation-api` and `ai-relocation-webhook` edge functions via `Deno.env.get('AI_RELOCATION_WEBHOOK_SECRET')`.

No code changes required — the webhook function already reads this env var.

