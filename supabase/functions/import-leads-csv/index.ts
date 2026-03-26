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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user has admin or closeur role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'closeur'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { leads, formulaire_name } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun lead fourni' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let inserted = 0;
    let duplicates = 0;
    let errors = 0;

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      const rows = batch.map((lead: any) => {
        const source = lead.source || 'CSV Import';
        const leadStatus = source.toLowerCase() === 'payé' ? 'qualified' : 'new';
        const formulaire = lead.formulaire || formulaire_name || null;
        const prenom = lead.prenom || '';
        const nom = lead.nom || '';
        const fullName = [prenom, nom].filter(Boolean).join(' ') || null;
        
        return {
          leadgen_id: `csv-import-${crypto.randomUUID()}`,
          email: lead.email?.toLowerCase()?.trim() || null,
          first_name: prenom || null,
          last_name: nom || null,
          full_name: fullName,
          phone: lead.telephone || null,
          source,
          form_name: formulaire,
          lead_status: leadStatus,
          imported_at: new Date().toISOString(),
        };
      }).filter((r: any) => r.email);

      for (const row of rows) {
        const { error } = await supabase
          .from('meta_leads')
          .insert(row);

        if (error) {
          if (error.code === '23505') {
            duplicates++;
          } else {
            errors++;
            console.error('Insert error:', error.message);
          }
        } else {
          inserted++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        duplicates,
        errors,
        total: leads.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Import error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
