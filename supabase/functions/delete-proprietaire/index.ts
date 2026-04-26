import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteProprietaireRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId }: DeleteProprietaireRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting proprietaire with userId:', userId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get proprietaire record
    const { data: proprietaire } = await supabaseAdmin
      .from('proprietaires')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (proprietaire) {
      // Delete related immeubles data
      const { data: immeubles } = await supabaseAdmin
        .from('immeubles')
        .select('id')
        .eq('proprietaire_id', proprietaire.id);

      if (immeubles && immeubles.length > 0) {
        const immeubleIds = immeubles.map(i => i.id);

        // Get lots for these immeubles
        const { data: lots } = await supabaseAdmin
          .from('lots')
          .select('id')
          .in('immeuble_id', immeubleIds);

        if (lots && lots.length > 0) {
          const lotIds = lots.map(l => l.id);

          // Delete baux
          await supabaseAdmin
            .from('baux')
            .delete()
            .in('lot_id', lotIds);

          // Delete candidatures_location
          await supabaseAdmin
            .from('candidatures_location')
            .delete()
            .in('lot_id', lotIds);

          // Delete lots
          await supabaseAdmin
            .from('lots')
            .delete()
            .in('immeuble_id', immeubleIds);
        }

        // Delete locataires_immeuble
        await supabaseAdmin
          .from('locataires_immeuble')
          .delete()
          .in('immeuble_id', immeubleIds);

        // Delete assurances_immeuble
        await supabaseAdmin
          .from('assurances_immeuble')
          .delete()
          .in('immeuble_id', immeubleIds);

        // Delete hypotheques
        await supabaseAdmin
          .from('hypotheques')
          .delete()
          .in('immeuble_id', immeubleIds);

        // Delete documents_immeuble
        await supabaseAdmin
          .from('documents_immeuble')
          .delete()
          .in('immeuble_id', immeubleIds);

        // Delete tickets_technique
        await supabaseAdmin
          .from('tickets_technique')
          .delete()
          .in('immeuble_id', immeubleIds);

        // Delete transactions_comptables
        await supabaseAdmin
          .from('transactions_comptables')
          .delete()
          .in('immeuble_id', immeubleIds);

        // Delete immeubles
        await supabaseAdmin
          .from('immeubles')
          .delete()
          .eq('proprietaire_id', proprietaire.id);
      }

      // Delete proprietaire record
      await supabaseAdmin
        .from('proprietaires')
        .delete()
        .eq('user_id', userId);
    }

    // Delete user_roles
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    // Delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Error deleting auth user:', authError);
    }

    console.log('Proprietaire deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Proprietaire deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in delete-proprietaire:', error);
    const message = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
