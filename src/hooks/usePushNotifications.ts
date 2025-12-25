import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

// This hook handles push notifications for native iOS/Android

interface PushNotificationToken {
  value: string;
}

interface PushNotificationActionPerformed {
  notification: {
    data?: {
      link?: string;
    };
  };
}

export function usePushNotifications() {
  const navigate = useNavigate();
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
      } else {
        console.log("[Push] Token registered successfully in database");
        setToken(pushToken);
        setRegistrationError(null);
      }
    } catch (err) {
      console.error("[Push] Failed to register token:", err);
      setRegistrationError(`Exception: ${String(err)}`);
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
    const link = action.notification.data?.link;
    if (link) {
      console.log("[Push] Navigating to:", link);
      navigate(link);
    }
  }, [navigate]);

  const initializePushNotifications = useCallback(async () => {
    console.log("[Push] Initializing...");
    console.log("[Push] Is native platform:", isNative);
    console.log("[Push] Platform:", platform);

    if (!isNative) {
      console.log("[Push] Not a native platform, skipping push notification setup");
      return;
    }

    try {
      // Dynamic import to avoid errors when not installed
      const { PushNotifications } = await import("@capacitor/push-notifications");
      
      console.log("[Push] PushNotifications plugin loaded");

      // Check if push notifications are supported
      const permResult = await PushNotifications.checkPermissions();
      console.log("[Push] Current permission status:", permResult.receive);
      setPermissionStatus(permResult.receive);
      
      if (permResult.receive === "prompt") {
        console.log("[Push] Requesting permissions...");
        const requestResult = await PushNotifications.requestPermissions();
        console.log("[Push] Permission request result:", requestResult.receive);
        setPermissionStatus(requestResult.receive);
        
        if (requestResult.receive !== "granted") {
          console.log("[Push] Permission denied by user");
          toast.error("Notifications refusées", {
            description: "Vous ne recevrez pas les alertes push. Vous pouvez activer les notifications dans les réglages de votre appareil.",
          });
          return;
        }
      }

      if (permResult.receive === "denied") {
        console.log("[Push] Permissions were previously denied");
        setRegistrationError("Permissions denied");
        return;
      }

      setIsSupported(true);
      console.log("[Push] Push notifications supported, registering...");

      // Register with Apple / Google
      await PushNotifications.register();
      console.log("[Push] Registration initiated");

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[Push] No authenticated user, skipping token registration");
        return;
      }
      console.log("[Push] User authenticated:", user.id);

      // Listen for registration success
      PushNotifications.addListener("registration", (pushToken: PushNotificationToken) => {
        console.log("[Push] Registration successful, token received");
        console.log("[Push] Token length:", pushToken.value.length);
        registerToken(pushToken.value, user.id);
      });

      // Listen for registration errors
      PushNotifications.addListener("registrationError", (error: any) => {
        console.error("[Push] Registration error:", error);
        setRegistrationError(`Registration failed: ${JSON.stringify(error)}`);
        
        // Show toast for debugging on device
        toast.error("Erreur notification push", {
          description: `Registration error: ${error.error || JSON.stringify(error)}`,
        });
      });

      // Listen for push notifications received (foreground)
      PushNotifications.addListener("pushNotificationReceived", handleNotificationReceived);

      // Listen for notification actions (tap)
      PushNotifications.addListener("pushNotificationActionPerformed", handleNotificationAction);

      console.log("[Push] All listeners registered");

    } catch (error) {
      // Push notifications not available (web or plugin not installed)
      console.log("[Push] Not available:", error);
      setIsSupported(false);
      setRegistrationError(`Init failed: ${String(error)}`);
    }
  }, [isNative, platform, registerToken, handleNotificationReceived, handleNotificationAction]);

  useEffect(() => {
    initializePushNotifications();
  }, [initializePushNotifications]);

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
