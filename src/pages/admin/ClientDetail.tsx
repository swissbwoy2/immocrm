import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Clock, CheckCircle2, AlertCircle, CalendarDays, FileCheck, FileText, Send, Shield, Users, Search, LayoutGrid, FolderOpen, Wallet, Activity, Mail, UserX, Ban, Inbox } from 'lucide-react';
import { StaffCancellationDialog } from '@/components/mandat/StaffCancellationDialog';
import { fetchCandidatCriteresMap, mergeCandidatCriteres } from '@/lib/candidatCriteresMerge';
import { CandidatGarantCard } from '@/components/candidat/CandidatGarantCard';
import { InfosPostulationCard } from '@/components/infos-postulation/InfosPostulationCard';
import { AdminCreditsCard } from '@/components/credits/AdminCreditsCard';
import { DownloadClientPDFButton } from '@/components/DownloadClientPDFButton';
import { ClientActivityStats } from '@/components/admin/ClientActivityStats';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getStoragePath } from '@/lib/documentUtils';
import { mandatElapsedFor } from '@/utils/mandatDates';
import { SendEmailDialog } from '@/components/SendEmailDialog';
import { MergeDocumentsDialog } from '@/components/MergeDocumentsDialog';
import { ClientCandidatesManager } from '@/components/ClientCandidatesManager';
import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';
import { useClientCandidates } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck, hasStableStatus } from '@/hooks/useSolvabilityCheck';
import { ApporteurInfoCard } from '@/components/ApporteurInfoCard';
import { SwissRomandeMapGoogle } from '@/components/SwissRomandeMapGoogle';
import { useAbaNinjaInvoice } from '@/hooks/useAbaNinjaInvoice';
import {
  ReletterStatusBanner,
  ReletterFinancialCard,
  ReletterCurrentSituationCard,
  ReletterFileMgmtCard,
  ReletterCriteriaCard,
  ReletterPropertyFeaturesCard,
  ReletterProfilesProposedCard,
  ReletterDossiersTransmisCard,
  ReletterAddressBadge,
} from '@/components/admin/ReletterDetailSections';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { PurchaseCreateButton } from '@/components/admin/purchase/PurchaseCreateButton';
import { PurchaseClientDetailPremium } from '@/components/admin/purchase/PurchaseClientDetailPremium';
import { isPurchaseBuyer } from '@/lib/journey';
import { EditClientProfileDialog } from '@/components/EditClientProfileDialog';
import { toSwissTime, formatSwissDate } from '@/lib/dateUtils';
import { formatZurichDateTime } from '@/lib/dateZurich';
import { DashBadge, DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import { FICHE_TABS, chf, dossierPrincipalStatus, getCandidatureStatutLabel, type Agent, type Client, type FicheTab, type Profile, type Tone } from '@/components/admin/client-detail/model';
import { FicheCard, Notice } from '@/components/admin/client-detail/parts';
import { ClientDetailHeader, type ConfirmKind } from '@/components/admin/client-detail/ClientDetailHeader';
import { ClientSummaryTiles, ClientTabsRail, ClientTodoList, TabPanel, type SummaryTile, type TabDef, type TodoItem } from '@/components/admin/client-detail/ClientSummary';
import { MandatProgressCard } from '@/components/admin/client-detail/MandatProgressCard';
import { FollowUpCard, PersonalInfoCard } from '@/components/admin/client-detail/ClientIdentityCards';
import { CurrentSituationCard, FinancialSituationCard, OtherInfoCard, ProfessionalSituationCard, SearchCriteriaCard } from '@/components/admin/client-detail/ClientProfileCards';
import { UpcomingVisitsCard, VisitDetailDialog } from '@/components/admin/client-detail/ClientVisitsSection';
import { OfferDetailDialog, SentOffersCard, TodayOffersCard } from '@/components/admin/client-detail/ClientOffersSection';
import { CandidaturesCard } from '@/components/admin/client-detail/ClientCandidaturesSection';
import { DocumentsCard, PreviewDocumentDialog, RenameDocumentDialog, UploadDocumentDialog } from '@/components/admin/client-detail/ClientDocumentsSection';
import { InvoiceCard, MandatContractCard } from '@/components/admin/client-detail/ClientMandatSection';
import { ClientEditDialog } from '@/components/admin/client-detail/ClientEditDialog';
import { ClientConfirmDialogs } from '@/components/admin/client-detail/ClientConfirmDialogs';

/**
 * Fiche client admin (/admin/clients/:id).
 * L'état, les chargements et les actions vivent ici ; l'affichage est découpé en sections
 * dans src/components/admin/client-detail/ (en-tête, résumé, à faire, onglets).
 */
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [offres, setOffres] = useState<any[]>([]);
  const [candidatures, setCandidatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deleting, setDeleting] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [regeneratingContract, setRegeneratingContract] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  const [relouerRequest, setRelouerRequest] = useState<any | null>(null);
  const [relouerCandidates, setRelouerCandidates] = useState<any[]>([]);

  // Hook pour les candidats supplémentaires et solvabilité
  const { candidates, refresh: refreshCandidates } = useClientCandidates(id);
  const documentPersons = candidates.map((c) => ({
    id: c.id,
    label: `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() || 'Personne liée',
  }));
  const solvabilityResult = useSolvabilityCheck(client, candidates);
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  
  // Hook pour AbaNinja
  const { loading: abaNinjaLoading, createInvoice } = useAbaNinjaInvoice();
  
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
  const [newDocumentPerson, setNewDocumentPerson] = useState<string>('client');
  const [newDocumentName, setNewDocumentName] = useState('');
  const [newDocumentType, setNewDocumentType] = useState<string>('autre');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  // IMPORTANT: hook appelé inconditionnellement AVANT tout early return pour préserver l'ordre des hooks.
  const purchaseHook = usePurchaseProject({ clientId: client?.id ?? null });



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

      // Complète les critères vides avec ceux du candidat (candidat_criteres) ;
      // les valeurs déjà renseignées dans clients restent prioritaires.
      const criteresMap = await fetchCandidatCriteresMap([clientData.user_id]);
      setClient(mergeCandidatCriteres(clientData, criteresMap.get(clientData.user_id)));

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

      // Load offers for this client
      const { data: offresData, error: offresError } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', id)
        .order('date_envoi', { ascending: false })
        .limit(15000);

      if (offresError) throw offresError;
      setOffres(offresData || []);

      // Load candidatures with offer details
      const { data: candidaturesData, error: candidaturesError } = await supabase
        .from('candidatures')
        .select('*, offres(adresse, prix, pieces, surface)')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (candidaturesError) throw candidaturesError;
      setCandidatures(candidaturesData || []);

      // Load reloueur data if applicable (reloueur pur OU parcours mixte chercheur + reloueur)
      if (clientData.journey_type === 'property_reletting' || clientData.journey_type === 'mixed') {
        const { data: reqData } = await supabase
          .from('relouer_requests')
          .select('*')
          .eq('user_id', clientData.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setRelouerRequest(reqData || null);
        if (reqData?.id) {
          const { data: candData } = await supabase
            .from('relouer_candidates')
            .select('*')
            .eq('request_id', reqData.id)
            .order('created_at', { ascending: false });
          setRelouerCandidates(candData || []);
        }
      } else {
        setRelouerRequest(null);
        setRelouerCandidates([]);
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

  // Visites à venir de ce client (statuts actifs uniquement, futures)
  const [upcomingVisites, setUpcomingVisites] = useState<any[]>([]);
  const [coursiersMap, setCoursiersMap] = useState<Record<string, string>>({});
  const [selectedVisite, setSelectedVisite] = useState<any | null>(null);

  // Offres reçues aujourd'hui (jour calendaire suisse)
  const [todayOffres, setTodayOffres] = useState<any[]>([]);
  const [selectedTodayOffre, setSelectedTodayOffre] = useState<any | null>(null);
  const [offreRecipients, setOffreRecipients] = useState<{ name: string; statut: string }[]>([]);
  const [offreRecipientsLoading, setOffreRecipientsLoading] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    const loadUpcomingVisites = async () => {
      try {
        const { data } = await supabase
          .from('visites')
          .select('id, date_visite, adresse, statut, est_deleguee, coursier_id, statut_coursier, offre_id, offres:offre_id(id, titre, adresse, prix, pieces, surface, etage, disponibilite, type_bien, description, lien_annonce, contact_gerance, contact_annonceur, contact_visite, concierge_nom, concierge_tel, statut)')
          .eq('client_id', client.id)
          .in('statut', ['proposee', 'planifiee', 'confirmee', 'deleguee', 'a_deleguer'])
          .gte('date_visite', new Date().toISOString())
          .order('date_visite', { ascending: true })
          .limit(15000);

        const visites = data || [];
        setUpcomingVisites(visites);

        const coursierIds = Array.from(new Set(visites.map((v: any) => v.coursier_id).filter(Boolean)));
        if (coursierIds.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('id, prenom, nom').in('id', coursierIds as string[]);
          const map: Record<string, string> = {};
          (profs || []).forEach((p: any) => {
            map[p.id] = [p.prenom, p.nom].filter(Boolean).join(' ') || p.id;
          });
          setCoursiersMap(map);
        } else {
          setCoursiersMap({});
        }
      } catch (error) {
        console.error('Error loading upcoming visites:', error);
      }
    };
    loadUpcomingVisites();
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) return;
    const loadTodayOffres = async () => {
      try {
        const { data } = await supabase
          .from('offres')
          .select('id, titre, adresse, prix, pieces, surface, etage, disponibilite, type_bien, description, lien_annonce, contact_gerance, contact_annonceur, contact_visite, concierge_nom, concierge_tel, statut, date_envoi')
          .eq('client_id', client.id)
          .not('date_envoi', 'is', null)
          .order('date_envoi', { ascending: false })
          .limit(15000);

        const todayKey = formatSwissDate(toSwissTime(new Date().toISOString()), 'yyyy-MM-dd');
        const todays = (data || []).filter((o: any) => {
          if (!o.date_envoi) return false;
          return formatSwissDate(toSwissTime(o.date_envoi), 'yyyy-MM-dd') === todayKey;
        });
        setTodayOffres(todays);
      } catch (error) {
        console.error('Error loading today offres:', error);
      }
    };
    loadTodayOffres();
  }, [client?.id]);

  // Charge les autres clients ayant reçu la même offre (même lien_annonce, sinon même adresse + prix)
  useEffect(() => {
    if (!selectedTodayOffre) {
      setOffreRecipients([]);
      return;
    }
    const loadRecipients = async () => {
      setOffreRecipientsLoading(true);
      try {
        let query = supabase
          .from('offres')
          .select('id, client_id, statut')
          .limit(15000);
        if (selectedTodayOffre.lien_annonce) {
          query = query.eq('lien_annonce', selectedTodayOffre.lien_annonce);
        } else {
          query = query.eq('adresse', selectedTodayOffre.adresse || '').eq('prix', selectedTodayOffre.prix);
        }
        const { data: sameOffres } = await query;
        const rows = sameOffres || [];
        const clientIds = Array.from(new Set(rows.map((r: any) => r.client_id).filter(Boolean)));
        const nameByClientId: Record<string, string> = {};
        if (clientIds.length > 0) {
          const { data: cls } = await supabase.from('clients').select('id, user_id').in('id', clientIds as string[]);
          const userIds = Array.from(new Set((cls || []).map((c: any) => c.user_id).filter(Boolean)));
          const userToClient: Record<string, string> = {};
          (cls || []).forEach((c: any) => { userToClient[c.user_id] = c.id; });
          if (userIds.length > 0) {
            const { data: profs } = await supabase.from('profiles').select('id, prenom, nom').in('id', userIds as string[]);
            (profs || []).forEach((p: any) => {
              const cid = userToClient[p.id];
              if (cid) nameByClientId[cid] = [p.prenom, p.nom].filter(Boolean).join(' ') || 'Client';
            });
          }
        }
        setOffreRecipients(rows.map((r: any) => ({
          name: nameByClientId[r.client_id] || 'Client',
          statut: r.statut || '',
        })));
      } catch (error) {
        console.error('Error loading offre recipients:', error);
        setOffreRecipients([]);
      } finally {
        setOffreRecipientsLoading(false);
      }
    };
    loadRecipients();
  }, [selectedTodayOffre]);

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

      const currentUser = (await supabase.auth.getUser()).data.user;
      const purchaseCategoryMap: Record<string, string> = {
        piece_identite: 'identite', permis_sejour: 'identite',
        certificat_salaire: 'revenus', fiche_salaire: 'revenus', fiche_salaire_2: 'revenus', fiche_salaire_3: 'revenus',
        contrat_travail: 'revenus', attestation_employeur: 'revenus',
        releve_bancaire_fonds_propres: 'fonds_propres', attestation_3a: 'fonds_propres', attestation_lpp: 'fonds_propres',
        attestation_epl: 'fonds_propres', attestation_libre_passage: 'fonds_propres',
        justificatif_placements: 'fonds_propres', justificatif_donation: 'fonds_propres',
        justificatif_credit_prive: 'charges', justificatif_leasing: 'charges',
        justificatif_carte_credit: 'charges', justificatif_pension_alimentaire: 'charges',
        decision_taxation: 'fiscalite', declaration_fiscale: 'fiscalite',
        accord_transmission: 'autorisation', consentement_donnees: 'autorisation',
      };

      const isPurchaseDoc = isPurchaseEligible && purchaseHook.project?.id;
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          nom: selectedFile.name,
          type: selectedFile.type,
          taille: selectedFile.size,
          user_id: currentUser?.id,
          client_id: client.id,
          type_document: selectedDocType,
          url: fileName,
          ...(isPurchaseDoc ? {
            purchase_project_id: purchaseHook.project!.id,
            purchase_category: purchaseCategoryMap[selectedDocType] || 'autre',
          } : {}),
        } as any);

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
        .update({ nom: newDocumentName.trim(), type_document: newDocumentType })
        .eq('id', documentToRename.id);

      if (error) throw error;

      // Document rattaché à une autre personne du dossier (ex. fiche de salaire de la conjointe).
      const nextPerson = newDocumentPerson === 'client' ? null : newDocumentPerson;
      if ((documentToRename.candidate_id ?? null) !== nextPerson) {
        const { data: moved, error: moveError } = await supabase.rpc('document_changer_personne', {
          p_document_id: documentToRename.id, p_candidate_id: nextPerson,
        });
        if (moveError || !(moved as { ok?: boolean; motif?: string } | null)?.ok) throw moveError ?? new Error((moved as { ok?: boolean; motif?: string } | null)?.motif ?? 'Personne non modifiée');
      }

      toast({
        title: 'Document mis à jour',
        description: 'Le nom et la catégorie du document ont été mis à jour',
      });

      setRenameDialogOpen(false);
      setDocumentToRename(null);
      setNewDocumentName('');
      setNewDocumentType('autre');
      loadDocuments();
      setDocumentsRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error renaming document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de renommer le document',
        variant: 'destructive',
      });
    }
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
      
      // Une seule conversation par client : on ouvre la sienne si elle existe
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', client.id)
        .eq('conversation_type', 'client-agent')
        .order('created_at', { ascending: true })
        .limit(1)
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

  const handleCreateAbaNinjaInvoice = async () => {
    if (!client || !profile) return;
    
    const result = await createInvoice({
      clientId: client.id,
      prenom: profile.prenom,
      nom: profile.nom,
      email: profile.email,
      telephone: profile.telephone || '',
      adresse: client.adresse || '',
      typeRecherche: client.type_recherche || client.type_bien || 'Louer'
    });
    
    if (result.success) {
      // Refresh client data to get the new AbaNinja refs
      loadClientData();
    }
  };

  const [relaunching, setRelaunching] = useState(false);

  const handleRelaunchSearch = async () => {
    if (!client || !profile) return;
    if (client.refund_status === 'pending' || client.refund_status === 'processed') {
      toast({
        title: 'Impossible de relancer',
        description: 'Un remboursement est en cours. Terminez-le avant de relancer une nouvelle recherche.',
        variant: 'destructive',
      });
      return;
    }

    setRelaunching(true);
    try {
      const nowIso = new Date().toISOString();

      // 1. Reset mandate cycle: remet le compteur à J0 / 90
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          statut: 'actif',
          mandat_date_signature: nowIso,
          date_ajout: nowIso,
          mandate_pause_days: 0,
          mandate_paused_at: null,
          cancellation_requested_at: null,
          refund_status: 'not_applicable',
          derniere_relance_at: nowIso,
          relance_count: (client.relance_count ?? 0) + 1,
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      // 2. Génération de la nouvelle facture d'acompte CHF 300.-
      const invoiceResult = await createInvoice({
        clientId: client.id,
        prenom: profile.prenom,
        nom: profile.nom,
        email: profile.email,
        telephone: profile.telephone || '',
        adresse: client.adresse || '',
        typeRecherche: 'Louer',
      });

      // 3. Notification in-app au client + agent assigné
      try {
        if (client.user_id) {
          await supabase.rpc('create_notification', {
            p_user_id: client.user_id,
            p_type: 'mandat_relance',
            p_title: '🔄 Nouvelle recherche activée',
            p_message: `Votre recherche de logement est réactivée pour 90 jours. Une nouvelle facture d'acompte de CHF 300.- vous a été envoyée par email.`,
            p_link: '/client/mon-contrat',
            p_metadata: JSON.stringify({ client_id: client.id }),
          });
        }
        if (client.agent_id) {
          const { data: agentRow } = await supabase
            .from('agents')
            .select('user_id')
            .eq('id', client.agent_id)
            .maybeSingle();
          if (agentRow?.user_id) {
            await supabase.rpc('create_notification', {
              p_user_id: agentRow.user_id,
              p_type: 'mandat_relance',
              p_title: '🔄 Nouvelle recherche relancée',
              p_message: `Une nouvelle recherche de 90 jours vient d'être ouverte pour ${profile.prenom} ${profile.nom}.`,
              p_link: `/admin/clients/${client.id}`,
              p_metadata: JSON.stringify({ client_id: client.id }),
            });
          }
        }
      } catch (notifErr) {
        console.warn('Notification error (non-blocking):', notifErr);
      }

      toast({
        title: '✅ Nouvelle recherche lancée',
        description: invoiceResult.success
          ? 'Le mandat repart pour 90 jours et la facture CHF 300.- a été envoyée.'
          : 'Le mandat repart pour 90 jours. Attention : la facture AbaNinja n\'a pas pu être générée automatiquement.',
      });

      loadClientData();
    } catch (error: any) {
      console.error('Error relaunching search:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de relancer la recherche',
        variant: 'destructive',
      });
    } finally {
      setRelaunching(false);
    }
  };






  // ===== Organisation de la fiche (affichage uniquement, aucun appel) =====
  // Onglet actif en lien profond (?tab=…), sans changer la route.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as FicheTab | null;
  const activeTab: FicheTab = tabParam && FICHE_TABS.includes(tabParam) ? tabParam : 'apercu';
  const tabsRef = useRef<HTMLDivElement>(null);
  const openTab = (tab: FicheTab, scroll = false) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'apercu') next.delete('tab'); else next.set('tab', tab);
      return next;
    }, { replace: true });
    if (scroll) tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // Les panneaux montés en permanence (carte Google) se redimensionnent quand ils redeviennent visibles.
  useEffect(() => {
    const t = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
    return () => window.clearTimeout(t);
  }, [activeTab]);
  // Confirmation ouverte depuis le menu « Plus » (suspendre, stopper, réactiver, supprimer).
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  // Complétude du dossier principal : recalculée seulement quand la liste des documents change.
  const dossierStatus = useMemo(() => dossierPrincipalStatus(documents), [documents]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4" role="status">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-[15px] text-muted-foreground">Chargement du client…</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!client || !profile) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-background px-4">
        <div className={cn(DASH_CARD, 'w-full max-w-md px-6 py-10 text-center')}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <User className="h-7 w-7 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Client non trouvé</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">Ce client n'existe pas ou a été supprimé</p>
          <Button
            onClick={() => navigate('/admin/clients')}
            className="mt-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux clients
          </Button>
        </div>
      </div>
    );
  }

   // Déterminer la date de fin du mandat si le client est relogé/stoppé/suspendu
  const clientStatut = client.statut;
  const isActivated = ['actif', 'reloge', 'stoppe', 'suspendu'].includes(clientStatut || '');
  const isFrozenStatus = ['reloge', 'stoppe', 'suspendu'].includes(clientStatut || '');
  
  const reloggedCandidatureForCalc = candidatures.find(c => 
    ['signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(c.statut)
  );
  const mandatEndDate = isFrozenStatus 
    ? ((client as any).date_changement_statut || (client as any).updated_at || null)
    : (reloggedCandidatureForCalc?.cles_remises_at || 
       reloggedCandidatureForCalc?.signature_effectuee_at || 
       reloggedCandidatureForCalc?.date_etat_lieux || null);
  
  const daysElapsed = isActivated ? mandatElapsedFor(client as any, mandatEndDate) : 0;
  const daysRemaining = isActivated ? 90 - daysElapsed : 90;
  const progressPercentage = isActivated ? (daysElapsed / 90) * 100 : 0;
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);


  // Check if client has stable status
  const clientHasStableStatus = hasStableStatus(client.type_permis, client.nationalite);
  const isPurchaseEligible = isPurchaseBuyer(client, purchaseHook.project);
  const isReletter = !isPurchaseEligible && client.journey_type === 'property_reletting';
  // purchaseHook est déjà appelé en haut du composant (avant les early returns).


  const handleCandidatureStatutChange = async (candidatureId: string, newStatut: string, offreId?: string) => {
    try {
      const { error: candError } = await supabase
        .from('candidatures')
        .update({ statut: newStatut })
        .eq('id', candidatureId);

      if (candError) throw candError;

      // Also update offres table to sync status
      if (offreId) {
        const offreStatut = newStatut === 'acceptee' ? 'acceptee' : newStatut === 'refusee' ? 'refusee' : 'candidature_deposee';
        await supabase
          .from('offres')
          .update({ statut: offreStatut })
          .eq('id', offreId);
        
        setOffres(prev => 
          prev.map(o => o.id === offreId ? { ...o, statut: offreStatut } : o)
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

  // ===== Parcours achat : fiche admin premium acheteur =====
  if (purchaseHook.project || isPurchaseEligible) {
    // Si acheteur sans projet encore, proposer la création
    if (!purchaseHook.project && isPurchaseEligible) {
      return (
        <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
          <div className="p-4 md:p-8 space-y-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{profile.prenom} {profile.nom}</h1>
              <p className="text-sm text-muted-foreground">{profile.email}{profile.telephone ? ` · ${profile.telephone}` : ''}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 animate-fade-in">
              <div className="p-2 rounded-full bg-amber-500/20 shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">Projet d'achat en attente d'activation</p>
                <p className="text-sm text-muted-foreground">Mandat achat : 6 mois. Le suivi démarrera après activation par votre conseiller.</p>
              </div>
            </div>
            <PurchaseCreateButton clientId={client.id} userId={client.user_id} assignedAgentId={client.agent_id || null} onCreated={() => purchaseHook.reload()} />
          </div>
        </div>
      );
    }

    return (
      <>
        <PurchaseClientDetailPremium
          client={client}
          profile={profile}
          agent={agent}
          purchaseHook={purchaseHook}
          navigate={navigate}
          onInvite={handleInvite}
          inviting={inviting}
          onSendEmailOpen={() => setSendEmailDialogOpen(true)}
          onSendMessage={handleSendMessage}
          onEditOpen={handleEditClick}
          onDeleteConfirm={handleDelete}
          deleting={deleting}
          onCreateInvoice={handleCreateAbaNinjaInvoice}
          abaNinjaLoading={abaNinjaLoading}
          onUploadDoc={() => setUploadDialogOpen(true)}
        />

        {/* Buyer-specific dialogs — full editor (personal, finances, professional, criteria, housing) */}
        <EditClientProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          client={client}
          profile={profile}
          onSaved={loadClientData}
        />

        <SendEmailDialog
          open={sendEmailDialogOpen}
          onOpenChange={setSendEmailDialogOpen}
          clientId={client.id}
          clientName={`${profile.prenom} ${profile.nom}`}
          clientEmail={profile.email}
        />
      </>
    );
  }

  // ===== Actions déplacées telles quelles depuis l'ancien rendu (mêmes appels, mêmes messages) =====
  const handleSuspend = async () => {
    const { error } = await supabase.from('clients').update({ statut: 'suspendu', date_changement_statut: new Date().toISOString() }).eq('id', client.id);
    if (!error) { toast({ title: 'Recherche suspendue' }); loadClientData(); }
  };

  const handleStop = async () => {
    const { error } = await supabase.from('clients').update({ statut: 'stoppe', date_changement_statut: new Date().toISOString() }).eq('id', client.id);
    if (!error) { toast({ title: 'Recherche stoppée' }); loadClientData(); }
  };

  const handleReactivate = async () => {
    const { error } = await supabase.from('clients').update({ statut: 'actif', date_changement_statut: null }).eq('id', client.id);
    if (!error) {
      // 📱 WhatsApp welcome on reactivation (fire-and-forget)
      supabase.functions.invoke('wa-send-welcome', { body: { client_id: client.id } })
        .catch((e) => console.error('wa-send-welcome failed:', e));
      toast({ title: 'Recherche réactivée' });
      loadClientData();
    }
  };

  // Download full mandate PDF (always regenerated to ensure FULL legal text)
  const handleDownloadFullMandat = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-full-mandat-pdf', {
        body: { client_id: client.id },
      });
      if (error) throw error;
      if (!data?.pdf_base64) throw new Error('Aucun PDF retourné');
      const bytes = Uint8Array.from(atob(data.pdf_base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || `Mandat_Complet_${profile?.nom || 'client'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading full mandate:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le mandat complet',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateMandat = async () => {
    setRegeneratingContract(true);
    try {
      // Toujours générer le mandat COMPLET (toutes les dispositions juridiques)
      const { error: funcError } = await supabase.functions.invoke('generate-full-mandat-pdf', {
        body: { client_id: client.id },
      });

      if (funcError) throw funcError;

      toast({
        title: 'Mandat complet régénéré',
        description: 'Le PDF complet a été régénéré avec succès',
      });

      loadClientData();
    } catch (error) {
      console.error('Error regenerating contract:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de régénérer le mandat complet',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingContract(false);
    }
  };

  const handleGenerateMandat = async () => {
    setRegeneratingContract(true);
    try {
      const { error: funcError } = await supabase.functions.invoke('generate-full-mandat-pdf', {
        body: { client_id: client.id },
      });

      if (funcError) throw funcError;

      toast({
        title: 'Mandat complet généré',
        description: 'Le PDF complet a été généré avec succès',
      });

      loadClientData();
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le mandat complet',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingContract(false);
    }
  };

  const handleTestCancellationEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('mandate-renewal-action', {
        body: { action: 'test_staff_email', client_id: client.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Envoi échoué');
      const recipients = (data.recipients || []).join(', ');
      toast({
        title: '✅ Email de test envoyé',
        description: `Destinataires : ${recipients}`,
      });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Envoi du test échoué', variant: 'destructive' });
    }
  };

  // Navigations (une seule définition chacune, réutilisée par l'en-tête, « À faire » et les sections)
  const goPrefillMandat = () => navigate(`/admin/clients/${client.id}/mandat-prefill`);
  const goAssignAgent = () => navigate('/admin/assignations');
  const goSendOffer = () => navigate(`/admin/envoyer-offre?clientId=${client.id}`);

  // ===== Données d'affichage (calculs purs) =====
  const clientName = `${profile.prenom} ${profile.nom}`;
  const isFullyActivated = !!client.mandat_signature_data && !!client.demande_mandat_id && client.statut === 'actif';
  const isRelogged = clientStatut === 'reloge' || candidatures.some(c => ['signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(c.statut));
  const mandatRunning = isActivated && !isFrozenStatus && !isRelogged;
  const pendingCandidatures = candidatures.filter((c) => c.statut === 'en_attente').length;
  const visitesADeleguer = upcomingVisites.filter((v) => v.statut === 'a_deleguer').length;
  const nextVisite = upcomingVisites[0];

  const status: { label: string; tone: Tone } = (() => {
    if (clientStatut === 'reloge') return { label: 'Relogé', tone: 'success' };
    if (clientStatut === 'stoppe') return { label: 'Stoppé', tone: 'danger' };
    if (clientStatut === 'suspendu') return { label: 'Suspendu', tone: 'warning' };
    if (!isReletter && !isFullyActivated) return { label: "Période d'essai", tone: 'warning' };
    if (clientStatut === 'actif') return { label: 'Actif', tone: 'success' };
    if (clientStatut === 'inactif') return { label: 'Inactif', tone: 'muted' };
    return { label: 'En attente', tone: 'muted' };
  })();
  const journeyLabel = isReletter ? 'Relocation (reloueur)' : client.journey_type === 'mixed' ? 'Location + relocation' : 'Location';
  const mandatShort = !isActivated
    ? 'Mandat non démarré'
    : isFrozenStatus && clientStatut !== 'reloge'
      ? `Figé à J+${Math.floor(daysElapsed)}`
      : isRelogged
        ? 'Mandat terminé'
        : `${Math.max(0, Math.floor(daysRemaining))} j restants`;

  const tiles: SummaryTile[] = [
    ...(isReletter
      ? [{ key: 'candidats', icon: Users, label: 'Candidats', value: relouerCandidates.length, phrase: 'Dossiers reçus', tab: 'candidatures' as FicheTab }]
      : [
          { key: 'offres', icon: Send, label: 'Offres envoyées', value: offres.length, phrase: `${todayOffres.length} aujourd'hui`, tab: 'offres' as FicheTab },
        ]),
    {
      key: 'visites', icon: CalendarDays, label: 'Visites à venir', value: upcomingVisites.length,
      phrase: nextVisite ? `Proch. ${formatZurichDateTime(nextVisite.date_visite, { short: true })}` : 'Aucune prévue', tab: 'offres',
    },
    ...(!isReletter
      ? [{ key: 'candidatures', icon: FileCheck, label: 'Candidatures', value: candidatures.length, phrase: pendingCandidatures ? `${pendingCandidatures} en attente` : 'Aucune en attente', tab: 'candidatures' as FicheTab }]
      : []),
    {
      key: 'documents', icon: FileText, label: 'Dossier principal', value: `${dossierStatus.pct} %`,
      phrase: `${dossierStatus.complete}/${dossierStatus.total} pièces · ${documents.length} doc.`, tab: 'documents',
    },
    ...(!isReletter
      ? [{ key: 'solvabilite', icon: Shield, label: 'Solvabilité', value: solvabilityResult.isSolvable ? 'Solvable' : 'Non solvable', phrase: `Recommandé ${chf(budgetRecommande)}`, tab: 'dossier' as FicheTab }]
      : []),
    {
      key: 'mandat', icon: Clock, label: isReletter ? 'Relocation' : 'Mandat', value: isActivated ? `J+${Math.floor(daysElapsed)}` : '—',
      phrase: mandatShort, tab: 'mandat',
    },
  ];

  const todos: TodoItem[] = [];
  if (!profile.actif) {
    todos.push({ key: 'invite', icon: Mail, tone: 'warning', title: 'Compte non activé', detail: "Le client n'a pas encore activé son accès", actionLabel: inviting ? 'Envoi…' : 'Inviter', onAction: handleInvite, disabled: inviting });
  }
  if (!isReletter && !isFullyActivated && !isFrozenStatus) {
    todos.push({ key: 'essai', icon: Clock, tone: 'warning', title: "Période d'essai : mandat à compléter", detail: 'Mandat, signature et documents requis pour activer le compte', actionLabel: 'Pré-remplir', onAction: goPrefillMandat });
  }
  if (!agent) {
    todos.push({ key: 'agent', icon: UserX, tone: 'warning', title: 'Aucun agent assigné', detail: 'Nécessaire pour la messagerie', actionLabel: 'Assigner', onAction: goAssignAgent });
  }
  if (mandatRunning && daysRemaining <= 10) {
    todos.push({ key: 'expire', icon: Clock, tone: 'danger', title: `Mandat : ${Math.max(0, Math.floor(daysRemaining))} j restants`, detail: 'Le mandat de 90 jours arrive à échéance', actionLabel: 'Mandat', onAction: () => openTab('mandat', true) });
  }
  if (!isReletter && client.statut === 'actif' && client.mandat_date_signature && daysElapsed >= 80 && daysElapsed <= 90) {
    todos.push({ key: 'rembours', icon: Wallet, tone: 'warning', title: 'Fenêtre de remboursement ouverte', detail: `J${Math.floor(daysElapsed)} (jours 80–90)`, actionLabel: 'Mandat', onAction: () => openTab('mandat', true) });
  }
  if (client.refund_status === 'pending') {
    todos.push({ key: 'refund', icon: Wallet, tone: 'primary', title: 'Remboursement en cours', detail: 'Relance impossible tant qu’il n’est pas terminé', actionLabel: 'Mandat', onAction: () => openTab('mandat', true) });
  }
  if (client.cancellation_requested_at && client.statut === 'actif') {
    todos.push({ key: 'annulation', icon: Ban, tone: 'warning', title: "Demande d'annulation reçue", detail: formatZurichDateTime(client.cancellation_requested_at, { short: true }), actionLabel: 'Mandat', onAction: () => openTab('mandat', true) });
  }
  if (!isReletter && pendingCandidatures > 0) {
    todos.push({ key: 'cand', icon: FileCheck, tone: 'warning', title: `${pendingCandidatures} candidature${pendingCandidatures > 1 ? 's' : ''} à traiter`, detail: 'Accepter ou refuser', actionLabel: 'Ouvrir', onAction: () => openTab('candidatures', true) });
  }
  if (visitesADeleguer > 0) {
    todos.push({ key: 'deleguer', icon: CalendarDays, tone: 'warning', title: `${visitesADeleguer} visite${visitesADeleguer > 1 ? 's' : ''} à déléguer`, actionLabel: 'Voir', onAction: () => openTab('offres', true) });
  }
  if (!isReletter && dossierStatus.manquantes.length > 0) {
    todos.push({ key: 'pieces', icon: FileText, tone: 'primary', title: `${dossierStatus.manquantes.length} pièce${dossierStatus.manquantes.length > 1 ? 's' : ''} manquante${dossierStatus.manquantes.length > 1 ? 's' : ''}`, detail: dossierStatus.manquantes.join(', '), actionLabel: 'Documents', onAction: () => openTab('documents', true) });
  }
  if (!isReletter && !solvabilityResult.isSolvable) {
    todos.push({ key: 'solva', icon: AlertCircle, tone: 'danger', title: 'Dossier non solvable', detail: 'Voir l’analyse de solvabilité', actionLabel: 'Dossier', onAction: () => openTab('dossier', true) });
  }
  if (!client.abaninja_invoice_ref) {
    todos.push({ key: 'facture', icon: Inbox, tone: 'primary', title: 'Facture AbaNinja non créée', actionLabel: 'Facturer', onAction: () => openTab('mandat', true) });
  }

  const tabs: TabDef[] = [
    { key: 'apercu', label: "Vue d'ensemble", icon: LayoutGrid },
    { key: 'recherche', label: isReletter ? 'Logement' : 'Recherche', icon: Search },
    { key: 'dossier', label: 'Dossier', icon: Shield },
    { key: 'documents', label: 'Documents', icon: FolderOpen, count: documents.length },
    { key: 'offres', label: isReletter ? 'Visites' : 'Offres & visites', icon: Send, count: isReletter ? upcomingVisites.length : offres.length },
    { key: 'candidatures', label: 'Candidatures', icon: FileCheck, count: isReletter ? relouerCandidates.length : candidatures.length },
    { key: 'mandat', label: isReletter ? 'Finances' : 'Mandat & finances', icon: Wallet },
    { key: 'activite', label: 'Activité', icon: Activity },
  ];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 md:px-8">
        <ClientDetailHeader
          profile={profile}
          solvable={!isReletter && !isPurchaseEligible && solvabilityResult.isSolvable}
          status={status}
          extraBadges={(
            <>
              {!profile.actif && <DashBadge tone="primary">Non activé</DashBadge>}
              <DashBadge tone="neutral">{journeyLabel}</DashBadge>
            </>
          )}
          meta={<>Agent : {agent ? `${agent.profile.prenom} ${agent.profile.nom}` : 'non assigné'} · {mandatShort}</>}
          onBack={() => navigate('/admin/clients')}
          onMessage={handleSendMessage}
          onEmail={() => setSendEmailDialogOpen(true)}
          onEdit={handleEditClick}
          inviting={inviting}
          onInvite={handleInvite}
          onPrefill={!isReletter ? goPrefillMandat : undefined}
          pdfButton={(
            <DownloadClientPDFButton
              clientId={client.id}
              clientData={client}
              profileData={profile}
              variant="ghost"
            />
          )}
          canSuspendStop={!clientStatut || clientStatut === 'actif' || clientStatut === 'en_attente'}
          canReactivate={clientStatut === 'stoppe' || clientStatut === 'suspendu'}
          deleting={deleting}
          onConfirm={setConfirmKind}
        />

        <div className="mt-4 space-y-4">
          <ClientSummaryTiles tiles={tiles} onOpen={(t) => openTab(t, true)} />
          <ClientTodoList items={todos} />

          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/admin/clients/' + client.id + '/postulation')}>
              <FileText className="mr-1.5 h-4 w-4" /> Fiche de postulation
            </Button>
          </div>

          <div ref={tabsRef} className="scroll-mt-44">
            <ClientTabsRail tabs={tabs} value={activeTab} onChange={(t) => openTab(t)} />
          </div>

          {/* ── Vue d'ensemble ── */}
          <TabPanel tab="apercu" active={activeTab === 'apercu'} className="grid gap-4 space-y-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
            <div className="min-w-0 space-y-4">
              {/* Status banner — reloueur or chercheur */}
              {isReletter ? (
                <>
                  <ReletterStatusBanner request={relouerRequest} />
                  {relouerRequest && <div className="flex flex-wrap gap-2"><ReletterAddressBadge request={relouerRequest} /></div>}
                </>
              ) : isFullyActivated ? (
                <Notice icon={CheckCircle2} tone="success" title="Compte officiellement activé">Mandat signé, documents fournis.</Notice>
              ) : (
                <Notice icon={Clock} tone="warning" title="Période d'essai">
                  Ce client est en période d'essai. Pour activer son compte, il doit remplir le mandat, signer et fournir ses documents.
                </Notice>
              )}
              {/* Parcours mixte : le dossier de relocation s'affiche en plus du suivi chercheur */}
              {!isReletter && !isPurchaseEligible && client.journey_type === 'mixed' && relouerRequest && (
                <FicheCard title="Dossier de relocation (parcours mixte)" bodyClassName="space-y-4">
                  <ReletterStatusBanner request={relouerRequest} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <ReletterFinancialCard request={relouerRequest} />
                    <ReletterPropertyFeaturesCard request={relouerRequest} />
                  </div>
                  <ReletterDossiersTransmisCard candidates={relouerCandidates} />
                </FicheCard>
              )}
              <PersonalInfoCard client={client} profile={profile} stablePermis={clientHasStableStatus} />
              <FollowUpCard client={client} agent={agent} onAssign={goAssignAgent} />
            </div>
            <div className="min-w-0 space-y-4">
              <MandatProgressCard
                isActivated={isActivated}
                clientStatut={clientStatut}
                candidatures={candidatures}
                daysElapsed={daysElapsed}
                daysRemaining={daysRemaining}
                progressPercentage={progressPercentage}
                isReletter={isReletter}
              />
              <UpcomingVisitsCard visites={upcomingVisites} coursiersMap={coursiersMap} onSelect={setSelectedVisite} limit={3} onSeeAll={() => openTab('offres', true)} />
              {!isReletter && <TodayOffersCard offres={todayOffres} onSelect={setSelectedTodayOffre} onSeeAll={() => openTab('offres', true)} />}
            </div>
          </TabPanel>

          {/* ── Recherche (chercheur) / Logement (reloueur) — monté en permanence : la carte charge elle-même son jeton ── */}
          <TabPanel tab="recherche" active={activeTab === 'recherche'} keepMounted className="grid gap-4 space-y-0 lg:grid-cols-2 lg:items-start">
            {/* Critères — chercheur: recherche / reloueur: futur locataire */}
            {isReletter ? <ReletterCriteriaCard request={relouerRequest} /> : <SearchCriteriaCard client={client} />}
            {/* Carte de localisation — chercheur: zones de recherche; reloueur: logement */}
            <SwissRomandeMapGoogle
              client={isReletter && relouerRequest
                ? { ...client, region_recherche: relouerRequest.property_city || relouerRequest.property_canton || client.region_recherche }
                : client}
            />
            {/* Situation actuelle — chercheur / Contact régie — reloueur */}
            {isReletter ? <ReletterCurrentSituationCard request={relouerRequest} /> : <CurrentSituationCard client={client} />}
            {/* Autres informations — chercheur vs logement reloueur */}
            {isReletter ? <ReletterPropertyFeaturesCard request={relouerRequest} /> : <OtherInfoCard client={client} />}
          </TabPanel>

          {/* ── Dossier : finances, solvabilité, situation pro, garant, co-candidats (monté en permanence : co-candidats chargés par le composant) ── */}
          <TabPanel tab="dossier" active={activeTab === 'dossier'} keepMounted>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              {/* Situation financière — chercheur / logement reloueur */}
              {isReletter ? <ReletterFinancialCard request={relouerRequest} /> : <FinancialSituationCard client={client} budgetRecommande={budgetRecommande} />}
              {/* Situation professionnelle — chercheur / Gestion du dossier — reloueur */}
              {isReletter ? (
                <ReletterFileMgmtCard request={relouerRequest} agentName={agent ? `${agent.profile.prenom} ${agent.profile.nom}` : null} />
              ) : (
                <ProfessionalSituationCard client={client} />
              )}
            </div>
            {/* Solvability Alert - chercheur only */}
            {!isReletter && (
              <div className={cn(DASH_CARD, 'p-1')}>
                <SolvabilityAlert result={solvabilityResult} className="relative z-10" />
              </div>
            )}
            {!isReletter && <InfosPostulationCard clientId={client.id} />}
            {(client as any)?.candidat_garant && <CandidatGarantCard garant={(client as any).candidat_garant} />}
            <FicheCard icon={Users} title={isReletter ? 'Candidats intéressés' : 'Co-candidats du dossier'}>
              <ClientCandidatesManager
                clientId={client.id}
                clientRevenus={client.revenus_mensuels ?? 0}
                budgetDemande={client.budget_max ?? 0}
                onCandidatesChange={refreshCandidates}
              />
            </FicheCard>
          </TabPanel>

          {/* ── Documents (monté en permanence : documents des co-candidats chargés par le composant) ── */}
          <TabPanel tab="documents" active={activeTab === 'documents'} keepMounted>
            <DocumentsCard
              documents={documents}
              persons={documentPersons}
              onUpload={() => setUploadDialogOpen(true)}
              onMerge={() => setMergeDialogOpen(true)}
              onPreview={handlePreviewDocument}
              onRename={(doc) => {
                setDocumentToRename(doc);
                setNewDocumentName(doc.nom);
                setNewDocumentType(doc.type_document || 'autre');
                setNewDocumentPerson(doc.candidate_id || 'client');
                setRenameDialogOpen(true);
              }}
              onDownload={handleDownloadDocument}
              onDelete={(doc) => handleDeleteDocument(doc.id, doc.url)}
            />
            {/* Candidate Documents - chercheur only */}
            {!isReletter && (
              <FicheCard icon={FileText} title="Documents des co-candidats">
                <CandidateDocumentsSection
                  clientId={client.id}
                  clientUserId={client.user_id}
                  clientName={`${profile.prenom} ${profile.nom}`}
                  candidates={candidates}
                  agentUserId={user?.id}
                  agentId={client.agent_id || undefined}
                  onDocumentsChange={loadDocuments}
                  key={documentsRefreshKey}
                />
              </FicheCard>
            )}
          </TabPanel>

          {/* ── Offres & visites ── */}
          <TabPanel tab="offres" active={activeTab === 'offres'}>
            <UpcomingVisitsCard visites={upcomingVisites} coursiersMap={coursiersMap} onSelect={setSelectedVisite} />
            {/* Offres envoyées — chercheur only */}
            {!isReletter ? (
              <SentOffersCard offres={offres} onSelect={setSelectedTodayOffre} onSendOffer={goSendOffer} />
            ) : (
              <ReletterProfilesProposedCard count={0} />
            )}
          </TabPanel>

          {/* ── Candidatures (chercheur) / Dossiers transmis (reloueur) ── */}
          <TabPanel tab="candidatures" active={activeTab === 'candidatures'}>
            {!isReletter ? (
              <CandidaturesCard candidatures={candidatures} onStatutChange={handleCandidatureStatutChange} />
            ) : (
              <ReletterDossiersTransmisCard candidates={relouerCandidates} />
            )}
          </TabPanel>

          {/* ── Mandat & finances (monté en permanence : crédits et apporteur chargés par leurs composants) ── */}
          <TabPanel tab="mandat" active={activeTab === 'mandat'} keepMounted>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              {/* Contrat de mandat — chercheur only */}
              {!isReletter && (
                <MandatContractCard
                  client={client}
                  daysElapsed={daysElapsed}
                  regeneratingContract={regeneratingContract}
                  relaunching={relaunching}
                  abaNinjaLoading={abaNinjaLoading}
                  onDownloadFull={handleDownloadFullMandat}
                  onRegenerate={handleRegenerateMandat}
                  onGenerate={handleGenerateMandat}
                  onRefund={() => setRefundDialogOpen(true)}
                  onCancel={() => setCancelDialogOpen(true)}
                  onTestEmail={handleTestCancellationEmail}
                  onRelaunch={handleRelaunchSearch}
                />
              )}
              <div className="min-w-0 space-y-4">
                {/* AbaNinja Invoice */}
                <InvoiceCard invoiceRef={client.abaninja_invoice_ref} loading={abaNinjaLoading} onCreate={handleCreateAbaNinjaInvoice} />
                <AdminCreditsCard userId={(client as any)?.user_id} />
              </div>
            </div>
            {/* Apporteur Info Card */}
            <div className={cn(DASH_CARD, 'p-4 empty:hidden')}>
              <ApporteurInfoCard clientId={client.id} isAdmin={true} />
            </div>
          </TabPanel>

          {/* ── Activité (montée en permanence : statistiques chargées par le composant) ── */}
          <TabPanel tab="activite" active={activeTab === 'activite'} keepMounted>
            <FicheCard icon={Activity} title="Statistiques d'activité">
              <ClientActivityStats
                clientId={client.id}
                clientUserId={client.user_id}
              />
            </FicheCard>
          </TabPanel>
        </div>
      </div>

      {/* Dialog détail visite + offre liée */}
      <VisitDetailDialog visite={selectedVisite} coursiersMap={coursiersMap} onClose={() => setSelectedVisite(null)} />

      {/* Dialog détail offre (reçue aujourd'hui ou envoyée) */}
      <OfferDetailDialog
        offre={selectedTodayOffre}
        recipients={offreRecipients}
        recipientsLoading={offreRecipientsLoading}
        onClose={() => setSelectedTodayOffre(null)}
      />

      {/* Modifier les informations du client */}
      <ClientEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onSave={handleEditSave}
      />

      {/* Suspendre / stopper / réactiver / supprimer */}
      <ClientConfirmDialogs
        kind={confirmKind}
        onClose={() => setConfirmKind(null)}
        onSuspend={handleSuspend}
        onStop={handleStop}
        onReactivate={handleReactivate}
        onDelete={handleDelete}
      />

      {/* Upload Document Dialog */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        isPurchaseEligible={isPurchaseEligible}
        selectedDocType={selectedDocType}
        setSelectedDocType={setSelectedDocType}
        fileInputRef={fileInputRef}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        isUploading={isUploading}
        onSubmit={handleUploadDocument}
      />

      {/* Preview Document Dialog */}
      <PreviewDocumentDialog
        open={previewDialogOpen}
        onOpenChange={(open) => {
          setPreviewDialogOpen(open);
          if (!open && previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
          }
        }}
        previewDocument={previewDocument}
        previewUrl={previewUrl}
        onDownload={handleDownloadDocument}
      />

      {/* Rename Document Dialog */}
      <RenameDocumentDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        name={newDocumentName}
        setName={setNewDocumentName}
        type={newDocumentType}
        setType={setNewDocumentType}
        persons={documentPersons}
        selfLabel={profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || 'Client principal' : 'Client principal'}
        person={newDocumentPerson}
        setPerson={setNewDocumentPerson}
        onSubmit={handleRenameDocument}
      />

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

      <StaffCancellationDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        clientId={client.id}
        clientName={`${profile.prenom} ${profile.nom}`}
        daysSinceSignature={daysElapsed}
        withRefund={true}
        onSuccess={loadClientData}
      />
      <StaffCancellationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        clientId={client.id}
        clientName={`${profile.prenom} ${profile.nom}`}
        daysSinceSignature={daysElapsed}
        withRefund={false}
        onSuccess={loadClientData}
      />
    </div>
  );
}
