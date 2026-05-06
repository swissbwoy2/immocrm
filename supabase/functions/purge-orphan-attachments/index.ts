// One-shot cleanup: removes orphan files from message-attachments bucket
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function listAllRecursive(supabase: any, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from("message-attachments")
      .list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // folders have null id
      if (item.id === null) {
        const sub = await listAllRecursive(supabase, path);
        out.push(...sub);
      } else {
        out.push(path);
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const allFiles = await listAllRecursive(supabase);
    console.log(`[purge] Found ${allFiles.length} files in bucket`);

    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("attachment_url")
      .not("attachment_url", "is", null);
    if (msgErr) throw msgErr;

    const referencedUrls = (msgs || []).map((m: any) => m.attachment_url as string);
    const orphans = allFiles.filter(
      (f) => !referencedUrls.some((url) => url.includes(f))
    );

    console.log(`[purge] ${orphans.length} orphans to remove`);

    if (orphans.length === 0) {
      return new Response(
        JSON.stringify({ success: true, removed: 0, total: allFiles.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove in batches of 100
    let removed = 0;
    for (let i = 0; i < orphans.length; i += 100) {
      const batch = orphans.slice(i, i + 100);
      const { data, error } = await supabase.storage
        .from("message-attachments")
        .remove(batch);
      if (error) {
        console.error("Remove error:", error);
        throw error;
      }
      removed += data?.length ?? 0;
    }

    return new Response(
      JSON.stringify({ success: true, removed, total: allFiles.length, orphans }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("[purge] FATAL:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
