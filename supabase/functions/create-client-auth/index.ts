import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    console.log('Creating client auth account for info@immo-rama.ch');

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === 'info@immo-rama.ch');

    let userId: string;

    if (existingUser) {
      console.log('User already exists, using existing user_id:', existingUser.id);
      userId = existingUser.id;
      
      // Update password if user exists
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: 'Client123!',
      });
    } else {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: 'info@immo-rama.ch',
        password: 'Client123!',
        email_confirm: true,
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }

      console.log('Auth user created:', authData.user.id);
      userId = authData.user.id;
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: 'info@immo-rama.ch',
          nom: 'Ramazani',
          prenom: 'Christ',
          telephone: '+41 76 123 45 67',
          actif: true,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }

      console.log('Profile created');
    } else {
      console.log('Profile already exists');
    }

    // Check if client role exists
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'client')
      .single();

    if (!existingRole) {
      // Add client role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'client',
        });

      if (roleError) {
        console.error('Error creating role:', roleError);
        throw roleError;
      }

      console.log('Client role added');
    } else {
      console.log('Client role already exists');
    }

    // Update existing client record if it exists
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('user_id', '977d15e9-f368-47f0-af1f-4ceb013b7f13')
      .single();

    if (existingClient) {
      const { error: updateError } = await supabaseAdmin
        .from('clients')
        .update({ user_id: userId })
        .eq('id', existingClient.id);

      if (updateError) {
        console.error('Error updating client:', updateError);
      } else {
        console.log('Client record updated with new user_id');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compte client configuré avec succès',
        user_id: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in create-client-auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
