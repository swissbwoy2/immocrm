import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Users, Calendar, Pencil, Save, X, Camera, Power, Target, BarChart3, Send, Eye, FileCheck, UserPlus, MessageSquare } from "lucide-react";
import { AgentGoalsDialog } from "@/components/stats/AgentGoalsDialog";
import { AgentStatsSection } from "@/components/stats/AgentStatsSection";
import { AgentBadges } from "@/components/stats/AgentBadges";
import { DailyGoalsHistory } from "@/components/stats/DailyGoalsHistory";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { countUniqueVisitesInRange, countUniqueOffresInRange } from "@/utils/visitesCalculator";

interface Agent {
  id: string;
  user_id: string;
  statut: string;
  nombre_clients_assignes: number;
  created_at: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  actif: boolean;
  avatar_url: string | null;
}

interface Client {
  id: string;
  user_id: string;
  budget_max: number | null;
  pieces: number | null;
  region_recherche: string | null;
  date_ajout: string | null;
  statut: string | null;
  profiles: Profile;
}

const AgentDetail = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Stats data
  const [offres, setOffres] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  
  // Today's stats
  const [todayStats, setTodayStats] = useState({
    offres: 0,
    visites: 0,
    candidatures: 0,
    weekClients: 0
  });
  
  const [editForm, setEditForm] = useState({
    prenom: '',
    nom: '',
    telephone: ''
  });

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
      fetchStatsData();
    }
  }, [agentId]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        telephone: profile.telephone || ''
      });
    }
  }, [profile]);

  const fetchStatsData = async () => {
    if (!agentId) return;
    
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

    try {
      // Fetch all offres for this agent
      const { data: offresData } = await supabase
        .from('offres')
        .select('*')
        .eq('agent_id', agentId);
      setOffres(offresData || []);

      // Fetch all transactions for this agent
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('agent_id', agentId);
      setTransactions(transactionsData || []);

      // Fetch all visites for this agent (need adresse for unique counting)
      const { data: visitesData } = await supabase
        .from('visites')
        .select('*')
        .eq('agent_id', agentId);
      setVisites(visitesData || []);

      // Fetch all candidatures for clients assigned to this agent
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', agentId);
      
      const clientIds = clientsData?.map(c => c.id) || [];
      
      if (clientIds.length > 0) {
        const { data: candidaturesData } = await supabase
          .from('candidatures')
          .select('*')
          .in('client_id', clientIds);
        setCandidatures(candidaturesData || []);
      }

      // Calculate today's stats - count unique offers (same date + address = 1 offer)
      const todayOffres = countUniqueOffresInRange(
        offresData || [],
        todayStart,
        todayEnd
      );

      // Count unique visits (same date + address = 1 visit, regardless of clients)
      const todayVisites = countUniqueVisitesInRange(
        visitesData || [],
        todayStart,
        todayEnd
      );

      const todayCandidatures = (candidatures || []).filter(c => 
        c.created_at && c.created_at >= todayStart && c.created_at <= todayEnd
      ).length;

      // New clients this week
      const { data: weekClientsData } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', agentId)
        .gte('date_ajout', weekStart)
        .lte('date_ajout', weekEnd);

      setTodayStats({
        offres: todayOffres,
        visites: todayVisites,
        candidatures: todayCandidatures,
        weekClients: weekClientsData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAgentDetails = async () => {
    try {
      // Fetch agent data
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentError) throw agentError;
      setAgent(agentData);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', agentData.user_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch assigned clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('agent_id', agentId);

      if (clientsError) throw clientsError;

      // Fetch clients profiles
      const userIds = clientsData?.map(c => c.user_id) || [];
      if (userIds.length > 0) {
        const { data: clientProfilesData, error: clientProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        if (clientProfilesError) throw clientProfilesError;

        const mergedClients = clientsData?.map(client => ({
          ...client,
          profiles: clientProfilesData?.find(p => p.id === client.user_id) || {
            nom: '',
            prenom: '',
            email: '',
            telephone: '',
            actif: false,
            avatar_url: null
          }
        })) || [];

        setClients(mergedClients);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de l'agent",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!agent || !profile) return;
    
    if (!editForm.prenom.trim() || !editForm.nom.trim()) {
      toast({
        title: "Erreur",
        description: "Le prénom et le nom sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          prenom: editForm.prenom.trim(),
          nom: editForm.nom.trim(),
          telephone: editForm.telephone.trim()
        })
        .eq('id', agent.user_id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Informations de l'agent mises à jour",
      });
      
      setIsEditing(false);
      fetchAgentDetails();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les informations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActif = async () => {
    if (!agent || !profile) return;

    try {
      const newActif = !profile.actif;
      const { error } = await supabase
        .from('profiles')
        .update({ actif: newActif })
        .eq('id', agent.user_id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Agent ${newActif ? 'activé' : 'désactivé'}`,
      });
      
      fetchAgentDetails();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    } finally {
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !agent) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5 Mo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${agent.user_id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage
        .from('profile-avatars')
        .remove([`${agent.user_id}/avatar.png`, `${agent.user_id}/avatar.jpg`, `${agent.user_id}/avatar.jpeg`, `${agent.user_id}/avatar.webp`]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl + '?t=' + Date.now() })
        .eq('id', agent.user_id);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Photo de profil mise à jour",
      });
      fetchAgentDetails();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement de l'image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setEditForm({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        telephone: profile.telephone || ''
      });
    }
  };

  const handleSendMessage = async () => {
    if (!agent) return;
    
    try {
      // Get current admin user id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Check if a conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('admin_user_id', user.id)
        .eq('conversation_type', 'admin-agent')
        .maybeSingle();
      
      if (existingConv) {
        navigate({
          pathname: '/admin/messagerie',
          search: `?conversationId=${existingConv.id}`
        });
        return;
      }
      
      // Create a new admin-agent conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agent.id,
          admin_user_id: user.id,
          conversation_type: 'admin-agent',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      navigate({
        pathname: '/admin/messagerie',
        search: `?conversationId=${data.id}`
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la conversation',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!agent || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent introuvable</h2>
          <Button onClick={() => navigate('/admin/agents')}>
            Retour aux agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/agents')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6">
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} alt={`${profile.prenom} ${profile.nom}`} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile.prenom?.[0]}{profile.nom?.[0]}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prénom</Label>
                        <Input
                          value={editForm.prenom}
                          onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                          placeholder="Prénom"
                        />
                      </div>
                      <div>
                        <Label>Nom</Label>
                        <Input
                          value={editForm.nom}
                          onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                          placeholder="Nom"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input
                        value={editForm.telephone}
                        onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                        placeholder="+41 XX XXX XX XX"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel} disabled={saving}>
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-3xl font-bold">
                        {profile.prenom} {profile.nom}
                      </h1>
                      <Badge variant={profile.actif ? "default" : "secondary"}>
                        {profile.actif ? "Actif" : "Inactif"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleSendMessage}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                      <AgentGoalsDialog
                        agentId={agent.id} 
                        agentName={`${profile.prenom} ${profile.nom}`}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Target className="h-4 w-4 mr-1" />
                            Objectifs
                          </Button>
                        }
                      />
                    </div>
                    <p className="text-muted-foreground">Agent immobilier</p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                      <Power className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="agent-actif" className="text-sm">Statut de l'agent</Label>
                      <Switch
                        id="agent-actif"
                        checked={profile.actif}
                        onCheckedChange={handleToggleActif}
                      />
                      <span className="text-sm text-muted-foreground">
                        {profile.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Email:</span>
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Téléphone:</span>
                    <span>{profile.telephone || 'Non renseigné'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Clients assignés:</span>
                    <span>{clients.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Créé le:</span>
                    <span>
                      {format(new Date(agent.created_at), "d MMMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Today's Activity Stats */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Activité d'aujourd'hui
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Send className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{todayStats.offres}</div>
                <p className="text-sm text-muted-foreground">Offres envoyées</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{todayStats.visites}</div>
                <p className="text-sm text-muted-foreground">Visites planifiées</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <FileCheck className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{todayStats.candidatures}</div>
                <p className="text-sm text-muted-foreground">Candidatures</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <UserPlus className="h-6 w-6 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{todayStats.weekClients}</div>
                <p className="text-sm text-muted-foreground">Nouveaux clients (sem.)</p>
              </div>
            </div>
          </Card>

          {/* Badges and Daily Goals History */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Badges Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                🏆 Badges
              </h2>
              <AgentBadges agentId={agent.id} />
            </Card>

            {/* Daily Goals History */}
            <DailyGoalsHistory agentId={agent.id} />
          </div>

          {/* Full Stats Section */}
          <Card className="p-6">
            <AgentStatsSection
              offres={offres}
              transactions={transactions}
              candidatures={candidatures}
              clients={clients}
              agentId={agent.id}
            />
          </Card>

          {/* Clients Card */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">
              Clients assignés ({clients.length})
            </h2>

            {clients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun client assigné à cet agent
              </p>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <Card
                    key={client.id}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            {client.profiles.prenom} {client.profiles.nom}
                          </h3>
                          <Badge variant="outline">{client.statut || 'actif'}</Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Budget:</span>{" "}
                            {client.budget_max ? `${client.budget_max.toLocaleString()} CHF` : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Pièces:</span>{" "}
                            {client.pieces || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Région:</span>{" "}
                            {client.region_recherche || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;
