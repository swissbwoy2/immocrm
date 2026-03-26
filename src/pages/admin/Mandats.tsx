import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, TrendingUp, AlertCircle, RefreshCw, Search, ArrowUpDown, User, Undo2, History, FileText, Download, Eye, FileArchive, Loader2, Pause, StopCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { calculateDaysElapsed, calculateDaysRemaining, formatTimeRemaining } from "@/utils/calculations";
import { toast } from "sonner";
import { useFullMandatAssembler } from "@/hooks/useFullMandatAssembler";

type SortField = 'days' | 'name' | 'agent' | 'date';
type SortOrder = 'asc' | 'desc';

const Mandats = () => {
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
  
  // Filtres et tri
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<SortField>('days');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  const getMandateStatus = (daysElapsed: number) => {
    if (daysElapsed <= 30) return { label: "Nouveau", variant: "default" as const, color: "text-primary", key: "nouveau" };
    if (daysElapsed <= 60) return { label: "En cours", variant: "secondary" as const, color: "text-muted-foreground", key: "en_cours" };
    if (daysElapsed < 90) return { label: "Critique", variant: "outline" as const, color: "text-warning", key: "critique" };
    return { label: "Expiré", variant: "destructive" as const, color: "text-destructive", key: "expire" };
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
      // Priority 1: Try to download directly from storage if URL exists
      if (client.mandat_pdf_url) {
        const storagePath = extractStoragePath(client.mandat_pdf_url);
        console.log('Attempting direct download from storage:', storagePath);
        
        const { data, error } = await supabase.storage
          .from('mandat-contracts')
          .download(storagePath);
        
        if (!error && data) {
          const url = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Mandat_${client.profiles?.nom || 'client'}_${client.profiles?.prenom || ''}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          
          toast.success("PDF téléchargé avec succès");
          setIsDownloadingPdf(null);
          return;
        }
        
        console.warn('Direct download failed, falling back to generation:', error?.message);
      }
      
      // Priority 2: Generate PDF on-the-fly (with page limit for memory optimization)
      console.log('Generating PDF on-the-fly for client:', client.id);
      const { data, error } = await supabase.functions.invoke('generate-full-mandat-pdf', {
        body: { client_id: client.id }
      });
      
      if (error) throw error;
      
      if (data?.pdf_base64) {
        downloadFromBase64(
          data.pdf_base64, 
          data.filename || `Mandat_${client.profiles?.nom || 'client'}.pdf`
        );
        toast.success("PDF généré et téléchargé avec succès");
      } else {
        throw new Error('Aucun PDF retourné');
      }
    } catch (error) {
      console.error('Error downloading/generating PDF:', error);
      toast.error("Erreur lors du téléchargement du PDF. Veuillez réessayer.");
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      // Exclude non-activated clients
      const isActivated = ['actif', 'reloge', 'stoppe', 'suspendu'].includes(client.statut);
      if (!isActivated) return false;
      
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
          const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
          const status = getMandateStatus(daysElapsed);
          if (status.key !== filterStatus) return false;
        }
      }
      
      return matchSearch && matchAgent;
    });

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'days':
          const daysA = calculateDaysElapsed(a.date_ajout || a.created_at);
          const daysB = calculateDaysElapsed(b.date_ajout || b.created_at);
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
  }, [clients, searchTerm, filterAgent, filterStatus, sortField, sortOrder, agents]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Mandats</h1>
          <p className="text-sm md:text-base text-muted-foreground">Suivi de la durée des mandats clients</p>
        </div>

        {/* Stats résumé */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6">
          <Card className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Total clients</p>
            <p className="text-xl md:text-2xl font-bold">{clients.length}</p>
          </Card>
          <Card className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Nouveaux (≤30j)</p>
            <p className="text-xl md:text-2xl font-bold text-primary">
              {clients.filter(c => ['actif'].includes(c.statut) && calculateDaysElapsed(c.date_ajout || c.created_at) <= 30).length}
            </p>
            </p>
          </Card>
          <Card className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">En cours (30-60j)</p>
            <p className="text-xl md:text-2xl font-bold text-muted-foreground">
              {clients.filter(c => {
                if (c.statut !== 'actif') return false;
                const days = calculateDaysElapsed(c.date_ajout || c.created_at);
                return days > 30 && days <= 60;
              }).length}
            </p>
          </Card>
          <Card className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Critiques (60-89j)</p>
            <p className="text-xl md:text-2xl font-bold text-warning">
              {clients.filter(c => {
                if (c.statut !== 'actif') return false;
                const days = calculateDaysElapsed(c.date_ajout || c.created_at);
                return days > 60 && days < 90;
              }).length}
            </p>
          </Card>
          <Card className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Expirés (90+j)</p>
            <p className="text-xl md:text-2xl font-bold text-destructive">
              {clients.filter(c => c.statut !== 'reloge' && c.statut !== 'suspendu' && c.statut !== 'stoppe' && calculateDaysElapsed(c.date_ajout || c.created_at) >= 90).length}
            </p>
          </Card>
          <Card className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Relogés</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-600">
              {clients.filter(c => c.statut === 'reloge').length}
            </p>
          </Card>
        </div>

        {/* Filtres et tri */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
            <SelectTrigger className="w-full sm:w-[150px]">
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

        {/* Boutons de tri */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-muted-foreground py-1">Trier par:</span>
          <Button
            variant={sortField === 'days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('days')}
            className="h-8 text-xs"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Jours écoulés
          </Button>
          <Button
            variant={sortField === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('name')}
            className="h-8 text-xs"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Nom
          </Button>
          <Button
            variant={sortField === 'agent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('agent')}
            className="h-8 text-xs"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Agent
          </Button>
          <Button
            variant={sortField === 'date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('date')}
            className="h-8 text-xs"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Date début
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {filteredAndSortedClients.length} résultat{filteredAndSortedClients.length > 1 ? 's' : ''}
        </p>

        <div className="grid gap-3 md:gap-4">
          {filteredAndSortedClients.map((client) => {
            const isReloge = client.statut === 'reloge';
            const isSuspendu = client.statut === 'suspendu';
            const isStoppe = client.statut === 'stoppe';
            const isFrozen = isReloge || isSuspendu || isStoppe;
            
            const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
            const daysRemaining = calculateDaysRemaining(client.date_ajout || client.created_at);
            const progress = isReloge ? 100 : Math.min((daysElapsed / 90) * 100, 100);
            const status = isFrozen 
              ? isReloge 
                ? { label: "Relogé", variant: "default" as const, color: "text-emerald-600", key: "reloge" }
                : isSuspendu
                  ? { label: "Suspendu", variant: "secondary" as const, color: "text-amber-600", key: "suspendu" }
                  : { label: "Stoppé", variant: "destructive" as const, color: "text-destructive", key: "stoppe" }
              : getMandateStatus(daysElapsed);
            const renewed = isRecentlyRenewed(client.id);

            const progressBarColor = isReloge 
              ? "bg-emerald-500" 
              : isSuspendu 
                ? "bg-amber-500" 
                : isStoppe 
                  ? "bg-destructive" 
                  : undefined;
            
            return (
              <Card key={client.id} className={`p-4 md:p-6 ${isFrozen ? 'opacity-80' : ''}`}>
                <div className="space-y-3 md:space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg md:text-xl font-semibold">
                          {client.profiles 
                            ? `${client.profiles.prenom} ${client.profiles.nom}` 
                            : 'Client (sans profil)'}
                        </h3>
                        {isReloge ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs border-emerald-300">✅ Relogé</Badge>
                        ) : isSuspendu ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs border-amber-300">⏸️ Suspendu</Badge>
                        ) : isStoppe ? (
                          <Badge variant="destructive" className="text-xs">⛔ Stoppé</Badge>
                        ) : (
                          <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                        )}
                        {renewed && !isFrozen && (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs">
                            🔄 Renouvelé
                          </Badge>
                        )}
                        {!isFrozen && getLatestRenewal(client.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client);
                              setSelectedRenewal(getLatestRenewal(client.id));
                              setCancelRenewalDialogOpen(true);
                            }}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            Annuler renouvellement
                          </Button>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Agent: {getAgentName(client.agent_id)}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                      {isFrozen ? (
                        <div className={`text-lg md:text-xl font-bold ${status.color}`}>
                          {status.label}
                        </div>
                      ) : (
                        <>
                          <div className={`text-2xl md:text-3xl font-bold ${status.color}`}>
                            J+{Math.floor(daysElapsed)}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {daysRemaining > 0 ? formatTimeRemaining(daysRemaining) : "Expiré"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span>Progression du mandat</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress 
                      value={progress} 
                      className="h-2" 
                      indicatorClassName={progressBarColor}
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Début:</span> {new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      Split: {client.commission_split}%
                    </div>
                    {!isFrozen && daysElapsed > 60 && (
                      <div className="flex items-center gap-1.5 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Proche expiration</span>
                        <span className="sm:hidden">Urgent</span>
                      </div>
                    )}
                  </div>

                  {/* Recherche info */}
                  <div className="pt-3 border-t">
                    <div className="text-xs md:text-sm flex flex-wrap gap-x-3 gap-y-1">
                      <span><span className="font-medium">Recherche:</span> {client.type_bien || 'N/A'} {client.pieces || '-'} pièces</span>
                      <span><span className="font-medium">Budget:</span> CHF {client.budget_max?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Action boutons */}
                  <div className="pt-3 border-t flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleViewMandat(client)}
                      variant="outline"
                      size="sm"
                      disabled={isDownloadingPdf === client.id || (isAssembling && assemblingClientId === client.id)}
                    >
                      {isDownloadingPdf === client.id ? (
                        <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Contrat
                    </Button>
                    
                    <Button
                      onClick={async () => {
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
                      }}
                      variant="default"
                      size="sm"
                      disabled={isAssembling && assemblingClientId === client.id}
                    >
                      {isAssembling && assemblingClientId === client.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {assemblyProgress ? `${Math.round(assemblyProgress.percent)}%` : 'Assemblage...'}
                        </>
                      ) : (
                        <>
                          <FileArchive className="h-4 w-4 mr-2" />
                          Mandat complet
                        </>
                      )}
                    </Button>
                    
                    {!isFrozen && daysRemaining <= 30 && (
                      <Button
                        onClick={() => {
                          setSelectedClient(client);
                          setRenewalDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Renouveler le mandat
                      </Button>
                    )}

                    {!isFrozen && client.statut !== 'reloge' && (
                      <>
                        <ConfirmDialog
                          trigger={
                            <Button variant="warning" size="sm">
                              <Pause className="h-4 w-4 mr-2" />
                              Suspendre
                            </Button>
                          }
                          title="Suspendre le mandat"
                          description={`Voulez-vous suspendre le mandat de ${client.profiles?.prenom} ${client.profiles?.nom} ? La progression sera figée.`}
                          confirmText="Suspendre"
                          variant="default"
                          onConfirm={() => handleUpdateClientStatus(client, 'suspendu')}
                        />
                        <ConfirmDialog
                          trigger={
                            <Button variant="destructive" size="sm">
                              <StopCircle className="h-4 w-4 mr-2" />
                              Stopper
                            </Button>
                          }
                          title="Stopper le mandat"
                          description={`Voulez-vous stopper définitivement le mandat de ${client.profiles?.prenom} ${client.profiles?.nom} ? Cette action est irréversible.`}
                          confirmText="Stopper le mandat"
                          variant="destructive"
                          onConfirm={() => handleUpdateClientStatus(client, 'stoppe')}
                        />
                      </>
                    )}
                  </div>
                  
                  {/* Progress bar for assembly */}
                  {isAssembling && assemblingClientId === client.id && assemblyProgress && (
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{assemblyProgress.step}</span>
                        <span>{assemblyProgress.current}/{assemblyProgress.total}</span>
                      </div>
                      <Progress value={assemblyProgress.percent} className="h-1.5" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

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
              {selectedClient && calculateDaysRemaining(selectedClient.date_ajout || selectedClient.created_at) <= 0 && (
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Ce mandat a expiré
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

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📅 Le nouveau mandat débutera aujourd'hui et sera valable pour 90 jours supplémentaires.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
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
              <Undo2 className="h-5 w-5 text-destructive" />
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

            <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Cette action va restaurer la date du mandat à sa valeur avant le renouvellement ({selectedRenewal ? new Date(selectedRenewal.date_ancien_mandat).toLocaleDateString('fr-CH') : ''}).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
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
              onClick={handleCancelRenewal}
              disabled={isCancelling}
            >
              {isCancelling ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Mandats;
