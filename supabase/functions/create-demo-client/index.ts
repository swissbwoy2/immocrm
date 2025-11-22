import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Check if demo client already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const demoClientExists = existingUser?.users.some(user => user.email === 'client@immo-rama.ch');

    if (demoClientExists) {
      return new Response(
        JSON.stringify({ error: 'Demo client already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create demo client user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'client@immo-rama.ch',
      password: 'Client123!',
      email_confirm: true,
      user_metadata: {
        prenom: 'Marie',
        nom: 'Dupont',
        telephone: '+41 79 123 45 67',
      },
    });

    if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    }

    console.log('Demo client user created:', userData.user.id);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user.id,
        email: 'client@immo-rama.ch',
        prenom: 'Marie',
        nom: 'Dupont',
        telephone: '+41 79 123 45 67',
        actif: true,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    console.log('Profile created successfully');

    // Assign client role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'client',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw roleError;
    }

    console.log('Client role assigned successfully');

    // Get first available agent
    const { data: agents, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .limit(1)
      .single();

    if (agentError) {
      console.error('Error fetching agent:', agentError);
    }

    // Create client record
    const { error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        user_id: userData.user.id,
        agent_id: agents?.id || null,
        date_naissance: '1990-05-15',
        nationalite: 'Suisse',
        etat_civil: 'Célibataire',
        profession: 'Architecte',
        employeur: 'Studio Architecture SA',
        revenus_mensuels: 7500,
        type_contrat: 'CDI',
        budget_max: 2500,
        pieces: 3,
        type_bien: 'Appartement',
        region_recherche: 'Lausanne',
        statut: 'actif',
        priorite: 'haute',
        etat_avancement: 'recherche_active',
        loyer_actuel: 1800,
        pieces_actuel: 2,
        nombre_occupants: 1,
        animaux: false,
        vehicules: false,
        instrument_musique: false,
        charges_extraordinaires: false,
        poursuites: false,
        curatelle: false,
        autres_credits: false,
      });

    if (clientError) {
      console.error('Error creating client record:', clientError);
      throw clientError;
    }

    console.log('Client record created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData.user,
        message: 'Demo client created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-demo-client function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
