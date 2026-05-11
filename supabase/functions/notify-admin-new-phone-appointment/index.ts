// Notify admin (email + WhatsApp + in-app) when a new bureau RDV is booked.
// Public endpoint (no auth) — called right after the public form insert.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'info@immo-rama.ch';
const OFFICE_ADDRESS = "Chemin de l'Esparcette 5, 1023 Crissier";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const ADMIN_PHONE = Deno.env.get('WHATSAPP_ADMIN_PHONE') || '';

    const { appointment_id } = await req.json().catch(() => ({}));
    if (!appointment_id) {
      return new Response(JSON.stringify({ error: 'appointment_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: appt, error: fetchErr } = await admin
      .from('lead_phone_appointments').select('*').eq('id', appointment_id).maybeSingle();
    if (fetchErr || !appt) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const start = new Date(appt.slot_start);
    const dateStr = start.toLocaleDateString('fr-CH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich',
    });
    const timeStr = start.toLocaleTimeString('fr-CH', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich',
    });

    const result: any = { email: false, wa: false, notif: 0 };

    // 1) EMAIL admin (Resend)
    if (RESEND_API_KEY) {
      try {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 28px; color: white; margin-bottom: 20px;">
              <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Nouveau RDV bureau</div>
              <h1 style="margin: 0; font-size: 22px;">🚨 ${appt.prospect_name || 'Prospect'}</h1>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 24px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                <tr><td style="padding: 6px 0; color: #666; width: 110px;">📆 Date</td><td style="padding: 6px 0; font-weight: 600;">${dateStr}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">🕐 Heure</td><td style="padding: 6px 0; font-weight: 600;">${timeStr}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">👤 Nom</td><td style="padding: 6px 0; font-weight: 600;">${appt.prospect_name || '—'}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">📞 Téléphone</td><td style="padding: 6px 0; font-weight: 600;"><a href="tel:${appt.prospect_phone}">${appt.prospect_phone || '—'}</a></td></tr>
                <tr><td style="padding: 6px 0; color: #666;">✉️ Email</td><td style="padding: 6px 0; font-weight: 600;"><a href="mailto:${appt.prospect_email}">${appt.prospect_email || '—'}</a></td></tr>
                <tr><td style="padding: 6px 0; color: #666;">🔗 Source</td><td style="padding: 6px 0;">${appt.source_form || '—'}</td></tr>
                ${appt.notes_admin ? `<tr><td style="padding: 6px 0; color: #666; vertical-align: top;">📝 Note</td><td style="padding: 6px 0; font-style: italic;">${appt.notes_admin}</td></tr>` : ''}
              </table>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              Logisorama by Immo-Rama · Notification interne
            </p>
          </div>`;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Logisorama <support@logisorama.ch>',
            to: [ADMIN_EMAIL],
            subject: `🚨 Nouveau RDV bureau — ${appt.prospect_name} — ${dateStr} ${timeStr}`,
            html,
            reply_to: appt.prospect_email || undefined,
          }),
        });
        result.email = res.ok;
        if (!res.ok) console.error('[notify-admin] resend failed', res.status, await res.text());
      } catch (e) {
        console.error('[notify-admin] resend exception', e);
      }
    }

    // 2) WhatsApp admin (template staff_client_inbound — pas de variables)
    if (ADMIN_PHONE) {
      try {
        const r = await admin.functions.invoke('send-whatsapp-notification', {
          body: {
            event_type: 'admin_new_phone_appointment',
            template_key: 'staff_client_inbound',
            recipient_phone_override: ADMIN_PHONE,
            variables: [],
            context_type: 'phone_appointment',
            context_ref: appointment_id,
          },
        });
        const data: any = r.data || {};
        result.wa = !r.error && !data.skipped && !data.error;
        if (!result.wa) console.error('[notify-admin] WA failed', JSON.stringify({ err: r.error, data }));
      } catch (e) {
        console.error('[notify-admin] WA exception', e);
      }
    }

    // 3) In-app notification (cloche) pour tous les admins
    try {
      const { data: admins } = await admin
        .from('user_roles').select('user_id').eq('role', 'admin');
      const summary = `${appt.prospect_name} — ${dateStr} ${timeStr} — ${appt.prospect_phone}`;
      for (const a of admins || []) {
        try {
          await admin.rpc('create_notification', {
            p_user_id: a.user_id,
            p_type: 'phone_appointment_new',
            p_title: '📍 Nouveau RDV bureau',
            p_message: summary,
            p_link: '/admin/calendrier',
            p_metadata: { appointment_id, prospect_phone: appt.prospect_phone, prospect_email: appt.prospect_email },
          });
          result.notif++;
        } catch (e) {
          console.error('[notify-admin] notif failed', a.user_id, e);
        }
      }
    } catch (e) {
      console.error('[notify-admin] notif fetch admins failed', e);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[notify-admin-new-phone-appointment] fatal', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
