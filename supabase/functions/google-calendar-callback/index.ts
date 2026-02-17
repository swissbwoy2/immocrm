import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!;
  const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;

  let appUrl = 'https://immocrm.lovable.app';
  let userId: string | null = null;

  // Parse state
  if (state) {
    try {
      const stateData = JSON.parse(atob(state));
      appUrl = stateData.appUrl || appUrl;
      userId = stateData.userId;
    } catch {
      console.error('Invalid state parameter');
    }
  }

  // Handle OAuth error
  if (errorParam) {
    console.error('OAuth error:', errorParam);
    return Response.redirect(`${appUrl}/parametres?google_calendar=error&reason=${errorParam}`, 302);
  }

  if (!code || !userId) {
    return Response.redirect(`${appUrl}/parametres?google_calendar=error&reason=missing_params`, 302);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.refresh_token) {
      console.error('Token exchange failed:', tokenData);
      return Response.redirect(`${appUrl}/parametres?google_calendar=error&reason=token_exchange_failed`, 302);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Upsert the token for this user
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        refresh_token: tokenData.refresh_token,
        access_token: tokenData.access_token,
        token_expires_at: expiresAt,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error saving token:', upsertError);
      return Response.redirect(`${appUrl}/parametres?google_calendar=error&reason=db_error`, 302);
    }

    return Response.redirect(`${appUrl}/parametres?google_calendar=success`, 302);
  } catch (error) {
    console.error('Error in google-calendar-callback:', error);
    return Response.redirect(`${appUrl}/parametres?google_calendar=error&reason=server_error`, 302);
  }
});
