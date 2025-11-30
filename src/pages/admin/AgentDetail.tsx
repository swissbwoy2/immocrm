import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Users, Calendar, Pencil, Save, X, Camera, Power, Target } from "lucide-react";
import { AgentGoalsDialog } from "@/components/stats/AgentGoalsDialog";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  
  const [editForm, setEditForm] = useState({
    prenom: '',
    nom: '',
    telephone: ''
  });

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
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
                    <div className="flex items-center gap-3 mb-2">
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
                    <span>{agent.nombre_clients_assignes}</span>
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
