import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Mail, Phone, MapPin, DollarSign, Calendar, 
  FileText, User, Send, Home, Building2, Briefcase, AlertCircle, Edit, Download, Eye, Upload, MailPlus,
  FileCheck, CheckCircle, XCircle, Clock, Pencil, Trash2, FilePlus, Users, MessageSquare
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SendDossierDialog } from '@/components/SendDossierDialog';
import { MergeDocumentsDialog } from '@/components/MergeDocumentsDialog';
import { ClientCandidatesManager } from '@/components/ClientCandidatesManager';
import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { PurchaseSolvabilityAlert } from '@/components/PurchaseSolvabilityAlert';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';
import { useClientCandidates } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck } from '@/hooks/useSolvabilityCheck';
import { usePurchaseSolvabilityCheck } from '@/hooks/usePurchaseSolvabilityCheck';
import { StickyNote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculateDaysElapsed } from '@/utils/calculations';
import { Progress } from '@/components/ui/progress';
import { ClientTypeBadge } from '@/components/ClientTypeBadge';
import { ClientNotesManager } from '@/components/ClientNotesManager';
import { SwissRomandeMap } from '@/components/SwissRomandeMap';
import { RegionAutocomplete } from '@/components/RegionAutocomplete';

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
  type_recherche?: string;
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [offres, setOffres] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  
  // Hook pour les candidats supplémentaires
  const { candidates, refresh: refreshCandidates } = useClientCandidates(id);
  const solvabilityResult = useSolvabilityCheck(client, candidates);
  const purchaseSolvabilityResult = usePurchaseSolvabilityCheck(client, candidates);
  const isAcheteur = client?.type_recherche === 'Acheter';
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('autre');
  const [isUploading, setIsUploading] = useState(false);
  const [sendDossierDialogOpen, setSendDossierDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<any>(null);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [assignedAgents, setAssignedAgents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

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
      
      // Get all assigned agents via client_agents
      const { data: clientAgentsData, error: clientAgentsError } = await supabase
        .from('client_agents')
        .select(`
          agent_id,
          is_primary,
          commission_split,
          agents!inner (
            user_id,
            profiles:user_id (
              prenom,
              nom,
              email,
              telephone
            )
          )
        `)
        .eq('client_id', id)
        .order('is_primary', { ascending: false });

      if (clientAgentsError) throw clientAgentsError;
      
      const agentsWithProfiles = clientAgentsData?.map(ca => ({
        agent_id: ca.agent_id,
        is_primary: ca.is_primary,
        commission_split: ca.commission_split,
        profile: ca.agents?.profiles
      })) || [];
      
      setAssignedAgents(agentsWithProfiles);
      
      // Set primary agent ID
      const primaryAgent = agentsWithProfiles.find(a => a.is_primary);
      if (primaryAgent) {
        setAgentId(primaryAgent.agent_id);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientData.user_id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: offresData, error: offresError } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', id)
        .order('date_envoi', { ascending: false });

      if (offresError) throw offresError;
      setOffres(offresData || []);

      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', id)
        .order('date_upload', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

      // Load candidatures
      const { data: candidaturesData, error: candidaturesError } = await supabase
        .from('candidatures')
        .select('*, offres(adresse, prix, pieces)')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (candidaturesError) throw candidaturesError;
      setCandidatures(candidaturesData || []);
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

  const handleStatutChange = async (offreId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut })
        .eq('id', offreId);

      if (error) throw error;

      setOffres(offres.map(o => 
        o.id === offreId ? { ...o, statut: newStatut } : o
      ));

      toast({
        title: 'Statut mis à jour',
        description: 'Le statut de l\'offre a été modifié',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = () => {
    setEditFormData(client);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(editFormData)
        .eq('id', id);

      if (error) throw error;

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

  const handleUploadDocument = async () => {
    if (!selectedFile || !client) return;
    
    // Limite de 1GB
    const maxSize = 1024 * 1024 * 1024;
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
      // Utiliser user_id du client (pas client.id) pour correspondre aux politiques RLS du storage
      const fileName = `${client.user_id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: client.user_id,
          client_id: client.id,
          nom: selectedFile.name,
          type: selectedFile.type,
          type_document: documentType,
          taille: selectedFile.size,
          url: fileName,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Document uploadé',
        description: 'Le document a été ajouté avec succès',
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('autre');
      loadClientData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
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

      // Update local state
      setDocuments(documents.map(d => 
        d.id === documentToRename.id ? { ...d, nom: newDocumentName.trim() } : d
      ));

      toast({
        title: 'Document renommé',
        description: 'Le nom du document a été mis à jour',
      });

      setRenameDialogOpen(false);
      setDocumentToRename(null);
      setNewDocumentName('');
    } catch (error) {
      console.error('Error renaming document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de renommer le document',
        variant: 'destructive',
      });
    }
  };

  const openRenameDialog = (doc: any) => {
    setDocumentToRename(doc);
    setNewDocumentName(doc.nom);
    setRenameDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    try {
      // Supprimer du storage si ce n'est pas une data URL
      if (!documentToDelete.url.startsWith('data:')) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([documentToDelete.url]);

        if (storageError) {
          console.warn('Storage delete warning:', storageError);
        }
      }

      // Supprimer de la base de données
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentToDelete.id);

      if (dbError) throw dbError;

      // Mettre à jour l'état local
      setDocuments(documents.filter(d => d.id !== documentToDelete.id));
      // Forcer le rafraîchissement de CandidateDocumentsSection
      setDocumentsRefreshKey(prev => prev + 1);

      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès',
      });

      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!client || !agentId) return;
    
    try {
      // Vérifier si une conversation existe déjà
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', client.id)
        .eq('agent_id', agentId)
        .eq('conversation_type', 'client-agent')
        .maybeSingle();
      
      if (existingConv) {
        navigate({
          pathname: '/agent/messagerie',
          search: `conversationId=${existingConv.id}`
        });
        return;
      }
      
      // Créer une nouvelle conversation
      const clientName = `${profile?.prenom} ${profile?.nom}`.trim();
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          client_id: client.id,
          client_name: clientName,
          subject: `Conversation avec ${clientName}`,
          last_message_at: new Date().toISOString(),
          conversation_type: 'client-agent',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      navigate({
        pathname: '/agent/messagerie',
        search: `conversationId=${data.id}`
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

  const handlePreview = async (document: any) => {
    setSelectedDocument(document);
    
    try {
      if (document.url.startsWith('data:')) {
        if (document.type === 'application/pdf') {
          try {
            const base64Data = document.url.split(',')[1];
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            setPreviewUrl(blobUrl);
            setPreviewDialogOpen(true);
          } catch (error) {
            console.error('Error converting base64 to Blob:', error);
            toast({
              title: 'Erreur',
              description: 'Erreur lors de la conversion du document',
              variant: 'destructive'
            });
            return;
          }
        } else {
          setPreviewUrl(document.url);
          setPreviewDialogOpen(true);
        }
        return;
      }

      let filePath = document.url;
      if (filePath.includes('/storage/v1/object/')) {
        const parts = filePath.split('/client-documents/');
        filePath = parts[1] || filePath;
      }

      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error('Error creating preview URL:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de prévisualiser le document',
        variant: 'destructive'
      });
    }
  };

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      'envoyee': 'Envoyée',
      'vue': 'Vue',
      'interesse': 'Intéressé',
      'visite_planifiee': 'Visite planifiée',
      'visite_effectuee': 'Visite effectuée',
      'candidature_deposee': 'Candidature déposée',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée',
    };
    return labels[statut] || statut;
  };

  const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
    if (statut === 'acceptee') return 'default';
    if (statut === 'refusee') return 'destructive';
    if (statut === 'envoyee') return 'secondary';
    return 'outline';
  };

  const calculateAnciennete = (dateEngagement?: string) => {
    if (!dateEngagement) return null;
    const now = new Date();
    const engagement = new Date(dateEngagement);
    const months = (now.getFullYear() - engagement.getFullYear()) * 12 + (now.getMonth() - engagement.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return years > 0 ? `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois` : `${remainingMonths} mois`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Client non trouvé</h2>
          <Button onClick={() => navigate('/agent/mes-clients')}>
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

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {profile.prenom} {profile.nom}
              </h1>
              <ClientTypeBadge typeRecherche={client.type_recherche} />
              <Badge variant="outline">{client.nationalite || 'N/A'}</Badge>
              <Badge variant="secondary">Permis {client.type_permis || 'N/A'}</Badge>
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
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSendDossierDialogOpen(true)}>
              <MailPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Envoyer dossier</span>
              <span className="sm:hidden">Dossier</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleSendMessage}>
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Message</span>
              <span className="sm:hidden">Msg</span>
            </Button>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" onClick={handleEditClick}>
                  <Edit className="w-4 h-4 sm:mr-2" />
                  <span>Modifier</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier les informations du client</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Informations personnelles */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Informations personnelles</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nationalité</Label>
                        <Input
                          value={editFormData.nationalite || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nationalite: e.target.value })}
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
                            <SelectItem value="C">Permis C</SelectItem>
                            <SelectItem value="B">Permis B</SelectItem>
                            <SelectItem value="L">Permis L</SelectItem>
                            <SelectItem value="G">Permis G</SelectItem>
                            <SelectItem value="F">Permis F</SelectItem>
                            <SelectItem value="N">Permis N</SelectItem>
                            <SelectItem value="S">Permis S</SelectItem>
                            <SelectItem value="Suisse">Suisse</SelectItem>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>État civil</Label>
                        <Select
                          value={editFormData.etat_civil || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, etat_civil: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="celibataire">Célibataire</SelectItem>
                            <SelectItem value="marie">Marié(e)</SelectItem>
                            <SelectItem value="divorce">Divorcé(e)</SelectItem>
                            <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                            <SelectItem value="concubinage">Concubinage</SelectItem>
                            <SelectItem value="pacs">PACS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Situation familiale</Label>
                        <Input
                          value={editFormData.situation_familiale || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, situation_familiale: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Adresse</Label>
                      <Input
                        value={editFormData.adresse || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Situation professionnelle */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Situation professionnelle</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Profession</Label>
                        <Input
                          value={editFormData.profession || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, profession: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employeur</Label>
                        <Input
                          value={editFormData.employeur || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, employeur: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Secteur d'activité</Label>
                        <Input
                          value={editFormData.secteur_activite || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, secteur_activite: e.target.value })}
                        />
                      </div>
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
                            <SelectItem value="Temporaire">Temporaire</SelectItem>
                            <SelectItem value="Retraité">Retraité</SelectItem>
                            <SelectItem value="Étudiant">Étudiant</SelectItem>
                            <SelectItem value="Chômage">Chômage</SelectItem>
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
                    </div>
                  </div>

                  {/* Situation financière */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Situation financière</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Revenus mensuels nets (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.revenus_mensuels || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, revenus_mensuels: parseFloat(e.target.value) || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Source de revenus</Label>
                        <Input
                          value={editFormData.source_revenus || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, source_revenus: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Charges mensuelles (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.charges_mensuelles || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, charges_mensuelles: parseFloat(e.target.value) || null })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Apport personnel (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.apport_personnel || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, apport_personnel: parseFloat(e.target.value) || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Situation financière</Label>
                        <Input
                          value={editFormData.situation_financiere || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, situation_financiere: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Garanties</Label>
                        <Input
                          value={editFormData.garanties || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, garanties: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autres_credits"
                          checked={editFormData.autres_credits || false}
                          onChange={(e) => setEditFormData({ ...editFormData, autres_credits: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="autres_credits">Autres crédits en cours</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="poursuites"
                          checked={editFormData.poursuites || false}
                          onChange={(e) => setEditFormData({ ...editFormData, poursuites: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="poursuites">Poursuites</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="curatelle"
                          checked={editFormData.curatelle || false}
                          onChange={(e) => setEditFormData({ ...editFormData, curatelle: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="curatelle">Curatelle</Label>
                      </div>
                    </div>
                  </div>

                  {/* Logement actuel */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Logement actuel</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Gérance actuelle</Label>
                        <Input
                          value={editFormData.gerance_actuelle || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, gerance_actuelle: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact gérance</Label>
                        <Input
                          value={editFormData.contact_gerance || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, contact_gerance: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Loyer actuel (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.loyer_actuel || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, loyer_actuel: parseFloat(e.target.value) || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pièces actuel</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editFormData.pieces_actuel || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, pieces_actuel: parseFloat(e.target.value) || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Depuis le</Label>
                        <Input
                          type="date"
                          value={editFormData.depuis_le || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, depuis_le: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Motif du changement</Label>
                      <Textarea
                        value={editFormData.motif_changement || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, motif_changement: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Critères de recherche */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Critères de recherche</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Budget maximum (CHF)</Label>
                        <Input
                          type="number"
                          value={editFormData.budget_max || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, budget_max: parseFloat(e.target.value) || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pièces souhaitées</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editFormData.pieces || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, pieces: parseFloat(e.target.value) || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nombre d'occupants</Label>
                        <Input
                          type="number"
                          value={editFormData.nombre_occupants || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nombre_occupants: parseInt(e.target.value) || null })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <Label>Type de bien</Label>
                        <Input
                          value={editFormData.type_bien || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, type_bien: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="animaux"
                          checked={editFormData.animaux || false}
                          onChange={(e) => setEditFormData({ ...editFormData, animaux: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="animaux">Animaux</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="instrument_musique"
                          checked={editFormData.instrument_musique || false}
                          onChange={(e) => setEditFormData({ ...editFormData, instrument_musique: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="instrument_musique">Instrument de musique</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="vehicules"
                          checked={editFormData.vehicules || false}
                          onChange={(e) => setEditFormData({ ...editFormData, vehicules: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="vehicules">Véhicules</Label>
                      </div>
                    </div>
                    {editFormData.vehicules && (
                      <div className="space-y-2">
                        <Label>Numéro de plaques</Label>
                        <Input
                          value={editFormData.numero_plaques || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, numero_plaques: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Souhaits particuliers</Label>
                      <Textarea
                        value={editFormData.souhaits_particuliers || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, souhaits_particuliers: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Gestion du dossier */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Gestion du dossier</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>État d'avancement</Label>
                        <Select
                          value={editFormData.etat_avancement || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, etat_avancement: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nouveau">Nouveau</SelectItem>
                            <SelectItem value="en_recherche">En recherche</SelectItem>
                            <SelectItem value="visites_en_cours">Visites en cours</SelectItem>
                            <SelectItem value="dossier_depose">Dossier déposé</SelectItem>
                            <SelectItem value="en_attente_reponse">En attente de réponse</SelectItem>
                            <SelectItem value="accepte">Accepté</SelectItem>
                            <SelectItem value="termine">Terminé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priorité</Label>
                        <Select
                          value={editFormData.priorite || 'moyenne'}
                          onValueChange={(value) => setEditFormData({ ...editFormData, priorite: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="haute">Haute</SelectItem>
                            <SelectItem value="moyenne">Moyenne</SelectItem>
                            <SelectItem value="basse">Basse</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes de l'agent</Label>
                      <Textarea
                        value={editFormData.note_agent || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, note_agent: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleEditSave}>
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="w-full sm:w-auto col-span-2 sm:col-span-1" onClick={() => navigate('/agent/mes-clients')}>
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span>Retour</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Situation financière */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Situation financière
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Revenus totaux</p>
                    <p className="text-2xl font-bold">
                      CHF {solvabilityResult.totalRevenus.toLocaleString()}
                    </p>
                    {solvabilityResult.candidatesRevenus > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Client: CHF {solvabilityResult.clientRevenus.toLocaleString()} + Candidats: CHF {solvabilityResult.candidatesRevenus.toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      {isAcheteur ? 'Prix recherché' : 'Budget demandé'}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      CHF {client.budget_max?.toLocaleString() || '0'}
                      {!isAcheteur && <span className="text-base font-normal">/mois</span>}
                    </p>
                  </CardContent>
                </Card>
                {isAcheteur ? (
                  <Card className={`${(client.apport_personnel || 0) >= (client.budget_max || 0) * 0.26 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-orange-50 dark:bg-orange-950/20'}`}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-1">Apport disponible</p>
                      <p className={`text-2xl font-bold ${(client.apport_personnel || 0) >= (client.budget_max || 0) * 0.26 ? 'text-green-600' : 'text-orange-600'}`}>
                        CHF {client.apport_personnel?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        (Requis: {Math.round((client.budget_max || 0) * 0.26).toLocaleString()} CHF - 26%)
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className={`${solvabilityResult.budgetPossible >= (client.budget_max || 0) ? 'bg-green-50 dark:bg-green-950/20' : 'bg-orange-50 dark:bg-orange-950/20'}`}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-1">Budget possible</p>
                      <p className={`text-2xl font-bold ${solvabilityResult.budgetPossible >= (client.budget_max || 0) ? 'text-green-600' : 'text-orange-600'}`}>
                        CHF {solvabilityResult.budgetPossible.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        (Revenus ÷ 3)
                      </p>
                    </CardContent>
                  </Card>
                )}
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

          {/* Recherche immobilière */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Recherche immobilière
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Carte de localisation */}
          <SwissRomandeMap client={client} />

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Alerte de solvabilité */}
          {isAcheteur ? (
            <PurchaseSolvabilityAlert result={purchaseSolvabilityResult} className="col-span-full" />
          ) : (
            <SolvabilityAlert result={solvabilityResult} className="col-span-full" />
          )}

          {/* Notes & Rappels */}
          {agentId && (
            <div className="col-span-full">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5" />
                    Notes & Rappels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ClientNotesManager clientId={client.id} agentId={agentId} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Candidats supplémentaires */}
          <div className="col-span-full">
            <ClientCandidatesManager
              clientId={client.id}
              clientRevenus={client.revenus_mensuels || 0}
              budgetDemande={client.budget_max || 0}
              onCandidatesChange={refreshCandidates}
            />
          </div>

          {/* Documents groupés par personne */}
          <div className="col-span-full">
            <CandidateDocumentsSection
              clientId={client.id}
              clientUserId={client.user_id}
              clientName={`${profile.prenom} ${profile.nom}`}
              candidates={candidates}
              onDocumentsChange={loadClientData}
              refreshKey={documentsRefreshKey}
              agentUserId={user?.id}
              agentId={agentId || undefined}
            />
          </div>

      {/* Documents section (existante - pour référence) */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents du client ({documents.length})
            </CardTitle>
            <div className="flex gap-2">
              {documents.length >= 2 && (
                <Button variant="outline" onClick={() => setMergeDialogOpen(true)}>
                  <FilePlus className="w-4 h-4 mr-2" />
                  Créer dossier complet
                </Button>
              )}
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter un document
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Fichier</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-type">Type de document</Label>
                    <select
                      id="doc-type"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="fiche_salaire">💰 Fiche de salaire</option>
                      <option value="extrait_poursuites">📋 Extrait des poursuites</option>
                      <option value="piece_identite">🪪 Pièce d'identité</option>
                      <option value="attestation_domicile">🏠 Attestation de domicile</option>
                      <option value="rc_menage">🛡️ RC Ménage</option>
                      <option value="contrat_travail">📝 Contrat de travail</option>
                      <option value="attestation_employeur">👔 Attestation employeur</option>
                      <option value="copie_bail">📋 Copie du bail</option>
                      <option value="attestation_garantie_loyer">🔐 Attestation garantie de loyer</option>
                      <option value="autre">📄 Autre</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadDialogOpen(false);
                        setSelectedFile(null);
                      }}
                      disabled={isUploading}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleUploadDocument}
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? 'Upload en cours...' : 'Uploader'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc: any) => (
                <Card key={doc.id} className="border">
                  <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {doc.nom}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => openRenameDialog(doc)}
                          title="Renommer"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 flex-shrink-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDocumentToDelete(doc);
                            setDeleteDialogOpen(true);
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Badge variant="outline" className="text-xs">
                        {doc.type_document === 'fiche_salaire' && '💰 Fiche salaire'}
                        {doc.type_document === 'extrait_poursuites' && '📋 Extrait poursuites'}
                        {doc.type_document === 'piece_identite' && '🪪 Pièce ID'}
                        {doc.type_document === 'attestation_domicile' && '🏠 Attestation domicile'}
                        {doc.type_document === 'rc_menage' && '🛡️ RC Ménage'}
                        {doc.type_document === 'contrat_travail' && '📝 Contrat travail'}
                        {doc.type_document === 'attestation_employeur' && '👔 Attestation employeur'}
                        {doc.type_document === 'copie_bail' && '📋 Copie bail'}
                        {doc.type_document === 'attestation_garantie_loyer' && '🔐 Garantie loyer'}
                        {doc.type_document === 'dossier_complet' && '📎 Dossier complet'}
                        {doc.type_document === 'autre' && '📄 Autre'}
                        {!doc.type_document && '📄 Autre'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Ajouté le {new Date(doc.date_upload).toLocaleDateString('fr-CH')}
                      </p>
                      {doc.offre_id && (
                        <Badge variant="secondary" className="text-xs">
                          📝 Lié à une candidature
                        </Badge>
                      )}
                      <div className="flex gap-2">
                        {(doc.type.includes('image') || doc.type.includes('pdf')) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Aperçu
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={async () => {
                          try {
                            if (!doc.url.startsWith('data:')) {
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
                            } else {
                              const link = document.createElement('a');
                              link.href = doc.url;
                              link.download = doc.nom;
                              link.click();
                            }
                          } catch (error) {
                            console.error('Error downloading:', error);
                            toast({
                              title: 'Erreur',
                              description: 'Impossible de télécharger',
                              variant: 'destructive'
                            });
                          }
                        }}
                      >
                          <Download className="w-3 h-3 mr-1" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun document uploadé</p>
            </div>
          )}

          {/* Rename Document Dialog */}
          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Renommer le document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nouveau nom</Label>
                  <Input
                    id="new-name"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                    placeholder="Nom du document"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRenameDialogOpen(false);
                      setDocumentToRename(null);
                      setNewDocumentName('');
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleRenameDocument}
                    disabled={!newDocumentName.trim()}
                  >
                    Renommer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Document Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le document</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer "{documentToDelete?.nom}" ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>

        {/* Offres envoyées */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="w-5 h-5" />
              Offres envoyées ({offres.length})
            </h2>
            <Button onClick={() => navigate(`/agent/envoyer-offre?clientId=${client.id}`)}>
              <Send className="w-4 h-4 mr-2" />
              Envoyer une offre
            </Button>
          </div>

          {offres.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offres.map((offre) => (
                <Card key={offre.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{offre.adresse}</CardTitle>
                      <Badge variant={getStatutBadgeVariant(offre.statut)}>
                        {getStatutLabel(offre.statut)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prix</span>
                        <span className="font-medium">{offre.prix.toLocaleString('fr-CH')} CHF</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Surface</span>
                        <span className="font-medium">{offre.surface || 'N/A'} m²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pièces</span>
                        <span className="font-medium">{offre.pieces || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date d'envoi</span>
                        <span className="font-medium">
                          {new Date(offre.date_envoi).toLocaleDateString('fr-CH')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune offre envoyée pour le moment
              </CardContent>
            </Card>
          )}
        </div>

        {/* Candidatures déposées */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Candidatures déposées ({candidatures.length})
            </h2>
          </div>

          {candidatures.length > 0 ? (
            <div className="space-y-3">
              {candidatures.map((candidature) => {
                const getCandidatureStatutLabel = (statut: string) => {
                  const labels: Record<string, string> = {
                    'en_attente': 'En attente',
                    'acceptee': 'Acceptée',
                    'refusee': 'Refusée',
                  };
                  return labels[statut] || statut;
                };

                const getCandidatureStatutVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
                  if (statut === 'acceptee') return 'default';
                  if (statut === 'refusee') return 'destructive';
                  return 'secondary';
                };

                const getCandidatureStatutIcon = (statut: string) => {
                  if (statut === 'acceptee') return <CheckCircle className="h-4 w-4" />;
                  if (statut === 'refusee') return <XCircle className="h-4 w-4" />;
                  return <Clock className="h-4 w-4" />;
                };

                const handleCandidatureStatutChange = async (candidatureId: string, newStatut: string) => {
                  try {
                    // 1. Update candidatures table
                    const { error: candError } = await supabase
                      .from('candidatures')
                      .update({ statut: newStatut })
                      .eq('id', candidatureId);

                    if (candError) throw candError;

                    // 2. Also update offres table to sync status
                    if (candidature.offre_id) {
                      const offreStatut = newStatut === 'acceptee' ? 'acceptee' : newStatut === 'refusee' ? 'refusee' : 'candidature_deposee';
                      await supabase
                        .from('offres')
                        .update({ statut: offreStatut })
                        .eq('id', candidature.offre_id);
                      
                      // Also update local offres state
                      setOffres(prev => 
                        prev.map(o => o.id === candidature.offre_id ? { ...o, statut: offreStatut } : o)
                      );
                    }

                    setCandidatures(prev => 
                      prev.map(c => c.id === candidatureId ? { ...c, statut: newStatut } : c)
                    );

                    toast({
                      title: 'Statut mis à jour',
                      description: `Candidature marquée comme ${getCandidatureStatutLabel(newStatut).toLowerCase()}`,
                    });
                  } catch (error) {
                    console.error('Error updating status:', error);
                    toast({
                      title: 'Erreur',
                      description: 'Impossible de mettre à jour le statut',
                      variant: 'destructive',
                    });
                  }
                };

                return (
                  <Card key={candidature.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">
                              {candidature.offres?.adresse || 'Offre inconnue'}
                            </span>
                            <Badge variant={getCandidatureStatutVariant(candidature.statut)} className="flex items-center gap-1">
                              {getCandidatureStatutIcon(candidature.statut)}
                              {getCandidatureStatutLabel(candidature.statut)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {candidature.offres && (
                              <span>{candidature.offres.prix?.toLocaleString()} CHF • {candidature.offres.pieces || 'N/A'} pièces</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(candidature.date_depot || candidature.created_at).toLocaleDateString('fr-CH')}
                            </span>
                            <Badge variant={candidature.dossier_complet ? "outline" : "secondary"} className="text-xs">
                              {candidature.dossier_complet ? "Dossier complet" : "Dossier incomplet"}
                            </Badge>
                          </div>
                        </div>
                        {candidature.statut === 'en_attente' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleCandidatureStatutChange(candidature.id, 'acceptee')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleCandidatureStatutChange(candidature.id, 'refusee')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Refuser
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune candidature déposée pour ce client</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog d'aperçu */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => {
        setPreviewDialogOpen(open);
        if (!open && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDocument?.nom}</span>
              {selectedDocument?.type.includes('pdf') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  Ouvrir dans un nouvel onglet
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {selectedDocument?.type.includes('image') ? (
              <img
                src={previewUrl}
                alt={selectedDocument?.nom}
                className="w-full h-auto"
              />
            ) : selectedDocument?.type.includes('pdf') ? (
              <embed
                src={previewUrl}
                type="application/pdf"
                className="w-full h-[70vh]"
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aperçu non disponible pour ce type de fichier
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Dossier Dialog */}
      <SendDossierDialog
        open={sendDossierDialogOpen}
        onOpenChange={setSendDossierDialogOpen}
        clientId={client.id}
        clientName={`${profile.prenom} ${profile.nom}`}
        clientEmail={profile.email}
        offres={offres}
        onCandidatureCreated={loadClientData}
      />

      {/* Merge Documents Dialog */}
      <MergeDocumentsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        documents={documents}
        clientId={client.id}
        clientUserId={client.user_id}
        clientName={`${profile.prenom} ${profile.nom}`}
        candidates={candidates}
        onSuccess={loadClientData}
      />
    </main>
  );
}
