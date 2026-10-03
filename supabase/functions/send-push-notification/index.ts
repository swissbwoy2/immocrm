import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { denyIfNotInternal } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  link?: string;
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

function b64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToDer(pem: string): Uint8Array {
  const contents = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "")
    .trim();
  return Uint8Array.from(atob(contents), (c) => c.charCodeAt(0));
}

/* ------------------------------------------------------------------ */
/* FCM (Android)                                                       */
/* ------------------------------------------------------------------ */

async function createJWT(serviceAccount: ServiceAccountKey): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput)
  );

  return `${signatureInput}.${b64url(new Uint8Array(signature))}`;
}

async function getAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OAuth2 token error:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function sendFCMMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string; invalidToken?: boolean }> {
  const message = {
    message: {
      token,
      notification: { title, body },
      data: data || {},
      android: {
        priority: "high",
        notification: { sound: "default", click_action: "FLUTTER_NOTIFICATION_CLICK" },
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("FCM send error:", error);
    return {
      success: false,
      error,
      invalidToken: error.includes("UNREGISTERED") || error.includes("INVALID_ARGUMENT"),
    };
  }

  return { success: true };
}

/* ------------------------------------------------------------------ */
/* APNs (iOS)                                                          */
/* ------------------------------------------------------------------ */

let cachedApnsJwt: { token: string; createdAt: number } | null = null;

async function getApnsJwt(keyId: string, teamId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && now - cachedApnsJwt.createdAt < 50 * 60) {
    return cachedApnsJwt.token;
  }

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKeyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // WebCrypto returns the JOSE r||s (64 bytes) signature directly.
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const token = `${signingInput}.${b64url(new Uint8Array(signature))}`;
  cachedApnsJwt = { token, createdAt: now };
  return token;
}

async function sendAPNsMessage(
  jwt: string,
  base: string,
  bundleId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string; invalidToken?: boolean; environmentMismatch?: boolean }> {
  const payload = {
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
    ...(data || {}),
  };

  const response = await fetch(`${base}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const envLabel = base.includes("sandbox") ? "sandbox" : "production";

  if (response.ok) {
    console.log(`APNs send OK on ${envLabel} endpoint`);
    return { success: true };
  }

  const errorText = await response.text();
  console.error(`APNs send error on ${envLabel} (${response.status}):`, errorText);

  let reason = "";
  try {
    reason = JSON.parse(errorText)?.reason ?? "";
  } catch {
    // ignore
  }

  const invalidToken =
    response.status === 410 ||
    (response.status === 400 &&
      ["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"].includes(reason));

  const environmentMismatch =
    response.status === 400 && ["BadDeviceToken", "DeviceTokenNotForTopic"].includes(reason);

  return { success: false, error: errorText, invalidToken, environmentMismatch };
}

const APNS_PRODUCTION_URL = "https://api.push.apple.com";
const APNS_SANDBOX_URL = "https://api.sandbox.push.apple.com";

async function sendAPNsWithFallback(
  jwt: string,
  preferredBase: string,
  bundleId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; error?: string; invalidToken?: boolean }> {
  const otherBase =
    preferredBase === APNS_PRODUCTION_URL ? APNS_SANDBOX_URL : APNS_PRODUCTION_URL;

  const first = await sendAPNsMessage(jwt, preferredBase, bundleId, token, title, body, data);
  if (first.success) return { success: true };

  if (first.environmentMismatch) {
    const otherLabel = otherBase.includes("sandbox") ? "sandbox" : "production";
    console.log(`APNs environment mismatch — retrying on ${otherLabel} endpoint`);
    const second = await sendAPNsMessage(jwt, otherBase, bundleId, token, title, body, data);
    if (second.success) return { success: true };
    return {
      success: false,
      error: second.error ?? first.error,
      invalidToken: Boolean(first.invalidToken && second.invalidToken),
    };
  }

  return { success: false, error: first.error, invalidToken: first.invalidToken };
}


/* ------------------------------------------------------------------ */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const _deny = await denyIfNotInternal(req, corsHeaders, 'send-push-notification');
  if (_deny) return _deny;

  try {
    const { user_id, user_ids, title, body, data, link } =
      (await req.json()) as PushNotificationRequest;

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUserIds = user_ids || (user_id ? [user_id] : []);
    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: "user_id or user_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: deviceTokens, error: tokensError } = await supabase
      .from("device_tokens")
      .select("token, platform, user_id")
      .in("user_id", targetUserIds);

    if (tokensError) {
      console.error("Error fetching device tokens:", tokensError);
      throw new Error("Failed to fetch device tokens");
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log("No device tokens found for users:", targetUserIds);
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, total: 0, message: "No device tokens found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationData: Record<string, string> = {
      ...data,
      ...(link ? { link } : {}),
    };

    const iosTokens = deviceTokens.filter((d) => d.platform === "ios");
    const androidTokens = deviceTokens.filter((d) => d.platform !== "ios");

    console.log(
      `Found ${deviceTokens.length} device tokens (${iosTokens.length} iOS / ${androidTokens.length} Android)`
    );

    const deleteToken = async (token: string) => {
      await supabase.from("device_tokens").delete().eq("token", token);
    };

    const results: { success: boolean }[] = [];

    /* ---------------- iOS via APNs ---------------- */
    if (iosTokens.length > 0) {
      const keyId = Deno.env.get("APNS_KEY_ID");
      const teamId = Deno.env.get("APNS_TEAM_ID");
      const privateKey = Deno.env.get("APNS_PRIVATE_KEY");
      const bundleId = Deno.env.get("APNS_BUNDLE_ID") || "ch.logisorama.app";
      const production = (Deno.env.get("APNS_PRODUCTION") ?? "true") === "true";
      const base = production ? APNS_PRODUCTION_URL : APNS_SANDBOX_URL;
      console.log(`APNs preferred environment: ${production ? "production" : "sandbox"}`);

      if (!keyId || !teamId || !privateKey) {
        console.error(
          "APNs secrets missing (APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY) — skipping iOS tokens"
        );
        iosTokens.forEach(() => results.push({ success: false }));
      } else {
        try {
          const jwt = await getApnsJwt(keyId, teamId, privateKey);
          const iosResults = await Promise.all(
            iosTokens.map(async (device) => {
              const r = await sendAPNsWithFallback(
                jwt,
                base,
                bundleId,
                device.token,
                title,
                body,
                notificationData
              );
              if (r.invalidToken) {
                console.log(`Removing invalid iOS token for user ${device.user_id}`);
                await deleteToken(device.token);
              }
              return { success: r.success };
            })
          );
          results.push(...iosResults);
        } catch (e) {
          console.error("APNs dispatch failed:", e);
          cachedApnsJwt = null;
          iosTokens.forEach(() => results.push({ success: false }));
        }
      }
    }

    /* ---------------- Android via FCM ---------------- */
    if (androidTokens.length > 0) {
      const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
      if (!serviceAccountJson) {
        console.error("FIREBASE_SERVICE_ACCOUNT not configured — skipping Android tokens");
        androidTokens.forEach(() => results.push({ success: false }));
      } else {
        try {
          const serviceAccount: ServiceAccountKey = JSON.parse(serviceAccountJson);
          const accessToken = await getAccessToken(serviceAccount);
          const androidResults = await Promise.all(
            androidTokens.map(async (device) => {
              const r = await sendFCMMessage(
                accessToken,
                serviceAccount.project_id,
                device.token,
                title,
                body,
                notificationData
              );
              if (r.invalidToken) {
                console.log(`Removing invalid Android token for user ${device.user_id}`);
                await deleteToken(device.token);
              }
              return { success: r.success };
            })
          );
          results.push(...androidResults);
        } catch (e) {
          console.error("FCM dispatch failed:", e);
          androidTokens.forEach(() => results.push({ success: false }));
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    console.log(`Push notifications sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: deviceTokens.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
