import { renderCorporateEmail, emailButton } from '../_shared/email-brand.ts';
// Campagne de suivi candidat (planifiée 2×/jour).
// - Rappels de visite (rappel_48h, rappel_24h) : canal transactionnel (sendTemplateEmail).
// - Activation (activation_bienvenue, activation_post_visite) : canal marketing via Resend,
//   avec lien de désinscription (email_unsubscribe_tokens → email_unsubscribes).
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
const UNSUB_FN = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/handle-email-unsubscribe`
const H = 3600_000

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const zurichDay = (d: Date) => d.toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function activationHtml(prenom: string, unsubscribeUrl: string): string {
  return renderCorporateEmail({title:'Pas le temps de visiter ?', preview:"Pas le temps de chercher ? On s’occupe de tout", category:'VOTRE RECHERCHE', bodyHtml:`
    ${prenom ? `<p>Bonjour ${esc(prenom)},</p>` : ''}
    <p>La recherche d'un appartement peut vite devenir stressante. Laissez nos agents immobiliers faire le travail pour vous ! Recherche, visites, postulations : on s'occupe de tout, de A à Z, pour vous trouver votre futur logement. Activez votre recherche en un clic.</p>
    <div style="padding:22px;background:#f3f4ed;border:1px solid #e7ebe5;border-radius:5px;color:#193d2c;">Recherche · Visites · Postulations</div>
    ${emailButton('Activer ma recherche','https://logisorama.ch/nouveau-mandat')}
  `, footerHtml:`Agence de relocation en Suisse romande<br><a href="${esc(unsubscribeUrl)}" style="color:#205a43;">Se désinscrire de ces e-mails</a>`});
}

async function sendActivation(email: string, prenom: string, subject: string): Promise<boolean> {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquant')
  const token = crypto.randomUUID()
  const { error: tErr } = await admin.from('email_unsubscribe_tokens').insert({ email: email.toLowerCase(), token })
  if (tErr) throw new Error(`token: ${tErr.message}`)
  const unsubscribeUrl = `https://logisorama.ch/unsubscribe?token=${token}`
  const oneClickUrl = `${UNSUB_FN}?token=${token}`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject,
      html: activationHtml(prenom, unsubscribeUrl),
      headers: { 'List-Unsubscribe': `<${oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
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
