import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendInvitationRequest {
  userId: string;
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email }: ResendInvitationRequest = await req.json();

    console.log('Resending invitation to proprietaire:', { userId, email });

    if (!userId || !email) {
      throw new Error('userId et email sont requis');
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

    // Send password reset email
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

    console.log('Invitation resent successfully to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation renvoyée avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in resend-proprietaire-invitation function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Une erreur est survenue lors du renvoi de l\'invitation' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
