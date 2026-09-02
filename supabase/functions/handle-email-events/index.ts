import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Notification only: Lovable enforces suppression at send time. These writes keep
// the app's own history tables (suppressed_emails, email_send_log, email_unsubscribe_tokens)
// in sync so existing screens and reports keep working.

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

async function record(reason: Reason, recipient: string, eventId: string, messageId?: string | null) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedEmail = String(recipient).toLowerCase()

  // 1. Suppression history (idempotent — safe for redeliveries)
  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email: normalizedEmail, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: eventId,
    })
    throw new Error('Failed to write suppression')
  }

  // 2. Append the outcome to the send log
  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: messageId ?? null,
    template_name: 'system',
    recipient_email: normalizedEmail,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })

  if (logError) {
    console.error('Failed to insert email_send_log', {
      code: logError.code,
      message: logError.message,
      event_id: eventId,
    })
    throw new Error('Failed to write email send log')
  }

  // 3. On unsubscribe, mark the recipient's legacy token as used (no-op when absent)
  if (reason === 'unsubscribe') {
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
      .is('used_at', null)

    if (tokenError) {
      console.error('Failed to mark unsubscribe token as used', {
        code: tokenError.code,
        message: tokenError.message,
        event_id: eventId,
      })
      throw new Error('Failed to update unsubscribe token')
    }
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record('bounce', event.data.recipient, event.event_id, event.data.message_id)
    },
    'email.complaint': async (event) => {
      await record('complaint', event.data.recipient, event.event_id, event.data.message_id)
    },
    'email.unsubscribed': async (event) => {
      await record('unsubscribe', event.data.recipient, event.event_id, event.data.message_id)
    },
  },
})

Deno.serve((req) => handler(req))
