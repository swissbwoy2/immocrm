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

    if (existingUser) {
      console.log('User already exists');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Le compte existe déjà' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
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

    // Add client role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'client',
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      throw roleError;
    }

    console.log('Client role added');

    // Update existing client record if it exists
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('user_id', '977d15e9-f368-47f0-af1f-4ceb013b7f13')
      .single();

    if (existingClient) {
      const { error: updateError } = await supabaseAdmin
        .from('clients')
        .update({ user_id: authData.user.id })
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
        message: 'Compte client créé avec succès',
        user_id: authData.user.id
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
