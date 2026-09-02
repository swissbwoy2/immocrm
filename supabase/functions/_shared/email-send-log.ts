// Journalisation applicative des envois d'e-mails (table email_send_log).
// Notification uniquement : l'écriture d'une ligne ne décide jamais du résultat d'un envoi.
// Statuts autorisés par la contrainte CHECK :
// 'pending' | 'sent' | 'suppressed' | 'failed' | 'bounced' | 'complained' | 'dlq'

// deno-lint-ignore-file no-explicit-any
type AnyClient = { from: (table: string) => any }

export type EmailLogStatus = 'sent' | 'suppressed' | 'failed'

export async function logEmailSend(
  supabase: AnyClient,
  entry: {
    templateName: string
    recipientEmail: string
    status: EmailLogStatus
    errorMessage?: string | null
    messageId?: string | null
  },
): Promise<void> {
  const { error } = await supabase.from('email_send_log').insert({
    message_id: entry.messageId ?? null,
    template_name: entry.templateName,
    recipient_email: entry.recipientEmail,
    status: entry.status,
    error_message: entry.errorMessage ? entry.errorMessage.slice(0, 1000) : null,
  })

  if (error) {
    console.error('Failed to write email_send_log', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      template_name: entry.templateName,
      status: entry.status,
    })
  }
}
