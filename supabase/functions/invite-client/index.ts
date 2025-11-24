import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteClientRequest {
  email: string;
  clientId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, clientId }: InviteClientRequest = await req.json();

    console.log('Inviting client:', { email, clientId });

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
    }

    console.log('Email sent successfully to user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        userId: userId
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
