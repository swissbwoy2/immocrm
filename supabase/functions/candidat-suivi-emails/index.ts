// Campagne de suivi candidat (planifiée 2×/jour).
// - Rappels de visite (rappel_48h, rappel_24h) : canal transactionnel (sendTemplateEmail).
// - Activation (activation_bienvenue, activation_post_visite) : canal marketing via Resend,
//   avec lien de désinscription (email_unsubscribe_tokens → email_unsubscribes).
// GET ?unsubscribe=<token> : traite la désinscription et affiche une page de confirmation.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RAW_FROM = (Deno.env.get('RESEND_FROM_EMAIL') || '').trim()
const SENDER_EMAIL =
  RAW_FROM && RAW_FROM.includes('@') && !RAW_FROM.includes('notify.logisorama.ch') ? RAW_FROM : 'support@logisorama.ch'
const FROM = SENDER_EMAIL.includes('<') ? SENDER_EMAIL : `Logisorama <${SENDER_EMAIL}>`
const FUNCTION_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/candidat-suivi-emails`
const CAMPAIGN_KEY = 'candidat_suivi_activation'
const H = 3600_000

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const zurichDay = (d: Date) => d.toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function activationHtml(prenom: string, unsubscribeUrl: string): string {
  const G = 'hsl(158,55%,38%)', GD = 'hsl(158,60%,24%)'
  const pill = (t: string) =>
    `<td align="center" style="padding:0 6px;"><span style="display:inline-block;background:#eaf7f1;color:${GD};border:1px solid #cdeadc;border-radius:999px;padding:9px 16px;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;">${t}</span></td>`
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pas le temps de chercher ? On s'occupe de tout</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:20px 10px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #e5efe9;border-radius:14px;overflow:hidden;">
<tr><td style="background:${G};background:linear-gradient(135deg,${G} 0%,${GD} 100%);padding:22px 28px;">
<table role="presentation" width="100%"><tr>
<td><div style="font-size:20px;font-weight:bold;color:#fff;letter-spacing:2px;">IMMO-RAMA</div><div style="font-size:12px;color:#d6f2e6;margin-top:2px;">Logisorama</div></td>
<td align="right" style="font-size:13px;font-weight:bold;color:#fff;">Déléguez votre recherche</td>
</tr></table></td></tr>
<tr><td style="padding:32px 28px 12px;">
<h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;">Pas le temps de visiter ?</h1>
${prenom ? `<p style="margin:0 0 14px;font-size:15px;color:#374151;">Bonjour ${esc(prenom)},</p>` : ''}
<p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#374151;">La recherche d'un appartement peut vite devenir stressante. Laissez nos agents immobiliers faire le travail pour vous ! Recherche, visites, postulations : on s'occupe de tout, de A à Z, pour vous trouver votre futur logement. Activez votre recherche en un clic.</p>
<table role="presentation" align="center" style="margin:0 auto 26px;"><tr>${pill('🔍 Recherche')}${pill('🏠 Visites')}${pill('📝 Postulations')}</tr></table>
<table role="presentation" align="center" style="margin:0 auto 10px;"><tr><td bgcolor="${G}" style="border-radius:10px;background:${G};">
<a href="https://logisorama.ch/nouveau-mandat" target="_blank" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:bold;color:#fff;text-decoration:none;border-radius:10px;">Activer ma recherche</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#f6faf8;padding:18px 28px;border-top:1px solid #e5efe9;text-align:center;font-size:12px;color:#6b7280;line-height:1.6;">
Immo-Rama · Logisorama — Agence de relocation en Suisse romande · <a href="https://logisorama.ch" style="color:${G};">logisorama.ch</a><br>
<a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Se désinscrire de ces e-mails</a>
</td></tr></table></td></tr></table></body></html>`
}

async function handleUnsubscribe(token: string): Promise<Response> {
  const page = (msg: string) =>
    new Response(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Désinscription</title></head><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:90vh;color:#0f172a;"><div style="max-width:420px;text-align:center;padding:24px;"><div style="font-weight:bold;color:hsl(158,55%,38%);letter-spacing:2px;margin-bottom:16px;">IMMO-RAMA</div><p>${msg}</p><a href="https://logisorama.ch" style="color:hsl(158,55%,38%);">logisorama.ch</a></div></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  if (!/^[0-9a-f-]{36}$/i.test(token)) return page('Lien de désinscription invalide.')
  const { data: row } = await admin.from('email_unsubscribe_tokens').select('email, used_at').eq('token', token).maybeSingle()
  if (!row?.email) return page('Lien de désinscription invalide ou expiré.')
  const email = String(row.email).toLowerCase()
  const { data: exists } = await admin.from('email_unsubscribes').select('id').ilike('email', email).limit(1)
  if (!exists?.length) {
    await admin.from('email_unsubscribes').insert({ email, campaign_key: CAMPAIGN_KEY, source: 'candidat_suivi' })
  }
  if (!row.used_at) await admin.from('email_unsubscribe_tokens').update({ used_at: new Date().toISOString() }).eq('token', token)
  return page('Vous êtes désinscrit(e). Vous ne recevrez plus nos e-mails de suivi commerciaux.')
}

async function sendActivation(email: string, prenom: string, subject: string): Promise<boolean> {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquant')
  const token = crypto.randomUUID()
  const { error: tErr } = await admin.from('email_unsubscribe_tokens').insert({ email: email.toLowerCase(), token })
  if (tErr) throw new Error(`token: ${tErr.message}`)
  const unsubscribeUrl = `${FUNCTION_URL}?unsubscribe=${token}`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject,
      html: activationHtml(prenom, unsubscribeUrl),
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }),
  })
  if (!res.ok) {
    console.error('[candidat-suivi] resend', res.status, await res.text())
    return false
  }
  return true
}

