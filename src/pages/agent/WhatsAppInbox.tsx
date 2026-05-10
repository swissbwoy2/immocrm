import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageCircle, Search, RefreshCw, Send, AlertTriangle, ArrowLeft, Phone } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { LeadAvatar } from "@/components/whatsapp/LeadAvatar";
import { WhatsAppBubble } from "@/components/whatsapp/WhatsAppBubble";
import { ConversationListItem } from "@/components/whatsapp/ConversationListItem";

interface InboundMessage {
  id: string;
  conversation_id: string;
  unknown_conversation_id?: string;
  content: string;
  created_at: string;
  read: boolean;
  client_id?: string;
  client_name?: string;
  agent_id?: string;
  phone?: string;
  isUnknown?: boolean;
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
  const [tab, setTab] = useState<"clients" | "inconnus">("clients");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [unknowns, setUnknowns] = useState<InboundMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<InboundMessage | null>(null);
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadClients = async () => {
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
    if (!convIds.length) { setMessages([]); return; }

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, content, created_at, read")
      .in("conversation_id", convIds)
      .eq("sender_type", "client")
      .ilike("content", "📱 [WhatsApp]%")
      .order("created_at", { ascending: false })
      .limit(300);

    const seen = new Set<string>();
    const latest = (msgs || []).filter((m: any) => {
      if (seen.has(m.conversation_id)) return false;
      seen.add(m.conversation_id);
      return true;
    });

    const convMap = new Map((convs || []).map((c: any) => [c.id, c]));
    const clientIds = Array.from(new Set(latest.map((m: any) => convMap.get(m.conversation_id)?.client_id).filter(Boolean)));

    const nameMap = new Map<string, string>();
    if (clientIds.length) {
      const { data: clients } = await supabase.from("clients").select("id, user_id").in("id", clientIds as string[]);
      const userIds = (clients || []).map((c: any) => c.user_id).filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, prenom, nom").in("id", userIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, `${p.prenom || ""} ${p.nom || ""}`.trim()]));
      (clients || []).forEach((c: any) => nameMap.set(c.id, profileMap.get(c.user_id) || "Client"));
    }

    const unreadMap = new Map<string, number>();
    (msgs || []).forEach((m: any) => {
      if (!m.read) unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
    });

    setMessages(latest.map((m: any) => {
      const conv = convMap.get(m.conversation_id) || {};
      return {
        ...m,
        read: (unreadMap.get(m.conversation_id) || 0) === 0,
        client_id: conv.client_id,
        agent_id: conv.agent_id,
        client_name: nameMap.get(conv.client_id) || "—",
      };
    }));
  };

