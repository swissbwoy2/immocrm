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

    // Pre-fetch existing emails in meta_leads to dedupe by email
    const incomingEmails = Array.from(
      new Set(
        leads
          .map((l: any) => l.email?.toLowerCase()?.trim())
          .filter(Boolean)
      )
    );

    const existingEmails = new Set<string>();
    if (incomingEmails.length > 0) {
      // chunk to avoid huge IN()
      for (let i = 0; i < incomingEmails.length; i += 200) {
        const chunk = incomingEmails.slice(i, i + 200);
        const { data: existing } = await supabase
          .from('meta_leads')
          .select('email')
          .in('email', chunk);
        (existing || []).forEach((r: any) => {
          if (r.email) existingEmails.add(r.email.toLowerCase());
        });
      }
    }

    for (const lead of leads) {
      const email = lead.email?.toLowerCase()?.trim() || null;
      if (!email) {
        errors++;
        continue;
      }

      if (existingEmails.has(email)) {
        duplicates++;
        continue;
      }

      const prenom = lead.prenom || '';
      const nom = lead.nom || '';
      const fullName = [prenom, nom].filter(Boolean).join(' ') || null;
      const formulaire = lead.formulaire || formulaire_name || null;
      const originalSource = lead.source || 'CSV Import';
      const leadStatus = String(originalSource).toLowerCase() === 'payé' ? 'qualified' : 'new';

      const row = {
        leadgen_id: `csv_${crypto.randomUUID()}`,
        source: 'csv_import',
        form_name: formulaire,
        email,
        phone: lead.telephone || null,
        first_name: prenom || null,
        last_name: nom || null,
        full_name: fullName,
        lead_status: leadStatus,
        imported_at: new Date().toISOString(),
        raw_meta_payload: {
          original_source: originalSource,
          original_formulaire: formulaire,
          import_filename: formulaire_name || null,
        },
      };

      const { error } = await supabase.from('meta_leads').insert(row);

      if (error) {
        if (error.code === '23505') {
          duplicates++;
        } else {
          errors++;
          console.error('Insert error:', error.message);
        }
      } else {
        inserted++;
        existingEmails.add(email);
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
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
