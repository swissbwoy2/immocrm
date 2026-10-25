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
  Sparkles, FolderOpen, Check
} from 'lucide-react';
import { DASH_CARD, DashPage, DashPageHeader, DashSection, DashEmptyState, DashBadge } from '@/components/client/dashboard/DashPrimitives';
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
import { getStoragePath } from '@/lib/documentUtils';
import { DocumentUpdateReminder } from '@/components/DocumentUpdateReminder';
import { isPurchaseBuyer } from '@/lib/journey';

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
  const [isClientBuyer, setIsClientBuyer] = useState(false);
  const [purchaseProjectId, setPurchaseProjectId] = useState<string | null>(null);

  const PURCHASE_DOC_CATEGORY_MAP: Record<string, string> = {
    piece_identite: 'identite', permis_sejour: 'identite',
    certificat_salaire: 'revenus', fiche_salaire_1: 'revenus', fiche_salaire_2: 'revenus',
    fiche_salaire_3: 'revenus', fiche_salaire: 'revenus',
    contrat_travail: 'revenus', attestation_employeur: 'revenus',
    releve_bancaire_fonds_propres: 'fonds_propres', attestation_3a: 'fonds_propres',
    attestation_lpp: 'fonds_propres', attestation_epl: 'fonds_propres',
    attestation_libre_passage: 'fonds_propres', justificatif_placements: 'fonds_propres',
    justificatif_donation: 'fonds_propres', justificatif_avance_hoirie: 'fonds_propres',
    justificatif_credit_prive: 'charges', justificatif_leasing: 'charges',
    justificatif_carte_credit: 'charges', justificatif_pension_alimentaire: 'charges',
    justificatif_charges_fixes: 'charges',
    decision_taxation: 'fiscalite', declaration_fiscale: 'fiscalite',
    extrait_poursuites: 'autre',
    accord_transmission: 'autorisation', consentement_donnees: 'autorisation',
    autre: 'autre',
  };
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
      'piece_identite_recto': 'piece_identite',
      'piece_identite_verso': 'piece_identite',
      'permis_sejour_recto': 'permis_sejour',
      'permis_sejour_verso': 'permis_sejour',
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

      // 2. Récupérer le client (avec champs buyer detection)
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, type_recherche, journey_type')
        .eq('user_id', user.id)
        .maybeSingle();

      let buyer = false;
      let pp: any = null;
      if (clientData) {
        setClientId(clientData.id);
        // Charger le projet achat pour détecter acheteur
        const { data: byUser } = await supabase
          .from('purchase_projects')
          .select('id, client_id, user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        pp = byUser;
        if (!pp && clientData.id) {
          const { data: byClient } = await supabase
            .from('purchase_projects')
            .select('id, client_id, user_id')
            .eq('client_id', clientData.id)
            .maybeSingle();
          pp = byClient;
        }
        buyer = isPurchaseBuyer(clientData, pp);
        setIsClientBuyer(buyer);
        setPurchaseProjectId(pp?.id || null);
        if (buyer) {
          setSelectedType('piece_identite');
        }
      }

      // 3. Charger les documents de la table documents
      let docsFromTable: any[] = [];
      if (clientData) {
        if (buyer && pp?.id) {
          // Rattacher les anciens docs sans purchase_project_id au projet achat
          await supabase
            .from('documents')
            .update({ purchase_project_id: pp.id, purchase_category: 'autre' } as any)
            .eq('client_id', clientData.id)
            .is('purchase_project_id', null);

          // Charger uniquement les documents de ce projet achat
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('purchase_project_id', pp.id)
            .order('date_upload', { ascending: false });

          if (!error) docsFromTable = data || [];
        } else if (!buyer) {
          // Comportement location inchangé
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('client_id', clientData.id)
            .order('date_upload', { ascending: false });

          if (!error) docsFromTable = data || [];
        }
      }

      // 4. Si pas de documents dans la table, récupérer depuis demandes_mandat (locataires uniquement)
      if (!buyer && docsFromTable.length === 0 && profileData?.email) {
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

      const purchaseCategory = isClientBuyer
        ? (PURCHASE_DOC_CATEGORY_MAP[selectedType] || 'autre')
        : null;
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          nom: selectedFile.name,
          type: selectedFile.type,
          taille: selectedFile.size,
          user_id: user!.id,
          client_id: clientId,
          type_document: selectedType,
          purchase_project_id: isClientBuyer ? purchaseProjectId : null,
          purchase_category: purchaseCategory,
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
        const filePath = getStoragePath(document.url);
        const { data, error } = await supabase.storage
          .from('client-documents')
          .download(filePath);

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
        variant: 'destructive'
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      // Location
      'fiche_salaire': '💰 Fiche salaire',
      'extrait_poursuites': '📋 Extrait poursuites',
      'attestation_domicile': '🏠 Attestation domicile',
      'rc_menage': '🛡️ RC Ménage',
      'copie_bail': '📋 Copie bail',
      'attestation_garantie_loyer': '🔐 Garantie loyer',
      // Commun
      'piece_identite': '🪪 Pièce d\'identité',
      'permis_sejour': '🪪 Permis de séjour',
      'contrat_travail': '📝 Contrat travail',
      'attestation_employeur': '👔 Attestation employeur',
      'dossier_complet': '📎 Dossier complet',
      // Achat — revenus
      'certificat_salaire': '💰 Certificat de salaire',
      'fiche_salaire_1': '💰 Fiche salaire 1',
      'fiche_salaire_2': '💰 Fiche salaire 2',
      'fiche_salaire_3': '💰 Fiche salaire 3',
      // Achat — fonds propres
      'releve_bancaire_fonds_propres': '🏦 Relevé bancaire FP',
      'attestation_3a': '🏦 Attestation 3a',
      'attestation_lpp': '🏦 Attestation LPP',
      'attestation_epl': '🏦 Attestation EPL',
      'attestation_libre_passage': '🏦 Libre passage',
      'justificatif_placements': '📊 Justificatif placements',
      'justificatif_donation': '🎁 Justificatif donation',
      'justificatif_avance_hoirie': '🎁 Avance d\'hoirie',
      // Achat — charges
      'justificatif_credit_prive': '💳 Crédit privé',
      'justificatif_leasing': '🚗 Leasing',
      'justificatif_carte_credit': '💳 Carte de crédit',
      'justificatif_pension_alimentaire': '👶 Pension alimentaire',
      'justificatif_charges_fixes': '📊 Charges fixes',
      // Achat — fiscalité
      'decision_taxation': '📋 Décision de taxation',
      'declaration_fiscale': '📋 Déclaration fiscale',
      // Achat — autorisations
      'accord_transmission': '✅ Accord transmission',
      'consentement_donnees': '✅ Consentement données',
      // Autre
      'autre': '📄 Autre',
    };
    return labels[type] || '📄 ' + (type || 'Autre').replace(/_/g, ' ');
  };

  const getTypeBadgeStyle = (type: string) => {
    // Famille identité (bleu)
    const identite = 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700';
    // Famille revenus (vert émeraude)
    const revenus = 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700';
    // Famille fonds propres (ciel)
    const fondsPropres = 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700';
    // Famille charges (orange)
    const charges = 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-700';
    // Famille fiscalité (violet)
    const fiscalite = 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-700';
    // Famille autorisation (indigo)
    const autorisation = 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700';
    // Famille location-spécifique
    const locationStyle = 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700';
    const autre = 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600';

    const styles: Record<string, string> = {
      // Identité
      'piece_identite': identite,
      'permis_sejour': identite,
      // Revenus
      'fiche_salaire': revenus,
      'fiche_salaire_1': revenus,
      'fiche_salaire_2': revenus,
      'fiche_salaire_3': revenus,
      'certificat_salaire': revenus,
      'contrat_travail': revenus,
      'attestation_employeur': revenus,
      // Fonds propres
      'releve_bancaire_fonds_propres': fondsPropres,
      'attestation_3a': fondsPropres,
      'attestation_lpp': fondsPropres,
      'attestation_epl': fondsPropres,
      'attestation_libre_passage': fondsPropres,
      'justificatif_placements': fondsPropres,
      'justificatif_donation': fondsPropres,
      'justificatif_avance_hoirie': fondsPropres,
      // Charges
      'extrait_poursuites': charges,
      'justificatif_credit_prive': charges,
      'justificatif_leasing': charges,
      'justificatif_carte_credit': charges,
      'justificatif_pension_alimentaire': charges,
      'justificatif_charges_fixes': charges,
      // Fiscalité
      'decision_taxation': fiscalite,
      'declaration_fiscale': fiscalite,
      // Autorisations
      'accord_transmission': autorisation,
      'consentement_donnees': autorisation,
      // Location-spécifique
      'attestation_domicile': locationStyle,
      'rc_menage': 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-700',
      'copie_bail': locationStyle,
      'attestation_garantie_loyer': 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700',
      'dossier_complet': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-300 dark:border-green-700',
      'autre': autre,
    };
    return styles[type] || autre;
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('image')) return ImageIcon;
    if (type.includes('sheet')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined) return '';
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <DashPage>
        <div className="mx-auto w-full max-w-3xl" role="status" aria-label="Chargement des documents">
          <div className="h-7 w-44 rounded-full bg-muted" />
          <div className="mt-6 h-24 rounded-2xl bg-muted/60" />
        </div>
      </DashPage>
    );
  }

  // ── Checklist du dossier (location / achat) ─────────────────────────────
  type CheckItem = { label: string; types: string[]; min?: number; optional?: boolean; uploadType: string };
  const RENTAL_CHECKLIST: { title: string; items: CheckItem[] }[] = [
    {
      title: 'Votre dossier de location',
      items: [
        { label: "Pièce d'identité ou permis de séjour", types: ['piece_identite', 'permis_sejour'], uploadType: 'piece_identite' },
        { label: '3 dernières fiches de salaire', types: ['fiche_salaire', 'fiche_salaire_1', 'fiche_salaire_2', 'fiche_salaire_3'], min: 3, uploadType: 'fiche_salaire' },
        { label: 'Contrat de travail', types: ['contrat_travail'], uploadType: 'contrat_travail' },
        { label: 'Extrait des poursuites (moins de 3 mois)', types: ['extrait_poursuites'], uploadType: 'extrait_poursuites' },
        { label: "Attestation de l'employeur", types: ['attestation_employeur'], optional: true, uploadType: 'attestation_employeur' },
        { label: 'Attestation de domicile', types: ['attestation_domicile'], optional: true, uploadType: 'attestation_domicile' },
        { label: 'Assurance RC ménage', types: ['rc_menage'], optional: true, uploadType: 'rc_menage' },
      ],
    },
  ];
  const PURCHASE_CHECKLIST: { title: string; items: CheckItem[] }[] = [
    {
      title: 'Identité',
      items: [
        { label: "Pièce d'identité", types: ['piece_identite'], uploadType: 'piece_identite' },
        { label: 'Permis de séjour (si applicable)', types: ['permis_sejour'], optional: true, uploadType: 'permis_sejour' },
        { label: 'Extrait des poursuites', types: ['extrait_poursuites'], uploadType: 'extrait_poursuites' },
      ],
    },
    {
      title: 'Revenus',
      items: [
        { label: 'Certificat de salaire annuel', types: ['certificat_salaire'], uploadType: 'certificat_salaire' },
        { label: '3 dernières fiches de salaire', types: ['fiche_salaire_1', 'fiche_salaire_2', 'fiche_salaire_3', 'fiche_salaire'], min: 3, uploadType: 'fiche_salaire_1' },
        { label: 'Contrat de travail', types: ['contrat_travail'], uploadType: 'contrat_travail' },
        { label: 'Attestation employeur (si nécessaire)', types: ['attestation_employeur'], optional: true, uploadType: 'attestation_employeur' },
      ],
    },
    {
      title: 'Fonds propres',
      items: [
        { label: 'Relevé bancaire des fonds propres', types: ['releve_bancaire_fonds_propres'], uploadType: 'releve_bancaire_fonds_propres' },
        { label: 'Attestation 3e pilier (3a)', types: ['attestation_3a'], optional: true, uploadType: 'attestation_3a' },
        { label: 'Attestation LPP', types: ['attestation_lpp'], optional: true, uploadType: 'attestation_lpp' },
        { label: 'Attestation EPL / libre passage', types: ['attestation_epl', 'attestation_libre_passage'], optional: true, uploadType: 'attestation_epl' },
        { label: "Donation, avance d'hoirie, placements", types: ['justificatif_donation', 'justificatif_avance_hoirie', 'justificatif_placements'], optional: true, uploadType: 'justificatif_donation' },
      ],
    },
    {
      title: 'Charges et fiscalité',
      items: [
        { label: 'Dernière décision de taxation', types: ['decision_taxation'], uploadType: 'decision_taxation' },
        { label: 'Crédit privé, leasing, carte de crédit', types: ['justificatif_credit_prive', 'justificatif_leasing', 'justificatif_carte_credit'], optional: true, uploadType: 'justificatif_credit_prive' },
        { label: 'Pension alimentaire', types: ['justificatif_pension_alimentaire'], optional: true, uploadType: 'justificatif_pension_alimentaire' },
      ],
    },
    {
      title: 'Autorisations',
      items: [
        { label: 'Accord de transmission aux partenaires financiers', types: ['accord_transmission'], uploadType: 'accord_transmission' },
        { label: 'Consentement au traitement des données financières', types: ['consentement_donnees'], uploadType: 'consentement_donnees' },
      ],
    },
  ];
  const checklist = isClientBuyer ? PURCHASE_CHECKLIST : RENTAL_CHECKLIST;
  const countFor = (item: CheckItem) => documents.filter((d) => item.types.includes(d.type_document)).length;
  const requiredItems = checklist.flatMap((g) => g.items).filter((i) => !i.optional);
  const requiredDone = requiredItems.filter((i) => countFor(i) >= (i.min ?? 1)).length;
  const openUpload = (type: string) => { setSelectedType(type); setUploadDialogOpen(true); };

  const ROW_DIVIDE = 'divide-y divide-border/70';

  return (
    <DashPage>
      <div className="mx-auto w-full max-w-3xl space-y-8">
        {/* En-tête */}
        <DashPageHeader
          title="Mes documents"
          subtitle={<>{documents.length} document{documents.length > 1 ? 's' : ''} · {requiredDone}/{requiredItems.length} pièces essentielles déposées</>}
          action={
            <Button onClick={() => openUpload(isClientBuyer ? 'piece_identite' : 'autre')} className="h-11 rounded-full px-5">
              <Upload className="mr-2 h-4 w-4" /> Ajouter un document
            </Button>
          }
        />

        <DocumentUpdateReminder />

        {/* Demandés par l'agent */}
        {documentRequests.length > 0 && (
          <DashSection
            title="Demandés par votre agent"
            action={<DashBadge tone="warning">{documentRequests.length}</DashBadge>}
          >
            <ul className={`${DASH_CARD} ${ROW_DIVIDE} overflow-hidden`}>
              {documentRequests.map((request) => (
                <li key={request.id} className="flex flex-wrap items-center gap-3 p-4 md:px-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">{request.document_label}</p>
                    {request.note && <p className="mt-0.5 text-sm text-muted-foreground">{request.note}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">Demandé le {new Date(request.created_at).toLocaleDateString('fr-CH')}</p>
                  </div>
                  <Button size="sm" onClick={() => openUpload(request.document_type)} className="h-9 shrink-0 rounded-full px-4">
                    <Upload className="mr-1.5 h-4 w-4" /> Déposer
                  </Button>
                </li>
              ))}
            </ul>
          </DashSection>
        )}

        {/* Checklist du dossier */}
        <DashSection title={isClientBuyer ? 'Pièces de votre dossier d\'achat' : 'Pièces de votre dossier'}>
          <div className={`${DASH_CARD} overflow-hidden`}>
            <div className="p-4 md:p-5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${requiredItems.length ? (requiredDone / requiredItems.length) * 100 : 0}%` }} />
              </div>
            </div>
            {checklist.map((group) => (
              <div key={group.title} className="border-t border-border/70">
                {checklist.length > 1 && (
                  <p className="bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:px-5">{group.title}</p>
                )}
                <ul className={ROW_DIVIDE}>
                  {group.items.map((item) => {
                    const n = countFor(item);
                    const need = item.min ?? 1;
                    const done = n >= need;
                    return (
                      <li key={item.label} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-primary text-primary-foreground' : 'border-2 border-border'}`}>
                          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className={`text-xs ${done ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                            {done ? 'Déposé' : need > 1 ? `${n}/${need} déposé${n > 1 ? 's' : ''}` : item.optional ? 'Selon votre situation' : 'À déposer'}
                          </p>
                        </div>
                        {!done && (
                          <Button size="sm" variant="outline" onClick={() => openUpload(item.uploadType)} className="h-9 shrink-0 rounded-full px-4">
                            <Upload className="mr-1.5 h-4 w-4" /> Déposer
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {!isClientBuyer && (
              <p className="border-t border-border/70 px-4 py-3 text-xs text-muted-foreground md:px-5">
                Indépendant : ajoutez votre dernière déclaration d'impôts. Personne mariée ou en partenariat : les mêmes pièces pour les deux.
              </p>
            )}
          </div>
        </DashSection>

        {/* Fichiers déposés */}
        <DashSection title="Mes fichiers">
          {documents.length > 0 ? (
            <ul className={`${DASH_CARD} ${ROW_DIVIDE} overflow-hidden`}>
              {documents.map((doc) => {
                const Icon = getFileIcon(doc.type || '');
                const canPreview = (doc.type || '').includes('image') || doc.type === 'application/pdf';
                return (
                  <li key={doc.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center md:px-5">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground" title={doc.nom}>{doc.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTypeLabel(doc.type_document)} · {new Date(doc.date_upload).toLocaleDateString('fr-CH')}
                          {doc.taille ? ` · ${formatFileSize(doc.taille)}` : ''}
                          {doc.offre_id ? ' · Candidature' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                      {canPreview && (
                        <Button size="sm" variant="outline" onClick={() => handlePreview(doc)} className="h-9 rounded-full px-4">
                          <Eye className="mr-1.5 h-4 w-4" /> Voir
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDownload(doc)} className="h-9 rounded-full px-4">
                        <Download className="mr-1.5 h-4 w-4" /> Télécharger
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Renommer"
                        onClick={() => { setDocumentToRename(doc); setNewDocumentName(doc.nom); setRenameDialogOpen(true); }}
                        className="h-9 w-9 rounded-full"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Supprimer"
                        onClick={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }}
                        className="h-9 w-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <DashEmptyState
              icon={FileText}
              title="Aucun document pour l'instant"
              description="Déposez vos pièces pour que votre agent puisse envoyer votre dossier rapidement."
              action={
                <Button onClick={() => openUpload(isClientBuyer ? 'piece_identite' : 'autre')} className="h-11 rounded-full px-5">
                  <Upload className="mr-2 h-4 w-4" /> Ajouter un document
                </Button>
              }
            />
          )}
        </DashSection>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </span>
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
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isClientBuyer ? (
                    <>
                      <SelectItem value="piece_identite">🪪 Pièce d'identité</SelectItem>
                      <SelectItem value="permis_sejour">🪪 Permis de séjour</SelectItem>
                      <SelectItem value="extrait_poursuites">📋 Extrait des poursuites</SelectItem>
                      <SelectItem value="certificat_salaire">💰 Certificat de salaire annuel</SelectItem>
                      <SelectItem value="fiche_salaire_1">💰 Fiche de salaire 1</SelectItem>
                      <SelectItem value="fiche_salaire_2">💰 Fiche de salaire 2</SelectItem>
                      <SelectItem value="fiche_salaire_3">💰 Fiche de salaire 3</SelectItem>
                      <SelectItem value="contrat_travail">📝 Contrat de travail</SelectItem>
                      <SelectItem value="attestation_employeur">👔 Attestation employeur</SelectItem>
                      <SelectItem value="releve_bancaire_fonds_propres">🏦 Relevé bancaire fonds propres</SelectItem>
                      <SelectItem value="attestation_3a">🏦 Attestation 3e pilier (3a)</SelectItem>
                      <SelectItem value="attestation_lpp">🏦 Attestation LPP</SelectItem>
                      <SelectItem value="attestation_epl">🏦 Attestation EPL</SelectItem>
                      <SelectItem value="attestation_libre_passage">🏦 Attestation libre passage</SelectItem>
                      <SelectItem value="justificatif_placements">📊 Justificatif placements</SelectItem>
                      <SelectItem value="justificatif_donation">🎁 Justificatif donation / hoirie</SelectItem>
                      <SelectItem value="justificatif_credit_prive">💳 Justificatif crédit privé</SelectItem>
                      <SelectItem value="justificatif_leasing">🚗 Justificatif leasing</SelectItem>
                      <SelectItem value="justificatif_carte_credit">💳 Justificatif carte de crédit</SelectItem>
                      <SelectItem value="justificatif_pension_alimentaire">👶 Pension alimentaire</SelectItem>
                      <SelectItem value="decision_taxation">📋 Décision de taxation</SelectItem>
                      <SelectItem value="declaration_fiscale">📋 Déclaration fiscale</SelectItem>
                      <SelectItem value="accord_transmission">✅ Accord transmission partenaires</SelectItem>
                      <SelectItem value="consentement_donnees">✅ Consentement données financières</SelectItem>
                      <SelectItem value="autre">📄 Autre document achat</SelectItem>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors duration-150 sm:p-8 ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-foreground/40 hover:bg-muted/40'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${dragActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Upload className="h-7 w-7" />
            </span>

            {selectedFile ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
                  <p className="break-all text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
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
                  className="rounded-full px-4"
                >
                  Changer de fichier
                </Button>
              </div>
            ) : (
              <>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Glissez-déposez votre fichier ici
                </p>
                <p className="mb-4 text-xs text-muted-foreground">ou</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full px-5"
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

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setSelectedType('autre');
              }}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={!selectedFile || isUploading}
              className="rounded-full"
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

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onOpenChange={(open) => {
          setPreviewDialogOpen(open);
          if (!open && previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[95vh] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex min-w-0 items-center gap-3 text-base font-semibold">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Eye className="h-4 w-4" />
              </span>
              <span className="truncate">{previewDocument?.nom}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="h-[80vh] overflow-hidden rounded-xl border border-border/70 bg-muted/40">
            {previewDocument?.type?.includes('pdf') ? (
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex h-full flex-col items-center justify-center px-4 text-center text-muted-foreground">
                  <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FileText className="h-7 w-7" />
                  </span>
                  <p className="mb-4 text-sm">Impossible d'afficher le PDF dans le navigateur.</p>
                  <Button onClick={() => handleDownload(previewDocument)} className="rounded-full">
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
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aperçu non disponible pour ce type de fichier
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Pencil className="h-5 w-5" />
              </span>
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
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} className="rounded-full">
              Annuler
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newDocumentName.trim()}
              className="rounded-full"
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </span>
              Supprimer le document
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer "<span className="font-medium text-foreground">{selectedDoc?.nom}</span>" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashPage>
  );
}
