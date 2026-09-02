import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, Send, ArrowLeft, UserCog, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Ticket = {
  id: string; user_id: string; sujet: string; categorie: string; statut: string;
  priorite: string; assigned_agent_id: string | null; created_at: string; last_message_at: string;
};
type Msg = { id: string; author_role: string; body: string; created_at: string };
type Person = { id: string; nom: string | null; prenom: string | null; email: string | null };

const STATUTS: Record<string, { label: string; cls: string }> = {
  nouveau: { label: 'Nouveau', cls: 'bg-blue-100 text-blue-700' },
  assigne: { label: 'Assigné', cls: 'bg-amber-100 text-amber-700' },
  en_cours: { label: 'En cours', cls: 'bg-violet-100 text-violet-700' },
  resolu: { label: 'Résolu', cls: 'bg-emerald-100 text-emerald-700' },
  cloture: { label: 'Clôturé', cls: 'bg-gray-200 text-gray-600' },
};
const CAT_LABEL: Record<string, string> = { bug: 'Bug', question: 'Question', conseil: 'Conseil', avis: 'Avis', autre: 'Autre' };
const FILTERS = ['tous', 'nouveau', 'assigne', 'en_cours', 'resolu', 'cloture'];
const fmt = (d: string) => new Date(d).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });
const personName = (p?: Person) => p ? ([p.prenom, p.nom].filter(Boolean).join(' ') || p.email || 'Utilisateur') : '—';

