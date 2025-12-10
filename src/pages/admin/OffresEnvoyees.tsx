import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Send, MapPin, Home, Calendar, User, Filter, Eye, ExternalLink, Phone, Building, Forward, Clock, 
  CheckCircle, XCircle, Star, FileText, Key, Sparkles
} from "lucide-react";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { PremiumKPICard } from "@/components/premium/PremiumKPICard";
import { cn } from "@/lib/utils";

interface Visite {
  id: string;
  offre_id: string;
  date_visite: string;
  statut: string | null;
  notes: string | null;
  feedback_agent: string | null;
}

interface Offre {
  id: string;
  titre: string | null;
  adresse: string;
  prix: number;
  pieces: number | null;
  surface: number | null;
  type_bien: string | null;
  statut: string | null;
  date_envoi: string | null;
  client_id: string | null;
  agent_id: string | null;
  lien_annonce: string | null;
  description: string | null;
  disponibilite: string | null;
  etage: string | null;
  code_immeuble: string | null;
  commentaires: string | null;
  concierge_nom: string | null;
  concierge_tel: string | null;
  locataire_nom: string | null;
  locataire_tel: string | null;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
}

interface Agent {
  id: string;
  user_id: string;
}

interface Client {
  id: string;
  user_id: string;
  agent_id: string | null;
}

// Configuration complète des statuts avec toutes les étapes du workflow
const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  icon: typeof Send; 
  emoji: string;
  step: number;
}> = {
  envoyee: { 
    label: 'Envoyée', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Send, 
    emoji: '📤',
    step: 1 
  },
  vue: { 
    label: 'Vue', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: Eye, 
    emoji: '👁️',
    step: 2 
  },
  interesse: { 
    label: 'Intéressé', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Star, 
    emoji: '⭐',
    step: 3 
  },
  visite_planifiee: { 
    label: 'Visite planifiée', 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    icon: Calendar, 
    emoji: '📅',
    step: 4 
  },
  visite_effectuee: { 
    label: 'Visite effectuée', 
    color: 'text-teal-600', 
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
    icon: CheckCircle, 
    emoji: '✅',
    step: 5 
  },
  candidature_deposee: { 
    label: 'Candidature déposée', 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    icon: FileText, 
    emoji: '📋',
    step: 6 
  },
  acceptee: { 
    label: 'Acceptée', 
    color: 'text-success', 
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    icon: Key, 
    emoji: '🎉',
    step: 7 
  },
  refusee: { 
    label: 'Refusée', 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    icon: XCircle, 
    emoji: '❌',
    step: -1 
  },
};

// Étapes de la timeline
const TIMELINE_STEPS = [
  { key: 'envoyee', label: 'Envoyée', emoji: '📤' },
  { key: 'vue', label: 'Vue', emoji: '👁️' },
  { key: 'interesse', label: 'Intéressé', emoji: '⭐' },
  { key: 'visite_planifiee', label: 'Visite', emoji: '📅' },
  { key: 'visite_effectuee', label: 'Visitée', emoji: '✅' },
  { key: 'candidature_deposee', label: 'Candidature', emoji: '📋' },
  { key: 'acceptee', label: 'Acceptée', emoji: '🎉' },
];

