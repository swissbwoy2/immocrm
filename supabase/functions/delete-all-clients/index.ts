import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !roles?.some(r => r.role === 'admin')) {
      throw new Error('Forbidden: Admin access required');
    }

    console.log('Admin user verified, proceeding with deletion');

    // Get all client user IDs
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('user_id');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      throw clientsError;
    }

    const clientUserIds = clients?.map(c => c.user_id) || [];
    console.log(`Found ${clientUserIds.length} clients to delete`);

    // Delete all clients records
    const { error: deleteClientsError } = await supabaseAdmin
      .from('clients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteClientsError) {
      console.error('Error deleting clients:', deleteClientsError);
      throw deleteClientsError;
    }

    console.log('Clients records deleted');

    // Delete user roles for clients
    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .in('user_id', clientUserIds)
      .eq('role', 'client');

    if (deleteRolesError) {
      console.error('Error deleting user roles:', deleteRolesError);
    }

    console.log('User roles deleted');

    // Delete profiles for clients
    const { error: deleteProfilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .in('id', clientUserIds);

    if (deleteProfilesError) {
      console.error('Error deleting profiles:', deleteProfilesError);
    }

    console.log('Profiles deleted');

    // Delete auth users
    let deletedUsers = 0;
    for (const userId of clientUserIds) {
      try {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteUserError) {
          console.error(`Error deleting user ${userId}:`, deleteUserError);
        } else {
          deletedUsers++;
        }
      } catch (error) {
        console.error(`Exception deleting user ${userId}:`, error);
      }
    }

    console.log(`Successfully deleted ${deletedUsers} auth users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted ${clientUserIds.length} clients and ${deletedUsers} auth users`,
        deletedClients: clientUserIds.length,
        deletedAuthUsers: deletedUsers,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in delete-all-clients function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
