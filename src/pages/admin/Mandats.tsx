import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, FileSignature, Loader2, RefreshCw, Search, Undo2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mandatElapsedFor, mandatRemainingFor } from '@/utils/mandatDates';
import { toast } from "sonner";
import { useFullMandatAssembler } from "@/hooks/useFullMandatAssembler";
import { useAbaNinjaInvoice } from "@/hooks/useAbaNinjaInvoice";
import { DASH_CARD, DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from "@/components/client/dashboard/DashPrimitives";
import { MandatCard } from "@/components/admin/mandats/MandatCard";
import {
  ETAPES_A_TRAITER, ONGLETS, etapeMandat, getMandateStatus, hasCancellationPending, hasRefundPending,
  nomClient, rangUrgence, type EtapeMandat, type OngletMandat,
} from "@/components/admin/mandats/mandatsModel";

type SortField = 'urgence' | 'days' | 'name' | 'agent' | 'date';
type SortOrder = 'asc' | 'desc';

const Mandats = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [renouvellements, setRenouvellements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [cancelRenewalDialogOpen, setCancelRenewalDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedRenewal, setSelectedRenewal] = useState<any>(null);
  const [renewalReason, setRenewalReason] = useState("");
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);
  const [assemblingClientId, setAssemblingClientId] = useState<string | null>(null);
  
  // Full mandat assembler hook
  const { assembleFullMandat, isAssembling, progress: assemblyProgress, error: assemblyError } = useFullMandatAssembler();
  const { createInvoice } = useAbaNinjaInvoice();
  const [relaunchingId, setRelaunchingId] = useState<string | null>(null);
  
  // Filtres et tri
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<SortField>('urgence');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tab, setTab] = useState<OngletMandat>('a_traiter');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*, profiles!clients_user_id_fkey(prenom, nom, email)')
        .order('date_ajout', { ascending: false });

      const { data: agentsData } = await supabase
        .from('agents')
        .select('*, profiles!agents_user_id_fkey(*)');

      const { data: renouvData } = await supabase
        .from('renouvellements_mandat')
        .select('*')
        .order('created_at', { ascending: false });

      setClients(clientsData || []);
      setAgents(agentsData || []);
      setRenouvellements(renouvData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewMandate = async () => {
    if (!selectedClient) return;
    
    setIsRenewing(true);
    try {
      const { error: renewalError } = await supabase
        .from('renouvellements_mandat')
        .insert({
          client_id: selectedClient.id,
          agent_id: selectedClient.agent_id,
          date_ancien_mandat: selectedClient.date_ajout,
          raison: renewalReason || 'Renouvellement standard'
        });

      if (renewalError) throw renewalError;

      const { error: updateError } = await supabase
        .from('clients')
        .update({ date_ajout: new Date().toISOString() })
        .eq('id', selectedClient.id);

      if (updateError) throw updateError;

      await loadData();
      setRenewalDialogOpen(false);
      setRenewalReason("");
      setSelectedClient(null);
      
      toast.success("Mandat renouvelé avec succès !", {
        description: `Le mandat de ${selectedClient.profiles?.prenom} ${selectedClient.profiles?.nom} a été renouvelé pour 90 jours.`
      });
    } catch (error) {
      console.error('Error renewing mandate:', error);
      toast.error("Erreur lors du renouvellement du mandat");
    } finally {
      setIsRenewing(false);
    }
  };

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    if (!agent?.profiles) return "Non assigné";
    return `${agent.profiles.prenom} ${agent.profiles.nom}`;
  };

  const getLatestRenewal = (clientId: string) => {
    return renouvellements.find(r => r.client_id === clientId);
  };

  const isRecentlyRenewed = (clientId: string) => {
    const renewal = getLatestRenewal(clientId);
    if (!renewal) return false;
    const daysSinceRenewal = Math.floor((Date.now() - new Date(renewal.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceRenewal <= 7;
  };

  const handleUpdateClientStatus = async (client: any, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ statut: newStatus })
        .eq('id', client.id);
      
      if (error) throw error;
      
      await loadData();
      const labels: Record<string, string> = { suspendu: 'suspendu', stoppe: 'stoppé' };
      toast.success(`Mandat ${labels[newStatus] || newStatus}`, {
        description: `Le mandat de ${client.profiles?.prenom} ${client.profiles?.nom} a été ${labels[newStatus] || newStatus}.`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleRelaunchSearch = async (client: any) => {
    if (!client) return;
    if (client.refund_status === 'pending' || client.refund_status === 'processed') {
      toast.error('Impossible de relancer', {
        description: 'Un remboursement est en cours. Terminez-le avant de relancer une nouvelle recherche.',
      });
      return;
    }
    setRelaunchingId(client.id);
    try {
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          statut: 'actif',
          mandat_date_signature: nowIso,
          date_ajout: nowIso,
          mandate_pause_days: 0,
          mandate_paused_at: null,
          cancellation_requested_at: null,
          refund_status: 'not_applicable',
          derniere_relance_at: nowIso,
          relance_count: (client.relance_count ?? 0) + 1,
        })
        .eq('id', client.id);
      if (updateError) throw updateError;

      const profile = client.profiles || {};
      const invoiceResult = await createInvoice({
        clientId: client.id,
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        email: profile.email || '',
        telephone: profile.telephone || '',
        adresse: client.adresse || '',
        typeRecherche: 'Louer',
      });

      try {
        if (client.user_id) {
          await supabase.rpc('create_notification', {
            p_user_id: client.user_id,
            p_type: 'mandat_relance',
            p_title: '🔄 Nouvelle recherche activée',
            p_message: `Votre recherche de logement est réactivée pour 90 jours. Une nouvelle facture d'acompte de CHF 300.- vous a été envoyée par email.`,
            p_link: '/client/mon-contrat',
            p_metadata: JSON.stringify({ client_id: client.id }),
          });
        }
        if (client.agent_id) {
          const { data: agentRow } = await supabase
            .from('agents')
            .select('user_id')
            .eq('id', client.agent_id)
            .maybeSingle();
          if (agentRow?.user_id) {
            await supabase.rpc('create_notification', {
              p_user_id: agentRow.user_id,
              p_type: 'mandat_relance',
              p_title: '🔄 Nouvelle recherche relancée',
              p_message: `Une nouvelle recherche de 90 jours vient d'être ouverte pour ${profile.prenom || ''} ${profile.nom || ''}.`,
              p_link: `/admin/clients/${client.id}`,
              p_metadata: JSON.stringify({ client_id: client.id }),
            });
          }
        }
      } catch (notifErr) {
        console.warn('Notification error (non-blocking):', notifErr);
      }

      toast.success('✅ Nouvelle recherche lancée', {
        description: invoiceResult.success
          ? 'Le mandat repart pour 90 jours et la facture CHF 300.- a été envoyée.'
          : "Le mandat repart pour 90 jours. Attention : la facture AbaNinja n'a pas pu être générée automatiquement.",
      });
      await loadData();
    } catch (error: any) {
      console.error('Error relaunching search:', error);
      toast.error('Erreur', { description: error?.message || 'Impossible de relancer la recherche' });
    } finally {
      setRelaunchingId(null);
    }
  };

  const handleCancelRenewal = async () => {
    if (!selectedRenewal || !selectedClient) return;
    
    setIsCancelling(true);
    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ date_ajout: selectedRenewal.date_ancien_mandat })
        .eq('id', selectedClient.id);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('renouvellements_mandat')
        .delete()
        .eq('id', selectedRenewal.id);

      if (deleteError) throw deleteError;

      await loadData();
      setCancelRenewalDialogOpen(false);
      setSelectedRenewal(null);
      setSelectedClient(null);
      
      toast.success("Renouvellement annulé", {
        description: `Le mandat de ${selectedClient.profiles?.prenom} ${selectedClient.profiles?.nom} a été restauré à sa date initiale.`
      });
    } catch (error) {
      console.error('Error cancelling renewal:', error);
      toast.error("Erreur lors de l'annulation du renouvellement");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleViewMandat = async (client: any) => {
    setIsDownloadingPdf(client.id);
    
    const downloadFromBase64 = (base64: string, filename: string) => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };
    
    const extractStoragePath = (url: string): string => {
      if (!url) return url;
      if (!url.startsWith('http')) return url;
      
      const patterns = [
        /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/,
        /\/storage\/v1\/object\/sign\/[^/]+\/(.+)\?/,
        /\/storage\/v1\/object\/authenticated\/[^/]+\/(.+)$/,
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      
      const parts = url.split('/mandat-contracts/');
      if (parts.length > 1) return parts[1].split('?')[0];
      
      return url;
    };
    
    try {
      // Priority 1: TOUJOURS régénérer le mandat OFFICIEL (11 articles + CGV) depuis les données BDD à jour.
      // Cela évite de servir d'anciens PDFs simplifiés stockés (générés par l'obsolète generate-mandat-contract).
      console.log('Regenerating full mandat PDF for client:', client.id);
      const { data, error } = await supabase.functions.invoke('generate-full-mandat-pdf', {
        body: { client_id: client.id }
      });

      if (!error && data?.pdf_base64) {
        downloadFromBase64(
          data.pdf_base64,
          data.filename || `Mandat_${client.profiles?.nom || 'client'}.pdf`
        );
        toast.success("Mandat complet généré et téléchargé");
        return;
      }

      console.warn('Regeneration failed, trying storage fallback:', error?.message);

      // Priority 2 (fallback): télécharger depuis le storage si la régénération échoue
      if (client.mandat_pdf_url) {
        const storagePath = extractStoragePath(client.mandat_pdf_url);
        const { data: storageData, error: storageError } = await supabase.storage
          .from('mandat-contracts')
          .download(storagePath);

        if (!storageError && storageData) {
          const url = URL.createObjectURL(storageData);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Mandat_${client.profiles?.nom || 'client'}_${client.profiles?.prenom || ''}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          toast.success("PDF téléchargé (version archivée)");
          return;
        }
      }

      throw new Error('Aucun PDF disponible');
    } catch (error) {
      console.error('Error downloading/generating PDF:', error);
      toast.error("Erreur lors du téléchargement du PDF. Veuillez réessayer.");
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const handleAssemble = async (client: any) => {
    setAssemblingClientId(client.id);
    const clientName = client.profiles 
      ? `${client.profiles.nom}_${client.profiles.prenom}`.replace(/\s+/g, '_')
      : 'client';
    const result = await assembleFullMandat(client.id, clientName);
    if (result.success) {
      toast.success(`Mandat complet téléchargé (${result.pagesAdded || 0} pages d'annexes)`);
    } else {
      toast.error(result.error || "Erreur lors de l'assemblage");
    }
    setAssemblingClientId(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // Changer de critère repart en ordre décroissant (comme les anciens boutons de tri) ; le bouton d'ordre inverse.
  const changeSortField = (field: SortField) => {
    setSortField(field);
    setSortOrder('desc');
  };

  // Clients dont le mandat est activé (mêmes règles que l'écran d'origine).
  const activatedClients = useMemo(
    () => clients.filter(client => ['actif', 'reloge', 'stoppe', 'suspendu'].includes(client.statut)),
    [clients]
  );

  // Recherche + filtres agent / phase : s'appliquent à tous les onglets, les compteurs suivent.
  const filteredClients = useMemo(() => {
    return activatedClients.filter(client => {
      // Filtre recherche
      const clientName = client.profiles ? `${client.profiles.prenom} ${client.profiles.nom}`.toLowerCase() : '';
      const matchSearch = clientName.includes(searchTerm.toLowerCase()) || 
        client.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtre agent
      const matchAgent = filterAgent === 'all' || client.agent_id === filterAgent;
      
      // Filtre statut
      if (filterStatus !== 'all') {
        if (filterStatus === 'reloge' || filterStatus === 'suspendu' || filterStatus === 'stoppe') {
          if (client.statut !== filterStatus) return false;
        } else {
          if (client.statut === 'reloge' || client.statut === 'suspendu' || client.statut === 'stoppe') return false;
          const daysElapsed = mandatElapsedFor(client as any);
          const status = getMandateStatus(daysElapsed);
          if (status.key !== filterStatus) return false;
        }
      }
      
      return matchSearch && matchAgent;
    });
  }, [activatedClients, searchTerm, filterAgent, filterStatus]);

  const etapeCounts = useMemo(() => {
    const m: Record<OngletMandat, number> = {
      a_traiter: 0, demandes: 0, echus: 0, bientot: 0, actifs: 0, suspendus: 0, reloges: 0, stoppes: 0, tous: filteredClients.length,
    };
    for (const c of filteredClients) {
      const e = etapeMandat(c);
      m[e] += 1;
      if (ETAPES_A_TRAITER.includes(e)) m.a_traiter += 1;
    }
    return m;
  }, [filteredClients]);

  const filteredAndSortedClients = useMemo(() => {
    const filtered = filteredClients.filter(client => {
      if (tab === 'tous') return true;
      const e = etapeMandat(client);
      return tab === 'a_traiter' ? ETAPES_A_TRAITER.includes(e) : e === (tab as EtapeMandat);
    });

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'urgence':
          // Demandes en attente, puis mandats échus, puis échéances les plus proches.
          return rangUrgence(a) - rangUrgence(b);
        case 'days':
          const daysA = mandatElapsedFor(a as any);
          const daysB = mandatElapsedFor(b as any);
          comparison = daysA - daysB;
          break;
        case 'name':
          const nameA = a.profiles ? `${a.profiles.prenom} ${a.profiles.nom}`.toLowerCase() : '';
          const nameB = b.profiles ? `${b.profiles.prenom} ${b.profiles.nom}`.toLowerCase() : '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'agent':
          const agentA = getAgentName(a.agent_id).toLowerCase();
          const agentB = getAgentName(b.agent_id).toLowerCase();
          comparison = agentA.localeCompare(agentB);
          break;
        case 'date':
          const dateA = new Date(a.date_ajout || a.created_at).getTime();
          const dateB = new Date(b.date_ajout || b.created_at).getTime();
          comparison = dateA - dateB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClients, tab, sortField, sortOrder, agents]);

  if (loading) {
    return (
      <DashPage>
        <div className="flex justify-center py-16" role="status" aria-label="Chargement">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashPage>
    );
  }

  // Synthèse (sur tous les mandats, indépendamment des filtres) : mêmes compteurs que l'écran d'origine.
  const synthese: { label: string; value: number; cls: string; onClick: () => void }[] = [
    { label: 'Total clients', value: clients.length, cls: 'text-foreground', onClick: () => { setFilterStatus('all'); setTab('tous'); } },
    { label: 'Nouveaux (≤30j)', value: clients.filter(c => ['actif'].includes(c.statut) && mandatElapsedFor(c as any) <= 30).length, cls: 'text-primary', onClick: () => { setFilterStatus('nouveau'); setTab('tous'); } },
    {
      label: 'En cours (30-60j)',
      value: clients.filter(c => {
        if (c.statut !== 'actif') return false;
        const days = mandatElapsedFor(c as any);
        return days > 30 && days <= 60;
      }).length,
      cls: 'text-muted-foreground',
      onClick: () => { setFilterStatus('en_cours'); setTab('tous'); },
    },
    {
      label: 'Critiques (60-89j)',
      value: clients.filter(c => {
        if (c.statut !== 'actif') return false;
        const days = mandatElapsedFor(c as any);
        return days > 60 && days < 90;
      }).length,
      cls: 'text-amber-700 dark:text-amber-400',
      onClick: () => { setFilterStatus('critique'); setTab('tous'); },
    },
    { label: 'Expirés (90+j)', value: clients.filter(c => c.statut === 'actif' && mandatElapsedFor(c as any) >= 90).length, cls: 'text-destructive', onClick: () => { setFilterStatus('expire'); setTab('tous'); } },
    { label: 'Relogés', value: clients.filter(c => c.statut === 'reloge').length, cls: 'text-emerald-700 dark:text-emerald-400', onClick: () => { setFilterStatus('reloge'); setTab('tous'); } },
  ];

  // Sous-titre : ce qui attend une action, sur l'ensemble des mandats activés.
  const nbATraiter = activatedClients.filter(c => ETAPES_A_TRAITER.includes(etapeMandat(c))).length;
  const nbDemandes = activatedClients.filter(c => hasRefundPending(c) || hasCancellationPending(c)).length;
  const nbEchus = activatedClients.filter(c => etapeMandat(c) === 'echus').length;
  const subtitle = nbATraiter === 0
    ? 'Tout est à jour : aucun mandat à traiter.'
    : [
        `${nbATraiter} mandat${nbATraiter > 1 ? 's' : ''} à traiter`,
        nbDemandes > 0 ? `${nbDemandes} demande${nbDemandes > 1 ? 's' : ''} de remboursement ou résiliation` : null,
        nbEchus > 0 ? `${nbEchus} échu${nbEchus > 1 ? 's' : ''}` : null,
      ].filter(Boolean).join(' · ');

  const filtresActifs = !!searchTerm || filterAgent !== 'all' || filterStatus !== 'all';

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Gestion des Mandats"
        subtitle={subtitle}
        action={
          <Button variant="outline" size="sm" className="h-10 rounded-full" onClick={handleRefresh} disabled={refreshing} aria-label="Actualiser">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Synthèse : un clic filtre la liste sur cette phase */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {synthese.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={t.onClick}
            className={`${DASH_CARD} min-h-[72px] p-3 text-left transition-transform duration-150 active:scale-[0.98]`}
          >
            <span className="block truncate text-[11px] text-muted-foreground sm:text-xs">{t.label}</span>
            <span className={`mt-1 block text-xl font-semibold tabular-nums ${t.cls}`}>{t.value}</span>
          </button>
        ))}
      </div>

      {/* Barre d'outils : recherche plein écran sur mobile ; tri, ordre, agent et phase à côté sur grand écran */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un client"
            className="h-11 rounded-full pl-10 pr-10"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:w-auto">
          <div className="flex gap-2">
            <Select value={sortField} onValueChange={(v) => changeSortField(v as SortField)}>
              <SelectTrigger className="h-11 min-w-0 flex-1 rounded-full lg:w-[170px]" aria-label="Trier par"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgence">Urgent d’abord</SelectItem>
                <SelectItem value="days">Jours écoulés</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="date">Date début</SelectItem>
              </SelectContent>
            </Select>
            {sortField !== 'urgence' && (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                aria-label={sortOrder === 'asc' ? 'Ordre croissant (inverser)' : 'Ordre décroissant (inverser)'}
                title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
              >
                {sortOrder === 'asc' ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="h-11 rounded-full lg:w-[180px]" aria-label="Agent">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les agents</SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.profiles?.prenom} {agent.profiles?.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="col-span-2 h-11 rounded-full lg:w-[160px]" aria-label="Statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="nouveau">Nouveaux</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="critique">Critiques</SelectItem>
              <SelectItem value="expire">Expirés</SelectItem>
              <SelectItem value="reloge">Relogés</SelectItem>
              <SelectItem value="suspendu">Suspendus</SelectItem>
              <SelectItem value="stoppe">Stoppés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DashFilterPills
        label="Étapes des mandats"
        value={tab}
        onChange={(v) => setTab(v as OngletMandat)}
        options={ONGLETS.map((o) => ({ key: o.key, label: o.label, count: etapeCounts[o.key] }))}
      />

      <p className="-mt-2 text-sm text-muted-foreground">
        {filteredAndSortedClients.length} résultat{filteredAndSortedClients.length > 1 ? 's' : ''}
        {filtresActifs && (
          <button
            type="button"
            className="ml-2 font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => { setSearchTerm(''); setFilterAgent('all'); setFilterStatus('all'); }}
          >
            Réinitialiser les filtres
          </button>
        )}
      </p>

      {filteredAndSortedClients.length === 0 ? (
        <DashEmptyState
          icon={FileSignature}
          title={
            filtresActifs ? 'Aucun mandat pour ces filtres'
              : tab === 'a_traiter' ? 'Rien à traiter pour le moment'
              : 'Aucun mandat dans cette étape'
          }
          description={tab === 'a_traiter' && !filtresActifs
            ? 'Les mandats échus, proches de l’échéance ou avec une demande de remboursement ou de résiliation apparaissent ici.'
            : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredAndSortedClients.map((client) => (
            <MandatCard
              key={client.id}
              client={client}
              agentName={getAgentName(client.agent_id)}
              renewed={isRecentlyRenewed(client.id)}
              latestRenewal={getLatestRenewal(client.id)}
              downloading={isDownloadingPdf === client.id}
              assembling={isAssembling && assemblingClientId === client.id}
              assemblyProgress={assemblyProgress}
              relaunching={relaunchingId === client.id}
              onOpenFiche={(c) => navigate(`/admin/clients/${c.id}`)}
              onViewMandat={handleViewMandat}
              onAssemble={handleAssemble}
              onRenew={(c) => {
                setSelectedClient(c);
                setRenewalDialogOpen(true);
              }}
              onRelaunch={handleRelaunchSearch}
              onUpdateStatus={handleUpdateClientStatus}
              onCancelRenewal={(c, renewal) => {
                setSelectedClient(c);
                setSelectedRenewal(renewal);
                setCancelRenewalDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={renewalDialogOpen} onOpenChange={setRenewalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renouveler le mandat</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Client: <span className="font-medium text-foreground">
                  {selectedClient?.profiles?.prenom} {selectedClient?.profiles?.nom}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Mandat actuel: <span className="font-medium text-foreground">
                  {selectedClient?.date_ajout ? new Date(selectedClient.date_ajout).toLocaleDateString('fr-CH') : '-'}
                </span>
              </p>
              {selectedClient && mandatRemainingFor(selectedClient as any) <= 0 && (
                <p className="text-sm text-destructive font-medium">
                  Ce mandat a expiré
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Raison du renouvellement (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Client toujours en recherche active, budget ajusté, nouvelles disponibilités..."
                value={renewalReason}
                onChange={(e) => setRenewalReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-sm text-foreground">
                Le nouveau mandat débutera aujourd'hui et sera valable pour 90 jours supplémentaires.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setRenewalDialogOpen(false);
                setRenewalReason("");
                setSelectedClient(null);
              }}
              disabled={isRenewing}
            >
              Annuler
            </Button>
            <Button
              className="rounded-full"
              onClick={handleRenewMandate}
              disabled={isRenewing}
            >
              {isRenewing ? "Renouvellement..." : "Confirmer le renouvellement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog annulation renouvellement */}
      <Dialog open={cancelRenewalDialogOpen} onOpenChange={setCancelRenewalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Undo2 className="h-4 w-4" />
              </span>
              Annuler le renouvellement
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Client: <span className="font-medium text-foreground">
                  {selectedClient?.profiles?.prenom} {selectedClient?.profiles?.nom}
                </span>
              </p>
              {selectedRenewal && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Date actuelle du mandat: <span className="font-medium text-foreground">
                      {new Date(selectedClient?.date_ajout).toLocaleDateString('fr-CH')}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Date avant renouvellement: <span className="font-medium text-foreground">
                      {new Date(selectedRenewal.date_ancien_mandat).toLocaleDateString('fr-CH')}
                    </span>
                  </p>
                  {selectedRenewal.raison && (
                    <p className="text-sm text-muted-foreground">
                      Raison du renouvellement: <span className="font-medium text-foreground">
                        {selectedRenewal.raison}
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="rounded-xl bg-amber-500/10 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Cette action va restaurer la date du mandat à sa valeur avant le renouvellement ({selectedRenewal ? new Date(selectedRenewal.date_ancien_mandat).toLocaleDateString('fr-CH') : ''}).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setCancelRenewalDialogOpen(false);
                setSelectedRenewal(null);
                setSelectedClient(null);
              }}
              disabled={isCancelling}
            >
              Fermer
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={handleCancelRenewal}
              disabled={isCancelling}
            >
              {isCancelling ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashPage>
  );
};

export default Mandats;
