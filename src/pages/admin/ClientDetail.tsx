import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, DollarSign, Calendar, FileText, User, Home, Building2, Briefcase, AlertCircle, Edit, Trash2, MailPlus, Upload, Download, Eye, File, Image as ImageIcon, Pencil, FilePlus, Users, MessageSquare } from 'lucide-react';
import { ClientActivityStats } from '@/components/admin/ClientActivityStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateDaysElapsed } from '@/utils/calculations';
import { SendEmailDialog } from '@/components/SendEmailDialog';
import { MergeDocumentsDialog } from '@/components/MergeDocumentsDialog';
import { ClientCandidatesManager } from '@/components/ClientCandidatesManager';
import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';
import { useClientCandidates } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck, hasStableStatus } from '@/hooks/useSolvabilityCheck';
import { RegionAutocomplete } from '@/components/RegionAutocomplete';
import { ApporteurInfoCard } from '@/components/ApporteurInfoCard';

interface Client {
  id: string;
  user_id: string;
  agent_id?: string;
  type_contrat?: string;
  pieces?: number;
  budget_max?: number;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  autres_credits?: boolean;
  apport_personnel?: number;
  commission_split?: number;
  secteur_activite?: string;
  etat_avancement?: string;
  priorite?: string;
  note_agent?: string;
  statut?: string;
  nationalite?: string;
  type_permis?: string;
  residence?: string;
  garanties?: string;
  region_recherche?: string;
  situation_familiale?: string;
  situation_financiere?: string;
  profession?: string;
  type_bien?: string;
  source_revenus?: string;
  anciennete_mois?: number;
  created_at?: string;
  date_ajout?: string;
  date_naissance?: string;
  adresse?: string;
  etat_civil?: string;
  gerance_actuelle?: string;
  contact_gerance?: string;
  loyer_actuel?: number;
  depuis_le?: string;
  pieces_actuel?: number;
  motif_changement?: string;
  employeur?: string;
  date_engagement?: string;
  charges_extraordinaires?: boolean;
  montant_charges_extra?: number;
  poursuites?: boolean;
  curatelle?: boolean;
  souhaits_particuliers?: string;
  nombre_occupants?: number;
  utilisation_logement?: string;
  animaux?: boolean;
  instrument_musique?: boolean;
  vehicules?: boolean;
  numero_plaques?: string;
  decouverte_agence?: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
}

