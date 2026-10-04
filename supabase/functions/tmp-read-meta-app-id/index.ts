Deno.serve(() => new Response(JSON.stringify({ meta_app_id: Deno.env.get("META_APP_ID") ?? null }), { headers: { "Content-Type": "application/json" } }));
