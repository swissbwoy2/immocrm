import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Graph API helpers (duplicated from webhook — edge functions can't share code) ──

async function fetchGraphAPI(path: string, token: string): Promise<any> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `https://graph.facebook.com/v21.0/${path}${separator}access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error(`Graph API error for ${path}: ${res.status} — ${text}`);
    return null;
  }
  return res.json();
}

async function fetchGraphAPIWithRetry(path: string, token: string): Promise<any> {
  let result = await fetchGraphAPI(path, token);
  if (!result) {
    console.log(`Retrying Graph API call: ${path}`);
    result = await fetchGraphAPI(path, token);
  }
  return result;
}

function extractFieldValue(fieldData: any[], name: string): string | undefined {
  const field = fieldData?.find((f: any) => f.name?.toLowerCase() === name.toLowerCase());
  return field?.values?.[0] || undefined;
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const META_PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN")!;

  // ── Auth: verify JWT + admin role ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const adminUserId = userData.user.id;

  // Use service role client for DB operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", adminUserId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Accès refusé — admin uniquement" }), { status: 403, headers: corsHeaders });
  }

  // ── Parse body ──
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // empty body is ok
  }

  // ── Concurrency guard (10 min lock) ──
  const { data: activeBackfill } = await supabase
    .from("meta_lead_logs")
    .select("id, created_at, payload")
    .eq("event_type", "backfill_started")
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeBackfill) {
    const sessionId = (activeBackfill.payload as any)?.session_id;
    if (sessionId) {
      // Check if this session already completed or failed
      const { data: completed } = await supabase
        .from("meta_lead_logs")
        .select("id")
        .in("event_type", ["backfill_completed", "backfill_failed"])
        .contains("payload", { session_id: sessionId })
        .maybeSingle();

      if (!completed) {
        return new Response(
          JSON.stringify({ error: "Un import est déjà en cours. Réessayez dans quelques minutes." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  // ── Auto-detect page_id ──
  let pageId = body.page_id;
  if (!pageId) {
    const { data: recentLead } = await supabase
      .from("meta_leads")
      .select("page_id")
      .not("page_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    pageId = recentLead?.page_id;
  }

  if (!pageId) {
    return new Response(
      JSON.stringify({ error: "Aucun page_id détecté. Veuillez le fournir manuellement." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Session start ──
  const sessionId = crypto.randomUUID();
  const counters = { total_fetched: 0, imported: 0, skipped: 0, errors: 0, forms_count: 0 };

  await supabase.from("meta_lead_logs").insert({
    event_type: "backfill_started",
    status: "started",
    page_id: pageId,
    payload: { admin_user_id: adminUserId, page_id: pageId, session_id: sessionId },
  });

  // ── Name cache to minimize API calls ──
  const nameCache = new Map<string, string | null>();

  async function getCachedName(id: string | null, fields = "name"): Promise<string | null> {
    if (!id) return null;
    if (nameCache.has(id)) return nameCache.get(id)!;
    const data = await fetchGraphAPI(`${id}?fields=${fields}`, META_PAGE_ACCESS_TOKEN);
    const name = data?.name || null;
    nameCache.set(id, name);
    return name;
  }

  try {
    // ── Fetch all forms ──
    const formsData = await fetchGraphAPIWithRetry(
      `${pageId}/leadgen_forms?fields=id,name,status&limit=100`,
      META_PAGE_ACCESS_TOKEN
    );

    if (!formsData?.data) {
      throw new Error("Impossible de récupérer les formulaires depuis Meta Graph API");
    }

    const forms = formsData.data;
    counters.forms_count = forms.length;
    console.log(`Found ${forms.length} forms for page ${pageId}`);

    // Cache page name
    const pageName = await getCachedName(pageId);

    // ── Process each form ──
    for (const form of forms) {
      const formId = form.id;
      const formName = form.name || null;
      nameCache.set(formId, formName);

      const formCounters = { fetched: 0, imported: 0, skipped: 0, errors: 0 };

      await supabase.from("meta_lead_logs").insert({
        event_type: "backfill_form_started",
        status: "started",
        page_id: pageId,
        form_id: formId,
        payload: { form_id: formId, form_name: formName, session_id: sessionId },
      });

      // Paginate leads
      let leadsUrl: string | null = `${formId}/leads?fields=field_data,created_time,ad_id,campaign_id,form_id,is_organic&limit=500`;

      while (leadsUrl) {
        let leadsData: any;
        if (leadsUrl.startsWith("http")) {
          // Full URL from paging.next — call directly
          const res = await fetch(leadsUrl);
          leadsData = res.ok ? await res.json() : null;
        } else {
          leadsData = await fetchGraphAPIWithRetry(leadsUrl, META_PAGE_ACCESS_TOKEN);
        }

        if (!leadsData?.data) break;

        for (const lead of leadsData.data) {
          const leadgenId = lead.id;
          formCounters.fetched++;
          counters.total_fetched++;

          // Dedup check
          const { data: existing } = await supabase
            .from("meta_leads")
            .select("id")
            .eq("leadgen_id", leadgenId.toString())
            .maybeSingle();

          if (existing) {
            formCounters.skipped++;
            counters.skipped++;
            continue;
          }

          try {
            const fieldData = lead.field_data || [];
            const metaAdId = lead.ad_id;
            const metaCampaignId = lead.campaign_id;
            const metaFormId = lead.form_id || formId;
            const isOrganic = lead.is_organic || false;

            // Extract contacts
            const email = extractFieldValue(fieldData, "email");
            const phone = extractFieldValue(fieldData, "phone_number") || extractFieldValue(fieldData, "phone");
            const fullName = extractFieldValue(fieldData, "full_name");
            const firstName = extractFieldValue(fieldData, "first_name");
            const lastName = extractFieldValue(fieldData, "last_name");
            const city = extractFieldValue(fieldData, "city");
            const postalCode = extractFieldValue(fieldData, "zip") || extractFieldValue(fieldData, "postal_code");

            // Raw answers
            const rawAnswers: Record<string, string> = {};
            for (const f of fieldData) {
              rawAnswers[f.name] = f.values?.[0] || "";
            }

            // Enrich names (cached)
            let adName: string | null = null;
            let adsetId: string | null = null;
            let adsetName: string | null = null;
            let campaignName: string | null = null;

            if (metaAdId) {
              if (nameCache.has(`ad_${metaAdId}`)) {
                adName = nameCache.get(`ad_${metaAdId}`)!;
                adsetId = nameCache.get(`adset_of_${metaAdId}`) || null;
              } else {
                const adData = await fetchGraphAPI(`${metaAdId}?fields=name,adset_id`, META_PAGE_ACCESS_TOKEN);
                if (adData) {
                  adName = adData.name || null;
                  adsetId = adData.adset_id || null;
                  nameCache.set(`ad_${metaAdId}`, adName);
                  nameCache.set(`adset_of_${metaAdId}`, adsetId);
                }
              }
            }

            if (adsetId) {
              adsetName = await getCachedName(adsetId);
            }

            if (metaCampaignId) {
              campaignName = await getCachedName(metaCampaignId);
            }

            const enrichedFormName = await getCachedName(metaFormId);

            // Build reference
            const labelParts: string[] = [];
            if (campaignName) labelParts.push(`Campagne: ${campaignName}`);
            if (adsetName) labelParts.push(`Adset: ${adsetName}`);
            if (adName) labelParts.push(`Ad: ${adName}`);
            const adReferenceLabel = labelParts.length > 0 ? labelParts.join(" / ") : null;
            const adReferenceUrl = metaAdId
              ? `https://www.facebook.com/ads/manager/manage/ads?act=&selected_ad_ids=${metaAdId}`
              : null;

            const computedFullName = fullName || [firstName, lastName].filter(Boolean).join(" ") || null;

            const { error: insertError } = await supabase.from("meta_leads").insert({
              leadgen_id: leadgenId.toString(),
              source: "backfill",
              page_id: pageId,
              page_name: pageName,
              form_id: metaFormId?.toString(),
              form_name: enrichedFormName || formName,
              campaign_id: metaCampaignId?.toString(),
              campaign_name: campaignName,
              adset_id: adsetId?.toString(),
              adset_name: adsetName,
              ad_id: metaAdId?.toString(),
              ad_name: adName,
              ad_reference_label: adReferenceLabel,
              ad_reference_url: adReferenceUrl,
              is_organic: isOrganic,
              lead_created_time_meta: lead.created_time || null,
              full_name: computedFullName,
              first_name: firstName,
              last_name: lastName,
              email,
              phone,
              city,
              postal_code: postalCode,
              raw_answers: rawAnswers,
              raw_meta_payload: lead,
            });

            if (insertError) {
              throw new Error(`Insert error: ${insertError.message}`);
            }

            formCounters.imported++;
            counters.imported++;
          } catch (err: any) {
            console.error(`Error processing lead ${leadgenId}:`, err.message);
            formCounters.errors++;
            counters.errors++;
          }
        }

        // Follow pagination
        leadsUrl = leadsData.paging?.next || null;
      }

      // Log form completion
      await supabase.from("meta_lead_logs").insert({
        event_type: "backfill_form_completed",
        status: "success",
        page_id: pageId,
        form_id: formId,
        payload: { form_id: formId, form_name: formName, session_id: sessionId, ...formCounters },
      });

      console.log(`Form ${formName || formId}: fetched=${formCounters.fetched} imported=${formCounters.imported} skipped=${formCounters.skipped} errors=${formCounters.errors}`);
    }

    // ── Session completed ──
    await supabase.from("meta_lead_logs").insert({
      event_type: "backfill_completed",
      status: "success",
      page_id: pageId,
      payload: { admin_user_id: adminUserId, session_id: sessionId, ...counters },
    });

    console.log(`Backfill completed: ${JSON.stringify(counters)}`);

    return new Response(JSON.stringify({ status: "ok", ...counters }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Backfill fatal error:", err.message);

    await supabase.from("meta_lead_logs").insert({
      event_type: "backfill_failed",
      status: "error",
      page_id: pageId,
      error_message: err.message,
      payload: { admin_user_id: adminUserId, session_id: sessionId, error_message: err.message, ...counters },
    });

    return new Response(JSON.stringify({ error: err.message, ...counters }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
