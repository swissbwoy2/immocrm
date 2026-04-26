import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function fetchGraphAPI(path: string, token: string): Promise<any> {
  const url = `https://graph.facebook.com/v21.0/${path}`;
  const res = await fetch(`${url}&access_token=${token}`);
  if (!res.ok) {
    console.error(`Graph API error for ${path}: ${res.status}`);
    return null;
  }
  return res.json();
}

async function fetchGraphAPIWithRetry(
  path: string,
  token: string
): Promise<any> {
  let result = await fetchGraphAPI(path, token);
  if (!result) {
    console.log(`Retrying Graph API call: ${path}`);
    result = await fetchGraphAPI(path, token);
  }
  return result;
}

function extractFieldValue(
  fieldData: any[],
  name: string
): string | undefined {
  const field = fieldData?.find(
    (f: any) => f.name?.toLowerCase() === name.toLowerCase()
  );
  return field?.values?.[0] || undefined;
}

async function verifySignature(
  body: string,
  signature: string,
  appSecret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = `sha256=${hashHex}`;
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const META_VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  const META_PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // GET — Webhook verification handshake
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST — Process leadgen events
  if (req.method === "POST") {
    const bodyText = await req.text();

    // Validate signature
    const signature = req.headers.get("x-hub-signature-256");
    if (signature && META_APP_SECRET) {
      const valid = await verifySignature(bodyText, signature, META_APP_SECRET);
      if (!valid) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", {
          status: 403,
          headers: corsHeaders,
        });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response("Invalid JSON", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const entries = payload?.entry || [];

    for (const entry of entries) {
      const pageId = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        const adId = change.value?.ad_id;

        // Log raw payload with maximum context
        await supabase.from("meta_lead_logs").insert({
          leadgen_id: leadgenId?.toString(),
          page_id: pageId?.toString(),
          form_id: formId?.toString(),
          ad_id: adId?.toString(),
          event_type: "webhook_received",
          status: "received",
          payload: change.value,
        });

        if (!leadgenId) {
          console.error("No leadgen_id in webhook payload");
          continue;
        }

        // Deduplication check
        const { data: existing } = await supabase
          .from("meta_leads")
          .select("id")
          .eq("leadgen_id", leadgenId.toString())
          .maybeSingle();

        if (existing) {
          console.log(`Duplicate leadgen_id ${leadgenId}, skipping`);
          await supabase.from("meta_lead_logs").insert({
            leadgen_id: leadgenId.toString(),
            page_id: pageId?.toString(),
            form_id: formId?.toString(),
            ad_id: adId?.toString(),
            event_type: "duplicate_ignored",
            status: "skipped",
            payload: change.value,
          });
          continue;
        }

        try {
          // Fetch full lead data from Graph API
          const leadData = await fetchGraphAPIWithRetry(
            `${leadgenId}?fields=field_data,created_time,ad_id,campaign_id,form_id,is_organic`,
            META_PAGE_ACCESS_TOKEN!
          );

          if (!leadData) {
            throw new Error("Failed to fetch lead data from Graph API");
          }

          const fieldData = leadData.field_data || [];
          const metaAdId = leadData.ad_id || adId;
          const metaCampaignId = leadData.campaign_id;
          const metaFormId = leadData.form_id || formId;
          const isOrganic = leadData.is_organic || false;

          // Extract contact fields
          const email = extractFieldValue(fieldData, "email");
          const phone =
            extractFieldValue(fieldData, "phone_number") ||
            extractFieldValue(fieldData, "phone");
          const fullName = extractFieldValue(fieldData, "full_name");
          const firstName = extractFieldValue(fieldData, "first_name");
          const lastName = extractFieldValue(fieldData, "last_name");
          const city = extractFieldValue(fieldData, "city");
          const postalCode =
            extractFieldValue(fieldData, "zip") ||
            extractFieldValue(fieldData, "postal_code");

          // Build raw answers
          const rawAnswers: Record<string, string> = {};
          for (const f of fieldData) {
            rawAnswers[f.name] = f.values?.[0] || "";
          }

          // Enrich names via Graph API (best-effort)
          let adName: string | null = null;
          let adsetId: string | null = null;
          let adsetName: string | null = null;
          let campaignName: string | null = null;
          let formName: string | null = null;
          let pageName: string | null = null;

          // Ad details
          if (metaAdId) {
            const adData = await fetchGraphAPI(
              `${metaAdId}?fields=name,adset_id,campaign_id`,
              META_PAGE_ACCESS_TOKEN!
            );
            if (adData) {
              adName = adData.name;
              adsetId = adData.adset_id;
            }
          }

          // Adset name
          if (adsetId) {
            const adsetData = await fetchGraphAPI(
              `${adsetId}?fields=name`,
              META_PAGE_ACCESS_TOKEN!
            );
            if (adsetData) adsetName = adsetData.name;
          }

          // Campaign name
          if (metaCampaignId) {
            const campData = await fetchGraphAPI(
              `${metaCampaignId}?fields=name`,
              META_PAGE_ACCESS_TOKEN!
            );
            if (campData) campaignName = campData.name;
          }

          // Form name
          if (metaFormId) {
            const formData = await fetchGraphAPI(
              `${metaFormId}?fields=name`,
              META_PAGE_ACCESS_TOKEN!
            );
            if (formData) formName = formData.name;
          }

          // Page name
          if (pageId) {
            const pageData = await fetchGraphAPI(
              `${pageId}?fields=name`,
              META_PAGE_ACCESS_TOKEN!
            );
            if (pageData) pageName = pageData.name;
          }

          // Build ad_reference_label
          const labelParts: string[] = [];
          if (campaignName) labelParts.push(`Campagne: ${campaignName}`);
          if (adsetName) labelParts.push(`Adset: ${adsetName}`);
          if (adName) labelParts.push(`Ad: ${adName}`);
          const adReferenceLabel =
            labelParts.length > 0 ? labelParts.join(" / ") : null;

          // Build ad_reference_url (best-effort)
          const adReferenceUrl = metaAdId
            ? `https://www.facebook.com/ads/manager/manage/ads?act=&selected_ad_ids=${metaAdId}`
            : null;

          // Compute full_name if not directly available
          const computedFullName =
            fullName ||
            [firstName, lastName].filter(Boolean).join(" ") ||
            null;

          // Insert lead
          const { error: insertError } = await supabase
            .from("meta_leads")
            .insert({
              leadgen_id: leadgenId.toString(),
              page_id: pageId?.toString(),
              page_name: pageName,
              form_id: metaFormId?.toString(),
              form_name: formName,
              campaign_id: metaCampaignId?.toString(),
              campaign_name: campaignName,
              adset_id: adsetId?.toString(),
              adset_name: adsetName,
              ad_id: metaAdId?.toString(),
              ad_name: adName,
              ad_reference_label: adReferenceLabel,
              ad_reference_url: adReferenceUrl,
              is_organic: isOrganic,
              lead_created_time_meta: leadData.created_time || null,
              full_name: computedFullName,
              first_name: firstName,
              last_name: lastName,
              email,
              phone,
              city,
              postal_code: postalCode,
              raw_answers: rawAnswers,
              raw_meta_payload: leadData,
            });

          if (insertError) {
            throw new Error(`Insert error: ${insertError.message}`);
          }

          // Log success
          await supabase.from("meta_lead_logs").insert({
            leadgen_id: leadgenId.toString(),
            page_id: pageId?.toString(),
            form_id: metaFormId?.toString(),
            ad_id: metaAdId?.toString(),
            event_type: "lead_processed",
            status: "success",
            payload: { email, full_name: computedFullName, is_organic: isOrganic },
          });

          // Notify admins
          const { data: admins } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (admins) {
            for (const admin of admins) {
              await supabase.rpc("create_notification", {
                p_user_id: admin.user_id,
                p_type: "new_meta_lead",
                p_title: "📣 Nouveau lead Meta Ads",
                p_message: `${computedFullName || email || "Nouveau lead"} via ${formName || "formulaire Meta"}`,
                p_link: "/admin/meta-leads",
                p_metadata: { leadgen_id: leadgenId.toString() },
              });
            }
          }

          console.log(`Lead ${leadgenId} processed successfully`);
        } catch (err: any) {
          console.error(`Error processing lead ${leadgenId}:`, (err instanceof Error ? err.message : String(err)));
          await supabase.from("meta_lead_logs").insert({
            leadgen_id: leadgenId?.toString(),
            page_id: pageId?.toString(),
            form_id: formId?.toString(),
            ad_id: adId?.toString(),
            event_type: "lead_processing_error",
            status: "error",
            error_message: (err instanceof Error ? err.message : String(err)),
            payload: change.value,
          });
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
});