  const loadUnknowns = async () => {
    const { data } = await supabase
      .from("whatsapp_unknown_conversations")
      .select("id, phone_e164, display_name, last_message_at, status")
      .order("last_message_at", { ascending: false })
      .limit(200);

    const ids = (data || []).map(c => c.id);
    let lastMsgMap = new Map<string, { content: string; read: boolean }>();
    let unreadMap = new Map<string, number>();
    if (ids.length) {
      const { data: msgs } = await supabase
        .from("whatsapp_unknown_messages")
        .select("conversation_id, content, created_at, read, direction")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });
      (msgs || []).forEach((m: any) => {
        if (!lastMsgMap.has(m.conversation_id)) {
          lastMsgMap.set(m.conversation_id, { content: m.content, read: m.read });
        }
        if (m.direction === "in" && !m.read) {
          unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
        }
      });
    }

    setUnknowns((data || []).map((c: any) => ({
      id: c.id,
      conversation_id: c.id,
      unknown_conversation_id: c.id,
      content: lastMsgMap.get(c.id)?.content || "(aucun message)",
      created_at: c.last_message_at,
      read: (unreadMap.get(c.id) || 0) === 0,
      client_name: c.display_name || c.phone_e164,
      phone: c.phone_e164,
      isUnknown: true,
    })));
  };

  const load = async () => {
    setLoading(true);
    await Promise.all([loadClients(), loadUnknowns()]);
    setLoading(false);
  };

  const loadConversation = async (m: InboundMessage) => {
    setSelectedConv(m);
    setConvLoading(true);
    setConvMessages([]);

    if (m.isUnknown) {
      const { data } = await supabase
        .from("whatsapp_unknown_messages")
        .select("id, content, created_at, direction, read")
        .eq("conversation_id", m.conversation_id)
        .order("created_at", { ascending: true })
        .limit(200);
      setConvMessages((data || []).map((x: any) => ({
        id: x.id, content: x.content, created_at: x.created_at,
        sender_type: x.direction === "in" ? "client" : "agent", read: x.read,
      })));
      await supabase
        .from("whatsapp_unknown_messages")
        .update({ read: true })
        .eq("conversation_id", m.conversation_id)
        .eq("direction", "in")
        .eq("read", false);
      setUnknowns(prev => prev.map(x => x.conversation_id === m.conversation_id ? { ...x, read: true } : x));
    } else {
      const { data } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_type, read")
        .eq("conversation_id", m.conversation_id)
        .or("content.ilike.📱 [WhatsApp]%,content.ilike.📱 [WhatsApp →]%")
        .order("created_at", { ascending: true })
        .limit(100);
      setConvMessages(data || []);
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", m.conversation_id)
        .eq("sender_type", "client")
        .eq("read", false)
        .ilike("content", "📱 [WhatsApp]%");
      setMessages(prev => prev.map(x => x.conversation_id === m.conversation_id ? { ...x, read: true } : x));
    }

    setConvLoading(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  };

  const sendReply = async () => {
    if (!selectedConv || !reply.trim() || sending) return;
    setSending(true);
    try {
      const body: any = { text: reply.trim() };
      if (selectedConv.isUnknown) body.unknown_conversation_id = selectedConv.conversation_id;
      else body.conversation_id = selectedConv.conversation_id;

      const { data, error } = await supabase.functions.invoke("wa-reply-text", { body });
      if (error || (data as any)?.error) {
        const errCode = (data as any)?.error || error?.message || "erreur";
        if (errCode === "window_closed") toast.error("Fenêtre 24h Meta fermée. Le client doit vous écrire d'abord, ou utilisez un template.");
        else if (errCode === "invalid_phone") toast.error("Numéro WhatsApp invalide.");
        else toast.error("Erreur d'envoi : " + errCode);
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
    const chan = supabase.channel("wa-inbox-" + scope)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const c = payload.new?.content || "";
        if (payload.new?.sender_type === "client" && c.startsWith("📱 [WhatsApp]")) {
          loadClients();
          if (selectedConv && !selectedConv.isUnknown && payload.new?.conversation_id === selectedConv.conversation_id) loadConversation(selectedConv);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_unknown_messages" }, (payload: any) => {
        loadUnknowns();
        if (selectedConv?.isUnknown && (payload.new as any)?.conversation_id === selectedConv.conversation_id) loadConversation(selectedConv);
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedConv?.conversation_id]);

  const currentList = tab === "clients" ? messages : unknowns;
  const filtered = useMemo(() => {
    let list = currentList;
    if (readFilter === "unread") list = list.filter(m => !m.read);
    else if (readFilter === "read") list = list.filter(m => m.read);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(m =>
      (m.client_name || "").toLowerCase().includes(q) ||
      (m.content || "").toLowerCase().includes(q) ||
      (m.phone || "").toLowerCase().includes(q),
    );
  }, [currentList, search, readFilter]);

  const unreadClients = messages.filter(m => !m.read).length;
  const unreadUnknowns = unknowns.filter(m => !m.read).length;

  const lastInbound = useMemo(() => {
    const inbounds = convMessages.filter(m => m.sender_type === "client");
    return inbounds[inbounds.length - 1];
  }, [convMessages]);
  const windowOpen = lastInbound ? (Date.now() - new Date(lastInbound.created_at).getTime()) < 24 * 3600 * 1000 : false;

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-7xl">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 mb-4 bg-background/85 backdrop-blur-md border-b">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--whatsapp-green))] to-[hsl(var(--whatsapp-green-dark))] flex items-center justify-center text-white shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight truncate">Inbox WhatsApp</h1>
              <p className="text-xs text-muted-foreground">
                {unreadClients + unreadUnknowns > 0
                  ? `${unreadClients + unreadUnknowns} message${unreadClients + unreadUnknowns > 1 ? "s" : ""} non lu${unreadClients + unreadUnknowns > 1 ? "s" : ""}`
                  : "Tout est lu"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-full h-9">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline ml-2">Actualiser</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Sidebar conversations */}
        <div className={selectedConv ? "hidden lg:block" : ""}>
          {/* Tabs en chips */}
          <div className="flex gap-2 mb-3 p-1 bg-muted rounded-full">
            <button
              onClick={() => { setTab("clients"); setSelectedConv(null); }}
              className={`flex-1 h-9 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                tab === "clients" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Clients
              {unreadClients > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[hsl(var(--whatsapp-green))] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadClients}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab("inconnus"); setSelectedConv(null); }}
              className={`flex-1 h-9 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                tab === "inconnus" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inconnus
              {unreadUnknowns > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadUnknowns}
                </span>
              )}
            </button>
          </div>

          {/* Recherche */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher une conversation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>

          {/* Liste */}
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {tab === "clients" ? "Aucun message client." : "Aucun message d'inconnu."}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[65vh]">
                <div className="divide-y">
                  {filtered.map(m => {
                    const cleanContent = m.content.replace(/^📱 \[WhatsApp\]\s*/, "");
                    const active = selectedConv?.conversation_id === m.conversation_id;
                    return (
                      <ConversationListItem
                        key={m.id}
                        name={m.client_name || "—"}
                        preview={cleanContent}
                        createdAt={m.created_at}
                        unread={!m.read}
                        active={active}
                        isUnknown={m.isUnknown}
                        onClick={() => loadConversation(m)}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>

        {/* Zone conversation */}
        <div className={selectedConv ? "" : "hidden lg:block"}>
          <Card className="h-[78vh] flex flex-col overflow-hidden">
            {selectedConv ? (
              <>
                {/* Header conversation */}
                <div className="py-3 px-3 sm:px-4 border-b shrink-0 bg-card flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 -ml-1" onClick={() => setSelectedConv(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <LeadAvatar name={selectedConv.client_name || "—"} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-sm sm:text-base truncate">{selectedConv.client_name}</h2>
                      {selectedConv.isUnknown && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] dark:bg-amber-950/30 dark:text-amber-400">Inconnu</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                      {windowOpen && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--whatsapp-green))]" />}
                      {windowOpen ? "Fenêtre 24h ouverte" : "Fenêtre 24h fermée"}
                      {selectedConv.phone && <span className="text-muted-foreground/60"> · {selectedConv.phone}</span>}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <CardContent className="flex-1 overflow-hidden p-0 bg-whatsapp-pattern">
                  <ScrollArea className="h-full" ref={scrollRef as any}>
                    <div className="p-3 sm:p-4 space-y-1.5">
                      {convLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
                      ) : convMessages.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-10">Aucun message dans cette conversation.</p>
                      ) : (
                        convMessages.map(m => {
                          const isAgent = m.sender_type === "agent";
                          const clean = m.content.replace(/^📱 \[WhatsApp( →)?\]\s*/, "");
                          return (
                            <WhatsAppBubble
                              key={m.id}
                              content={clean}
                              createdAt={m.created_at}
                              outgoing={isAgent}
                              read={isAgent ? m.read : undefined}
                              delivered={isAgent}
                            />
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Zone saisie */}
                <div className="border-t p-2.5 sm:p-3 shrink-0 bg-card space-y-2 pb-[max(env(safe-area-inset-bottom,0px),0.625rem)]">
                  {!windowOpen && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Fenêtre 24h Meta fermée. Le contact doit vous écrire en premier pour rouvrir la conversation.</span>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder={windowOpen ? "Écrire un message…" : "Réponse impossible (fenêtre 24h fermée)"}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={1}
                      disabled={!windowOpen || sending}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      className="resize-none rounded-2xl min-h-[44px] max-h-32 py-2.5 px-4 bg-muted/40 border-0 focus-visible:ring-1"
                    />
                    <Button
                      onClick={sendReply}
                      disabled={!windowOpen || sending || !reply.trim()}
                      size="icon"
                      className="h-11 w-11 rounded-full bg-[hsl(var(--whatsapp-green))] hover:bg-[hsl(var(--whatsapp-green-dark))] text-white shrink-0 transition-transform active:scale-95 disabled:bg-muted-foreground/30"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-whatsapp-pattern">
                <div className="h-20 w-20 rounded-full bg-background/80 backdrop-blur shadow-md flex items-center justify-center mb-4">
                  <MessageCircle className="h-10 w-10 text-[hsl(var(--whatsapp-green))]" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Inbox WhatsApp</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Sélectionnez une conversation à gauche pour afficher l'historique et répondre.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AgentWhatsAppInbox() { return <WhatsAppInbox scope="agent" />; }
