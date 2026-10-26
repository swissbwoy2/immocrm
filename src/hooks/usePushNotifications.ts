import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCorrectNotificationLink, detectRoleFromPath } from "@/lib/notificationLinks";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";

// This hook handles push notifications for native iOS/Android

/** Compte pour lequel l'enregistrement a déjà été lancé (une fois par ouverture de l'app). */
let initializedFor: string | null = null;

/** Journal d'enregistrement (diagnostic) : autorisation, jeton reçu, erreurs. Jamais bloquant. */
export function logPushStep(userId: string, platform: string, etape: string, detail?: string) {
  void (supabase.from("push_registration_log" as any) as any)
    .insert({ user_id: userId, platform, etape, detail: detail ?? null })
    .then(() => undefined, () => undefined);
}

interface PushNotificationToken {
  value: string;
}

interface PushNotificationActionPerformed {
  notification: {
    data?: {
      link?: string;
      type?: string;
      metadata?: string | Record<string, string>;
    };
  };
}

export function usePushNotifications() {
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const registerToken = useCallback(async (pushToken: string, userId: string) => {
    try {
      console.log('[Push] Registering token for user:', userId);
      console.log('[Push] Token (first 20 chars):', pushToken.substring(0, 20) + '...');
      console.log('[Push] Platform:', platform);

      const { error } = await supabase
        .from("device_tokens")
        .upsert(
          {
            user_id: userId,
            token: pushToken,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" }
        );

      if (error) {
        console.error("[Push] Error registering token:", error);
        setRegistrationError(`DB Error: ${error.message}`);
        return false;
      }
      console.log("[Push] Token registered successfully in database");
      setToken(pushToken);
      setRegistrationError(null);
      return true;
    } catch (err) {
      console.error("[Push] Failed to register token:", err);
      setRegistrationError(`Exception: ${String(err)}`);
      return false;
    }
  }, [platform]);

  const handleNotificationReceived = useCallback(async (notification: any) => {
    console.log("[Push] Notification received:", notification);
    
    // Haptic feedback when notification received
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available
    }
  }, []);

  const handleNotificationAction = useCallback((action: PushNotificationActionPerformed) => {
    console.log("[Push] Notification action performed:", action);
    const data = action.notification.data || {};
    const link = data.link || null;
    // Le rôle RÉEL de l'utilisateur prime sur celui déduit du lien :
    // un lien généré pour un autre espace ne doit jamais provoquer de 404.
    const knownRoles = ['admin', 'agent', 'client', 'apporteur'] as const;
    const role = (knownRoles as readonly string[]).includes(userRole || '')
      ? (userRole as (typeof knownRoles)[number])
      : detectRoleFromPath(link || '');
    let metadata: Record<string, string> | null = null;
    if (data.metadata) {
      try {
        metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      } catch (e) {
        console.error('[Push] Failed to parse metadata:', e);
      }
    }
    const url = getCorrectNotificationLink(data.type || '', link, role, metadata);
    console.log("[Push] Navigating to:", url);
    navigate(url);
  }, [navigate, userRole]);

  // Gestionnaires lus via des refs : un changement de rôle ne relance pas l'enregistrement.
  const actionRef = useRef(handleNotificationAction);
  actionRef.current = handleNotificationAction;
  const receivedRef = useRef(handleNotificationReceived);
  receivedRef.current = handleNotificationReceived;
  const registerRef = useRef(registerToken);
  registerRef.current = registerToken;

  const initializePushNotifications = useCallback(async (userId: string) => {
    if (!isNative) return;
    const log = (etape: string, detail?: string) => logPushStep(userId, platform, etape, detail);

    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Les écouteurs sont branchés AVANT toute vérification d'autorisation : si l'utilisateur
      // autorise plus tard (Paramètres › « Activer sur ce téléphone »), le jeton reçu est quand
      // même enregistré. Avant, un refus initial laissait l'app sans écouteur → jeton perdu.
      await PushNotifications.removeAllListeners();
      await PushNotifications.addListener("registration", (pushToken: PushNotificationToken) => {
        void registerRef.current(pushToken.value, userId).then((ok) =>
          log(ok ? "jeton_enregistre" : "jeton_refuse_base", ok ? `longueur ${pushToken.value.length}` : undefined),
        );
      });
      await PushNotifications.addListener("registrationError", (error: any) => {
        const detail = error?.error || JSON.stringify(error);
        setRegistrationError(`Registration failed: ${detail}`);
        log("erreur_enregistrement", String(detail).slice(0, 500));
      });
      await PushNotifications.addListener("pushNotificationReceived", (n: any) => receivedRef.current(n));
      await PushNotifications.addListener("pushNotificationActionPerformed", (a: any) => actionRef.current(a));

      let perm = await PushNotifications.checkPermissions();
      setPermissionStatus(perm.receive);
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
        setPermissionStatus(perm.receive);
      }
      if (perm.receive !== "granted") {
        setRegistrationError("Permissions denied");
        log("autorisation_refusee", perm.receive);
        return;
      }

      setIsSupported(true);
      log("autorisation_ok");
      await PushNotifications.register();
    } catch (error) {
      setIsSupported(false);
      setRegistrationError(`Init failed: ${String(error)}`);
      log("indisponible", String(error).slice(0, 500));
    }
  }, [isNative, platform]);

  useEffect(() => {
    if (!isNative || !user?.id) return;
    if (initializedFor === user.id) return;
    initializedFor = user.id;
    void initializePushNotifications(user.id);
  }, [isNative, user?.id, initializePushNotifications]);

  const unregisterToken = useCallback(async () => {
    if (!token) return;
    
    console.log("[Push] Unregistering token...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("device_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("token", token);

      if (error) {
        console.error("[Push] Failed to unregister token:", error);
      } else {
        console.log("[Push] Token unregistered successfully");
        setToken(null);
      }
    } catch (error) {
      console.error("[Push] Failed to unregister token:", error);
    }
  }, [token]);

  // Debug function to check current state
  const getDebugInfo = useCallback(() => {
    return {
      isNative,
      platform,
      isSupported,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      permissionStatus,
      registrationError,
    };
  }, [isNative, platform, isSupported, token, permissionStatus, registrationError]);

  return {
    token,
    isSupported,
    unregisterToken,
    registrationError,
    permissionStatus,
    getDebugInfo,
  };
}
