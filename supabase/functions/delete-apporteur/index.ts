import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireAuth } from '../_shared/require-admin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteApporteurRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return auth.response!;
  const supabaseAdmin = auth.admin!;

  try {
    const { userId }: DeleteApporteurRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting apporteur with userId:', userId);

    // Delete apporteur record
    await supabaseAdmin
      .from('apporteurs')
      .delete()
      .eq('user_id', userId);

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

    console.log('Apporteur deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Apporteur deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in delete-apporteur:', error);
    const message = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
