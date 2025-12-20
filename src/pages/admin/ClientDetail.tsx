import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, DollarSign, Calendar, FileText, User, Home, Building2, Briefcase, AlertCircle, Edit, Trash2, MailPlus, Upload, Download, Eye, File, Image as ImageIcon, Pencil, FilePlus, Users, MessageSquare, Sparkles, Clock, Shield, TrendingUp, CheckCircle2, XCircle, Send, RefreshCw } from 'lucide-react';
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
import { getStoragePath } from '@/lib/documentUtils';
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
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SwissRomandeMap } from '@/components/SwissRomandeMap';

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
  // Contract fields
  mandat_pdf_url?: string | null;
  mandat_signature_data?: string | null;
  mandat_date_signature?: string | null;
  demande_mandat_id?: string | null;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  actif?: boolean;
}

interface Agent {
  id: string;
  profile: Profile;
}

import { FloatingParticles } from '@/components/messaging/FloatingParticles';

import { PremiumCard } from '@/components/premium/PremiumCard';

// Premium stat mini-card
const PremiumStatCard = ({ 
  label, 
  value, 
  prefix = "", 
  animated = false,
  variant = "default",
  icon: Icon
}: { 
  label: string; 
  value: number | string; 
  prefix?: string;
  animated?: boolean;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  icon?: React.ElementType;
}) => {
  const variantStyles = {
    default: "bg-muted/50 border-border/30",
    primary: "bg-primary/10 border-primary/30",
    success: "bg-green-500/10 border-green-500/30",
    warning: "bg-orange-500/10 border-orange-500/30",
    danger: "bg-red-500/10 border-red-500/30"
  };
  
  const textStyles = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-orange-600 dark:text-orange-400",
    danger: "text-red-600 dark:text-red-400"
  };

  return (
    <div className={`group p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={`w-4 h-4 ${textStyles[variant]} opacity-70`} />}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${textStyles[variant]}`}>
        {animated && typeof value === 'number' ? (
          <>
            {prefix}<AnimatedCounter value={value} duration={1200} decimals={0} />
          </>
        ) : (
          `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}`
        )}
      </p>
    </div>
  );
};

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
  const [inviting, setInviting] = useState(false);
  const [regeneratingContract, setRegeneratingContract] = useState(false);
  
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
    if (id) {
      loadClientData();
    }
  }, [id]);

  const loadClientData = async () => {
    if (!id) {
      console.warn('loadClientData called without id');
      setLoading(false);
      return;
    }

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
      const filePath = getStoragePath(doc.url);
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(filePath);

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
        // Extraire le chemin relatif et télécharger
        const filePath = getStoragePath(doc.url);
        const { data, error } = await supabase.storage
          .from('client-documents')
          .download(filePath);

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

  const handleInvite = async () => {
    if (!profile?.email || !client?.id) return;

    try {
      setInviting(true);

      const { error } = await supabase.functions.invoke('invite-client', {
        body: { email: profile.email, clientId: client.id },
      });

      if (error) throw error;

      toast({
        title: 'Invitation envoyée',
        description: `Une invitation a été envoyée à ${profile.email}`,
      });
    } catch (error) {
      console.error('Error inviting client:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'invitation",
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
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

  // Premium loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 rounded-full animate-spin border-t-primary" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-b-primary/40" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <div className="absolute inset-2 w-16 h-16 border-4 border-transparent rounded-full animate-spin border-r-primary/30" style={{ animationDuration: '2s' }} />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse text-lg font-medium">Chargement du client...</p>
        </div>
      </div>
    );
  }

  // Premium not found state
  if (!client || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Client non trouvé
          </h2>
          <p className="text-muted-foreground max-w-md">Ce client n'existe pas ou a été supprimé</p>
          <Button 
            onClick={() => navigate('/admin/clients')} 
            className="mt-4 group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
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

  const progressColor = daysElapsed < 60 ? 'from-green-500 to-emerald-400' : daysElapsed < 90 ? 'from-orange-500 to-amber-400' : 'from-red-500 to-rose-400';

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        {/* Premium Header */}
        <div className="relative rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 p-6 overflow-hidden animate-fade-in">
          <FloatingParticles count={20} />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              {/* Client Avatar & Name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-[0_0_25px_rgba(var(--primary),0.3)]">
                    {profile.prenom[0]}{profile.nom[0]}
                  </div>
                  {solvabilityResult.isSolvable && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-card">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {profile.prenom} {profile.nom}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {!profile.actif && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 backdrop-blur-sm animate-pulse-soft">
                        <Mail className="w-3 h-3 mr-1" />
                        Non activé
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-card/50 backdrop-blur-sm border-border/50">
                      {client.nationalite || 'N/A'}
                    </Badge>
                    <Badge
                      variant={clientHasStableStatus ? "secondary" : "destructive"}
                      className={`${clientHasStableStatus ? "bg-secondary/50" : "animate-pulse"} backdrop-blur-sm`}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Permis {client.type_permis || 'N/A'}
                      {!clientHasStableStatus && " ⚠️"}
                    </Badge>
                    {solvabilityResult.isSolvable ? (
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 backdrop-blur-sm">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Solvable
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 backdrop-blur-sm">
                        <XCircle className="w-3 h-3 mr-1" />
                        Non solvable
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Premium Progress bar */}
              <div className="mt-6 max-w-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Progression du mandat</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                    daysElapsed < 60 
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                      : daysElapsed < 90 
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                      : 'bg-red-500/20 text-red-600 dark:text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
                  }`}>
                    <TrendingUp className="w-4 h-4" />
                    {Math.floor(daysRemaining)}j {Math.floor((daysRemaining - Math.floor(daysRemaining)) * 24)}h
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-right mb-2">
                  <AnimatedCounter value={Math.floor(daysElapsed)} duration={800} decimals={0} /> / 90 jours
                </p>
                <div className="relative h-4 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${progressColor} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
                  </div>
                  <div 
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${progressColor} blur-md opacity-50 rounded-full`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Premium Action Buttons */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:flex-nowrap w-full sm:w-auto">
              <Button 
                variant="outline" 
                className={`w-full sm:w-auto group backdrop-blur-sm border-border/50 transition-all duration-300 ${
                  !profile.actif 
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-600 hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse-soft" 
                    : "bg-card/50 hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(var(--primary),0.15)]"
                }`}
                onClick={handleInvite}
                disabled={inviting}
              >
                {inviting ? (
                  <div className="h-4 w-4 sm:mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                )}
                <span className="hidden sm:inline">{!profile.actif ? 'Envoyer invitation' : 'Renvoyer invitation'}</span>
                <span className="sm:hidden">Inviter</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(var(--primary),0.15)] transition-all duration-300" 
                onClick={() => setSendEmailDialogOpen(true)}
              >
                <MailPlus className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Envoyer dossier</span>
                <span className="sm:hidden">Dossier</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(var(--primary),0.15)] transition-all duration-300" 
                onClick={handleSendMessage}
              >
                <MessageSquare className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Message</span>
                <span className="sm:hidden">Msg</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full sm:w-auto group hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300" 
                    disabled={deleting}
                  >
                    <Trash2 className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Supprimer</span>
                    <span className="sm:hidden">Suppr.</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-red-500/20">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </div>
                      Confirmer la suppression
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et supprimera toutes les données associées (documents, candidatures, visites, etc.).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-card/50 backdrop-blur-sm">Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      Supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full sm:w-auto group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-300" 
                    onClick={handleEditClick}
                  >
                    <Edit className="w-4 h-4 sm:mr-2 group-hover:scale-110 transition-transform" />
                    <span>Modifier</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Edit className="w-5 h-5 text-primary" />
                      </div>
                      Modifier les informations du client
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Informations personnelles */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Informations personnelles
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Prénom *</Label>
                          <Input
                            value={editFormData.prenom || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })}
                            placeholder="Prénom"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nom *</Label>
                          <Input
                            value={editFormData.nom || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                            placeholder="Nom"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Téléphone</Label>
                          <Input
                            value={editFormData.telephone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                            placeholder="+41 XX XXX XX XX"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type de permis</Label>
                          <Select 
                            value={editFormData.type_permis || ''} 
                            onValueChange={(value) => setEditFormData({ ...editFormData, type_permis: value })}
                          >
                            <SelectTrigger className="bg-card/50 backdrop-blur-sm border-border/50">
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
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
                            <SelectTrigger className="bg-card/50 backdrop-blur-sm border-border/50">
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                    {/* Situation professionnelle */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        Situation professionnelle
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Profession</Label>
                          <Input
                            value={editFormData.profession || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, profession: e.target.value })}
                            placeholder="Ingénieur"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Employeur</Label>
                          <Input
                            value={editFormData.employeur || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, employeur: e.target.value })}
                            placeholder="Nom de l'entreprise"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
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
                            <SelectTrigger className="bg-card/50 backdrop-blur-sm border-border/50">
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Secteur d'activité</Label>
                          <Input
                            value={editFormData.secteur_activite || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, secteur_activite: e.target.value })}
                            placeholder="Technologie"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                    {/* Situation financière */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Charges mensuelles (CHF)</Label>
                          <Input
                            type="number"
                            value={editFormData.charges_mensuelles || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, charges_mensuelles: parseFloat(e.target.value) })}
                            placeholder="1000"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Apport personnel (CHF)</Label>
                          <Input
                            type="number"
                            value={editFormData.apport_personnel || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, apport_personnel: parseFloat(e.target.value) })}
                            placeholder="10000"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Garanties</Label>
                          <Input
                            value={editFormData.garanties || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, garanties: e.target.value })}
                            placeholder="Cautionnement"
                            className="bg-card/50 backdrop-blur-sm border-border/50"
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

                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                    {/* Critères de recherche */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Home className="w-5 h-5 text-primary" />
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
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
                            className="bg-card/50 backdrop-blur-sm border-border/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type de bien</Label>
                          <Select 
                            value={editFormData.type_bien || ''} 
                            onValueChange={(value) => setEditFormData({ ...editFormData, type_bien: value })}
                          >
                            <SelectTrigger className="bg-card/50 backdrop-blur-sm border-border/50">
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
                          className="bg-card/50 backdrop-blur-sm border-border/50"
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

                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                    {/* Notes agent */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Notes de l'agent
                      </h3>
                      <div className="space-y-2">
                        <Textarea
                          value={editFormData.note_agent || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, note_agent: e.target.value })}
                          rows={4}
                          placeholder="Notes internes..."
                          className="bg-card/50 backdrop-blur-sm border-border/50"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="bg-card/50 backdrop-blur-sm">
                        Annuler
                      </Button>
                      <Button onClick={handleEditSave} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto col-span-2 sm:col-span-1 group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-muted/50 transition-all duration-300" 
                onClick={() => navigate('/admin/clients')}
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
                <span>Retour</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Solvability Alert - wrapped in premium container */}
        <div 
          className="group relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1 overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] hover:border-primary/20 animate-fade-in" 
          style={{ animationDelay: '100ms' }}
        >
          {/* Glow effect based on solvability */}
          <div className={`absolute inset-0 opacity-20 transition-opacity duration-500 ${solvabilityResult.isSolvable ? 'bg-gradient-to-br from-green-500/20 to-transparent' : 'bg-gradient-to-br from-red-500/20 to-transparent'}`} />
          {/* Shine effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
          <SolvabilityAlert 
            result={solvabilityResult} 
            className="relative z-10"
          />
        </div>

        {/* Client Activity Stats - with premium wrapper */}
        <div 
          className="group relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] hover:border-primary/20 animate-fade-in" 
          style={{ animationDelay: '150ms' }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <TrendingUp className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300">Statistiques d'activité</h3>
          </div>
          <ClientActivityStats 
            clientId={client.id} 
            clientUserId={client.user_id}
          />
        </div>

        {/* Candidates Manager - with premium wrapper */}
        <div 
          className="group relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] hover:border-primary/20 animate-fade-in" 
          style={{ animationDelay: '200ms' }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <Users className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300">Co-candidats du dossier</h3>
          </div>
          <ClientCandidatesManager
            clientId={client.id}
            clientRevenus={client.revenus_mensuels}
            budgetDemande={client.budget_max}
            onCandidatesChange={refreshCandidates}
          />
        </div>

        {/* Candidate Documents - with premium wrapper */}
        {candidates.length > 0 && (
          <div 
            className="group relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] hover:border-primary/20 animate-fade-in" 
            style={{ animationDelay: '250ms' }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                <FileText className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300">Documents des co-candidats</h3>
            </div>
            <CandidateDocumentsSection 
              clientId={client.id}
              clientUserId={client.user_id}
              candidates={candidates}
              key={documentsRefreshKey}
            />
          </div>
        )}

        {/* Apporteur Info Card - with premium wrapper */}
        <div 
          className="group relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] hover:border-primary/20 animate-fade-in" 
          style={{ animationDelay: '300ms' }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
          <ApporteurInfoCard clientId={client.id} isAdmin={true} />
        </div>

        {/* Premium Information Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Situation financière */}
          <PremiumCard icon={DollarSign} title="Situation financière" delay={350}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <PremiumStatCard 
                  label="Revenus mensuels" 
                  value={client.revenus_mensuels || 0} 
                  prefix="CHF "
                  animated
                />
                <PremiumStatCard 
                  label="Budget maximum" 
                  value={client.budget_max || 0} 
                  prefix="CHF "
                  variant="primary"
                  animated
                />
                <PremiumStatCard 
                  label="Budget recommandé" 
                  value={budgetRecommande} 
                  prefix="CHF "
                  variant="success"
                  animated
                />
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="space-y-2">
                {client.charges_extraordinaires && (
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 animate-pulse" />
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Charges extraordinaires</span>
                    </div>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {client.montant_charges_extra ? `CHF ${client.montant_charges_extra.toLocaleString()}` : 'Oui'}
                    </span>
                  </div>
                )}
                {(client.poursuites || client.curatelle) && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
                    <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                    <div className="flex-1 text-sm font-medium text-red-600 dark:text-red-400">
                      {client.poursuites && 'Poursuites en cours'}
                      {client.poursuites && client.curatelle && ' • '}
                      {client.curatelle && 'Sous curatelle'}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </PremiumCard>

          {/* Informations personnelles */}
          <PremiumCard icon={User} title="Informations personnelles" delay={400}>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{profile.telephone || 'Non renseigné'}</span>
                </div>
                {client.date_naissance && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{new Date(client.date_naissance).toLocaleDateString('fr-CH')}</span>
                  </div>
                )}
                {client.adresse && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{client.adresse}</span>
                  </div>
                )}
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">État civil</p>
                  <p className="font-medium text-sm group-hover:text-primary/90 transition-colors">{client.etat_civil || 'Non renseigné'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Nationalité</p>
                  <p className="font-medium text-sm group-hover:text-primary/90 transition-colors">{client.nationalite || 'Non renseigné'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Type de permis</p>
                  <p className="font-medium text-sm group-hover:text-primary/90 transition-colors">{client.type_permis || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </PremiumCard>

          {/* Situation actuelle */}
          <PremiumCard icon={Building2} title="Situation actuelle" delay={450}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Gérance actuelle</p>
                  <p className="font-medium text-sm">{client.gerance_actuelle || 'Non renseigné'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Contact gérance</p>
                  <p className="font-medium text-sm">{client.contact_gerance || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="grid grid-cols-2 gap-4">
                <PremiumStatCard 
                  label="Loyer brut actuel"
                  value={client.loyer_actuel || 0}
                  prefix="CHF "
                  animated
                />
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-sm text-muted-foreground mb-2">Depuis le</p>
                  <p className="font-medium">
                    {client.depuis_le ? new Date(client.depuis_le).toLocaleDateString('fr-CH') : 'Non renseigné'}
                  </p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Pièces actuel</p>
                  <p className="font-medium text-sm">{client.pieces_actuel || 'Non renseigné'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Motif du changement</p>
                  <p className="font-medium text-xs line-clamp-2">{client.motif_changement || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </PremiumCard>

          {/* Situation professionnelle */}
          <PremiumCard icon={Briefcase} title="Situation professionnelle" delay={500}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Profession</p>
                  <p className="font-medium text-sm">{client.profession || 'Non renseigné'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Employeur</p>
                  <p className="font-medium text-sm">{client.employeur || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="grid grid-cols-2 gap-4">
                <PremiumStatCard 
                  label="Revenus mensuels nets"
                  value={client.revenus_mensuels || 0}
                  prefix="CHF "
                  variant="success"
                  animated
                />
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-sm text-muted-foreground mb-2">Date d'engagement</p>
                  <p className="font-medium">
                    {client.date_engagement ? new Date(client.date_engagement).toLocaleDateString('fr-CH') : 'Non renseigné'}
                  </p>
                </div>
              </div>
              {calculateAnciennete(client.date_engagement) && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur-sm hover:bg-primary/15 hover:shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all duration-300">
                  <p className="text-xs text-muted-foreground mb-1">Ancienneté</p>
                  <p className="font-medium text-primary">{calculateAnciennete(client.date_engagement)}</p>
                </div>
              )}
            </CardContent>
          </PremiumCard>

          {/* Critères de recherche */}
          <PremiumCard icon={Home} title="Critères de recherche" delay={550}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Type de bien</p>
                  <p className="font-medium text-sm">{client.type_bien || 'Non renseigné'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Nombre de pièces</p>
                  <p className="font-medium text-sm">{client.pieces || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur-sm hover:bg-primary/15 hover:shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all duration-300">
                <p className="text-xs text-muted-foreground mb-2">Région de recherche</p>
                <p className="font-medium text-sm text-primary">{client.region_recherche || 'Non renseigné'}</p>
              </div>
              {client.nombre_occupants && (
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Nombre d'occupants</p>
                  <p className="font-medium text-sm">{client.nombre_occupants}</p>
                </div>
              )}
              {client.souhaits_particuliers && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all duration-300">
                    <p className="text-xs text-muted-foreground mb-2">Souhaits particuliers</p>
                    <p className="text-sm">{client.souhaits_particuliers}</p>
                  </div>
                </>
              )}
            </CardContent>
          </PremiumCard>

          {/* Carte de localisation */}
          <SwissRomandeMap client={client} />

          {/* Autres informations */}
          <PremiumCard icon={FileText} title="Autres informations" delay={600}>
            <CardContent className="space-y-4">
              {client.utilisation_logement && (
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Utilisation du logement</p>
                  <p className="font-medium text-sm">{client.utilisation_logement}</p>
                </div>
              )}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${client.animaux ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-muted-foreground/30'}`} />
                  <span className="text-sm">Animaux</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${client.instrument_musique ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-muted-foreground/30'}`} />
                  <span className="text-sm">Instrument de musique</span>
                </div>
              </div>
              {client.vehicules && (
                <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                  <p className="text-xs text-muted-foreground mb-1">Véhicules</p>
                  <p className="font-medium text-sm">{client.numero_plaques || 'Oui'}</p>
                </div>
              )}
              {client.decouverte_agence && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300 cursor-default">
                    <p className="text-xs text-muted-foreground mb-1">Comment a découvert l'agence</p>
                    <p className="font-medium text-sm">{client.decouverte_agence}</p>
                  </div>
                </>
              )}
            </CardContent>
          </PremiumCard>

          {/* Suivi */}
          <PremiumCard icon={Users} title="Suivi" className="lg:col-span-2" delay={650}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agent ? (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground mb-2">Agent assigné</p>
                    <p className="font-bold text-primary">
                      {agent.profile.prenom} {agent.profile.nom}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{agent.profile.email}</p>
                  </div>
                ) : (
                  <div className="text-center p-4 rounded-xl bg-muted/30 backdrop-blur-sm">
                    <p className="text-muted-foreground mb-2">Aucun agent assigné</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin/assignations')}
                      className="group hover:bg-primary/10 hover:border-primary/30"
                    >
                      <Users className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Assigner un agent
                    </Button>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground mb-2">Commission split</p>
                  <p className="font-bold text-2xl">{client.commission_split || 50}%</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm">
                  <p className="text-xs text-muted-foreground mb-2">Date d'ajout</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {new Date(client.date_ajout || client.created_at || '').toLocaleDateString('fr-CH')}
                    </span>
                  </div>
                </div>
              </div>
              {client.note_agent && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all duration-300">
                    <p className="text-xs text-muted-foreground mb-2">Notes de l'agent</p>
                    <p className="text-sm">{client.note_agent}</p>
                  </div>
                </>
              )}
            </CardContent>
          </PremiumCard>

          {/* Contrat de mandat */}
          <PremiumCard icon={FileText} title="Contrat de mandat" delay={680}>
            <CardContent className="space-y-4">
              {client.mandat_pdf_url || client.mandat_signature_data || client.demande_mandat_id ? (
                <>
                  {/* Status */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-600 dark:text-green-400">Contrat signé</p>
                      {client.mandat_date_signature && (
                        <p className="text-sm text-muted-foreground">
                          Signé le {new Date(client.mandat_date_signature).toLocaleDateString('fr-CH')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Signature preview */}
                  {client.mandat_signature_data && (
                    <div className="p-4 bg-white rounded-xl border-2 border-dashed border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Signature électronique</p>
                      <img 
                        src={client.mandat_signature_data} 
                        alt="Signature" 
                        className="max-h-16 object-contain"
                      />
                    </div>
                  )}

                  {/* Download button */}
                  {client.mandat_pdf_url && (
                    <Button 
                      variant="outline"
                      className="w-full group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30"
                      onClick={async () => {
                        try {
                          // Extract file path from URL
                          const urlParts = client.mandat_pdf_url!.split('/mandat-contracts/');
                          const filePath = urlParts[urlParts.length - 1];
                          
                          const { data, error } = await supabase.storage
                            .from('mandat-contracts')
                            .download(filePath);
                          if (error) throw error;
                          const url = URL.createObjectURL(data);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `contrat-mandat-${profile?.nom || 'client'}.pdf`;
                          link.click();
                          URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Error downloading contract:', error);
                          toast({
                            title: 'Erreur',
                            description: 'Impossible de télécharger le contrat',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Télécharger le contrat PDF
                    </Button>
                  )}

                  {/* Regenerate button */}
                  {client.demande_mandat_id && (
                    <Button 
                      variant="outline"
                      className="w-full group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-orange-500/10 hover:border-orange-500/30"
                      disabled={regeneratingContract}
                      onClick={async () => {
                        if (!client.demande_mandat_id) return;
                        
                        setRegeneratingContract(true);
                        try {
                          // Fetch demande_mandat data
                          const { data: demande, error: demandeError } = await supabase
                            .from('demandes_mandat')
                            .select('*')
                            .eq('id', client.demande_mandat_id)
                            .single();
                          
                          if (demandeError) throw demandeError;
                          
                          // Call generate-mandat-contract function
                          const { data: result, error: funcError } = await supabase.functions.invoke('generate-mandat-contract', {
                            body: {
                              clientId: client.id,
                              demandeId: demande.id,
                              prenom: demande.prenom,
                              nom: demande.nom,
                              email: demande.email,
                              telephone: demande.telephone,
                              adresse: demande.adresse,
                              date_naissance: demande.date_naissance,
                              nationalite: demande.nationalite,
                              type_permis: demande.type_permis,
                              etat_civil: demande.etat_civil,
                              profession: demande.profession,
                              employeur: demande.employeur,
                              revenus_mensuels: demande.revenus_mensuels,
                              type_recherche: demande.type_recherche,
                              type_bien: demande.type_bien,
                              pieces_recherche: demande.pieces_recherche,
                              region_recherche: demande.region_recherche,
                              budget_max: demande.budget_max,
                              signature_data: demande.signature_data,
                              cgv_acceptees_at: demande.cgv_acceptees_at,
                              candidats: demande.candidats,
                              gerance_actuelle: demande.gerance_actuelle,
                              loyer_actuel: demande.loyer_actuel,
                              depuis_le: demande.depuis_le,
                              motif_changement: demande.motif_changement,
                              nombre_occupants: demande.nombre_occupants,
                              souhaits_particuliers: demande.souhaits_particuliers,
                            }
                          });
                          
                          if (funcError) throw funcError;
                          
                          toast({
                            title: 'Contrat régénéré',
                            description: 'Le PDF a été régénéré avec succès et un email a été envoyé à l\'admin',
                          });
                          
                          // Reload client data to get new PDF URL
                          loadClientData();
                        } catch (error) {
                          console.error('Error regenerating contract:', error);
                          toast({
                            title: 'Erreur',
                            description: 'Impossible de régénérer le contrat',
                            variant: 'destructive',
                          });
                        } finally {
                          setRegeneratingContract(false);
                        }
                      }}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${regeneratingContract ? 'animate-spin' : 'group-hover:scale-110'} transition-transform`} />
                      {regeneratingContract ? 'Régénération...' : 'Régénérer le PDF'}
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">Aucun contrat enregistré</p>
                  <p className="text-xs text-muted-foreground">
                    Le contrat sera généré lors de l'activation du mandat
                  </p>
                  
                  {/* Button to generate if demande_mandat_id exists but no PDF */}
                  {client.demande_mandat_id && (
                    <Button 
                      variant="outline"
                      className="mt-4 group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30"
                      disabled={regeneratingContract}
                      onClick={async () => {
                        if (!client.demande_mandat_id) return;
                        
                        setRegeneratingContract(true);
                        try {
                          const { data: demande, error: demandeError } = await supabase
                            .from('demandes_mandat')
                            .select('*')
                            .eq('id', client.demande_mandat_id)
                            .single();
                          
                          if (demandeError) throw demandeError;
                          
                          const { data: result, error: funcError } = await supabase.functions.invoke('generate-mandat-contract', {
                            body: {
                              clientId: client.id,
                              demandeId: demande.id,
                              prenom: demande.prenom,
                              nom: demande.nom,
                              email: demande.email,
                              telephone: demande.telephone,
                              adresse: demande.adresse,
                              date_naissance: demande.date_naissance,
                              nationalite: demande.nationalite,
                              type_permis: demande.type_permis,
                              etat_civil: demande.etat_civil,
                              profession: demande.profession,
                              employeur: demande.employeur,
                              revenus_mensuels: demande.revenus_mensuels,
                              type_recherche: demande.type_recherche,
                              type_bien: demande.type_bien,
                              pieces_recherche: demande.pieces_recherche,
                              region_recherche: demande.region_recherche,
                              budget_max: demande.budget_max,
                              signature_data: demande.signature_data,
                              cgv_acceptees_at: demande.cgv_acceptees_at,
                              candidats: demande.candidats,
                              gerance_actuelle: demande.gerance_actuelle,
                              loyer_actuel: demande.loyer_actuel,
                              depuis_le: demande.depuis_le,
                              motif_changement: demande.motif_changement,
                              nombre_occupants: demande.nombre_occupants,
                              souhaits_particuliers: demande.souhaits_particuliers,
                            }
                          });
                          
                          if (funcError) throw funcError;
                          
                          toast({
                            title: 'Contrat généré',
                            description: 'Le PDF a été généré avec succès',
                          });
                          
                          loadClientData();
                        } catch (error) {
                          console.error('Error generating contract:', error);
                          toast({
                            title: 'Erreur',
                            description: 'Impossible de générer le contrat',
                            variant: 'destructive',
                          });
                        } finally {
                          setRegeneratingContract(false);
                        }
                      }}
                    >
                      <FilePlus className={`w-4 h-4 mr-2 ${regeneratingContract ? 'animate-spin' : 'group-hover:scale-110'} transition-transform`} />
                      {regeneratingContract ? 'Génération...' : 'Générer le PDF'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </PremiumCard>

          {/* Documents */}
          <PremiumCard icon={FileText} title={`Documents (${documents.length})`} className="lg:col-span-2" delay={700}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <span>Documents</span>
                  <Badge className="ml-2 bg-primary/20 text-primary border-primary/30">
                    <AnimatedCounter value={documents.length} duration={500} decimals={0} />
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  {documents.length >= 2 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setMergeDialogOpen(true)}
                      className="group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30"
                    >
                      <FilePlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Créer dossier complet
                    </Button>
                  )}
                  <Button 
                    onClick={() => setUploadDialogOpen(true)}
                    className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                  >
                    <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Ajouter un document
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc, index) => {
                    const Icon = getFileIcon(doc.type);
                    return (
                      <div 
                        key={doc.id} 
                        className="group flex items-center justify-between p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30 hover:bg-muted/50 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(var(--primary),0.1)] transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                          </div>
                          <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">{doc.nom}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Badge variant="outline" className="text-xs bg-card/50">
                                {getDocTypeLabel(doc.type_document)}
                              </Badge>
                              <span>{formatFileSize(doc.taille)}</span>
                              <span>•</span>
                              <span>{new Date(doc.date_upload).toLocaleDateString('fr-CH')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(doc.type?.includes('image') || doc.type === 'application/pdf') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handlePreviewDocument(doc)}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setDocumentToRename(doc);
                              setNewDocumentName(doc.nom);
                              setRenameDialogOpen(true);
                            }}
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDownloadDocument(doc)}
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteDocument(doc.id, doc.url)}
                            className="hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 animate-fade-in">
                  <div className="relative mx-auto w-20 h-20 mb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-10 h-10 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-muted-foreground">Aucun document</p>
                  <Button 
                    onClick={() => setUploadDialogOpen(true)}
                    className="mt-4 group"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Ajouter le premier document
                  </Button>
                </div>
              )}
            </CardContent>
          </PremiumCard>
        </div>
      </div>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              Ajouter un document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="bg-card/50 backdrop-blur-sm border-border/50">
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
                className="bg-card/50 backdrop-blur-sm border-border/50"
              />
              <p className="text-xs text-muted-foreground">Formats acceptés: PDF, JPG, PNG (max 1GB)</p>
            </div>
            {selectedFile && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                <p className="text-sm text-primary font-medium">
                  Fichier sélectionné: {selectedFile.name}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} className="bg-card/50 backdrop-blur-sm">
              Annuler
            </Button>
            <Button 
              onClick={handleUploadDocument} 
              disabled={!selectedFile || isUploading}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
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
        <DialogContent className="max-w-5xl max-h-[95vh] bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              {previewDocument?.nom || 'Aperçu du document'}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[80vh]">
            {previewDocument?.type?.includes('pdf') ? (
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-full rounded-xl"
              >
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="mb-4">Impossible d'afficher le PDF dans le navigateur.</p>
                  <Button onClick={() => handleDownloadDocument(previewDocument)} className="group">
                    <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Télécharger le PDF
                  </Button>
                </div>
              </object>
            ) : previewDocument?.type?.includes('image') ? (
              <div className="h-full overflow-auto flex justify-center items-start">
                <img 
                  src={previewUrl} 
                  alt={previewDocument?.nom}
                  className="max-w-full h-auto rounded-xl"
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
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Pencil className="w-5 h-5 text-primary" />
              </div>
              Renommer le document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau nom</Label>
              <Input
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="Nom du document"
                className="bg-card/50 backdrop-blur-sm border-border/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} className="bg-card/50 backdrop-blur-sm">
              Annuler
            </Button>
            <Button 
              onClick={handleRenameDocument} 
              disabled={!newDocumentName.trim()}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
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
