// Public signup completion: creates profile + assigns 'client' role server-side.
// Idempotent. Called from public landing forms after supabase.auth.signUp().
// When user_id is omitted, falls back to email lookup (for "user already registered"
// flow) and only creates profile/role rows if missing — never overwrites existing data.
//
// Extended (June 2026):
//  - Detects the "Relouer mon appartement" journey via explicit signals
//    (source='relouer-mon-appartement' OR parcours='locataire-sortant' OR
//     intention='relouer_mon_appartement' OR formulaire ILIKE %relouer%).
//  - When the relouer journey is detected, ensures:
//      * clients.journey_type is set to 'property_reletting'
//        (or 'mixed' if the user already had a different journey).
//      * a public.relouer_requests row exists (idempotent on user_id+lead_id),
//        populated with the property payload sent by the form.
//  - Never reclassifies an existing housing_search client without explicit relouer signals.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RelouerProperty {
  lead_id?: string | null;
  type_bien?: string | null;
  adresse?: string | null;
  npa?: string | null;
  ville?: string | null;
  canton?: string | null;
  nombre_pieces?: string | number | null;
  surface?: string | number | null;
  etage?: string | number | null;
  equipements?: string[] | null;
  loyer_net?: string | number | null;
  charges?: string | number | null;
  date_reprise?: string | null;
  date_fin_bail?: string | null;
  resiliation_donnee?: string | null;
  motif_depart?: string | null;
  description?: string | null;
  urgence?: string | null;
}

interface Payload {
  user_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  source?: string;
  formulaire?: string;
  intention?: string;
  parcours?:
    | 'location' | 'achat' | 'vente' | 'renovation'
    | 'relocation' | 'locataire-sortant';
  relouer_property?: RelouerProperty | null;
}

const isRelouerJourney = (b: Payload) => {
  const norm = (s?: string | null) => (s || '').toLowerCase();
  return (
    norm(b.source) === 'relouer-mon-appartement' ||
    norm(b.parcours) === 'locataire-sortant' ||
    norm(b.intention) === 'relouer_mon_appartement' ||
    norm(b.formulaire).includes('relouer')
  );
};

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const toInt = (v: any): number | null => {
  const n = toNum(v);
  return n === null ? null : Math.trunc(n);
};
const toDate = (v: any): string | null => {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Payload;

    if (!body?.email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Resolve auth user id
    let userId = body.user_id || '';

    if (userId) {
      const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
      if (authErr || !authUser?.user) {
        return new Response(
          JSON.stringify({ error: 'auth user not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      let found: { id: string } | null = null;
      for (let page = 1; page <= 20 && !found; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const match = data?.users?.find(
          (u) => (u.email || '').toLowerCase() === body.email.toLowerCase()
        );
        if (match) found = { id: match.id };
        if (!data?.users?.length || data.users.length < 200) break;
      }
      if (!found) {
        return new Response(
          JSON.stringify({ error: 'auth user not found for email' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = found.id;
    }

    const relouer = isRelouerJourney(body);

    // Normalize parcours: 'locataire-sortant' -> 'location' (legacy parcours_type)
    const normalizedParcours =
      body.parcours === 'locataire-sortant' ? 'location' : (body.parcours || 'location');

    // ---------- profiles ----------
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileErr } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: body.email,
          prenom: body.first_name || '',
          nom: body.last_name || '',
          telephone: body.phone || null,
          actif: true,
          parcours_type: normalizedParcours,
        });
      if (profileErr) {
        console.error('profile insert error', profileErr);
        return new Response(
          JSON.stringify({ error: 'profile_failed', details: profileErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ---------- user_roles ----------
    const { data: existingRole } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await admin
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });
      if (roleErr && !String(roleErr.message || '').toLowerCase().includes('duplicate')) {
        console.error('role insert error', roleErr);
        return new Response(
          JSON.stringify({ error: 'role_failed', details: roleErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ---------- clients.journey_type (relouer journey only) ----------
    let relouerRequestId: string | null = null;

    if (relouer) {
      const { data: existingClient } = await admin
        .from('clients')
        .select('id, journey_type')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingClient) {
        const current = existingClient.journey_type || 'housing_search';
        const target = current === 'housing_search' ? 'mixed' : 'property_reletting';
        if (current !== target) {
          await admin
            .from('clients')
            .update({ journey_type: target })
            .eq('id', existingClient.id);
        }
      }

      // ---------- relouer_requests (idempotent) ----------
      const p = body.relouer_property || {};
      const leadId = p.lead_id || null;

      let existingReq: { id: string } | null = null;
      if (leadId) {
        const { data } = await admin
          .from('relouer_requests')
          .select('id')
          .eq('user_id', userId)
          .eq('lead_id', leadId)
          .maybeSingle();
        existingReq = data;
      }
      if (!existingReq) {
        const { data } = await admin
          .from('relouer_requests')
          .select('id')
          .eq('user_id', userId)
          .is('lead_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingReq = data;
      }

      if (existingReq) {
        relouerRequestId = existingReq.id;
      } else {
        const equipements = Array.isArray(p.equipements) ? p.equipements : [];
        const has = (label: string) =>
          equipements.some((e) => (e || '').toLowerCase().includes(label));

        const { data: created, error: reqErr } = await admin
          .from('relouer_requests')
          .insert({
            user_id: userId,
            lead_id: leadId,
            status: 'new_request',
            prenom: body.first_name || null,
            nom: body.last_name || null,
            email: body.email,
            telephone: body.phone || null,
            requester_role: 'locataire_sortant',
            property_type: p.type_bien || null,
            property_street: p.adresse || null,
            property_zip: p.npa || null,
            property_city: p.ville || null,
            property_canton: p.canton || null,
            rooms: toNum(p.nombre_pieces),
            surface: toNum(p.surface),
            floor: toInt(p.etage),
            has_elevator: has('ascenseur'),
            has_balcony: has('balcon'),
            has_terrace: has('terrasse'),
            has_cellar: has('cave'),
            has_indoor_parking: has('parking'),
            rent_net: toNum(p.loyer_net),
            charges: toNum(p.charges),
            rent_gross:
              toNum(p.loyer_net) !== null || toNum(p.charges) !== null
                ? (toNum(p.loyer_net) || 0) + (toNum(p.charges) || 0)
                : null,
            availability_date: toDate(p.date_reprise),
            current_lease_end_date: toDate(p.date_fin_bail),
            resignation_sent:
              (p.resiliation_donnee || '').toLowerCase().includes('oui'),
            description: p.description || null,
            special_features:
              [p.motif_depart && `Motif: ${p.motif_depart}`, p.urgence && `Urgence: ${p.urgence}`]
                .filter(Boolean)
                .join(' — ') || null,
          })
          .select('id')
          .single();

        if (reqErr) {
          console.error('relouer_requests insert error', reqErr);
        } else if (created) {
          relouerRequestId = created.id;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: userId,
        relouer: relouer,
        relouer_request_id: relouerRequestId,
        profile_existed: !!existingProfile,
        source: body.source || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('create-public-user fatal', e);
    return new Response(
      JSON.stringify({ error: 'unexpected', details: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
