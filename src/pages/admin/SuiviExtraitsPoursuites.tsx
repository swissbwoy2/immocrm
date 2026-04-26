import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, Search, Sparkles, FileText, RefreshCw, Send, AlertTriangle, CheckCircle2, Clock, HelpCircle, User, Filter, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PremiumPageHeader, PremiumKPICard, PremiumTable, PremiumTableHeader, PremiumTableRow, PremiumTableSkeleton, PremiumEmptyState, TableBody, TableCell, TableHead, TableRow } from '@/components/premium';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

type Method = 'ai' | 'ai_auto_scan' | 'manual' | 'agent' | null;
type Status = 'missing' | 'valid' | 'warning' | 'expired';

interface Row {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  date_emission: string | null;
  method: Method;
  confidence: number | null;
  document_id: string | null;
  doc_nom: string | null;
  doc_url: string | null;
  last_reminder_at: string | null;
}

function computeStatus(dateEmission: string | null): { status: Status; ageDays: number | null } {
  if (!dateEmission) return { status: 'missing', ageDays: null };
  const ageDays = differenceInDays(new Date(), new Date(dateEmission));
  if (ageDays >= 90) return { status: 'expired', ageDays };
  if (ageDays >= 60) return { status: 'warning', ageDays };
  return { status: 'valid', ageDays };
}

function StatusBadge({ status, ageDays }: { status: Status; ageDays: number | null }) {
  if (status === 'missing') return <Badge variant="outline" className="gap-1 border-muted-foreground/40 text-muted-foreground"><HelpCircle className="w-3 h-3" /> Manquant</Badge>;
  if (status === 'expired') return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Expiré ({ageDays}j)</Badge>;
  if (status === 'warning') return <Badge className="gap-1 bg-amber-500/15 text-amber-700 border border-amber-500/30 hover:bg-amber-500/20"><Clock className="w-3 h-3" /> {ageDays}j</Badge>;
  return <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Valide ({ageDays}j)</Badge>;
}

function MethodBadge({ method }: { method: Method }) {
  if (!method) return <span className="text-xs text-muted-foreground">—</span>;
  if (method === 'ai_auto_scan') return <Badge className="gap-1 bg-violet-500/15 text-violet-700 border border-violet-500/30 hover:bg-violet-500/20"><Sparkles className="w-3 h-3" /> IA Auto</Badge>;
  if (method === 'ai') return <Badge className="gap-1 bg-blue-500/15 text-blue-700 border border-blue-500/30 hover:bg-blue-500/20"><Sparkles className="w-3 h-3" /> IA</Badge>;
  if (method === 'agent') return <Badge className="gap-1 bg-orange-500/15 text-orange-700 border border-orange-500/30 hover:bg-orange-500/20"><User className="w-3 h-3" /> Agent</Badge>;
  return <Badge variant="outline" className="gap-1">Manuel</Badge>;
}

function ConfidenceBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round(value * 100);
  const colorClass = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">{pct}%</span>
    </div>
  );
}

const STATUS_RANK: Record<Status, number> = { expired: 0, warning: 1, missing: 2, valid: 3 };

