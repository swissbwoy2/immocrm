import { useState, useEffect, useCallback } from "react";
import { syncQueue } from "@/lib/syncQueue";
import { toast } from "sonner";

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);

  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    toast.success("Connexion rétablie", {
      description: "Synchronisation en cours...",
    });
    
    // Sync pending actions
    setIsSyncing(true);
    try {
      await syncQueue.processQueue();
      const remaining = await syncQueue.getPendingCount();
      setPendingActions(remaining);
      if (remaining === 0) {
        toast.success("Synchronisation terminée");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erreur de synchronisation");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast.warning("Mode hors-ligne", {
      description: "Les modifications seront synchronisées au retour de la connexion",
    });
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check pending actions on mount
    syncQueue.getPendingCount().then(setPendingActions);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const addOfflineAction = useCallback(async (action: {
    type: string;
    table: string;
    data: unknown;
    method: "insert" | "update" | "delete";
  }) => {
    await syncQueue.addAction(action);
    const count = await syncQueue.getPendingCount();
    setPendingActions(count);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingActions,
    addOfflineAction,
  };
}
