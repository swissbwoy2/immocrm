import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";

// This hook is prepared for push notifications
// It will work once Firebase is configured

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

  const registerToken = useCallback(async (pushToken: string, userId: string) => {
    try {
      // Determine platform
      const platform = /iPhone|iPad|iPod/.test(navigator.userAgent) 
        ? "ios" 
        : /Android/.test(navigator.userAgent) 
          ? "android" 
          : "web";

      // Use Supabase client for upsert
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
        console.error("Error registering push token:", error);
      } else {
        console.log("Push token registered successfully");
        setToken(pushToken);
      }
    } catch (err) {
      console.error("Failed to register token:", err);
    }
  }, []);

  const handleNotificationReceived = useCallback(async () => {
    // Haptic feedback when notification received
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available
    }
  }, []);

  const handleNotificationAction = useCallback((action: PushNotificationActionPerformed) => {
    const link = action.notification.data?.link;
    if (link) {
      navigate(link);
    }
  }, [navigate]);

  const initializePushNotifications = useCallback(async () => {
    try {
      // Dynamic import to avoid errors when not installed
      const { PushNotifications } = await import("@capacitor/push-notifications");
      
      // Check if push notifications are supported
      const permResult = await PushNotifications.checkPermissions();
      
      if (permResult.receive === "prompt") {
        const requestResult = await PushNotifications.requestPermissions();
        if (requestResult.receive !== "granted") {
          toast.error("Notifications refusées", {
            description: "Vous ne recevrez pas les alertes push",
          });
          return;
        }
      }

      if (permResult.receive === "denied") {
        return;
      }

      setIsSupported(true);

      // Register with Apple / Google
      await PushNotifications.register();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Listen for registration
      PushNotifications.addListener("registration", (pushToken: PushNotificationToken) => {
        registerToken(pushToken.value, user.id);
      });

      // Listen for registration errors
      PushNotifications.addListener("registrationError", (error: unknown) => {
        console.error("Push registration error:", error);
      });

      // Listen for push notifications received
      PushNotifications.addListener("pushNotificationReceived", handleNotificationReceived);

      // Listen for notification actions (tap)
      PushNotifications.addListener("pushNotificationActionPerformed", handleNotificationAction);

    } catch (error) {
      // Push notifications not available (web or plugin not installed)
      console.log("Push notifications not available:", error);
      setIsSupported(false);
    }
  }, [registerToken, handleNotificationReceived, handleNotificationAction]);

  useEffect(() => {
    initializePushNotifications();
  }, [initializePushNotifications]);

  const unregisterToken = useCallback(async () => {
    if (!token) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("device_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("token", token);

      if (error) {
        console.error("Failed to unregister token:", error);
      } else {
        setToken(null);
      }
    } catch (error) {
      console.error("Failed to unregister token:", error);
    }
  }, [token]);

  return {
    token,
    isSupported,
    unregisterToken,
  };
}
