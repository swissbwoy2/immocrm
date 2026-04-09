import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all active clients with their user_id
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, user_id, agent_id')
      .in('statut', ['actif', 'en_recherche', 'en_attente']);

    if (clientsError) throw clientsError;

    let notificationCount = 0;

    for (const client of clients || []) {
      if (!client.user_id) continue;

      // Create in-app notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: client.user_id,
          type: 'document_update_reminder',
          title: '📋 Mettez à jour votre dossier',
          message: 'Vérifiez vos 3 dernières fiches de salaire, la validité de votre extrait de poursuites (min. 2-3 mois) et de votre permis de séjour.',
          link: '/client/documents',
          metadata: { reminder_type: 'monthly_document_update' },
        });

      if (!notifError) notificationCount++;
    }

    // Send notification email via edge function
    const baseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    try {
      await fetch(`${baseUrl}/functions/v1/send-notification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          type: 'document_update_reminder',
          subject: '📋 Mettez à jour votre dossier - Rappel mensuel',
          message: 'Vérifiez et confirmez la validité de vos documents : fiches de salaire, extrait de poursuites et permis de séjour.',
        }),
      });
    } catch (emailErr) {
      console.error('Email notification error:', emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: notificationCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
