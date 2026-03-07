import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Tag, ExternalLink, Leaf, RefreshCw, Download } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface MetaLead {
  id: string;
  leadgen_id: string;
  source: string;
  page_id: string | null;
  page_name: string | null;
  form_id: string | null;
  form_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  ad_reference_label: string | null;
  ad_reference_url: string | null;
  is_organic: boolean | null;
  lead_created_time_meta: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  raw_answers: Record<string, string> | null;
  raw_meta_payload: any;
  lead_status: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacté', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'qualified', label: 'Qualifié', color: 'bg-green-100 text-green-800' },
  { value: 'not_qualified', label: 'Non qualifié', color: 'bg-gray-100 text-gray-800' },
  { value: 'converted', label: 'Converti', color: 'bg-purple-100 text-purple-800' },
  { value: 'archived', label: 'Archivé', color: 'bg-red-100 text-red-800' },
];

const getStatusBadge = (status: string) => {
  const s = STATUS_OPTIONS.find((o) => o.value === status);
  return <Badge className={s?.color || ''}>{s?.label || status}</Badge>;
};

export default function MetaLeads() {
  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<MetaLead | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAssigned, setEditAssigned] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchAgents();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meta_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erreur de chargement des leads');
      console.error(error);
    } else {
      setLeads((data as any[]) || []);
    }
    setLoading(false);
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('agents')
      .select('id, user_id, profiles:user_id(prenom, nom)')
      .eq('statut', 'actif');
    setAgents(data || []);
  };

  const openDetail = (lead: MetaLead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || '');
    setEditStatus(lead.lead_status);
    setEditAssigned(lead.assigned_to || '');
  };

  const saveChanges = async () => {
    if (!selectedLead) return;
    setSaving(true);
    const { error } = await supabase
      .from('meta_leads')
      .update({
        lead_status: editStatus,
        assigned_to: editAssigned || null,
        notes: editNotes || null,
      })
      .eq('id', selectedLead.id);
    if (error) {
      toast.error('Erreur de sauvegarde');
    } else {
      toast.success('Lead mis à jour');
      setSelectedLead({ ...selectedLead, lead_status: editStatus, assigned_to: editAssigned || null, notes: editNotes });
      fetchLeads();
    }
    setSaving(false);
  };

  const handleBackfill = async () => {
    setSyncing(true);
    try {
      // Auto-detect page_id
      const { data: recentLead } = await supabase
        .from('meta_leads')
        .select('page_id')
        .not('page_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const pageId = recentLead?.page_id;
      if (!pageId) {
        toast.error('Aucun page_id détecté. Importez au moins un lead via le webhook avant de lancer le backfill.');
        setSyncing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('meta-leads-backfill', {
        body: { page_id: pageId },
      });

      if (error) {
        const msg = (error as any)?.message || '';
        if (msg.includes('409') || msg.includes('déjà en cours')) {
          toast.error('Un import est déjà en cours. Réessayez dans quelques minutes.');
        } else if (msg.includes('403') || msg.includes('Accès refusé')) {
          toast.error('Accès refusé — admin uniquement.');
        } else {
          toast.error('Erreur lors du backfill: ' + msg);
        }
        setSyncing(false);
        return;
      }

      if (data?.error) {
        if (data.error.includes('déjà en cours')) {
          toast.error('Un import est déjà en cours. Réessayez dans quelques minutes.');
        } else {
          toast.error('Erreur: ' + data.error);
        }
      } else {
        toast.success(
          `Import terminé : ${data?.imported || 0} importé(s), ${data?.skipped || 0} ignoré(s), ${data?.errors || 0} erreur(s)`
        );
        fetchLeads();
      }
    } catch (err: any) {
      toast.error('Erreur inattendue: ' + (err.message || 'inconnue'));
    }
    setSyncing(false);
  };

  const filtered = leads.filter((l) => {
    const matchesSearch =
      !search ||
      [l.full_name, l.email, l.phone].some((v) =>
        v?.toLowerCase().includes(search.toLowerCase())
      );
    const matchesStatus = statusFilter === 'all' || l.lead_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return '—';
    const agent = agents.find((a) => a.id === agentId);
    if (!agent?.profiles) return '—';
    const p = agent.profiles as any;
    return `${p.prenom || ''} ${p.nom || ''}`.trim() || '—';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Leads Meta Ads
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Formulaire</TableHead>
              <TableHead>Campagne</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Assigné</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucun lead trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(lead)}
                >
                  <TableCell className="text-sm">
                    {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {lead.full_name || '—'}
                    {lead.is_organic && <Leaf className="inline h-3 w-3 ml-1 text-green-600" />}
                  </TableCell>
                  <TableCell className="text-sm">{lead.email || '—'}</TableCell>
                  <TableCell className="text-sm">{lead.phone || '—'}</TableCell>
                  <TableCell className="text-sm">{lead.form_name || '—'}</TableCell>
                  <TableCell className="text-sm">{lead.campaign_name || '—'}</TableCell>
                  <TableCell>{getStatusBadge(lead.lead_status)}</TableCell>
                  <TableCell className="text-sm">{getAgentName(lead.assigned_to)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {selectedLead?.full_name || 'Lead Meta'}
              {selectedLead?.is_organic && (
                <Badge variant="outline" className="ml-2 text-green-700 border-green-300">
                  <Leaf className="h-3 w-3 mr-1" /> Organique
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Block 1: Contact */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Contact</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Nom :</span> {selectedLead.full_name || '—'}</div>
                  <div><span className="text-muted-foreground">Email :</span> {selectedLead.email || '—'}</div>
                  <div><span className="text-muted-foreground">Téléphone :</span> {selectedLead.phone || '—'}</div>
                  <div><span className="text-muted-foreground">Ville :</span> {selectedLead.city || '—'}</div>
                  <div><span className="text-muted-foreground">Code postal :</span> {selectedLead.postal_code || '—'}</div>
                </div>
              </div>

              {/* Block 2: Origine Meta */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Origine Meta</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Source :</span> {selectedLead.source}</div>
                  <div><span className="text-muted-foreground">Page :</span> {selectedLead.page_name || '—'}</div>
                  <div><span className="text-muted-foreground">Formulaire :</span> {selectedLead.form_name || '—'}</div>
                  <div><span className="text-muted-foreground">Campagne :</span> {selectedLead.campaign_name || '—'}</div>
                  <div><span className="text-muted-foreground">Adset :</span> {selectedLead.adset_name || '—'}</div>
                  <div><span className="text-muted-foreground">Publicité :</span> {selectedLead.ad_name || '—'}</div>
                  <div><span className="text-muted-foreground">Organique :</span> {selectedLead.is_organic ? 'Oui' : 'Non'}</div>
                  <div><span className="text-muted-foreground">Date Meta :</span> {selectedLead.lead_created_time_meta ? format(new Date(selectedLead.lead_created_time_meta), 'dd/MM/yyyy HH:mm') : '—'}</div>
                </div>
                {selectedLead.ad_reference_label && (
                  <div className="text-sm mt-2 p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Référence :</span> {selectedLead.ad_reference_label}
                    {selectedLead.ad_reference_url && (
                      <a href={selectedLead.ad_reference_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-primary hover:underline">
                        <ExternalLink className="h-3 w-3 mr-1" /> Voir dans Ads Manager
                      </a>
                    )}
                  </div>
                )}
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer text-muted-foreground">IDs techniques</summary>
                  <div className="grid grid-cols-2 gap-1 mt-1 font-mono text-muted-foreground">
                    <div>leadgen_id: {selectedLead.leadgen_id}</div>
                    <div>page_id: {selectedLead.page_id || '—'}</div>
                    <div>form_id: {selectedLead.form_id || '—'}</div>
                    <div>campaign_id: {selectedLead.campaign_id || '—'}</div>
                    <div>adset_id: {selectedLead.adset_id || '—'}</div>
                    <div>ad_id: {selectedLead.ad_id || '—'}</div>
                  </div>
                </details>
              </div>

              {/* Block 3: Réponses formulaire */}
              {selectedLead.raw_answers && Object.keys(selectedLead.raw_answers).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Réponses formulaire</h3>
                  <div className="space-y-1 text-sm">
                    {Object.entries(selectedLead.raw_answers).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground font-medium min-w-[120px]">{key} :</span>
                        <span>{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Block 4: Suivi CRM */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Suivi CRM</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Statut</label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Assigné à</label>
                    <Select value={editAssigned} onValueChange={setEditAssigned}>
                      <SelectTrigger>
                        <SelectValue placeholder="Non assigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non assigné</SelectItem>
                        {agents.map((a) => {
                          const p = a.profiles as any;
                          return (
                            <SelectItem key={a.id} value={a.id}>
                              {p?.prenom || ''} {p?.nom || ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Ajouter des notes CRM..."
                    rows={3}
                  />
                </div>
                <Button onClick={saveChanges} disabled={saving} className="w-full">
                  {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
