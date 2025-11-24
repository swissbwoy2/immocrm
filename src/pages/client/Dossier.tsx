import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Mail, Phone, MapPin, Calendar, Users, DollarSign, 
  Home, Building2, Briefcase, Heart, Car, Upload, FileText,
  Download, Trash2, User, MessageSquare, Edit, RefreshCw
} from 'lucide-react';
import { calculateDaysElapsed, calculateDaysRemaining, formatTimeRemaining } from '@/utils/calculations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Dossier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editProfileData, setEditProfileData] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      console.error('LoadData called but user is null');
      return;
    }

    console.log('Loading data for user:', user.id);

    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      matchesUser: session?.user?.id === user.id
    });

    if (!session) {
      console.error('No active session found');
      setLoading(false);
      return;
    }

    try {
      // Load client avec log détaillé
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Client query result:', {
        found: !!clientData,
        error: clientError,
        userId: user.id
      });

      if (clientError) throw clientError;
      
      if (!clientData) {
        console.error('No client data found for user:', user.id);
        setLoading(false);
        return;
      }
      
      setClient(clientData);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load agent if assigned
      if (clientData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('id', clientData.agent_id)
          .maybeSingle();

        if (agentData) {
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', agentData.user_id)
            .maybeSingle();

          setAgent({
            ...agentData,
            prenom: agentProfile?.prenom || '',
            nom: agentProfile?.nom || '',
            email: agentProfile?.email || '',
            telephone: agentProfile?.telephone || '',
          });
        }
      }

      // Load documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('date_upload', { ascending: false });

      setDocuments(docsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 5 MB',
        variant: 'destructive',
      });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Type de fichier non supporté',
        description: 'Formats acceptés : PDF, JPG, PNG',
        variant: 'destructive',
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const { error } = await supabase
          .from('documents')
          .insert({
            nom: file.name,
            type: file.type,
            taille: file.size,
            user_id: user!.id,
            client_id: client.id,
            url: e.target?.result as string,
          });

        if (error) throw error;

        await loadData();

        toast({
          title: 'Document ajouté',
          description: 'Le document a été uploadé avec succès',
        });

        setUploadDialogOpen(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le fichier',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', selectedDoc.id);

      if (error) throw error;

      await loadData();

      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès',
      });

      setDeleteDialogOpen(false);
      setSelectedDoc(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.nom;
    link.click();
  };

  const handleEditProfileClick = () => {
    setEditProfileData({
      nom: profile?.nom,
      prenom: profile?.prenom,
      telephone: profile?.telephone,
    });
    setEditProfileDialogOpen(true);
  };

  const handleEditProfileSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editProfileData)
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vos informations ont été mises à jour',
      });

      setEditProfileDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour vos informations',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleInitializeProfile = async () => {
    if (!user) return;
    
    try {
      // Utiliser upsert pour gérer le cas où le client existe déjà
      const { error } = await supabase
        .from('clients')
        .upsert({
          user_id: user.id,
          date_ajout: new Date().toISOString(),
          statut: 'actif',
          priorite: 'moyenne'
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Votre profil client a été chargé',
      });

      loadData();
    } catch (error) {
      console.error('Error initializing profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger votre profil',
        variant: 'destructive',
      });
    }
  };

  if (!client || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">Profil non chargé</h2>
            <p className="text-muted-foreground mb-4">
              Impossible de charger votre profil client. Cliquez sur le bouton ci-dessous pour réessayer.
            </p>
            <div className="space-y-2">
              <Button onClick={loadData} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Rafraîchir
              </Button>
              <Button onClick={handleInitializeProfile} variant="outline" className="w-full">
                Forcer le chargement
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
  const daysRemaining = calculateDaysRemaining(client.date_ajout || client.created_at);
  const progressPercentage = Math.min((daysElapsed / 90) * 100, 100);
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Mon dossier</h1>
              <p className="text-muted-foreground">Toutes vos informations personnelles</p>
            </div>
            <Button onClick={handleEditProfileClick}>
              <Edit className="w-4 h-4 mr-2" />
              Modifier mes informations
            </Button>
          </div>

          {/* Barre de progression du mandat */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Progression du mandat</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.floor(daysElapsed)} jours écoulés sur 90
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatTimeRemaining(daysRemaining)}</p>
                  <p className="text-sm text-muted-foreground">temps restant</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={progressPercentage} 
                className="h-3"
                indicatorClassName={
                  daysElapsed < 60 ? 'bg-green-500' :
                  daysElapsed < 90 ? 'bg-orange-500' :
                  'bg-red-500'
                }
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Début: {new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</span>
                <span>Fin: {new Date(new Date(client.date_ajout || client.created_at).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-CH')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Situation financière */}
          <div>
            <h2 className="text-xl font-semibold mb-4">💰 Situation financière</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm">Revenu mensuel</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm">Budget maximum</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(client.budget_max || 0).toLocaleString('fr-CH')} CHF</p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-sm">Budget recommandé</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {budgetRecommande.toLocaleString('fr-CH')} CHF
                  </p>
                  <Badge variant="secondary" className="mt-1">Règle du tiers</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Informations personnelles */}
          <div>
            <h2 className="text-xl font-semibold mb-4">👤 Informations personnelles</h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{profile.telephone || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Situation familiale</p>
                    <p className="font-medium">{client.situation_familiale || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nationalité / Permis</p>
                    <p className="font-medium">{client.nationalite || 'Non renseigné'} • {client.type_permis || 'Non renseigné'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Situation professionnelle */}
          <div>
            <h2 className="text-xl font-semibold mb-4">💼 Situation professionnelle</h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Profession</p>
                    <p className="font-medium">{client.profession || 'Non renseigné'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Secteur d'activité</p>
                  <p className="font-medium">{client.secteur_activite || 'Non renseigné'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Revenu mensuel net</p>
                  <p className="font-medium">{(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Critères de recherche */}
          <div>
            <h2 className="text-xl font-semibold mb-4">🔍 Critères de recherche</h2>
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Type de bien</p>
                    <p className="font-medium">{client.type_bien || 'Non renseigné'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Nombre de pièces souhaité</p>
                    <p className="font-medium">{client.pieces || 'Non renseigné'} pièces</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Budget maximum</p>
                    <p className="font-medium">{(client.budget_max || 0).toLocaleString('fr-CH')} CHF</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Région recherchée</p>
                    <p className="font-medium">{client.region_recherche || 'Non renseigné'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mon agent */}
          {agent && (
            <div>
              <h2 className="text-xl font-semibold mb-4">👤 Mon agent</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{agent.prenom} {agent.nom}</p>
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <a href={`mailto:${agent.email}`} className="text-primary hover:underline">
                            {agent.email}
                          </a>
                        </div>
                        {agent.telephone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <a href={`tel:${agent.telephone}`} className="text-primary hover:underline">
                              {agent.telephone}
                            </a>
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate('/client/messagerie')}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Envoyer un message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Mes documents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">📄 Mes documents</h2>
              <Button onClick={() => setUploadDialogOpen(true)} size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Ajouter un document
              </Button>
            </div>

            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-2xl">{getFileIcon(doc.type)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate" title={doc.nom}>
                              {doc.nom}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.taille)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-3">
                        Ajouté le {new Date(doc.date_upload).toLocaleDateString('fr-CH')}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Télécharger
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Aucun document uploadé
                  </p>
                  <Button onClick={() => setUploadDialogOpen(true)} size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter un document
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>
              Formats acceptés : PDF, JPG, PNG (max 5 MB)
            </DialogDescription>
          </DialogHeader>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              Glissez-déposez votre fichier ici
            </p>
            <p className="text-xs text-muted-foreground mb-4">ou</p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Sélectionner un fichier
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedDoc?.nom}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier mes informations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input
                  value={editProfileData.prenom || ''}
                  onChange={(e) => setEditProfileData({ ...editProfileData, prenom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={editProfileData.nom || ''}
                  onChange={(e) => setEditProfileData({ ...editProfileData, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={editProfileData.telephone || ''}
                onChange={(e) => setEditProfileData({ ...editProfileData, telephone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditProfileSave}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
