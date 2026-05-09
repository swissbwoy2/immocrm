import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Counts unread inbound WhatsApp messages for the current user (admin or agent).
 * Realtime: subscribes to messages INSERT/UPDATE to keep the badge fresh.
 */
export function useWhatsAppUnreadCount(scope: "admin" | "agent" | "both" = "both") {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const load = async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      // For agent scope, restrict to conversations where this user is the agent.
      let convQuery = supabase.from("conversations").select("id");
      if (scope === "agent") {
        const { data: a } = await supabase
          .from("agents").select("id").eq("user_id", user.id).maybeSingle();
        if (!a?.id) { setCount(0); return; }
        convQuery = convQuery.eq("agent_id", a.id);
      }
      const { data: convs } = await convQuery.limit(15000);
      const ids = (convs || []).map((c: any) => c.id);
      if (!ids.length) { setCount(0); return; }

      const { count: c } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids)
        .eq("sender_type", "client")
        .eq("read", false)
        .ilike("content", "📱 [WhatsApp]%");

      const { count: u } = await supabase
        .from("whatsapp_unknown_messages")
        .select("id", { count: "exact", head: true })
        .eq("direction", "in")
        .eq("read", false);

      setCount((c || 0) + (u || 0));
    } catch (e) {
      console.warn("useWhatsAppUnreadCount load error", e);
    }
  };

  useEffect(() => {
    load();
    if (!user) return;
    const chan = supabase
      .channel(`wa-unread-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const c = payload.new?.content || "";
          if (payload.new?.sender_type === "client" && c.startsWith("📱 [WhatsApp]")) {
            load();
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_unknown_messages" },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(chan); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, scope]);

  return count;
}
