// Désinscription des e-mails marketing (jetons email_unsubscribe_tokens → email_unsubscribes).
// GET ?token= : vérifie le jeton. POST {token} ou ?token= : désinscrit (one-click compatible).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = new URL(req.url)
  let token = url.searchParams.get('token') ?? ''
  if (req.method === 'POST' && !token) {
    try { token = String((await req.json())?.token ?? '') } catch { /* corps vide */ }
  }
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'Lien de désinscription invalide.' }, 400)

  const { data: row } = await admin.from('email_unsubscribe_tokens').select('email, used_at').eq('token', token).maybeSingle()
  if (!row?.email) return json({ error: 'Lien de désinscription invalide ou expiré.' }, 404)
  const email = String(row.email).toLowerCase()

  const { data: existing } = await admin.from('email_unsubscribes').select('id').ilike('email', email).limit(1)
  if (req.method === 'GET') return json({ valid: true, already_unsubscribed: !!existing?.length })

  if (existing?.length) return json({ success: true, reason: 'already_unsubscribed' })
  const { error } = await admin.from('email_unsubscribes').insert({ email, campaign_key: 'candidat_suivi_activation', source: 'unsubscribe_link' })
  if (error) return json({ success: false, error: error.message }, 500)
  await admin.from('email_unsubscribe_tokens').update({ used_at: new Date().toISOString() }).eq('token', token)
  return json({ success: true })
})