type Due = { etape: string; creneau_id: string | null; channel: 'tx' | 'mkt' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = new URL(req.url)
  const unsub = url.searchParams.get('unsubscribe')
  if (unsub) return handleUnsubscribe(unsub)
  if (req.method === 'POST' && url.searchParams.get('unsubscribe_post')) return handleUnsubscribe(url.searchParams.get('unsubscribe_post')!)

  const now = new Date()
  const nowMs = now.getTime()
  const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 }

  try {
    const { data: rows, error } = await admin
      .from('candidatures_location')
      .select('id, user_id, creneau_id, date_visite, created_at, prenom, email')
      .not('user_id', 'is', null)
      .not('creneau_id', 'is', null)
      .not('date_visite', 'is', null)
      .or(`created_at.gte.${new Date(nowMs - 40 * H).toISOString()},and(date_visite.gte.${new Date(nowMs - 40 * H).toISOString()},date_visite.lte.${new Date(nowMs + 60 * H).toISOString()})`)
      .limit(2000)
    if (error) throw error
    const list = rows ?? []
    const userIds = [...new Set(list.map((r) => r.user_id as string))]
    if (!userIds.length) return Response.json(stats, { headers: corsHeaders })

    const [{ data: roles }, { data: profiles }, { data: history }] = await Promise.all([
      admin.from('user_roles').select('user_id').eq('role', 'candidat').in('user_id', userIds),
      admin.from('profiles').select('id, email, prenom, actif, notifications_email').in('id', userIds),
      admin.from('candidat_suivi_emails').select('user_id, creneau_id, etape, sent_at').in('user_id', userIds),
    ])
    const candidats = new Set((roles ?? []).map((r) => r.user_id))
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))
    const sentKeys = new Set((history ?? []).map((h) => `${h.user_id}|${h.creneau_id ?? ''}|${h.etape}`))
    const today = zurichDay(now)
    const sentToday = new Set((history ?? []).filter((h) => zurichDay(new Date(h.sent_at)) === today).map((h) => h.user_id))

    // Regrouper par utilisateur : un seul e-mail par exécution et par jour.
    const byUser = new Map<string, typeof list>()
    for (const r of list) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, [])
      byUser.get(r.user_id)!.push(r)
    }

    for (const [userId, resas] of byUser) {
      stats.checked++
      const p: any = profileMap.get(userId)
      if (!candidats.has(userId) || !p || p.actif !== false || p.notifications_email === false || sentToday.has(userId)) {
        stats.skipped++
        continue
      }
      const email = String(resas[0].email || p.email || '').trim()
      if (!email.includes('@')) { stats.skipped++; continue }
      const prenom = String(resas.find((r) => r.prenom)?.prenom || p.prenom || '').trim()
      const has = (etape: string, c: string | null) => sentKeys.has(`${userId}|${c ?? ''}|${etape}`)

      // Étapes dues, par priorité.
      const dues: Due[] = []
      for (const r of [...resas].sort((a, b) => +new Date(a.date_visite) - +new Date(b.date_visite))) {
        const diffH = (+new Date(r.date_visite) - nowMs) / H
        if (diffH > 0 && diffH <= 30 && !has('rappel_24h', r.creneau_id)) dues.push({ etape: 'rappel_24h', creneau_id: r.creneau_id, channel: 'tx' })
        else if (diffH >= 24 && diffH <= 60 && !has('rappel_48h', r.creneau_id) && !has('rappel_24h', r.creneau_id)) dues.push({ etape: 'rappel_48h', creneau_id: r.creneau_id, channel: 'tx' })
      }
      for (const r of resas) {
        const sinceH = (nowMs - +new Date(r.date_visite)) / H
        if (sinceH >= 12 && sinceH <= 40 && !has('activation_post_visite', r.creneau_id)) dues.push({ etape: 'activation_post_visite', creneau_id: r.creneau_id, channel: 'mkt' })
      }
      const newest = Math.max(...resas.map((r) => +new Date(r.created_at)))
      if (nowMs - newest <= 40 * H && !has('activation_bienvenue', null)) dues.push({ etape: 'activation_bienvenue', creneau_id: null, channel: 'mkt' })

      let due = dues[0]
      if (!due) { stats.skipped++; continue }

      if (due.channel === 'mkt') {
        const { data: unsubRows } = await admin.from('email_unsubscribes').select('id').ilike('email', email.toLowerCase()).limit(1)
        if (unsubRows?.length) {
          // Désinscrit du marketing : on tente un éventuel rappel transactionnel restant.
          due = dues.find((d) => d.channel === 'tx') as Due
          if (!due) { stats.skipped++; continue }
        }
      }

      try {
        let ok = false
        if (due.channel === 'tx') {
          const r = await sendTemplateEmail('candidat-suivi-rappel-visite', email, {
            templateData: { prenom },
            idempotencyKey: `suivi-${due.etape}-${due.creneau_id}-${userId}`,
          })
          ok = r.sent
        } else {
          ok = await sendActivation(email, prenom, "Pas le temps de chercher ? On s'occupe de tout")
        }
        if (ok) {
          await admin.from('candidat_suivi_emails').insert({ user_id: userId, creneau_id: due.creneau_id, etape: due.etape })
          stats.sent++
        } else stats.skipped++
      } catch (e) {
        stats.errors++
        console.error('[candidat-suivi] send error', userId, due.etape, e instanceof Error ? e.message : e)
      }
    }
    console.log('[candidat-suivi]', stats)
    return Response.json(stats, { headers: corsHeaders })
  } catch (e) {
    console.error('[candidat-suivi] fatal', e)
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500, headers: corsHeaders })
  }
})
