import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user }, error: uErr } = await userClient.auth.getUser()
    if (uErr || !user) return json({ error: 'Non authentifié' }, 401)

    // (a) crédits -> résilié
    const { error: rErr } = await userClient.rpc('resilier_mandat')
    if (rErr) return json({ error: rErr.message }, 400)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const now = new Date()
    const today = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })

    // (b) stoppe le mandat client (mécanisme d'annulation existant)
    const { error: cErr } = await admin.from('clients').update({
      statut: 'stoppe',
      cancellation_requested_at: now.toISOString(),
      cancellation_reason: 'Résiliation via crédits mandat',
      mandate_official_end_date: today,
    }).eq('user_id', user.id)
    if (cErr) console.error('clients update', cErr)

    // (c) e-mail remboursement
    const { data: profile } = await admin.from('profiles').select('prenom, email').eq('id', user.id).maybeSingle()
    const to = profile?.email || user.email
    if (to) {
      try {
        await sendTemplateEmail('mandat-resilie-remboursement', to, {
          templateData: { prenom: profile?.prenom ?? '' },
          idempotencyKey: `mandat-resilie-${user.id}-${today}`,
        })
      } catch (e) { console.error('email', e) }
    }
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