export default function SuiviExtraitsPoursuites() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('clients')
        .select(`
          id, user_id,
          extrait_poursuites_date_emission,
          extrait_poursuites_extraction_method,
          extrait_poursuites_ai_confidence,
          extrait_poursuites_document_id,
          extrait_poursuites_last_reminder_at,
          profile:profiles!clients_user_id_fkey ( prenom, nom, email ),
          source_document:documents!clients_extrait_poursuites_document_id_fkey ( nom, url )
        `)
        .eq('statut', 'actif')
        .limit(15000);
      if (error) {
        console.error('[SuiviExtraitsPoursuites] query error:', error);
        throw error;
      }
      const mapped: Row[] = (data ?? []).map((c: any) => ({
        id: c.id,
        prenom: c.profile?.prenom ?? null,
        nom: c.profile?.nom ?? null,
        email: c.profile?.email ?? null,
        date_emission: c.extrait_poursuites_date_emission,
        method: c.extrait_poursuites_extraction_method,
        confidence: c.extrait_poursuites_ai_confidence,
        document_id: c.extrait_poursuites_document_id,
        doc_nom: c.source_document?.nom ?? null,
        doc_url: c.source_document?.url ?? null,
        last_reminder_at: c.extrait_poursuites_last_reminder_at,
      }));
      setRows(mapped);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur de chargement', description: err.message ?? 'Impossible de charger les extraits', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const enriched = useMemo(() => rows.map((r) => ({ ...r, ...computeStatus(r.date_emission) })), [rows]);

  const kpis = useMemo(() => ({
    total: enriched.length,
    missing: enriched.filter((r) => r.status === 'missing').length,
    warning: enriched.filter((r) => r.status === 'warning').length,
    expired: enriched.filter((r) => r.status === 'expired').length,
  }), [enriched]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return enriched
      .filter((r) => {
        if (filter !== 'all' && r.status !== filter) return false;
        if (!q) return true;
        const fullName = `${r.prenom ?? ''} ${r.nom ?? ''} ${r.email ?? ''}`.toLowerCase();
        return fullName.includes(q);
      })
      .sort((a, b) => {
        const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (r !== 0) return r;
        return (a.nom ?? '').localeCompare(b.nom ?? '');
      });
  }, [enriched, search, filter]);

  const openDocument = async (row: Row) => {
    if (!row.doc_url) {
      toast({ title: 'Aucun document', description: 'Ce client n\'a pas de document source enregistré', variant: 'destructive' });
      return;
    }
    if (row.doc_url.startsWith('http')) {
      window.open(row.doc_url, '_blank', 'noopener,noreferrer');
      return;
    }
    const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(row.doc_url, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: 'Erreur', description: error?.message ?? 'Impossible de créer le lien', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const relaunchAI = async (row: Row) => {
    setBusyId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('extract-poursuites-date', {
        body: { client_id: row.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Échec de l\'extraction');
      toast({ title: 'IA relancée', description: `Date détectée : ${data.date_emission} (confiance ${Math.round((data.confidence ?? 0) * 100)}%)` });
      await load();
    } catch (err: any) {
      toast({ title: 'Erreur IA', description: err.message ?? 'Impossible de relancer l\'IA', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const sendReminder = async (row: Row) => {
    setBusyId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-document-update-reminders', {
        body: { client_id: row.id, force: true },
      });
      if (error) throw error;
      toast({ title: 'Rappel envoyé', description: data?.sent ? `${data.sent} notification(s) envoyée(s)` : 'Demande de rappel transmise' });
      await load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message ?? 'Échec de l\'envoi', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative p-4 md:p-8 space-y-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-6">
        <PremiumPageHeader
          title="Suivi des extraits de poursuites"
          subtitle="Date d'émission, confiance IA et statut de validité par client actif"
          icon={ShieldCheck}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PremiumKPICard title="Clients actifs" value={kpis.total} icon={User} variant="default" />
          <PremiumKPICard title="Manquants" value={kpis.missing} icon={HelpCircle} variant="warning" />
          <PremiumKPICard title="> 2 mois" value={kpis.warning} icon={Clock} variant="warning" />
          <PremiumKPICard title="Expirés" value={kpis.expired} icon={AlertTriangle} variant="danger" />
        </div>

        {/* Filtres + recherche */}
        <Card className="border-border/50">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client (nom, prénom, email)..." className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1"><Filter className="w-3 h-3" /> Tous</TabsTrigger>
                <TabsTrigger value="expired">Expirés</TabsTrigger>
                <TabsTrigger value="warning">&gt; 2 mois</TabsTrigger>
                <TabsTrigger value="missing">Manquants</TabsTrigger>
                <TabsTrigger value="valid">Valides</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <PremiumTableSkeleton rows={8} columns={8} />
        ) : filtered.length === 0 ? (
          <PremiumEmptyState icon={ShieldCheck} title="Aucun client" description="Aucun client ne correspond aux filtres sélectionnés." />
        ) : (
          <PremiumTable>
            <PremiumTableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date d'émission</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Confiance IA</TableHead>
                <TableHead>Document source</TableHead>
                <TableHead>Dernier rappel</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </PremiumTableHeader>
            <TableBody>
              {filtered.map((r) => (
                <PremiumTableRow key={r.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{[r.prenom, r.nom].filter(Boolean).join(' ') || 'Sans nom'}</span>
                      {r.email && <span className="text-xs text-muted-foreground">{r.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} ageDays={r.ageDays} /></TableCell>
                  <TableCell className="tabular-nums">
                    {r.date_emission ? format(new Date(r.date_emission), 'd MMM yyyy', { locale: fr }) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><MethodBadge method={r.method} /></TableCell>
                  <TableCell><ConfidenceBar value={r.confidence} /></TableCell>
                  <TableCell>
                    {r.doc_url ? (
                      <Button variant="ghost" size="sm" className="gap-2 h-8" onClick={() => openDocument(r)}>
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="truncate max-w-[160px]">{r.doc_nom ?? 'Voir le PDF'}</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs text-muted-foreground">
                    {r.last_reminder_at ? format(new Date(r.last_reminder_at), 'd MMM yyyy', { locale: fr }) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => relaunchAI(r)}
                        disabled={busyId === r.id}
                        title="Relancer l'extraction IA"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${busyId === r.id ? 'animate-spin' : ''}`} />
                        IA
                      </Button>
                      {(r.status === 'missing' || r.status === 'warning' || r.status === 'expired') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-8"
                          onClick={() => sendReminder(r)}
                          disabled={busyId === r.id}
                          title="Envoyer un rappel au client"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Rappel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </PremiumTableRow>
              ))}
            </TableBody>
          </PremiumTable>
        )}
      </div>
    </div>
  );
}
