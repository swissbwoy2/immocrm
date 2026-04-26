import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateProprietaireRequest {
  email: string;
  password: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, prenom, nom, telephone } = await req.json() as CreateProprietaireRequest;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email et mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating proprietaire account for:', email);

    // Create Supabase admin client
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

    // Step 1: Create user in auth.users with password
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        prenom: prenom || 'Propriétaire',
        nom: nom || 'Démo',
      },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log('User created with ID:', userId);

    // Step 2: Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        prenom: prenom || 'Propriétaire',
        nom: nom || 'Démo',
        telephone: telephone || null,
        actif: true,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback: delete the user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du profil: ' + profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile created');

    // Step 3: Assign proprietaire role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'proprietaire',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'assignation du rôle: ' + roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Role assigned: proprietaire');

    // Step 4: Create proprietaire entry
    const { error: proprietaireError } = await supabaseAdmin
      .from('proprietaires')
      .insert({
        user_id: userId,
        statut: 'actif',
        telephone: telephone || null,
      });

    if (proprietaireError) {
      console.error('Error creating proprietaire entry:', proprietaireError);
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du propriétaire: ' + proprietaireError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Proprietaire entry created');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte propriétaire créé avec succès',
        user: {
          id: userId,
          email,
          prenom: prenom || 'Propriétaire',
          nom: nom || 'Démo',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: 'Erreur inattendue: ' + errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
