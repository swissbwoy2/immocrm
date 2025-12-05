import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, nom, prenom } = await req.json();

    if (!email || !nom || !prenom) {
      throw new Error('Email, nom et prénom sont requis');
    }

    console.log(`Creating apporteur for ${email}`);

    // Generate a random password
    const password = crypto.randomUUID().slice(0, 12);

    // Create the user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom,
        prenom,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Erreur lors de la création de l'utilisateur: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Utilisateur non créé');
    }

    const userId = authData.user.id;
    console.log('User created:', userId);

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        nom,
        prenom,
        email,
        actif: true,
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Try to clean up user
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Erreur lors de la création du profil: ${profileError.message}`);
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'apporteur',
      });

    if (roleError) {
      console.error('Role error:', roleError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Erreur lors de l'attribution du rôle: ${roleError.message}`);
    }

    // Create apporteur entry
    const dateExpiration = new Date();
    dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);

    const { data: apporteurData, error: apporteurError } = await supabase
      .from('apporteurs')
      .insert({
        user_id: userId,
        statut: 'en_attente',
        date_expiration: dateExpiration.toISOString(),
        taux_commission: 20,
        minimum_vente: 500,
        minimum_location: 150,
      })
      .select()
      .single();

    if (apporteurError) {
      console.error('Apporteur error:', apporteurError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Erreur lors de la création de l'apporteur: ${apporteurError.message}`);
    }

    console.log('Apporteur created:', apporteurData.id);

    // Generate magic link for password setup
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/first-login`,
      },
    });

    if (linkError) {
      console.warn('Could not generate magic link:', linkError);
    }

    // Create notification for admin
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'apporteur_welcome',
        title: 'Bienvenue chez Immo-Rama !',
        message: 'Votre compte apporteur d\'affaires a été créé. Complétez votre profil pour commencer.',
        link: '/apporteur/profil',
      });

    return new Response(
      JSON.stringify({
        success: true,
        apporteur: apporteurData,
        magicLink: linkData?.properties?.action_link,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
