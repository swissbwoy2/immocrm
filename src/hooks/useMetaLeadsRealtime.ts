import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on meta_leads (INSERT/UPDATE/DELETE)
 * and trigger a refresh callback.
 */
export function useMetaLeadsRealtime(onChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("meta-leads-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meta_leads" },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
