import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const page = (title: string, message: string) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f8faf9;margin:0;padding:40px">
  <div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;text-align:center">
    <h1 style="color:#16a34a;font-size:20px;margin:0 0 10px">${title}</h1>
    <p style="color:#4b5563">${message}</p>
    <a href="https://logisorama.ch/annonces" style="display:inline-block;margin-top:16px;background:#16a34a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Retour aux annonces</a>
  </div>
</body></html>`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || !/^[0-9a-fA-F-]{36}$/.test(token)) {
    return new Response(page("Lien invalide", "Ce lien de désinscription n'est pas valide."), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase
    .from("alertes_annonces")
    .update({ actif: false })
    .eq("unsubscribe_token", token);

  if (error) {
    console.error("unsubscribe error", error);
    return new Response(page("Erreur", "Impossible de traiter votre demande pour le moment."), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(
    page("Désinscription confirmée", "Vous ne recevrez plus d'e-mails pour cette alerte."),
    { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
});
