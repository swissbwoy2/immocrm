import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, Search, RefreshCw, Send, AlertTriangle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface InboundMessage {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  read: boolean;
  client_id?: string;
  client_name?: string;
  agent_id?: string;
}

interface ConvMessage {
  id: string;
  content: string;
  created_at: string;
  sender_type: string;
  read: boolean;
}

interface Props {
  scope: "agent" | "admin";
}

export function WhatsAppInbox({ scope }: Props) {
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<InboundMessage | null>(null);
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      .select("id, conversation_id, content, created_at, read")
      .in("conversation_id", convIds)
      .eq("sender_type", "client")
      .ilike("content", "📱 [WhatsApp]%")
      .order("created_at", { ascending: false })
      .limit(300);

    // Group: latest message per conversation
    const seen = new Set<string>();
    const latestPerConv = (msgs || []).filter((m: any) => {
      if (seen.has(m.conversation_id)) return false;
      seen.add(m.conversation_id);
      return true;
    });

    const convMap = new Map((convs || []).map((c: any) => [c.id, c]));
    const clientIds = Array.from(new Set(latestPerConv.map((m: any) => convMap.get(m.conversation_id)?.client_id).filter(Boolean)));

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

    // Unread counts
    const unreadMap = new Map<string, number>();
    (msgs || []).forEach((m: any) => {
      if (!m.read) unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
    });

    const enriched: InboundMessage[] = latestPerConv.map((m: any) => {
      const conv = convMap.get(m.conversation_id) || {};
      return {
        ...m,
        read: (unreadMap.get(m.conversation_id) || 0) === 0,
        client_id: conv.client_id,
        agent_id: conv.agent_id,
        client_name: nameMap.get(conv.client_id) || "—",
      };
    });

    setMessages(enriched);
    setLoading(false);
  };

  const loadConversation = async (m: InboundMessage) => {
    setSelectedConv(m);
    setConvLoading(true);
    setConvMessages([]);
    const { data } = await supabase
      .from("messages")
      .select("id, content, created_at, sender_type, read")
      .eq("conversation_id", m.conversation_id)
      .or("content.ilike.📱 [WhatsApp]%,content.ilike.📱 [WhatsApp →]%")
      .order("created_at", { ascending: true })
      .limit(100);
    setConvMessages(data || []);
    setConvLoading(false);

    // Mark inbound as read
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", m.conversation_id)
      .eq("sender_type", "client")
      .eq("read", false)
      .ilike("content", "📱 [WhatsApp]%");

    setMessages(prev => prev.map(x => x.conversation_id === m.conversation_id ? { ...x, read: true } : x));

    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  };

  const sendReply = async () => {
    if (!selectedConv || !reply.trim() || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-reply-text", {
        body: { conversation_id: selectedConv.conversation_id, text: reply.trim() },
      });
      if (error || (data as any)?.error) {
        const errCode = (data as any)?.error || error?.message || "erreur";
        if (errCode === "window_closed") {
          toast.error("Fenêtre 24h Meta fermée. Le client doit vous écrire d'abord, ou utilisez un template.");
        } else if (errCode === "invalid_phone") {
          toast.error("Numéro WhatsApp du client invalide ou manquant.");
        } else {
          toast.error("Erreur d'envoi : " + errCode);
        }
        return;
      }
      setReply("");
      await loadConversation(selectedConv);
      toast.success("Message envoyé sur WhatsApp");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    load();
    const chan = supabase.channel("wa-inbox-" + scope).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload: any) => {
        const c = payload.new?.content || "";
        if (payload.new?.sender_type === "client" && c.startsWith("📱 [WhatsApp]")) {
          load();
          if (selectedConv && payload.new?.conversation_id === selectedConv.conversation_id) {
            loadConversation(selectedConv);
          }
        }
      },
    ).subscribe();
    return () => { supabase.removeChannel(chan); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedConv?.conversation_id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter(m =>
      (m.client_name || "").toLowerCase().includes(q) ||
      (m.content || "").toLowerCase().includes(q),
    );
  }, [messages, search]);

  const unreadCount = messages.filter(m => !m.read).length;

  // 24h window check for selected conv
  const lastInbound = useMemo(() => {
    const inbounds = convMessages.filter(m => m.sender_type === "client");
    return inbounds[inbounds.length - 1];
  }, [convMessages]);
  const windowOpen = lastInbound ? (Date.now() - new Date(lastInbound.created_at).getTime()) < 24 * 3600 * 1000 : false;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Inbox WhatsApp</h1>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} non lu(s)</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Liste */}
        <div className={selectedConv ? "hidden lg:block" : ""}>
          <Card className="mb-3">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-0 focus-visible:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Conversations</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-10 px-4 text-sm">Aucun message WhatsApp reçu pour le moment.</p>
              ) : (
                <ScrollArea className="h-[65vh]">
                  <div className="divide-y">
                    {filtered.map(m => {
                      const cleanContent = m.content.replace(/^📱 \[WhatsApp\]\s*/, "");
                      const active = selectedConv?.conversation_id === m.conversation_id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => loadConversation(m)}
                          className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${active ? "bg-muted" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate">{m.client_name}</span>
                                {!m.read && <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 break-words">{cleanContent}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
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

        {/* Conversation */}
        <div className={selectedConv ? "" : "hidden lg:block"}>
          <Card className="h-[75vh] flex flex-col">
            {selectedConv ? (
              <>
                <CardHeader className="py-3 border-b shrink-0">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedConv(null)}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400">WhatsApp</Badge>
                    <CardTitle className="text-base">{selectedConv.client_name}</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full" ref={scrollRef as any}>
                    <div className="p-4 space-y-2">
                      {convLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                      ) : convMessages.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-10">Aucun message WhatsApp dans cette conversation.</p>
                      ) : (
                        convMessages.map(m => {
                          const isAgent = m.sender_type === "agent";
                          const clean = m.content.replace(/^📱 \[WhatsApp( →)?\]\s*/, "");
                          return (
                            <div key={m.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isAgent ? "bg-green-600 text-white" : "bg-muted"}`}>
                                <p className="whitespace-pre-wrap break-words">{clean}</p>
                                <p className={`text-[10px] mt-1 ${isAgent ? "text-white/70" : "text-muted-foreground"}`}>
                                  {format(new Date(m.created_at), "d MMM HH:mm", { locale: fr })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>

                <div className="border-t p-3 shrink-0 space-y-2">
                  {!windowOpen && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Fenêtre 24h Meta fermée. Le client doit vous écrire en premier, sinon utilisez un template depuis les Logs WhatsApp.</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={windowOpen ? "Votre réponse WhatsApp..." : "Réponse impossible (fenêtre 24h fermée)"}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={2}
                      disabled={!windowOpen || sending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      className="resize-none"
                    />
                    <Button onClick={sendReply} disabled={!windowOpen || sending || !reply.trim()} className="bg-green-600 hover:bg-green-700">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                Sélectionnez une conversation pour voir les messages et répondre.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AgentWhatsAppInbox() { return <WhatsAppInbox scope="agent" />; }
