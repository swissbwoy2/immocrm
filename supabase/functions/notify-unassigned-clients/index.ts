import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Client {
  id: string;
  date_ajout: string;
  agent_id: string | null;
  user_id: string;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
}

interface AdminRole {
  user_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting unassigned clients check...');

    // Calculate 48 hours ago
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    // Get clients without agent that were added more than 48h ago
    const { data: unassignedClients, error: clientsError } = await supabase
      .from('clients')
      .select('id, date_ajout, agent_id, user_id')
      .is('agent_id', null)
      .lt('date_ajout', fortyEightHoursAgo.toISOString())
      .returns<Client[]>();

    if (clientsError) {
      console.error('Error fetching unassigned clients:', clientsError);
      throw clientsError;
    }

    if (!unassignedClients || unassignedClients.length === 0) {
      console.log('No unassigned clients found');
      return new Response(
        JSON.stringify({ message: 'No unassigned clients found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${unassignedClients.length} unassigned clients`);

    // Get client profiles
    const clientUserIds = unassignedClients.map(c => c.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email')
      .in('id', clientUserIds)
      .returns<Profile[]>();

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Get all admins
    const { data: adminRoles, error: adminsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .returns<AdminRole[]>();

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
      throw adminsError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admins found');
      return new Response(
        JSON.stringify({ message: 'No admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create notifications for each admin about each unassigned client
    const notifications = [];
    for (const client of unassignedClients) {
      const profile = profiles?.find(p => p.id === client.user_id);
      if (!profile) continue;

      const clientName = `${profile.prenom} ${profile.nom}`;
      const hoursSinceAdded = Math.floor(
        (new Date().getTime() - new Date(client.date_ajout).getTime()) / (1000 * 60 * 60)
      );

      for (const adminRole of adminRoles) {
        notifications.push({
          user_id: adminRole.user_id,
          type: 'client_unassigned',
          title: '⚠️ Client sans agent',
          message: `${clientName} est sans agent depuis ${hoursSinceAdded}h`,
          link: '/admin/clients',
          metadata: {
            client_id: client.id,
            client_name: clientName,
            hours_unassigned: hoursSinceAdded,
          },
        });
      }
    }

    // Insert all notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
      throw notifError;
    }

    console.log(`Created ${notifications.length} notifications for ${adminRoles.length} admins`);

    return new Response(
      JSON.stringify({
        success: true,
        unassigned_clients: unassignedClients.length,
        notifications_created: notifications.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-unassigned-clients:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