interface Agent {
  id: string;
  profile: Profile;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deleting, setDeleting] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  
  // Hook pour les candidats supplémentaires et solvabilité
  const { candidates, refresh: refreshCandidates } = useClientCandidates(id);
  const solvabilityResult = useSolvabilityCheck(client, candidates);
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  
  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('autre');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<any>(null);
  const [newDocumentName, setNewDocumentName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  useEffect(() => {
    loadClientData();
  }, [id]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientData.user_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (clientData.agent_id) {
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('id, user_id, profiles!inner(*)')
          .eq('id', clientData.agent_id)
          .single();

        if (agentError) {
          console.error('Error loading agent:', agentError);
        } else {
          setAgent({
            id: agentData.id,
            profile: agentData.profiles as unknown as Profile,
          });
        }
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load documents
  const loadDocuments = async () => {
    if (!client) return;
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', client.id)
        .order('date_upload', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  useEffect(() => {
    if (client) {
      loadDocuments();
    }
  }, [client]);

  const handleUploadDocument = async () => {
    if (!selectedFile || !client) return;

    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (selectedFile.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 1 GB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${client.user_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          nom: selectedFile.name,
          type: selectedFile.type,
          taille: selectedFile.size,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          client_id: client.id,
          type_document: selectedDocType,
          url: fileName,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Document ajouté',
        description: 'Le document a été uploadé avec succès',
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedDocType('autre');
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'uploader le document",
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(doc.url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nom;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocument = async (docId: string, docUrl: string) => {
    try {
      await supabase.storage.from('client-documents').remove([docUrl]);
      
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès',
      });

      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const handlePreviewDocument = async (doc: any) => {
    try {
      let blobUrl: string;
      
      // Si l'URL est une data URL (base64)
      if (doc.url?.startsWith('data:')) {
        const base64Data = doc.url.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: doc.type });
        blobUrl = URL.createObjectURL(blob);
      } else {
        // Télécharger le fichier en blob depuis le storage
        const { data, error } = await supabase.storage
          .from('client-documents')
          .download(doc.url);

        if (error) throw error;
        blobUrl = URL.createObjectURL(data);
      }

      setPreviewDocument(doc);
      setPreviewUrl(blobUrl);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Error creating preview URL:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de prévisualiser le document',
        variant: 'destructive',
      });
    }
  };

  const handleRenameDocument = async () => {
    if (!documentToRename || !newDocumentName.trim()) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ nom: newDocumentName.trim() })
        .eq('id', documentToRename.id);

      if (error) throw error;

      toast({
        title: 'Document renommé',
        description: 'Le document a été renommé avec succès',
      });

      setRenameDialogOpen(false);
      setDocumentToRename(null);
      setNewDocumentName('');
      loadDocuments();
    } catch (error) {
      console.error('Error renaming document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de renommer le document',
        variant: 'destructive',
      });
    }
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'fiche_salaire': '💰 Fiche salaire',
      'extrait_poursuites': '📋 Extrait poursuites',
      'piece_identite': '🪪 Pièce ID',
      'attestation_domicile': '🏠 Attestation domicile',
      'rc_menage': '🛡️ RC Ménage',
      'contrat_travail': '📝 Contrat travail',
      'attestation_employeur': '👔 Attestation employeur',
      'copie_bail': '📋 Copie bail',
      'attestation_garantie_loyer': '🔐 Garantie loyer',
      'dossier_complet': '📎 Dossier complet',
      'autre': '📄 Autre'
    };
    return labels[type] || '📄 Autre';
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return FileText;
    if (type?.includes('image')) return ImageIcon;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleEditClick = () => {
    setEditFormData({
      ...client,
      nom: profile?.nom,
      prenom: profile?.prenom,
      email: profile?.email,
      telephone: profile?.telephone,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const { nom, prenom, email, telephone, ...clientFields } = editFormData;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nom, prenom, email, telephone })
        .eq('id', client?.user_id);

      if (profileError) throw profileError;

      const { error: clientError } = await supabase
        .from('clients')
        .update(clientFields)
        .eq('id', id);

      if (clientError) throw clientError;

      toast({
        title: 'Succès',
        description: 'Les informations ont été mises à jour',
      });

      setEditDialogOpen(false);
      loadClientData();
    } catch (error) {
      console.error('Error updating data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les informations',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!client) return;

    try {
      setDeleting(true);

      const { error } = await supabase.functions.invoke('delete-client', {
        body: { userId: client.user_id },
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Le client a été supprimé',
      });

      navigate('/admin/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le client',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!client) return;
    
    try {
      // Trouver l'agent assigné
      const agentIdToUse = client.agent_id;
      
      if (!agentIdToUse) {
        toast({
          title: 'Erreur',
          description: "Ce client n'a pas d'agent assigné. Assignez d'abord un agent.",
          variant: 'destructive',
        });
        return;
      }
      
      // Vérifier si une conversation existe déjà
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', client.id)
        .eq('agent_id', agentIdToUse)
        .eq('conversation_type', 'client-agent')
        .maybeSingle();
      
      if (existingConv) {
        navigate(`/admin/messagerie?conversationId=${existingConv.id}`);
        return;
      }
      
      // Créer une nouvelle conversation
      const clientName = `${profile?.prenom} ${profile?.nom}`.trim();
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentIdToUse,
          client_id: client.id,
          client_name: clientName,
          subject: `Conversation avec ${clientName}`,
          last_message_at: new Date().toISOString(),
          conversation_type: 'client-agent',
        })
        .select()
        .single();
      
      if (error) throw error;
      
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
          <p className="text-muted-foreground animate-pulse">Chargement du client...</p>
        </div>
      </div>
    );
  }

  if (!client || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Client non trouvé</h2>
          <p className="text-muted-foreground">Ce client n'existe pas ou a été supprimé</p>
          <Button onClick={() => navigate('/admin/clients')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux clients
          </Button>
        </div>
      </div>
    );
  }

  const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
  const daysRemaining = 90 - daysElapsed;
  const progressPercentage = (daysElapsed / 90) * 100;
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  const calculateAnciennete = (dateEngagement?: string) => {
    if (!dateEngagement) return null;
    const now = new Date();
    const engagement = new Date(dateEngagement);
    const months = (now.getFullYear() - engagement.getFullYear()) * 12 + (now.getMonth() - engagement.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return years > 0 ? `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois` : `${remainingMonths} mois`;
  };

  // Check if client has stable status
  const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {profile.prenom} {profile.nom}
              </h1>
              <Badge variant="outline">{client.nationalite || 'N/A'}</Badge>
              <Badge 
                variant={clientHasStableStatus ? "secondary" : "destructive"}
                className={clientHasStableStatus ? "" : "animate-pulse"}
              >
                Permis {client.type_permis || 'N/A'}
                {!clientHasStableStatus && " ⚠️"}
              </Badge>
              {solvabilityResult.isSolvable ? (
                <Badge className="bg-green-600 text-white">✓ Solvable</Badge>
              ) : (
                <Badge variant="destructive">✗ Non solvable</Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-4 max-w-2xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Progression du mandat</p>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  daysElapsed < 60 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : daysElapsed < 90 
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {Math.floor(daysRemaining)}j {Math.floor((daysRemaining - Math.floor(daysRemaining)) * 24)}h
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-right mb-2">
                {Math.floor(daysElapsed)} / 90 jours
              </p>
              <Progress 
                value={progressPercentage} 
                className="h-3" 
                indicatorClassName={
                  daysElapsed < 60 ? 'bg-green-500' :
                  daysElapsed < 90 ? 'bg-orange-500' :
                  'bg-red-500'
                }
              />
            </div>
          </div>

          {/* Boutons d'action - Responsive grid sur mobile */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:flex-nowrap w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSendEmailDialogOpen(true)}>
              <MailPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Envoyer dossier</span>
              <span className="sm:hidden">Dossier</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleSendMessage}>
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Message</span>
              <span className="sm:hidden">Msg</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto" disabled={deleting}>
                  <Trash2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Supprimer</span>
                  <span className="sm:hidden">Suppr.</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et supprimera toutes les données associées (documents, candidatures, visites, etc.).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" onClick={handleEditClick}>
                  <Edit className="w-4 h-4 sm:mr-2" />
                  <span>Modifier</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier les informations du client</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Informations personnelles */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Informations personnelles
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prénom *</Label>
                        <Input
                          value={editFormData.prenom || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })}
                          placeholder="Prénom"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nom *</Label>
                        <Input
                          value={editFormData.nom || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                          placeholder="Nom"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={editFormData.email || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          placeholder="email@exemple.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input
                          value={editFormData.telephone || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                          placeholder="+41 XX XXX XX XX"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nationalité</Label>
                        <Input
                          value={editFormData.nationalite || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nationalite: e.target.value })}
                          placeholder="Suisse"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type de permis</Label>
                        <Select 
                          value={editFormData.type_permis || ''} 
                          onValueChange={(value) => setEditFormData({ ...editFormData, type_permis: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="B">Permis B</SelectItem>
                            <SelectItem value="C">Permis C</SelectItem>
                            <SelectItem value="L">Permis L</SelectItem>
                            <SelectItem value="G">Permis G</SelectItem>
                            <SelectItem value="Suisse">Suisse</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date de naissance</Label>
                        <Input
                          type="date"
                          value={editFormData.date_naissance || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, date_naissance: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Situation familiale</Label>
                        <Select 
                          value={editFormData.situation_familiale || ''} 
                          onValueChange={(value) => setEditFormData({ ...editFormData, situation_familiale: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Célibataire">Célibataire</SelectItem>
                            <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                            <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                            <SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem>
                            <SelectItem value="En couple">En couple</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nombre d'occupants</Label>
                        <Input
                          type="number"
                          value={editFormData.nombre_occupants || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nombre_occupants: parseInt(e.target.value) })}
                          placeholder="1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Situation professionnelle */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Situation professionnelle
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Profession</Label>
                        <Input
                          value={editFormData.profession || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, profession: e.target.value })}
                          placeholder="Ingénieur"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employeur</Label>
                        <Input
                          value={editFormData.employeur || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, employeur: e.target.value })}
                          placeholder="Nom de l'entreprise"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Type de contrat</Label>
                        <Select 
                          value={editFormData.type_contrat || ''} 
                          onValueChange={(value) => setEditFormData({ ...editFormData, type_contrat: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CDI">CDI</SelectItem>
                            <SelectItem value="CDD">CDD</SelectItem>
                            <SelectItem value="Indépendant">Indépendant</SelectItem>
                            <SelectItem value="Intérim">Intérim</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date d'engagement</Label>
                        <Input
                          type="date"
                          value={editFormData.date_engagement || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, date_engagement: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secteur d'activité</Label>
                        <Input
                          value={editFormData.secteur_activite || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, secteur_activite: e.target.value })}
                          placeholder="Technologie"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Situation financière */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Situation financière
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Revenus mensuels (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.revenus_mensuels || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, revenus_mensuels: parseFloat(e.target.value) })}
                          placeholder="5000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Charges mensuelles (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.charges_mensuelles || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, charges_mensuelles: parseFloat(e.target.value) })}
                          placeholder="1000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Apport personnel (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.apport_personnel || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, apport_personnel: parseFloat(e.target.value) })}
                          placeholder="10000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Source de revenus</Label>
                        <Input
                          value={editFormData.source_revenus || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, source_revenus: e.target.value })}
                          placeholder="Salaire"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Garanties</Label>
                        <Input
                          value={editFormData.garanties || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, garanties: e.target.value })}
                          placeholder="Cautionnement"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="autres_credits"
                          checked={editFormData.autres_credits || false}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, autres_credits: checked })}
                        />
                        <Label htmlFor="autres_credits">Autres crédits</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="poursuites"
                          checked={editFormData.poursuites || false}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, poursuites: checked })}
                        />
                        <Label htmlFor="poursuites">Poursuites</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="curatelle"
                          checked={editFormData.curatelle || false}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, curatelle: checked })}
                        />
                        <Label htmlFor="curatelle">Curatelle</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Critères de recherche */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      Critères de recherche
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Budget maximum (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.budget_max || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, budget_max: parseFloat(e.target.value) })}
                          placeholder="2000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pièces souhaitées</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editFormData.pieces || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, pieces: parseFloat(e.target.value) })}
                          placeholder="3.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type de bien</Label>
                        <Select 
                          value={editFormData.type_bien || ''} 
                          onValueChange={(value) => setEditFormData({ ...editFormData, type_bien: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Appartement">Appartement</SelectItem>
                            <SelectItem value="Maison">Maison</SelectItem>
                            <SelectItem value="Studio">Studio</SelectItem>
                            <SelectItem value="Loft">Loft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Région(s) de recherche</Label>
                      <RegionAutocomplete
                        value={editFormData.region_recherche || ''}
                        onChange={(value) => setEditFormData({ ...editFormData, region_recherche: value })}
                        placeholder="Tapez une région, commune..."
                        multiSelect
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Souhaits particuliers</Label>
                      <Textarea
                        value={editFormData.souhaits_particuliers || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, souhaits_particuliers: e.target.value })}
                        rows={2}
                        placeholder="Balcon, parking, ascenseur..."
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="animaux"
                          checked={editFormData.animaux || false}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, animaux: checked })}
                        />
                        <Label htmlFor="animaux">Animaux</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="vehicules"
                          checked={editFormData.vehicules || false}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, vehicules: checked })}
                        />
                        <Label htmlFor="vehicules">Véhicules</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="instrument_musique"
                          checked={editFormData.instrument_musique || false}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, instrument_musique: checked })}
                        />
                        <Label htmlFor="instrument_musique">Instrument de musique</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Notes agent */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Notes de l'agent
                    </h3>
                    <div className="space-y-2">
                      <Textarea
                        value={editFormData.note_agent || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, note_agent: e.target.value })}
                        rows={4}
                        placeholder="Notes internes..."
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleEditSave}>
                      Enregistrer les modifications
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="w-full sm:w-auto col-span-2 sm:col-span-1" onClick={() => navigate('/admin/clients')}>
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span>Retour</span>
            </Button>
          </div>
        </div>

        {/* Solvability Alert */}
        <SolvabilityAlert 
          result={solvabilityResult} 
          className="mb-6"
        />

        {/* Client Activity Stats */}
        <ClientActivityStats 
          clientId={client.id} 
          clientUserId={client.user_id}
        />

        {/* Candidates Manager */}
        <ClientCandidatesManager
          clientId={client.id}
          clientRevenus={client.revenus_mensuels}
          budgetDemande={client.budget_max}
          onCandidatesChange={refreshCandidates}
        />

        {/* Candidate Documents */}
        {candidates.length > 0 && (
          <CandidateDocumentsSection 
            clientId={client.id}
            clientUserId={client.user_id}
            candidates={candidates}
            key={documentsRefreshKey}
          />
        )}

        {/* Apporteur Info Card */}
        <ApporteurInfoCard clientId={client.id} isAdmin={true} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Situation financière */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Situation financière
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Revenus mensuels</p>
                    <p className="text-2xl font-bold">
                      CHF {client.revenus_mensuels?.toLocaleString() || '0'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Budget maximum</p>
                    <p className="text-2xl font-bold text-primary">
                      CHF {client.budget_max?.toLocaleString() || '0'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Budget recommandé</p>
                    <p className="text-2xl font-bold text-green-600">
                      CHF {budgetRecommande.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Separator />
              <div className="space-y-2">
                {client.charges_extraordinaires && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <span className="text-sm font-medium">Charges extraordinaires</span>
                    <span className="text-sm">
                      {client.montant_charges_extra ? `CHF ${client.montant_charges_extra.toLocaleString()}` : 'Oui'}
                    </span>
                  </div>
                )}
                {(client.poursuites || client.curatelle) && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div className="flex-1 text-sm font-medium text-red-600">
                      {client.poursuites && 'Poursuites en cours'}
                      {client.poursuites && client.curatelle && ' • '}
                      {client.curatelle && 'Sous curatelle'}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.telephone || 'Non renseigné'}</span>
                </div>
                {client.date_naissance && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(client.date_naissance).toLocaleDateString('fr-CH')}</span>
                  </div>
                )}
                {client.adresse && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{client.adresse}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">État civil</p>
                  <p className="font-medium">{client.etat_civil || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nationalité</p>
                  <p className="font-medium">{client.nationalite || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type de permis</p>
                  <p className="font-medium">{client.type_permis || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Situation actuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Situation actuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gérance actuelle</p>
                  <p className="font-medium">{client.gerance_actuelle || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact gérance</p>
                  <p className="font-medium">{client.contact_gerance || 'Non renseigné'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Loyer brut actuel</p>
                  <p className="font-medium text-lg">
                    {client.loyer_actuel ? `CHF ${client.loyer_actuel.toLocaleString()}` : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Depuis le</p>
                  <p className="font-medium">
                    {client.depuis_le ? new Date(client.depuis_le).toLocaleDateString('fr-CH') : 'Non renseigné'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pièces actuel</p>
                  <p className="font-medium">{client.pieces_actuel || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Motif du changement</p>
                  <p className="font-medium text-sm">{client.motif_changement || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Situation professionnelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Situation professionnelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Profession</p>
                  <p className="font-medium">{client.profession || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employeur</p>
                  <p className="font-medium">{client.employeur || 'Non renseigné'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Revenus mensuels nets</p>
                  <p className="font-medium text-lg">
                    CHF {client.revenus_mensuels?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'engagement</p>
                  <p className="font-medium">
                    {client.date_engagement ? new Date(client.date_engagement).toLocaleDateString('fr-CH') : 'Non renseigné'}
                  </p>
                </div>
              </div>
              {calculateAnciennete(client.date_engagement) && (
                <div>
                  <p className="text-sm text-muted-foreground">Ancienneté</p>
                  <p className="font-medium">{calculateAnciennete(client.date_engagement)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critères de recherche */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Critères de recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type de bien</p>
                  <p className="font-medium">{client.type_bien || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre de pièces</p>
                  <p className="font-medium">{client.pieces || 'Non renseigné'}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Région de recherche</p>
                <p className="font-medium">{client.region_recherche || 'Non renseigné'}</p>
              </div>
              {client.nombre_occupants && (
                <div>
                  <p className="text-sm text-muted-foreground">Nombre d'occupants</p>
                  <p className="font-medium">{client.nombre_occupants}</p>
                </div>
              )}
              {client.souhaits_particuliers && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Souhaits particuliers</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{client.souhaits_particuliers}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Autres informations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Autres informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.utilisation_logement && (
                <div>
                  <p className="text-sm text-muted-foreground">Utilisation du logement</p>
                  <p className="font-medium">{client.utilisation_logement}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${client.animaux ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Animaux</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${client.instrument_musique ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">Instrument de musique</span>
                </div>
              </div>
              {client.vehicules && (
                <div>
                  <p className="text-sm text-muted-foreground">Véhicules</p>
                  <p className="font-medium">{client.numero_plaques || 'Oui'}</p>
                </div>
              )}
              {client.decouverte_agence && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Comment a découvert l'agence</p>
                    <p className="font-medium">{client.decouverte_agence}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Suivi */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Suivi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agent ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Agent assigné</p>
                    <p className="font-medium">
                      {agent.profile.prenom} {agent.profile.nom}
                    </p>
                    <p className="text-sm text-muted-foreground">{agent.profile.email}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">Aucun agent assigné</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin/assignations')}
                    >
                      Assigner un agent
                    </Button>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Commission split</p>
                  <p className="font-medium">{client.commission_split || 50}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'ajout</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}
                    </span>
                  </div>
                </div>
              </div>
              {client.note_agent && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Notes de l'agent</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{client.note_agent}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents ({documents.length})
                </CardTitle>
                <div className="flex gap-2">
                  {documents.length >= 2 && (
                    <Button variant="outline" onClick={() => setMergeDialogOpen(true)}>
                      <FilePlus className="w-4 h-4 mr-2" />
                      Créer dossier complet
                    </Button>
                  )}
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter un document
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const Icon = getFileIcon(doc.type);
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Icon className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{doc.nom}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {getDocTypeLabel(doc.type_document)}
                              </Badge>
                              <span>{formatFileSize(doc.taille)}</span>
                              <span>•</span>
                              <span>{new Date(doc.date_upload).toLocaleDateString('fr-CH')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(doc.type?.includes('image') || doc.type === 'application/pdf') && (
                            <Button variant="ghost" size="sm" onClick={() => handlePreviewDocument(doc)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => {
                            setDocumentToRename(doc);
                            setNewDocumentName(doc.nom);
                            setRenameDialogOpen(true);
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id, doc.url)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun document</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiche_salaire">💰 Fiche de salaire</SelectItem>
                  <SelectItem value="extrait_poursuites">📋 Extrait des poursuites</SelectItem>
                  <SelectItem value="piece_identite">🪪 Pièce d'identité</SelectItem>
                  <SelectItem value="attestation_domicile">🏠 Attestation de domicile</SelectItem>
                  <SelectItem value="rc_menage">🛡️ RC Ménage</SelectItem>
                  <SelectItem value="contrat_travail">📝 Contrat de travail</SelectItem>
                  <SelectItem value="attestation_employeur">👔 Attestation employeur</SelectItem>
                  <SelectItem value="copie_bail">📋 Copie du bail</SelectItem>
                  <SelectItem value="attestation_garantie_loyer">🔐 Attestation garantie de loyer</SelectItem>
                  <SelectItem value="autre">📄 Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-muted-foreground">Formats acceptés: PDF, JPG, PNG (max 1GB)</p>
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Fichier sélectionné: {selectedFile.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUploadDocument} disabled={!selectedFile || isUploading}>
              {isUploading ? 'Upload en cours...' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Document Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => {
        setPreviewDialogOpen(open);
        if (!open && previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>{previewDocument?.nom || 'Aperçu du document'}</DialogTitle>
          </DialogHeader>
          <div className="h-[80vh]">
            {previewDocument?.type?.includes('pdf') ? (
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-full rounded-lg"
              >
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="mb-4">Impossible d'afficher le PDF dans le navigateur.</p>
                  <Button onClick={() => handleDownloadDocument(previewDocument)}>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le PDF
                  </Button>
                </div>
              </object>
            ) : previewDocument?.type?.includes('image') ? (
              <div className="h-full overflow-auto flex justify-center items-start">
                <img 
                  src={previewUrl} 
                  alt={previewDocument?.nom}
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aperçu non disponible pour ce type de fichier
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Document Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau nom</Label>
              <Input
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="Nom du document"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRenameDocument} disabled={!newDocumentName.trim()}>
              Renommer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={sendEmailDialogOpen}
        onOpenChange={setSendEmailDialogOpen}
        clientId={client.id}
        clientName={`${profile.prenom} ${profile.nom}`}
        clientEmail={profile.email}
      />

      {/* Merge Documents Dialog */}
      <MergeDocumentsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        documents={documents}
        clientId={client.id}
        clientUserId={client.user_id}
        clientName={`${profile.prenom} ${profile.nom}`}
        onSuccess={loadDocuments}
      />
    </div>
  );
}
