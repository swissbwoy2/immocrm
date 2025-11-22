import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
          persistSession: false
        }
      }
    );

    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email et nouveau mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Recherche de l\'utilisateur avec email:', email);

    // Trouver l'utilisateur par email avec pagination
    let user = null;
    let page = 1;
    const perPage = 1000;
    
    while (!user) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });
      
      if (listError) {
        console.error('Erreur lors de la recherche de l\'utilisateur:', listError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la recherche de l\'utilisateur' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Page ${page}: ${users.length} utilisateurs trouvés`);
      
      user = users.find(u => u.email === email);
      
      // Si aucun utilisateur trouvé et qu'on a moins d'utilisateurs que le max, on arrête
      if (!user && users.length < perPage) {
        break;
      }
      
      page++;
    }

    if (!user) {
      console.error('Utilisateur non trouvé:', email);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Utilisateur trouvé, ID:', user.id);

    // Réinitialiser le mot de passe
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la réinitialisation du mot de passe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Mot de passe réinitialisé avec succès pour:', email);

    return new Response(
      JSON.stringify({ 
        message: 'Mot de passe réinitialisé avec succès',
        email: email,
        newPassword: newPassword
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
