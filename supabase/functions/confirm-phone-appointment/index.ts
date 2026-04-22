import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const { data: roles } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { appointment_id } = await req.json();
    if (!appointment_id) {
      return new Response(JSON.stringify({ error: 'appointment_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch appointment
    const { data: appt, error: fetchErr } = await admin
      .from('lead_phone_appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (fetchErr || !appt) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status -> confirme (reset reminder marker for re-confirmations)
    const { error: updErr } = await admin
      .from('lead_phone_appointments')
      .update({
        status: 'confirme',
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        reminder_24h_sent_at: null,
      })
      .eq('id', appointment_id);

    if (updErr) throw updErr;

    // Format date for emails (Europe/Zurich)
    const startDate = new Date(appt.slot_start);
    const dateStr = startDate.toLocaleDateString('fr-CH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Zurich',
    });
    const timeStr = startDate.toLocaleTimeString('fr-CH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    });

    const ADMIN_EMAIL = 'info@immo-rama.ch';

    // Send confirmation email + ICS via existing send-calendar-invite function
    if (RESEND_API_KEY) {
      try {
        await admin.functions.invoke('send-calendar-invite', {
          body: {
            title: 'Rendez-vous téléphonique avec Logisorama',
            description: `Notre équipe vous appellera au ${appt.prospect_phone}. Merci d'être disponible à l'heure prévue.`,
            location: `Téléphone : ${appt.prospect_phone}`,
            start_date: appt.slot_start,
            end_date: appt.slot_end,
            all_day: false,
            recipient_email: appt.prospect_email,
          },
        });
      } catch (e) {
        console.error('send-calendar-invite failed:', e);
      }

      // Send the same calendar invite to admin so it appears in their agenda
      try {
        await admin.functions.invoke('send-calendar-invite', {
          body: {
            title: `[RDV Lead] ${appt.prospect_name} — ${appt.prospect_phone}`,
            description: `RDV téléphonique confirmé avec ${appt.prospect_name}.\nEmail : ${appt.prospect_email}\nTéléphone : ${appt.prospect_phone}`,
            location: `Téléphone : ${appt.prospect_phone}`,
            start_date: appt.slot_start,
            end_date: appt.slot_end,
            all_day: false,
            recipient_email: ADMIN_EMAIL,
          },
        });
      } catch (e) {
        console.error('send-calendar-invite (admin) failed:', e);
      }

      // Also send a friendly HTML confirmation
      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 20px;">
              <h1 style="margin: 0 0 10px 0; font-size: 24px;">📞 Rendez-vous confirmé</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 16px;">Bonjour ${appt.prospect_name},</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
              <p style="margin: 0 0 16px 0; font-size: 16px;">Votre rendez-vous téléphonique est <strong>fixé</strong> :</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; width: 100px;">📆 Date</td><td style="padding: 8px 0; font-weight: 600;">${dateStr}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">🕐 Heure</td><td style="padding: 8px 0; font-weight: 600;">${timeStr}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">⏱️ Durée</td><td style="padding: 8px 0; font-weight: 600;">15 minutes</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">📞 Numéro</td><td style="padding: 8px 0; font-weight: 600;">${appt.prospect_phone}</td></tr>
              </table>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              Vous recevrez aussi une invitation calendrier (.ics) à ajouter à votre agenda.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
              Logisorama by Immo-Rama · support@logisorama.ch
            </p>
          </div>
        `;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Logisorama <support@logisorama.ch>',
            to: [appt.prospect_email],
            bcc: [ADMIN_EMAIL],
            subject: `📞 Rendez-vous téléphonique confirmé — ${dateStr} à ${timeStr}`,
            html: htmlBody,
          }),
        });
      } catch (e) {
        console.error('Resend confirmation email failed:', e);
      }

      await admin
        .from('lead_phone_appointments')
        .update({ ics_sent_at: new Date().toISOString() })
        .eq('id', appointment_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('confirm-phone-appointment error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
