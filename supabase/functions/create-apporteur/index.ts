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

    // Use inviteUserByEmail to automatically send invitation email
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/first-login`,
        data: {
          nom,
          prenom,
        },
      }
    );

    if (inviteError) {
      console.error('Invite error:', inviteError);
      throw new Error(`Erreur lors de l'invitation: ${inviteError.message}`);
    }

    if (!inviteData.user) {
      throw new Error('Utilisateur non créé');
    }

    const userId = inviteData.user.id;
    console.log('User invited:', userId);

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

    // Create apporteur entry with correct values (10% commission, no minimums)
    const dateExpiration = new Date();
    dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);

    const { data: apporteurData, error: apporteurError } = await supabase
      .from('apporteurs')
      .insert({
        user_id: userId,
        statut: 'en_attente',
        date_expiration: dateExpiration.toISOString(),
        taux_commission: 10,
        minimum_vente: 0,
        minimum_location: 0,
      })
      .select()
      .single();

    if (apporteurError) {
      console.error('Apporteur error:', apporteurError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Erreur lors de la création de l'apporteur: ${apporteurError.message}`);
    }

    console.log('Apporteur created:', apporteurData.id);

    // Create notification for the apporteur
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
        message: 'Apporteur créé avec succès. Un email d\'invitation a été envoyé.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
