import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface InboundMessage {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  read: boolean;
  client_id?: string;
  client_name?: string;
  agent_id?: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface Props {
  scope: "agent" | "admin";
}

export function WhatsAppInbox({ scope }: Props) {
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    let agentId: string | null = null;

    if (scope === "agent") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: a } = await supabase.from("agents").select("id").eq("user_id", user.id).maybeSingle();
        agentId = a?.id ?? null;
      }
    }

    let convQuery = supabase.from("conversations").select("id, client_id, agent_id");
    if (scope === "agent" && agentId) convQuery = convQuery.eq("agent_id", agentId);
    const { data: convs } = await convQuery;
    const convIds = (convs || []).map((c: any) => c.id);
    if (!convIds.length) { setMessages([]); setLoading(false); return; }

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, content, created_at, read, attachment_url, attachment_type")
      .in("conversation_id", convIds)
      .eq("sender_type", "client")
      .ilike("content", "📱 [WhatsApp]%")
      .order("created_at", { ascending: false })
      .limit(300);

    const convMap = new Map((convs || []).map((c: any) => [c.id, c]));
    const clientIds = Array.from(new Set((msgs || []).map((m: any) => convMap.get(m.conversation_id)?.client_id).filter(Boolean)));

    let nameMap = new Map<string, string>();
    if (clientIds.length) {
      const { data: clients } = await supabase.from("clients").select("id, user_id").in("id", clientIds as string[]);
      const userIds = (clients || []).map((c: any) => c.user_id).filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, prenom, nom").in("id", userIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, `${p.prenom || ""} ${p.nom || ""}`.trim()]));
      (clients || []).forEach((c: any) => nameMap.set(c.id, profileMap.get(c.user_id) || "Client"));
    }

    const enriched: InboundMessage[] = (msgs || []).map((m: any) => {
      const conv = convMap.get(m.conversation_id) || {};
      return {
        ...m,
        client_id: conv.client_id,
        agent_id: conv.agent_id,
        client_name: nameMap.get(conv.client_id) || "—",
      };
    });

    setMessages(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // realtime
    const chan = supabase.channel("wa-inbox-" + scope).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload: any) => {
        if (payload.new?.sender_type === "client" && (payload.new?.content || "").startsWith("📱 [WhatsApp]")) {
          load();
        }
      },
    ).subscribe();
    return () => { supabase.removeChannel(chan); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const filtered = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter(m =>
      (m.client_name || "").toLowerCase().includes(q) ||
      (m.content || "").toLowerCase().includes(q),
    );
  }, [messages, search]);

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Inbox WhatsApp</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} non lu(s)</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client ou contenu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Messages reçus via WhatsApp</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Aucun message WhatsApp reçu</p>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="divide-y">
                {filtered.map(m => {
                  const cleanContent = m.content.replace(/^📱 \[WhatsApp\]\s*/, "");
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/${scope}/messagerie?conversation=${m.conversation_id}`)}
                      className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400">WhatsApp</Badge>
                            <span className="font-medium">{m.client_name}</span>
                            {!m.read && <Badge variant="destructive" className="text-[10px]">Nouveau</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-words">{cleanContent}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(m.created_at), "d MMM HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AgentWhatsAppInbox() { return <WhatsAppInbox scope="agent" />; }
