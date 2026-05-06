// One-shot cleanup: removes orphan files from message-attachments bucket
// (storage objects that have no reference in public.messages.attachment_url)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. List all objects in bucket
    const { data: objects, error: listErr } = await supabase
      .from("storage.objects" as any)
      .select("name")
      .eq("bucket_id", "message-attachments")
      .limit(1000);

    if (listErr) throw listErr;
    if (!objects || objects.length === 0) {
      return new Response(JSON.stringify({ removed: 0, message: "Nothing to purge" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Find which are referenced
    const { data: msgs } = await supabase
      .from("messages")
      .select("attachment_url")
      .not("attachment_url", "is", null);

    const referenced = new Set<string>();
    (msgs || []).forEach((m: any) => {
      if (m.attachment_url) {
        // extract object name (last segment after bucket path)
        const url = m.attachment_url as string;
        objects.forEach((o: any) => {
          if (url.includes(o.name)) referenced.add(o.name);
        });
      }
    });

    const orphans = objects
      .map((o: any) => o.name)
      .filter((n: string) => !referenced.has(n));

    if (orphans.length === 0) {
      return new Response(JSON.stringify({ removed: 0, message: "No orphans" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Actually remove from storage (binary + metadata)
    const { data: removed, error: removeErr } = await supabase.storage
      .from("message-attachments")
      .remove(orphans);

    if (removeErr) throw removeErr;

    return new Response(
      JSON.stringify({
        success: true,
        removed: removed?.length ?? 0,
        files: orphans,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
