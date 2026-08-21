import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, Send, ArrowLeft, Plus, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

type Ticket = { id: string; sujet: string; categorie: string; statut: string; created_at: string; last_message_at: string };
type Msg = { id: string; author_role: string; body: string; created_at: string };

const STATUTS: Record<string, { label: string; cls: string }> = {
  nouveau: { label: 'Nouveau', cls: 'bg-blue-100 text-blue-700' },
  assigne: { label: 'Assigné', cls: 'bg-amber-100 text-amber-700' },
  en_cours: { label: 'En cours', cls: 'bg-violet-100 text-violet-700' },
  resolu: { label: 'Résolu', cls: 'bg-emerald-100 text-emerald-700' },
  cloture: { label: 'Clôturé', cls: 'bg-gray-200 text-gray-600' },
};
const CATS = [
  { v: 'bug', l: 'Bug / problème' },
  { v: 'question', l: 'Question' },
  { v: 'conseil', l: 'Conseil' },
  { v: 'avis', l: 'Avis / suggestion' },
  { v: 'autre', l: 'Autre' },
];
const fmt = (d: string) => new Date(d).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });

export default function SupportClient() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [open, setOpen] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [creating, setCreating] = useState(false);
  const [sujet, setSujet] = useState('');
  const [categorie, setCategorie] = useState('question');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('support_tickets').select('*')
      .eq('user_id', user.id).order('last_message_at', { ascending: false });
    setTickets((data as Ticket[]) || []);
  }, [user]);

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabase.from('support_ticket_messages').select('*')
      .eq('ticket_id', id).order('created_at', { ascending: true });
    setMsgs((data as Msg[]) || []);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => {
    if (!open) return;
    loadMsgs(open.id);
    const t = setInterval(() => loadMsgs(open.id), 8000);
    return () => clearInterval(t);
  }, [open, loadMsgs]);

  const submitCreate = async () => {
    if (!sujet.trim() || !message.trim()) { toast.error('Sujet et message requis'); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('support-ticket', {
      body: { action: 'create', sujet: sujet.trim(), categorie, message: message.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error('Envoi impossible'); return; }
    toast.success('Ticket envoyé au support');
    setSujet(''); setMessage(''); setCategorie('question'); setCreating(false);
    loadTickets();
  };

  const submitReply = async () => {
    if (!open || !reply.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('support-ticket', {
      body: { action: 'reply', ticket_id: open.id, message: reply.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error('Envoi impossible'); return; }
    setReply('');
    loadMsgs(open.id);
  };

  if (open) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <button onClick={() => { setOpen(null); loadTickets(); }} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Retour à mes tickets
        </button>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-lg">{open.sujet}</h2>
            <Badge className={STATUTS[open.statut]?.cls}>{STATUTS[open.statut]?.label || open.statut}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ouvert le {fmt(open.created_at)}</p>
        </Card>
        <div className="space-y-2">
          {msgs.map((m) => {
            const mine = m.author_role === 'client';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {!mine && <div className="text-[11px] font-semibold mb-0.5 opacity-70">Support</div>}
                  {m.body}
                  <div className="text-[10px] opacity-60 mt-1">{fmt(m.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-end gap-2">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={open.statut === 'cloture' ? 'Rouvrir avec un message…' : 'Votre message…'} rows={2} className="flex-1" />
          <Button onClick={submitReply} disabled={busy || !reply.trim()}><Send size={16} /></Button>
        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <button onClick={() => setCreating(false)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Retour
        </button>
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><LifeBuoy size={18} /> Nouveau ticket support</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium">Catégorie</label>
            <Select value={categorie} onValueChange={setCategorie}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Sujet</label>
            <Input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Résumé en quelques mots" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Message</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Décrivez votre demande, bug, question ou avis…" />
          </div>
          <Button onClick={submitCreate} disabled={busy} className="w-full">
            <Send size={16} className="mr-2" /> Envoyer au support
          </Button>
          <p className="text-xs text-muted-foreground">Votre message est transmis à l'équipe Logisorama (support@logisorama.ch) et suivi ici.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><LifeBuoy size={20} /> Aide & support</h1>
        <Button onClick={() => setCreating(true)}><Plus size={16} className="mr-1" /> Nouveau ticket</Button>
      </div>
      {tickets.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 opacity-40" />
          Aucun ticket pour le moment. Une question, un bug, un conseil ? Ouvrez un ticket.
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Card key={t.id} className="p-4 cursor-pointer hover:bg-accent/40" onClick={() => setOpen(t)}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{t.sujet}</span>
                <Badge className={STATUTS[t.statut]?.cls}>{STATUTS[t.statut]?.label || t.statut}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {CATS.find((c) => c.v === t.categorie)?.l || t.categorie} · maj {fmt(t.last_message_at)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
