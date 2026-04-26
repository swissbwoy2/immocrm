import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteProprietaireRequest {
  email: string;
  prenom: string;
  nom: string;
  telephone?: string;
  civilite?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  canton?: string;
  agent_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: InviteProprietaireRequest = await req.json();
    const { email, prenom, nom, telephone, civilite, adresse, code_postal, ville, canton, agent_id } = requestData;

    console.log('Inviting proprietaire:', { email, prenom, nom });

    if (!email || !prenom || !nom) {
      throw new Error('Email, prénom et nom sont requis');
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    console.log('Existing user:', existingUser ? { id: existingUser.id, email: existingUser.email } : null);

    let userId: string;
    let message: string;
    let isNewUser = false;

    if (existingUser) {
      // User exists - send password reset email instead
      console.log('User exists, sending password reset email');
      
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: 'https://immocrm.lovable.app/first-login',
        }
      );

      if (resetError) {
        console.error('Error sending reset email:', resetError);
        throw resetError;
      }

      userId = existingUser.id;
      message = 'Email de réinitialisation envoyé avec succès';
    } else {
      // New user - invite them
      console.log('New user, sending invitation');
      
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: 'https://immocrm.lovable.app/first-login',
        }
      );

      if (inviteError) {
        console.error('Error inviting user:', inviteError);
        throw inviteError;
      }

      userId = inviteData.user.id;
      message = 'Invitation envoyée avec succès';
      isNewUser = true;
    }

    // Check if profile exists, if not create it
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      console.log('Creating profile for user:', userId);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          prenom: prenom,
          nom: nom,
          telephone: telephone || null,
          actif: false // Account not activated yet
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    } else {
      // Update existing profile with new data if provided
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          prenom: prenom,
          nom: nom,
          telephone: telephone || undefined,
        })
        .eq('id', userId);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
      }
    }

    // Check if user_role exists, if not create it
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingRole) {
      console.log('Creating user_role for user:', userId);
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'proprietaire'
        });

      if (roleError) {
        console.error('Error creating user_role:', roleError);
      }
    }

    // Check if proprietaire record exists, if not create it
    const { data: existingProprietaire } = await supabaseAdmin
      .from('proprietaires')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let proprietaireId: string | null = null;

    if (!existingProprietaire) {
      console.log('Creating proprietaire record for user:', userId);
      
      const proprietaireData: any = {
        user_id: userId,
        statut: 'en_attente',
        civilite: civilite || null,
        adresse: adresse || null,
        code_postal: code_postal || null,
        ville: ville || null,
        canton: canton || null,
        telephone: telephone || null,
        agent_id: agent_id || null,
      };

      const { data: newProprietaire, error: proprietaireError } = await supabaseAdmin
        .from('proprietaires')
        .insert(proprietaireData)
        .select('id')
        .single();

      if (proprietaireError) {
        console.error('Error creating proprietaire:', proprietaireError);
      } else {
        proprietaireId = newProprietaire.id;
        console.log('Proprietaire created with ID:', proprietaireId);
      }
    } else {
      proprietaireId = existingProprietaire.id;
      
      // Update existing proprietaire with new data
      const { error: updateProprietaireError } = await supabaseAdmin
        .from('proprietaires')
        .update({
          civilite: civilite || undefined,
          adresse: adresse || undefined,
          code_postal: code_postal || undefined,
          ville: ville || undefined,
          canton: canton || undefined,
          telephone: telephone || undefined,
          agent_id: agent_id || undefined,
        })
        .eq('id', existingProprietaire.id);

      if (updateProprietaireError) {
        console.error('Error updating proprietaire:', updateProprietaireError);
      }
    }

    // Create notification for admins
    const { data: admins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await supabaseAdmin.rpc('create_notification', {
          p_user_id: admin.user_id,
          p_type: 'new_proprietaire_invited',
          p_title: '🏠 Nouveau propriétaire invité',
          p_message: `${prenom} ${nom} a été invité en tant que propriétaire`,
          p_link: '/admin/proprietaires',
          p_metadata: { proprietaire_id: proprietaireId, email }
        });
      }
    }

    console.log('Invitation sent successfully to user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        userId: userId,
        isNewUser: isNewUser,
        proprietaireId: proprietaireId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in invite-proprietaire function:', error);
    return new Response(
      JSON.stringify({ 
        error: (error instanceof Error ? error.message : String(error)) || 'Une erreur est survenue lors de l\'envoi de l\'invitation' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
