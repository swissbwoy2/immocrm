import { offlineStorage } from "./offlineStorage";
import { supabase } from "@/integrations/supabase/client";

interface SyncAction {
  id?: number;
  type: string;
  table: string;
  data: unknown;
  method: "insert" | "update" | "delete";
  timestamp: number;
  retries: number;
}

const MAX_RETRIES = 3;

export const syncQueue = {
  async addAction(action: Omit<SyncAction, "id" | "timestamp" | "retries">): Promise<void> {
    await offlineStorage.syncQueue.add({
      ...action,
      timestamp: Date.now(),
      retries: 0,
    });
  },

  async getPendingCount(): Promise<number> {
    return offlineStorage.syncQueue.count();
  },

  async processQueue(): Promise<void> {
    const actions = await offlineStorage.syncQueue.getAllByTimestamp();

    for (const action of actions) {
      try {
        await this.executeAction(action);
        // Remove successful action
        if (action.id !== undefined) {
          await offlineStorage.syncQueue.delete(action.id);
        }
      } catch (error) {
        console.error("Sync action failed:", error);
        
        // Increment retry count - need to re-add since we can't update
        if (action.retries < MAX_RETRIES && action.id !== undefined) {
          await offlineStorage.syncQueue.delete(action.id);
          await offlineStorage.syncQueue.add({
            ...action,
            retries: action.retries + 1,
          });
        } else if (action.id !== undefined) {
          // Remove after max retries
          console.error("Max retries reached, removing action:", action);
          await offlineStorage.syncQueue.delete(action.id);
        }
      }
    }
  },

  async executeAction(action: SyncAction): Promise<void> {
    const { table, data, method } = action;

    // Direct fetch to Supabase REST API to bypass type restrictions
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const headers = {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
    };

    const baseUrl = `${supabaseUrl}/rest/v1/${table}`;

    switch (method) {
      case "insert": {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error(`Insert failed: ${response.statusText}`);
        }
        break;
      }
      case "update": {
        const updateData = data as { id: string; [key: string]: unknown };
        const { id, ...rest } = updateData;
        const response = await fetch(`${baseUrl}?id=eq.${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(rest),
        });
        if (!response.ok) {
          throw new Error(`Update failed: ${response.statusText}`);
        }
        break;
      }
      case "delete": {
        const deleteData = data as { id: string };
        const response = await fetch(`${baseUrl}?id=eq.${deleteData.id}`, {
          method: "DELETE",
          headers,
        });
        if (!response.ok) {
          throw new Error(`Delete failed: ${response.statusText}`);
        }
        break;
      }
    }
  },

  async clearQueue(): Promise<void> {
    await offlineStorage.syncQueue.clear();
  },
};
