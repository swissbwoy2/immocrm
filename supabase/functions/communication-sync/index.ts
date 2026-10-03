import { connectReceipts } from "../_shared/communication-admin.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";
import { syncCommunications } from "../_shared/communication-sync.ts";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Unauthorized", { status: 403 });
  }
  const token = req.headers.get("x-newsletter-dispatch-token") || "";
  let allowed = false;
  if (/^[0-9a-f-]{72}$/.test(token)) {
    const r = await db.rpc("newsletter_verify_dispatch", { p_token: token });
    allowed = !r.error && r.data === true;
  } else {
    const auth = await verifyInternalCaller(req);
    allowed = auth.ok && ["service", "secret"].includes(auth.kind);
  }
  if (!allowed) return new Response("Unauthorized", { status: 403 });
  try {
    const body = await req.json().catch(() => ({}));
    return Response.json(
      body.action === "connect"
        ? await connectReceipts(db)
        : await syncCommunications(db),
    );
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Suivi indisponible",
    }, { status: 503 });
  }
});
