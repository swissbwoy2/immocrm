import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteClientRequest {
  email: string;
  clientId?: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, clientId, prenom, nom, telephone }: InviteClientRequest = await req.json();

    console.log('Inviting client:', { email, clientId, prenom, nom });

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

    // Check if profile exists, if not create it with actif = false
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
          prenom: prenom || email.split('@')[0],
          nom: nom || '',
          telephone: telephone || null,
          actif: false // Account not activated yet
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't throw - continue with the flow
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
          role: 'client'
        });

      if (roleError) {
        console.error('Error creating user_role:', roleError);
        // Don't throw - continue with the flow
      }
    }

    // Check if client record exists, if not create it
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingClient) {
      console.log('Creating client record for user:', userId);
      const { error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
          user_id: userId,
          date_ajout: new Date().toISOString(),
          statut: 'en_attente',
          priorite: 'moyenne'
        });

      if (clientError) {
        console.error('Error creating client:', clientError);
        // Don't throw - continue with the flow
      }
    }

    console.log('Email sent successfully to user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        userId: userId,
        isNewUser: isNewUser
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in invite-client function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Une erreur est survenue lors de l\'envoi de l\'invitation' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