export default function SupportStaff() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [agents, setAgents] = useState<Person[]>([]);
  const [filter, setFilter] = useState('tous');
  const [open, setOpen] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const loadRoleAndAgents = useCallback(async () => {
    if (!user) return;
    const { data: r } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const admin = (r || []).some((x: any) => x.role === 'admin');
    setIsAdmin(admin);
    if (admin) {
      const { data: ar } = await supabase.from('user_roles').select('user_id').eq('role', 'agent');
      const ids = (ar || []).map((x: any) => x.user_id);
      if (ids.length) {
        const { data: pf } = await supabase.from('profiles').select('id, nom, prenom, email').in('id', ids);
        setAgents((pf as Person[]) || []);
      }
    }
  }, [user]);

  const loadTickets = useCallback(async () => {
    const { data } = await supabase.from('support_tickets').select('*').order('last_message_at', { ascending: false });
    const list = (data as Ticket[]) || [];
    setTickets(list);
    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    if (ids.length) {
      const { data: pf } = await supabase.from('profiles').select('id, nom, prenom, email').in('id', ids);
      const map: Record<string, Person> = {};
      (pf as Person[] || []).forEach((p) => { map[p.id] = p; });
      setPeople(map);
    }
  }, []);

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabase.from('support_ticket_messages').select('*')
      .eq('ticket_id', id).order('created_at', { ascending: true });
    setMsgs((data as Msg[]) || []);
  }, []);

  useEffect(() => { loadRoleAndAgents(); loadTickets(); }, [loadRoleAndAgents, loadTickets]);
  useEffect(() => {
    if (!open) return;
    loadMsgs(open.id);
    const t = setInterval(() => loadMsgs(open.id), 8000);
    return () => clearInterval(t);
  }, [open, loadMsgs]);

  const doReply = async () => {
    if (!open || !reply.trim() || !user) return;
    setBusy(true);
    const role = isAdmin ? 'admin' : 'agent';
    const { error } = await supabase.from('support_ticket_messages')
      .insert({ ticket_id: open.id, author_id: user.id, author_role: role, body: reply.trim() });
    if (!error && (open.statut === 'nouveau' || open.statut === 'assigne')) {
      await supabase.from('support_tickets').update({ statut: 'en_cours' }).eq('id', open.id);
      setOpen({ ...open, statut: 'en_cours' });
    }
    setBusy(false);
    if (error) { toast.error('Envoi impossible'); return; }
    setReply(''); loadMsgs(open.id); loadTickets();
  };
  const doAssign = async (agentId: string) => {
    if (!open) return;
    setBusy(true);
    const aid = agentId === 'none' ? null : agentId;
    const { error } = await supabase.from('support_tickets')
      .update({ assigned_agent_id: aid, statut: aid ? 'assigne' : 'nouveau' }).eq('id', open.id);
    setBusy(false);
    if (error) { toast.error('Action impossible'); return; }
    setOpen({ ...open, assigned_agent_id: aid, statut: aid ? 'assigne' : 'nouveau' }); loadTickets();
    toast.success('Assignation mise à jour');
  };
  const doStatus = async (statut: string) => {
    if (!open) return;
    setBusy(true);
    const closed = statut === 'cloture' || statut === 'resolu';
    const { error } = await supabase.from('support_tickets')
      .update({ statut, closed_at: closed ? new Date().toISOString() : null }).eq('id', open.id);
    setBusy(false);
    if (error) { toast.error('Action impossible'); return; }
    setOpen({ ...open, statut }); loadTickets();
    toast.success('Statut mis à jour');
  };

  const runBroadcast = async () => {
    const { data: preview, error: previewError } = await supabase.functions.invoke('broadcast-service-notice', { body: { dryRun: true } });
    if (previewError) { toast.error("Impossible de préparer l'envoi"); return; }
    const nb = preview?.a_envoyer ?? 0;
    if (nb === 0) { toast.info('Aucun client actif restant à notifier'); return; }
    if (!window.confirm(`Envoyer la communication officielle à ${nb} client(s) actif(s) ?\nUn ticket Support sera créé pour chacun et un e-mail sera envoyé.`)) return;
    setBroadcasting(true);
    const { data, error } = await supabase.functions.invoke('broadcast-service-notice', { body: {} });
    setBroadcasting(false);
    if (error) { toast.error("Envoi impossible"); return; }
    toast.success(`Communication envoyée : ${data?.tickets_crees ?? 0} ticket(s), ${data?.emails_envoyes ?? 0} e-mail(s)${data?.erreurs ? `, ${data.erreurs} erreur(s)` : ''}`);
    loadTickets();
  };

  const shown = tickets.filter((t) => filter === 'tous' || t.statut === filter);


  if (open) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <button onClick={() => { setOpen(null); loadTickets(); }} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Retour aux tickets
        </button>
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-lg">{open.sujet}</h2>
              <p className="text-xs text-muted-foreground">
                {CAT_LABEL[open.categorie] || open.categorie} · {personName(people[open.user_id])} · ouvert {fmt(open.created_at)}
              </p>
            </div>
            <Badge className={STATUTS[open.statut]?.cls}>{STATUTS[open.statut]?.label || open.statut}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <div className="flex items-center gap-1">
                <UserCog size={15} className="text-muted-foreground" />
                <Select value={open.assigned_agent_id || 'none'} onValueChange={doAssign}>
                  <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Assigner à un agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{personName(a)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Select value={open.statut} onValueChange={doStatus}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(STATUTS).map((s) => <SelectItem key={s} value={s}>{STATUTS[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            {open.statut !== 'cloture' && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => doStatus('cloture')}>Clôturer</Button>
            )}
          </div>
        </Card>
        <div className="space-y-2">
          {msgs.map((m) => {
            const staff = m.author_role !== 'client';
            return (
              <div key={m.id} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${staff ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="text-[11px] font-semibold mb-0.5 opacity-70">{m.author_role === 'client' ? personName(people[open.user_id]) : (m.author_role === 'admin' ? 'Admin' : 'Agent')}</div>
                  {m.body}
                  <div className="text-[10px] opacity-60 mt-1">{fmt(m.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-end gap-2">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Répondre au client…" rows={2} className="flex-1" />
          <Button onClick={doReply} disabled={busy || !reply.trim()}><Send size={16} /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><LifeBuoy size={20} /> Tickets support {isAdmin ? '' : '(mes tickets)'}</h1>
        <Button size="sm" variant="ghost" onClick={() => loadTickets()}><RefreshCw size={16} /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}>
            {f === 'tous' ? 'Tous' : STATUTS[f]?.label || f}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Aucun ticket.</Card>
      ) : (
        <div className="space-y-2">
          {shown.map((t) => (
            <Card key={t.id} className="p-4 cursor-pointer hover:bg-accent/40" onClick={() => setOpen(t)}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{t.sujet}</span>
                <Badge className={STATUTS[t.statut]?.cls}>{STATUTS[t.statut]?.label || t.statut}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {CAT_LABEL[t.categorie] || t.categorie} · {personName(people[t.user_id])}
                {t.assigned_agent_id && <> · agent : {personName(agents.find((a) => a.id === t.assigned_agent_id))}</>}
                {' '}· maj {fmt(t.last_message_at)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