// Composant Timeline Premium
function OfferTimeline({ currentStatut }: { currentStatut: string | null }) {
  const statusConfig = STATUS_CONFIG[currentStatut || 'envoyee'];
  const currentStep = statusConfig?.step || 1;
  const isRefused = currentStatut === 'refusee';

  if (isRefused) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-full border border-destructive/20">
        <XCircle className="h-3.5 w-3.5 text-destructive" />
        <span className="text-xs font-medium text-destructive">Refusée</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
      {TIMELINE_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isPast = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isFuture = stepNumber > currentStep;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all",
                isPast && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                isFuture && "bg-muted text-muted-foreground"
              )}
              title={step.label}
            >
              {isPast ? '✓' : step.emoji}
            </div>
            {index < TIMELINE_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-3 h-0.5 transition-all",
                  stepNumber < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminOffresEnvoyees() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [offres, setOffres] = useState<Offre[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  
  // Dialog state
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTargetClient, setSelectedTargetClient] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  
  // Visites state
  const [visitesMap, setVisitesMap] = useState<Map<string, Visite[]>>(new Map());

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user?.id, userRole]);

  const loadData = async () => {
    try {
      // Charger toutes les offres avec tous les champs
      const { data: offresData, error: offresError } = await supabase
        .from('offres')
        .select('*')
        .order('date_envoi', { ascending: false });
      
      if (offresError) throw offresError;
      setOffres(offresData || []);

      // Charger les visites associées aux offres
      const offreIds = offresData?.map(o => o.id) || [];
      if (offreIds.length > 0) {
        const { data: visitesData, error: visitesError } = await supabase
          .from('visites')
          .select('id, offre_id, date_visite, statut, notes, feedback_agent')
          .in('offre_id', offreIds)
          .order('date_visite', { ascending: true });
        
        if (!visitesError && visitesData) {
          const newVisitesMap = new Map<string, Visite[]>();
          visitesData.forEach(v => {
            if (!newVisitesMap.has(v.offre_id)) newVisitesMap.set(v.offre_id, []);
            newVisitesMap.get(v.offre_id)!.push(v);
          });
          setVisitesMap(newVisitesMap);
        }
      }

      // Charger les agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, user_id');
      
      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Charger les clients avec leur agent assigné
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, user_id, agent_id');
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Collecter tous les user_ids pour charger les profils
      const userIds = new Set<string>();
      agentsData?.forEach(a => userIds.add(a.user_id));
      clientsData?.forEach(c => userIds.add(c.user_id));

      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', Array.from(userIds));
        
        if (profilesError) throw profilesError;
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Erreur chargement offres:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Agent inconnu";
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return "Agent inconnu";
    const profile = profiles.get(agent.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Agent inconnu";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Client inconnu";
    const client = clients.find(c => c.id === clientId);
    if (!client) return "Client inconnu";
    const profile = profiles.get(client.user_id);
    return profile ? `${profile.prenom} ${profile.nom}` : "Client inconnu";
  };

  const getStatusBadge = (statut: string | null) => {
    const config = STATUS_CONFIG[statut || 'envoyee'] || STATUS_CONFIG.envoyee;
    const Icon = config.icon;
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1.5 font-medium border",
          config.bgColor,
          config.color,
          config.borderColor
        )}
      >
        <Icon className="h-3 w-3" />
        <span>{config.emoji}</span>
        {config.label}
      </Badge>
    );
  };

  const handleOpenOffreDetail = (offre: Offre) => {
    setSelectedOffre(offre);
    setDetailDialogOpen(true);
  };

  const handleOpenTransferDialog = (offre: Offre, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOffre(offre);
    setSelectedTargetClient("");
    setTransferDialogOpen(true);
  };

  const handleTransferOffre = async () => {
    if (!selectedOffre || !selectedTargetClient) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    setTransferring(true);
    try {
      // Trouver le client cible et son agent assigné
      const targetClient = clients.find(c => c.id === selectedTargetClient);
      
      if (!targetClient?.agent_id) {
        toast.error("Ce client n'a pas d'agent assigné");
        setTransferring(false);
        return;
      }

      // Créer une nouvelle offre pour le nouveau client avec l'agent assigné
      const { data: newOffre, error: offreError } = await supabase
        .from('offres')
        .insert({
          titre: selectedOffre.titre,
          adresse: selectedOffre.adresse,
          prix: selectedOffre.prix,
          pieces: selectedOffre.pieces,
          surface: selectedOffre.surface,
          type_bien: selectedOffre.type_bien,
          description: selectedOffre.description,
          lien_annonce: selectedOffre.lien_annonce,
          disponibilite: selectedOffre.disponibilite,
          etage: selectedOffre.etage,
          code_immeuble: selectedOffre.code_immeuble,
          commentaires: selectedOffre.commentaires,
          concierge_nom: selectedOffre.concierge_nom,
          concierge_tel: selectedOffre.concierge_tel,
          locataire_nom: selectedOffre.locataire_nom,
          locataire_tel: selectedOffre.locataire_tel,
          agent_id: targetClient.agent_id,
          client_id: selectedTargetClient,
          statut: 'envoyee',
          date_envoi: new Date().toISOString()
        })
        .select()
        .single();

      if (offreError) throw offreError;

      // Chercher la conversation existante entre le client et son agent
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', selectedTargetClient)
        .eq('agent_id', targetClient.agent_id)
        .eq('conversation_type', 'client-agent')
        .maybeSingle();

      let conversationId = existingConv?.id;

      // Si pas de conversation, en créer une
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            client_id: selectedTargetClient,
            agent_id: targetClient.agent_id,
            subject: 'Échanges',
            conversation_type: 'client-agent',
            status: 'active'
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;

        // Ajouter l'agent dans conversation_agents
        await supabase
          .from('conversation_agents')
          .insert({
            conversation_id: conversationId,
            agent_id: targetClient.agent_id
          });
      }

      // Récupérer le nom du client cible pour la personnalisation
      const targetClientProfile = profiles.get(targetClient.user_id);
      const clientName = targetClientProfile 
        ? `${targetClientProfile.prenom} ${targetClientProfile.nom}` 
        : 'Client';

      // Créer le message complet comme dans EnvoyerOffre
      const messageLines = [
        `Nouvelle Offre pour Votre Recherche d'Appartement`,
        ``,
        `Bonjour ${clientName} 👋,`,
        ``,
        `Nous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :`,
        ``,
        `📍 Localisation : ${selectedOffre.adresse}`,
        `💰 Prix : ${selectedOffre.prix.toLocaleString()} CHF`,
      ];
      
      if (selectedOffre.surface) messageLines.push(`📐 Surface : ${selectedOffre.surface} m²`);
      if (selectedOffre.pieces) messageLines.push(`🏠 Nombre de pièces : ${selectedOffre.pieces}`);
      if (selectedOffre.etage) messageLines.push(`🏢 Étage : ${selectedOffre.etage}`);
      if (selectedOffre.disponibilite) messageLines.push(`📅 Disponibilité : ${selectedOffre.disponibilite}`);
      if (selectedOffre.type_bien) messageLines.push(`🏘️ Type de bien : ${selectedOffre.type_bien}`);
      if (selectedOffre.description) {
        messageLines.push(``);
        messageLines.push(`Description :`);
        messageLines.push(selectedOffre.description);
      }
      if (selectedOffre.lien_annonce) {
        messageLines.push(``);
        messageLines.push(`🔗 Voir l'annonce complète : ${selectedOffre.lien_annonce}`);
      }
      if (selectedOffre.commentaires) {
        messageLines.push(``);
        messageLines.push(`💬 Commentaires : ${selectedOffre.commentaires}`);
      }
      
      messageLines.push(``);
      messageLines.push(`Pour toute question, n'hésitez pas à nous appeler au +41 21 634 28 39 ou à répondre directement à ce message.`);
      messageLines.push(``);
      messageLines.push(`Cordialement,`);
      messageLines.push(`L'équipe Immo-rama.ch`);

      const messageContent = messageLines.join('\n');

      // Créer le message avec l'offre attachée (au nom de l'agent)
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: targetClient.agent_id,
          sender_type: 'agent',
          content: messageContent,
          offre_id: newOffre.id
        });

      if (messageError) throw messageError;

      // Mettre à jour last_message_at de la conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      const targetClientName = getClientName(selectedTargetClient);

      toast.success(`Offre envoyée à ${targetClientName}`);
      setTransferDialogOpen(false);
      setDetailDialogOpen(false);
      
      // Recharger les données
      loadData();
    } catch (error) {
      console.error('Erreur transfert offre:', error);
      toast.error("Erreur lors de l'envoi de l'offre");
    } finally {
      setTransferring(false);
    }
  };

  // Filtrage
  const filteredOffres = offres.filter(offre => {
    const matchesSearch = 
      offre.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offre.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      getClientName(offre.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAgentName(offre.agent_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || offre.statut === statusFilter;
    const matchesAgent = agentFilter === "all" || offre.agent_id === agentFilter;
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  // Stats
  const totalOffres = offres.length;
  const offresEnvoyees = offres.filter(o => o.statut === 'envoyee' || o.statut === 'vue').length;
  const offresInteresse = offres.filter(o => ['interesse', 'visite_planifiee', 'visite_effectuee'].includes(o.statut || '')).length;
  const candidatures = offres.filter(o => o.statut === 'candidature_deposee').length;
  const offresAcceptees = offres.filter(o => o.statut === 'acceptee').length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        {/* Header premium */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Offres envoyées</h1>
              <p className="text-muted-foreground text-sm">Suivi de toutes les offres envoyées par les agents</p>
            </div>
          </div>
        </div>

        {/* Stats Premium KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-8">
          <PremiumKPICard
            title="Total"
            value={totalOffres}
            icon={Send}
            variant="default"
            delay={0}
          />
          <PremiumKPICard
            title="En attente"
            value={offresEnvoyees}
            icon={Eye}
            variant="default"
            subtitle="Envoyées & vues"
            delay={50}
          />
          <PremiumKPICard
            title="Intéressés"
            value={offresInteresse}
            icon={Star}
            variant="warning"
            subtitle="Visites en cours"
            delay={100}
          />
          <PremiumKPICard
            title="Candidatures"
            value={candidatures}
            icon={FileText}
            variant="default"
            subtitle="Dossiers déposés"
            delay={150}
          />
          <PremiumKPICard
            title="Acceptées"
            value={offresAcceptees}
            icon={Key}
            variant="success"
            subtitle="🎉 Réussies"
            delay={200}
          />
        </div>

        {/* Filtres Premium */}
        <Card className="mb-6 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5 text-primary" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Rechercher (adresse, client, agent...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background/50"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="envoyee">📤 Envoyée</SelectItem>
                  <SelectItem value="vue">👁️ Vue</SelectItem>
                  <SelectItem value="interesse">⭐ Intéressé</SelectItem>
                  <SelectItem value="visite_planifiee">📅 Visite planifiée</SelectItem>
                  <SelectItem value="visite_effectuee">✅ Visite effectuée</SelectItem>
                  <SelectItem value="candidature_deposee">📋 Candidature déposée</SelectItem>
                  <SelectItem value="acceptee">🎉 Acceptée</SelectItem>
                  <SelectItem value="refusee">❌ Refusée</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {getAgentName(agent.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Liste des offres Premium */}
        <div className="grid gap-4">
          {filteredOffres.length === 0 ? (
            <Card className="p-12 border-dashed">
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Send className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">Aucune offre trouvée</p>
                <p className="text-sm mt-1">Modifiez vos filtres ou attendez que les agents envoient des offres</p>
              </div>
            </Card>
          ) : (
            filteredOffres.map((offre, index) => {
              const statusConfig = STATUS_CONFIG[offre.statut || 'envoyee'] || STATUS_CONFIG.envoyee;
              
              return (
                <Card 
                  key={offre.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 cursor-pointer",
                    "hover:shadow-lg hover:-translate-y-0.5",
                    "border-l-4",
                    statusConfig.borderColor
                  )}
                  onClick={() => handleOpenOffreDetail(offre)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenOffreDetail(offre)}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>

                  <div className="relative p-4 md:p-6">
                    <div className="flex flex-col gap-4">
                      {/* Header avec statut et timeline */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                            {offre.titre || offre.adresse}
                          </h3>
                          {getStatusBadge(offre.statut)}
                        </div>
                        <OfferTimeline currentStatut={offre.statut} />
                      </div>
                      
                      {/* Infos principales */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-primary/70" />
                          {offre.adresse}
                        </span>
                        {offre.type_bien && (
                          <span className="flex items-center gap-1.5">
                            <Home className="w-4 h-4" />
                            {offre.type_bien}
                          </span>
                        )}
                        {offre.pieces && (
                          <span>{offre.pieces} pièces</span>
                        )}
                        {offre.surface && (
                          <span>{offre.surface} m²</span>
                        )}
                      </div>

                      {/* Prix, Agent, Client */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="font-bold text-primary text-base">
                          CHF {offre.prix.toLocaleString()}/mois
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-4 h-4" />
                          {getAgentName(offre.agent_id)}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-4 h-4" />
                          {getClientName(offre.client_id)}
                        </span>
                        {offre.date_envoi && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(offre.date_envoi), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => handleOpenTransferDialog(offre, e)}
                          className="relative z-10 hover:bg-primary/5"
                        >
                          <Forward className="w-4 h-4 mr-1.5" />
                          Envoyer à un client
                        </Button>
                        {offre.client_id && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/clients/${offre.client_id}`);
                            }}
                            className="relative z-10 hover:bg-primary/5"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Voir client
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Dialog détail offre */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Détails de l'offre
              {selectedOffre && getStatusBadge(selectedOffre.statut)}
            </DialogTitle>
          </DialogHeader>

          {selectedOffre && (
            <div className="space-y-6">
              {/* Timeline dans le dialogue */}
              <div className="p-4 bg-muted/30 rounded-xl border">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Progression</Label>
                <OfferTimeline currentStatut={selectedOffre.statut} />
              </div>

              {/* En-tête avec adresse */}
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                <h4 className="font-semibold text-lg">{selectedOffre.titre || selectedOffre.adresse}</h4>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedOffre.adresse}
                </div>
                {selectedOffre.date_envoi && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Envoyée le {format(new Date(selectedOffre.date_envoi), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>

              {/* Lien de l'annonce avec prévisualisation */}
              {selectedOffre.lien_annonce && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Lien de l'annonce</Label>
                  <LinkPreviewCard url={selectedOffre.lien_annonce} showInline />
                </div>
              )}

              {/* Caractéristiques */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Prix</p>
                  <p className="font-bold text-primary">{selectedOffre.prix.toLocaleString()} CHF</p>
                </div>
                {selectedOffre.pieces && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Pièces</p>
                    <p className="font-bold">{selectedOffre.pieces}</p>
                  </div>
                )}
                {selectedOffre.surface && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Surface</p>
                    <p className="font-bold">{selectedOffre.surface} m²</p>
                  </div>
                )}
                {selectedOffre.etage && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Étage</p>
                    <p className="font-bold">{selectedOffre.etage}</p>
                  </div>
                )}
              </div>

              {/* Type et disponibilité */}
              <div className="grid grid-cols-2 gap-4">
                {selectedOffre.type_bien && (
                  <div>
                    <Label className="text-muted-foreground">Type de bien</Label>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Home className="h-4 w-4" />
                      {selectedOffre.type_bien}
                    </p>
                  </div>
                )}
                {selectedOffre.disponibilite && (
                  <div>
                    <Label className="text-muted-foreground">Disponibilité</Label>
                    <p className="font-medium mt-1">{selectedOffre.disponibilite}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedOffre.description && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Description</Label>
                  <div className="p-4 bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedOffre.description}</p>
                  </div>
                </div>
              )}

              {/* Commentaires agent */}
              {selectedOffre.commentaires && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Commentaires de l'agent</Label>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedOffre.commentaires}</p>
                  </div>
                </div>
              )}

              {/* Infos immeuble */}
              {selectedOffre.code_immeuble && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Code immeuble: <strong>{selectedOffre.code_immeuble}</strong></span>
                </div>
              )}

              {/* Contacts */}
              {(selectedOffre.concierge_nom || selectedOffre.locataire_nom) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedOffre.concierge_nom && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Concierge</p>
                      <p className="font-medium">{selectedOffre.concierge_nom}</p>
                      {selectedOffre.concierge_tel && (
                        <a 
                          href={`tel:${selectedOffre.concierge_tel}`} 
                          className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {selectedOffre.concierge_tel}
                        </a>
                      )}
                    </div>
                  )}
                  {selectedOffre.locataire_nom && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Locataire actuel</p>
                      <p className="font-medium">{selectedOffre.locataire_nom}</p>
                      {selectedOffre.locataire_tel && (
                        <a 
                          href={`tel:${selectedOffre.locataire_tel}`} 
                          className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {selectedOffre.locataire_tel}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section Visites */}
              {(() => {
                const visites = visitesMap.get(selectedOffre.id) || [];
                const now = new Date();
                
                const getVisiteStatus = (visite: Visite) => {
                  if (visite.statut === 'effectuee') return { label: 'Effectuée', variant: 'default' as const, icon: CheckCircle };
                  if (visite.statut === 'annulee') return { label: 'Annulée', variant: 'destructive' as const, icon: XCircle };
                  const visiteDate = new Date(visite.date_visite);
                  if (visiteDate < now) return { label: 'Passée', variant: 'secondary' as const, icon: Clock };
                  return { label: 'À venir', variant: 'outline' as const, icon: Calendar };
                };

                return (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Visites ({visites.length})
                    </Label>
                    
                    {visites.length === 0 ? (
                      <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground text-sm">
                        {selectedOffre.statut === 'visite_planifiee' 
                          ? "Visite programmée mais aucune date enregistrée"
                          : "Aucune visite pour cette offre"
                        }
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {visites.map(visite => {
                          const status = getVisiteStatus(visite);
                          const StatusIcon = status.icon;
                          return (
                            <div key={visite.id} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <StatusIcon className="h-4 w-4 text-primary" />
                                  <span className="font-medium">
                                    {format(new Date(visite.date_visite), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                                  </span>
                                </div>
                                <Badge variant={status.variant}>
                                  {status.label}
                                </Badge>
                              </div>
                              {visite.notes && (
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">Notes:</span> {visite.notes}
                                </p>
                              )}
                              {visite.feedback_agent && (
                                <div className="text-sm bg-muted p-2 rounded">
                                  <span className="font-medium">Feedback agent:</span> {visite.feedback_agent}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent et Client */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Agent</Label>
                  <p className="font-medium mt-1">{getAgentName(selectedOffre.agent_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Client</Label>
                  <p className="font-medium mt-1">{getClientName(selectedOffre.client_id)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button 
              variant="secondary"
              onClick={() => {
                setDetailDialogOpen(false);
                handleOpenTransferDialog(selectedOffre!);
              }}
            >
              <Forward className="w-4 h-4 mr-2" />
              Envoyer à un client
            </Button>
            {selectedOffre?.lien_annonce && (
              <Button 
                variant="outline" 
                onClick={() => window.open(selectedOffre.lien_annonce!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir l'annonce
              </Button>
            )}
            {selectedOffre?.client_id && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                navigate(`/admin/clients/${selectedOffre.client_id}`);
              }}>
                <Eye className="w-4 h-4 mr-2" />
                Voir le client
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog transfert offre à un client */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer l'offre à un autre client</DialogTitle>
            <DialogDescription>
              Sélectionnez le client à qui envoyer cette offre. L'offre sera dupliquée et envoyée au client sélectionné via son agent assigné.
            </DialogDescription>
          </DialogHeader>

          {selectedOffre && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOffre.titre || selectedOffre.adresse}</p>
                <p className="text-sm text-muted-foreground">CHF {selectedOffre.prix.toLocaleString()}/mois</p>
              </div>

              <div className="space-y-2">
                <Label>Sélectionner un client</Label>
                <Select value={selectedTargetClient} onValueChange={setSelectedTargetClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients
                      .filter(c => c.id !== selectedOffre.client_id && c.agent_id)
                      .map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {getClientName(client.id)} 
                          <span className="text-muted-foreground ml-2">
                            (Agent: {getAgentName(client.agent_id)})
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {clients.filter(c => c.id !== selectedOffre.client_id && c.agent_id).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun autre client avec un agent assigné disponible.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleTransferOffre} 
              disabled={!selectedTargetClient || transferring}
            >
              {transferring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer l'offre
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
