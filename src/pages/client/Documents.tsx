import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Upload, Download, Trash2, File, 
  Image as ImageIcon, FileSpreadsheet, AlertCircle, Eye, Pencil, ClipboardList,
  Sparkles, FolderOpen
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentRequest {
  id: string;
  document_type: string;
  document_label: string;
  note: string | null;
  candidate_id: string | null;
  created_at: string;
}

export default function Documents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('autre');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<any>(null);
  const [newDocumentName, setNewDocumentName] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  // Helpers pour mapper les types de documents du mandat
  const mapFormTypeToDocType = (formType: string): string => {
    const typeMapping: Record<string, string> = {
      'poursuites': 'extrait_poursuites',
      'salaire1': 'fiche_salaire',
      'salaire2': 'fiche_salaire',
      'salaire3': 'fiche_salaire',
      'identite': 'piece_identite',
    };
    return typeMapping[formType] || formType;
  };

  const getMimeTypeFromName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'application/octet-stream';
    }
  };

  const loadDocuments = async () => {
    if (!user) return;

    try {
      // 1. Récupérer le profil pour l'email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      // 2. Récupérer le client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientData) {
        setClientId(clientData.id);
      }

      // 3. Charger les documents de la table documents
      let docsFromTable: any[] = [];
      if (clientData) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('client_id', clientData.id)
          .order('date_upload', { ascending: false });

        if (!error) docsFromTable = data || [];
      }

      // 4. Si pas de documents dans la table, récupérer depuis demandes_mandat
      if (docsFromTable.length === 0 && profileData?.email) {
        console.log('No documents in table, fetching from demandes_mandat for email:', profileData.email);
        
        const { data: mandatData } = await supabase
          .from('demandes_mandat')
          .select('documents_uploades')
          .eq('email', profileData.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mandatData?.documents_uploades && Array.isArray(mandatData.documents_uploades) && mandatData.documents_uploades.length > 0) {
          console.log('Found documents in demandes_mandat:', mandatData.documents_uploades.length);
          
          // Transformer les documents du mandat en format compatible
          const mandatDocs = mandatData.documents_uploades.map((doc: any, index: number) => ({
            id: `mandat-${index}`,
            nom: doc.name,
            url: doc.url,
            type: getMimeTypeFromName(doc.name),
            type_document: mapFormTypeToDocType(doc.type),
            date_upload: new Date().toISOString(),
            source: 'mandat', // Pour identifier l'origine
          }));
          
          docsFromTable = mandatDocs;
        }
      }

      setDocuments(docsFromTable);

      // Charger les demandes de documents
      if (clientData) {
        const { data: requestsData } = await supabase
          .from('document_requests')
          .select('*')
          .eq('client_id', clientData.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        setDocumentRequests(requestsData || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 1 GB',
        variant: 'destructive',
      });
      return false;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Type de fichier non supporté',
        description: 'Formats acceptés : PDF, JPG, PNG',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);

    try {
      const filePath = `${user!.id}/general/${Date.now()}_${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          nom: selectedFile.name,
          type: selectedFile.type,
          taille: selectedFile.size,
          user_id: user!.id,
          client_id: clientId,
          type_document: selectedType,
          url: filePath,
        });

      if (dbError) throw dbError;

      if (clientId && selectedType !== 'autre') {
        const { data: pendingRequest } = await supabase
          .from('document_requests')
          .select('id')
          .eq('client_id', clientId)
          .eq('document_type', selectedType)
          .eq('status', 'pending')
          .maybeSingle();

        if (pendingRequest) {
          await supabase
            .from('document_requests')
            .update({ 
              status: 'fulfilled', 
              fulfilled_at: new Date().toISOString() 
            })
            .eq('id', pendingRequest.id);
        }
      }

      await loadDocuments();

      toast({
        title: 'Document ajouté',
        description: 'Le document a été uploadé avec succès',
      });

      setUploadDialogOpen(false);
      setSelectedType('autre');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le fichier',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    try {
      if (!selectedDoc.url.startsWith('data:')) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([selectedDoc.url]);

        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', selectedDoc.id);

      if (error) throw error;

      await loadDocuments();

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

  const handlePreview = async (document: any) => {
    try {
      let blobUrl: string;
      
      if (document.url?.startsWith('data:')) {
        const base64Data = document.url.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: document.type });
        blobUrl = URL.createObjectURL(blob);
      } else {
        const { data, error } = await supabase.storage
          .from('client-documents')
          .download(document.url);

        if (error) throw error;
        blobUrl = URL.createObjectURL(data);
      }

      setPreviewDocument(document);
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

  const handleRename = async () => {
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

  const handleDownload = async (doc: any) => {
    if (doc.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.nom;
      link.click();
      return;
    }

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
        variant: 'destructive'
      });
    }
  };

  const getTypeLabel = (type: string) => {
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

  const getTypeBadgeStyle = (type: string) => {
    const styles: Record<string, string> = {
      'fiche_salaire': 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700',
      'extrait_poursuites': 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-700',
      'piece_identite': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700',
      'attestation_domicile': 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-700',
      'rc_menage': 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-700',
      'contrat_travail': 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700',
      'attestation_employeur': 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-700',
      'copie_bail': 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700',
      'attestation_garantie_loyer': 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700',
      'dossier_complet': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-300 dark:border-green-700',
      'autre': 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600'
    };
    return styles[type] || styles['autre'];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('image')) return ImageIcon;
    if (type.includes('sheet')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-2 w-32 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full animate-pulse" />
            <p className="text-sm text-muted-foreground">Chargement des documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header animé avec glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8">
          {/* Effets de fond */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
          </div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                  <FolderOpen className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Mes documents
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {documents.length}
                  </span>
                  document{documents.length > 1 ? 's' : ''} dans votre espace
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Upload className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          </div>
        </div>

        {/* Info banner modernisé */}
        <Card className="relative overflow-hidden border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-blue-50/30 dark:from-blue-950/50 dark:to-blue-950/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent dark:from-blue-900/30" />
          <CardContent className="relative flex items-start gap-4 pt-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-3">
              <p className="font-semibold text-base">Documents requis (Personnes salariées sans garant) :</p>
              <ul className="grid gap-2">
                {[
                  'Formulaire de demande de recherches dûment complété et signé',
                  'Copie de carte d\'identité/passeport (si suisse) OU Copie du permis de séjour',
                  'Copie des 3 dernières fiches de salaire et du contrat de travail',
                  'Attestation de l\'employeur',
                  'Copie de la déclaration d\'impôts (si indépendant)',
                  'Attestation de l\'Office des Poursuites (antérieure à 3 mois)',
                  'Attestation de domicile ou d\'établissement de la commune actuelle',
                  'Copie de la RC-ménage (assurance responsabilité civile)'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs italic opacity-80 border-t border-blue-200/50 dark:border-blue-800/50 pt-3 mt-3">
                Note : Toute personne mariée ou en partenariat enregistré devra remettre tous les documents précédemment cités.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Documents demandés par l'agent */}
        {documentRequests.length > 0 && (
          <Card className="relative overflow-hidden border-orange-200/50 bg-gradient-to-br from-orange-50/80 to-orange-50/30 dark:from-orange-950/50 dark:to-orange-950/20 backdrop-blur-sm">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-100/50 via-transparent to-transparent dark:from-orange-900/30" />
            <CardHeader className="relative pb-3">
              <CardTitle className="flex items-center gap-3 text-orange-800 dark:text-orange-200">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <span>Documents demandés par votre agent</span>
                <Badge className="ml-auto bg-orange-500 hover:bg-orange-600 text-white border-0">
                  {documentRequests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-3">
                {documentRequests.map((request, index) => (
                  <div 
                    key={request.id} 
                    className="group relative flex items-center justify-between p-4 rounded-xl bg-background/80 backdrop-blur-sm border border-orange-200/50 dark:border-orange-800/50 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                    <div className="relative flex-1">
                      <p className="font-medium">{request.document_label}</p>
                      {request.note && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <span>📝</span> {request.note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Demandé le {new Date(request.created_at).toLocaleDateString('fr-CH')}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedType(request.document_type);
                        setUploadDialogOpen(true);
                      }}
                      className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                      <Upload className="w-4 h-4 mr-2" />
                      Uploader
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des documents */}
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, index) => {
              const Icon = getFileIcon(doc.type);
              return (
                <Card 
                  key={doc.id} 
                  className="group relative overflow-hidden bg-gradient-to-br from-card to-card/80 border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate group-hover:text-primary transition-colors" title={doc.nom}>
                            {doc.nom}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(doc.taille)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-sm font-medium px-3 py-1 border ${getTypeBadgeStyle(doc.type_document)}`}
                        >
                          {getTypeLabel(doc.type_document)}
                        </Badge>
                        {doc.offre_id && (
                          <Badge className="text-xs bg-secondary/80 text-secondary-foreground border-0">
                            📝 Candidature
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ajouté le {new Date(doc.date_upload).toLocaleDateString('fr-CH')}
                      </p>
                    </div>
                    
                    {doc.type.includes('image') && doc.url && doc.url.startsWith('data:') && (
                      <div className="relative overflow-hidden rounded-lg">
                        <img 
                          src={doc.url} 
                          alt={doc.nom}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {(doc.type.includes('image') || doc.type === 'application/pdf') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(doc)}
                          className="hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Aperçu
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDocumentToRename(doc);
                          setNewDocumentName(doc.nom);
                          setRenameDialogOpen(true);
                        }}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
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
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="relative overflow-hidden border-dashed border-2 border-muted-foreground/20 bg-gradient-to-br from-muted/30 to-muted/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
            <CardContent className="relative py-16 text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Aucun document</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Commencez par uploader vos documents importants pour constituer votre dossier
              </p>
              <Button 
                onClick={() => setUploadDialogOpen(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Upload className="w-4 h-4 mr-2" />
                Ajouter un document
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Dialog modernisé */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg border-border/50 bg-gradient-to-br from-background to-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                <Upload className="w-5 h-5 text-primary-foreground" />
              </div>
              Ajouter un document
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Formats acceptés : PDF, JPG, PNG (max 1 GB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type de document</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="bg-background/50 border-border/50 focus:border-primary/50">
                  <SelectValue />
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
                  <SelectItem value="autre">📄 Autre document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              dragActive
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {/* Gradient background on drag */}
            <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 transition-opacity duration-300 ${dragActive ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className="relative">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center transition-all duration-300 ${dragActive ? 'scale-110 from-primary/20 to-primary/10' : ''}`}>
                <Upload className={`w-8 h-8 transition-colors duration-300 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    Changer de fichier
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2">
                    Glissez-déposez votre fichier ici
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">ou</p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  >
                    Sélectionner un fichier
                  </Button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setSelectedType('autre');
              }}
              className="hover:bg-muted"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmUpload}
              disabled={!selectedFile || isUploading}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Upload en cours...
                </>
              ) : (
                <>Confirmer l'upload</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog modernisé */}
      <Dialog 
        open={previewDialogOpen} 
        onOpenChange={(open) => {
          setPreviewDialogOpen(open);
          if (!open && previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[95vh] border-border/50 bg-gradient-to-br from-background to-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              {previewDocument?.nom}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[80vh] rounded-xl overflow-hidden bg-muted/30">
            {previewDocument?.type?.includes('pdf') ? (
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="mb-4">Impossible d'afficher le PDF dans le navigateur.</p>
                  <Button onClick={() => handleDownload(previewDocument)} className="bg-gradient-to-r from-primary to-primary/90">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le PDF
                  </Button>
                </div>
              </object>
            ) : previewDocument?.type?.includes('image') ? (
              <div className="h-full overflow-auto flex justify-center items-start p-4">
                <img 
                  src={previewUrl} 
                  alt={previewDocument?.nom}
                  className="max-w-full h-auto rounded-lg shadow-2xl"
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

      {/* Rename Dialog modernisé */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md border-border/50 bg-gradient-to-br from-background to-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-primary" />
              </div>
              Renommer le document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nouveau nom</Label>
              <Input
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="Nom du document"
                className="bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleRename} 
              disabled={!newDocumentName.trim()}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog modernisé */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-border/50 bg-gradient-to-br from-background to-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              Supprimer le document
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer "<span className="font-medium text-foreground">{selectedDoc?.nom}</span>" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="hover:bg-muted">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
