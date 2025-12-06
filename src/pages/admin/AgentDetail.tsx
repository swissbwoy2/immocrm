import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Users, Calendar, Pencil, Save, X, Camera, Power, Target, BarChart3, Send, Eye, FileCheck, UserPlus, MessageSquare, Sparkles, TrendingUp, ChevronRight, MapPin, Wallet } from "lucide-react";
import { AgentGoalsDialog } from "@/components/stats/AgentGoalsDialog";
import { AgentStatsSection } from "@/components/stats/AgentStatsSection";
import { AgentBadges } from "@/components/stats/AgentBadges";
import { DailyGoalsHistory } from "@/components/stats/DailyGoalsHistory";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { countUniqueVisitesInRange, countUniqueOffresInRange } from "@/utils/visitesCalculator";
import { PremiumKPICard } from "@/components/premium/PremiumKPICard";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { cn } from "@/lib/utils";

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
        navigate(`/admin/messagerie?conversationId=${existingConv.id}`);
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

      // Add agent to conversation_agents for proper RLS access
      await supabase
        .from('conversation_agents')
        .insert({
          conversation_id: data.id,
          agent_id: agent.id,
        });
      
      navigate(`/admin/messagerie?conversationId=${data.id}`);
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
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin border-b-primary/40" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-muted-foreground animate-pulse">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!agent || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Agent introuvable</h2>
          <p className="text-muted-foreground">Cet agent n'existe pas ou a été supprimé</p>
          <Button onClick={() => navigate('/admin/agents')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/agents')}
          className="group hover:bg-primary/10 transition-all duration-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Retour
        </Button>

        {/* Premium Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-border/50 animate-fade-in">
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-8 right-16 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-8 left-24 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-primary/5 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
          </div>

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-start gap-6">
              {/* Avatar Section */}
              <div className="relative group">
                <div className={cn(
                  "absolute inset-0 rounded-full blur-lg transition-all duration-500",
                  profile.actif ? "bg-primary/30 group-hover:bg-primary/50" : "bg-muted/30"
                )} />
                <Avatar className="relative h-28 w-28 ring-4 ring-background shadow-xl transition-transform duration-300 group-hover:scale-105">
                  <AvatarImage src={profile.avatar_url || undefined} alt={`${profile.prenom} ${profile.nom}`} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
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
                  className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Info Section */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Prénom</Label>
                        <Input
                          value={editForm.prenom}
                          onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                          placeholder="Prénom"
                          className="bg-background/50 backdrop-blur-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Nom</Label>
                        <Input
                          value={editForm.nom}
                          onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                          placeholder="Nom"
                          className="bg-background/50 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Téléphone</Label>
                      <Input
                        value={editForm.telephone}
                        onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                        placeholder="+41 XX XXX XX XX"
                        className="bg-background/50 backdrop-blur-sm max-w-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel} disabled={saving} className="gap-2 bg-background/50">
                        <X className="h-4 w-4" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {profile.prenom} {profile.nom}
                      </h1>
                      <Badge 
                        variant={profile.actif ? "default" : "secondary"}
                        className={cn(
                          "transition-all duration-300",
                          profile.actif && "bg-success/90 hover:bg-success animate-pulse-soft"
                        )}
                      >
                        {profile.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Agent immobilier
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setIsEditing(true)}
                        className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-300"
                      >
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleSendMessage}
                        className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-300"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                      <AgentGoalsDialog
                        agentId={agent.id} 
                        agentName={`${profile.prenom} ${profile.nom}`}
                        trigger={
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-300"
                          >
                            <Target className="h-4 w-4" />
                            Objectifs
                          </Button>
                        }
                      />
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                      <Power className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="agent-actif" className="text-sm">Statut</Label>
                      <Switch
                        id="agent-actif"
                        checked={profile.actif}
                        onCheckedChange={handleToggleActif}
                      />
                      <span className={cn(
                        "text-sm font-medium transition-colors",
                        profile.actif ? "text-success" : "text-muted-foreground"
                      )}>
                        {profile.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Info Cards */}
              {!isEditing && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3 w-full lg:w-auto lg:min-w-[280px]">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:bg-background/80 hover:shadow-md">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:bg-background/80 hover:shadow-md">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <p className="text-sm font-medium">{profile.telephone || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:bg-background/80 hover:shadow-md">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Clients</p>
                      <p className="text-sm font-medium">{clients.length} assignés</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:bg-background/80 hover:shadow-md">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Membre depuis</p>
                      <p className="text-sm font-medium">{format(new Date(agent.created_at), "d MMM yyyy", { locale: fr })}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Today's Activity Stats - Premium KPI Cards */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Activité d'aujourd'hui</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PremiumKPICard
              title="Offres envoyées"
              value={todayStats.offres}
              icon={Send}
              variant="default"
              delay={0}
            />
            <PremiumKPICard
              title="Visites planifiées"
              value={todayStats.visites}
              icon={Eye}
              variant="success"
              delay={100}
            />
            <PremiumKPICard
              title="Candidatures"
              value={todayStats.candidatures}
              icon={FileCheck}
              variant="warning"
              delay={200}
            />
            <PremiumKPICard
              title="Nouveaux clients (sem.)"
              value={todayStats.weekClients}
              icon={UserPlus}
              variant="danger"
              delay={300}
            />
          </div>
        </div>

        {/* Badges and Daily Goals History */}
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          {/* Badges Section */}
          <PremiumCard className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              Badges
            </h2>
            <AgentBadges agentId={agent.id} />
          </PremiumCard>

          {/* Daily Goals History */}
          <DailyGoalsHistory agentId={agent.id} />
        </div>

        {/* Full Stats Section */}
        <PremiumCard className="p-6 animate-fade-in">
          <AgentStatsSection
            offres={offres}
            transactions={transactions}
            candidatures={candidatures}
            clients={clients}
            agentId={agent.id}
          />
        </PremiumCard>

        {/* Premium Clients Card */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Clients assignés</h2>
              <Badge variant="secondary" className="ml-2">{clients.length}</Badge>
            </div>
          </div>

          {clients.length === 0 ? (
            <PremiumCard className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Aucun client assigné</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Cet agent n'a pas encore de clients assignés
                  </p>
                </div>
              </div>
            </PremiumCard>
          ) : (
            <div className="grid gap-3">
              {clients.map((client, index) => (
                <div
                  key={client.id}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4",
                    "cursor-pointer transition-all duration-300",
                    "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${(index + 1) * 50}ms` }}
                  onClick={() => navigate(`/admin/clients/${client.id}`)}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {client.profiles.prenom} {client.profiles.nom}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "transition-colors",
                            client.statut === 'actif' && "border-success/50 text-success",
                            client.statut === 'en_pause' && "border-warning/50 text-warning",
                            client.statut === 'archive' && "border-muted-foreground/50"
                          )}
                        >
                          {client.statut || 'actif'}
                        </Badge>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Wallet className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {client.budget_max ? `${client.budget_max.toLocaleString()} CHF` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="h-4 w-4 flex-shrink-0" />
                          <span>{client.pieces ? `${client.pieces} pièces` : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{client.region_recherche || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;
