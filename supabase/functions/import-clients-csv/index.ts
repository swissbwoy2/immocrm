import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportClient {
  user: {
    email: string;
    password: string;
    prenom: string;
    nom: string;
    telephone?: string;
  };
  client: {
    nationalite?: string;
    type_permis?: string;
    situation_familiale?: string;
    profession?: string;
    revenus_mensuels?: number;
    budget_max?: number;
    charges_mensuelles?: number;
    pieces?: number;
    region_recherche?: string;
    type_bien?: string;
    type_contrat?: string;
    date_ajout?: string;
  };
  agentEmail?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ email: string; reason: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { clients } = await req.json() as { clients: ImportClient[] };

    console.log(`Starting import of ${clients.length} clients...`);

    const result: ImportResult = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Process each client
    for (const clientData of clients) {
      try {
        let userId: string;
        let isUpdate = false;

        // 1. Check if user already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', clientData.user.email)
          .single();

        if (existingProfile) {
          // User exists - we'll update their data
          userId = existingProfile.id;
          isUpdate = true;
          console.log(`User ${clientData.user.email} already exists, updating...`);
        } else {
          // Create new user in auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: clientData.user.email,
            password: clientData.user.password,
            email_confirm: true,
            user_metadata: {
              prenom: clientData.user.prenom,
              nom: clientData.user.nom
            }
          });

          if (authError) throw authError;
          userId = authData.user.id;
          console.log(`Created new user: ${clientData.user.email}`);
        }

        // 2. Create or update profile
        if (isUpdate) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              prenom: clientData.user.prenom,
              nom: clientData.user.nom,
              telephone: clientData.user.telephone
            })
            .eq('id', userId);

          if (profileError) {
            console.error('Profile update error:', profileError);
            throw profileError;
          }
        } else {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: clientData.user.email,
              prenom: clientData.user.prenom,
              nom: clientData.user.nom,
              telephone: clientData.user.telephone
            });

          if (profileError) {
            console.error('Profile error:', profileError);
            throw profileError;
          }

          // 3. Create user_role as 'client' (only for new users)
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'client'
            });

          if (roleError) {
            console.error('Role error:', roleError);
            throw roleError;
          }
        }

        // 4. Find agent if specified
        let agentId = null;
        if (clientData.agentEmail) {
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', clientData.agentEmail)
            .single();

          if (agentProfile) {
            const { data: agent } = await supabase
              .from('agents')
              .select('id')
              .eq('user_id', agentProfile.id)
              .single();

            if (agent) {
              agentId = agent.id;
            }
          }
        }

        // 5. Create or update client
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingClient) {
          // Update existing client
          const { error: clientError } = await supabase
            .from('clients')
            .update({
              agent_id: agentId,
              ...clientData.client
            })
            .eq('user_id', userId);

          if (clientError) {
            console.error('Client update error:', clientError);
            throw clientError;
          }

          result.updated++;
          console.log(`Successfully updated: ${clientData.user.email}`);
        } else {
          // Create new client
          const { error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: userId,
              agent_id: agentId,
              ...clientData.client
            });

          if (clientError) {
            console.error('Client error:', clientError);
            throw clientError;
          }

          // Update agent's client count if assigned (only for new clients)
          if (agentId) {
            const { data: agent } = await supabase
              .from('agents')
              .select('nombre_clients_assignes')
              .eq('id', agentId)
              .single();
            
            if (agent) {
              await supabase
                .from('agents')
                .update({ nombre_clients_assignes: (agent.nombre_clients_assignes || 0) + 1 })
                .eq('id', agentId);
            }
          }

          result.created++;
          console.log(`Successfully created: ${clientData.user.email}`);
        }

      } catch (error) {
        console.error(`Failed to import ${clientData.user.email}:`, error);
        result.failed++;
        result.errors.push({
          email: clientData.user.email,
          reason: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    console.log(`Import completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in import-clients-csv function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
