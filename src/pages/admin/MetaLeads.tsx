import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Tag, ExternalLink, Leaf, RefreshCw, Download, Upload, FileText as FileTextIcon, Loader2 } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
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
  const [manualPageId, setManualPageId] = useState(() => localStorage.getItem('meta_backfill_page_id') || '');
  const [detectedPageId, setDetectedPageId] = useState<string | null>(null);
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [checkingPageId, setCheckingPageId] = useState(false);
  const [pageIdError, setPageIdError] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

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

  const handlePreCheck = async () => {
    setCheckingPageId(true);
    setPageIdError('');
    const { data: recentLead } = await supabase
      .from('meta_leads')
      .select('page_id')
      .not('page_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setDetectedPageId(recentLead?.page_id || null);
    setCheckingPageId(false);
    setShowBackfillDialog(true);
  };

  const handleCloseBackfillDialog = (open: boolean) => {
    if (!open) {
      setShowBackfillDialog(false);
      setPageIdError('');
    }
  };

  const trimmedManualPageId = manualPageId.trim();
  const isManualPageIdValid = /^\d+$/.test(trimmedManualPageId);
  const resolvedPageId = detectedPageId || (isManualPageIdValid ? trimmedManualPageId : null);
  const canLaunchBackfill = !!resolvedPageId && !syncing;

  const handleManualPageIdChange = (value: string) => {
    setManualPageId(value);
    const trimmed = value.trim();
    if (trimmed && !/^\d+$/.test(trimmed)) {
      setPageIdError('Le Page ID doit contenir uniquement des chiffres');
    } else {
      setPageIdError('');
    }
  };

  const handleBackfill = async () => {
    if (!resolvedPageId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-leads-backfill', {
        body: { page_id: resolvedPageId },
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
        localStorage.setItem('meta_backfill_page_id', resolvedPageId);
        toast.success(
          `Import terminé : ${data?.imported || 0} importé(s), ${data?.skipped || 0} ignoré(s), ${data?.errors || 0} erreur(s)`
        );
        setShowBackfillDialog(false);
        fetchLeads();
      }
    } catch (err: any) {
      toast.error('Erreur inattendue: ' + (err.message || 'inconnue'));
    }
    setSyncing(false);
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const cleanText = text.replace(/^\uFEFF/, '');
      const lines = cleanText.split('\n').filter((l) => l.trim());
      if (lines.length < 2) throw new Error('CSV vide');
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes('nom') && !h.includes('famille'));
      const emailIdx = headers.findIndex((h) => h.includes('e-mail') || h.includes('email') || h.includes('adresse e'));
      const sourceIdx = headers.findIndex((h) => h === 'source');
      const formulaireIdx = headers.findIndex((h) => h.includes('formulaire'));
      const phoneIdx = headers.findIndex((h) => h.includes('téléphone') || h.includes('telephone') || h.includes('phone'));
      if (emailIdx === -1) throw new Error('Colonne email non trouvée');
      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const email = cols[emailIdx]?.trim();
        if (!email || !email.includes('@')) continue;
        const fullName = nameIdx >= 0 ? cols[nameIdx] : '';
        const parts = fullName.split(' ');
        parsed.push({
          email,
          prenom: parts[0] || null,
          nom: parts.slice(1).join(' ') || null,
          telephone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          source: sourceIdx >= 0 ? cols[sourceIdx] || 'CSV Import' : 'CSV Import',
          formulaire: formulaireIdx >= 0 ? cols[formulaireIdx] || null : null,
        });
      }
      const { data, error } = await supabase.functions.invoke('import-leads-csv', {
        body: { leads: parsed, formulaire_name: importFile.name },
      });
      if (error) throw error;
      toast.success(`${data.inserted} leads importés`, {
        description: data.duplicates > 0 ? `${data.duplicates} doublons ignorés` : undefined,
      });
      fetchLeads();
      setShowImportDialog(false);
      setImportFile(null);
    } catch (err) {
      toast.error("Erreur d'import", {
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    } finally {
      setImporting(false);
    }
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importer CSV
          </Button>
          <Button variant="outline" size="sm" disabled={syncing || checkingPageId} onClick={handlePreCheck}>
            <Download className={`h-4 w-4 mr-2 ${syncing || checkingPageId ? 'animate-spin' : ''}`} />
            {syncing ? 'Import en cours...' : checkingPageId ? 'Vérification...' : 'Synchroniser Meta'}
          </Button>
          <AlertDialog open={showBackfillDialog} onOpenChange={handleCloseBackfillDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Importer les leads Meta existants</AlertDialogTitle>
                <AlertDialogDescription>
                  Voulez-vous importer tous les leads Meta existants ? Cette opération peut prendre quelques minutes. Les doublons seront automatiquement ignorés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2 space-y-3">
                {detectedPageId ? (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
                    <Badge className="bg-green-100 text-green-800 border-green-300">Détecté</Badge>
                    <span className="text-sm font-mono text-green-900">{detectedPageId}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Page ID Facebook</label>
                    <Input
                      placeholder="Ex: 123456789012345"
                      value={manualPageId}
                      onChange={(e) => handleManualPageIdChange(e.target.value)}
                    />
                    {pageIdError && (
                      <p className="text-xs text-destructive">{pageIdError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      L'ID numérique de votre page Facebook qui reçoit les Lead Ads (visible dans les paramètres de la page).
                    </p>
                  </div>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleBackfill} disabled={!canLaunchBackfill}>
                  Lancer l'import
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importer un CSV
            </DialogTitle>
            <DialogDescription>
              Format Wix accepté. Les doublons (par email) sont ignorés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="mx-auto"
              />
              {importFile && (
                <div className="mt-2 flex items-center gap-2 justify-center text-sm text-muted-foreground">
                  <FileTextIcon className="h-4 w-4" />
                  {importFile.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowImportDialog(false); setImportFile(null); }}
              disabled={importing}
            >
              Annuler
            </Button>
            <Button onClick={handleImportCSV} disabled={!importFile || importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Import…' : 'Importer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
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
