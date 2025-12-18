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

      // Use direct REST API to bypass type restrictions for new table
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/device_tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          user_id: userId,
          token: pushToken,
          platform,
        }),
      });

      if (!response.ok) {
        console.error("Error registering push token:", await response.text());
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

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      await fetch(`${supabaseUrl}/rest/v1/device_tokens?user_id=eq.${user.id}&token=eq.${token}`, {
        method: "DELETE",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });

      setToken(null);
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
