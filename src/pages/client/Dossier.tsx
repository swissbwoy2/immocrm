import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, Phone, MapPin, Calendar, Users, DollarSign, 
  Home, Building2, Briefcase, Heart, Car, Upload, FileText,
  Download, Trash2, User, MessageSquare, Edit, RefreshCw,
  Sparkles, Wallet, Search, FolderOpen, CheckCircle2, XCircle
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditClientProfileDialog } from '@/components/EditClientProfileDialog';
import { MissingDocumentsAlert } from '@/components/MissingDocumentsAlert';
import { ExtraitPoursuitesHeroCard } from '@/components/ExtraitPoursuitesHeroCard';
import { useClientCandidates, ClientCandidate } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck } from '@/hooks/useSolvabilityCheck';
import { usePurchaseSolvabilityCheck } from '@/hooks/usePurchaseSolvabilityCheck';
import { usePurchaseProject, computeProgression } from '@/hooks/usePurchaseProject';
import { isPurchaseBuyer } from '@/lib/journey';
import { formatCHF } from '@/lib/purchaseFinancing';
import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { PurchaseSolvabilityAlert } from '@/components/PurchaseSolvabilityAlert';
import { ClientCandidatesManager } from '@/components/ClientCandidatesManager';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';
import { Progress } from '@/components/ui/progress';
import { 
  PremiumPageHeader,
  PremiumMandatProgress,
  PremiumFinanceCard,
  PremiumDossierSection,
  PremiumInfoGrid,
  PremiumAgentCard,
  PremiumDocumentCard,
  PremiumDocumentEmptyState
} from '@/components/premium';

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
  const [selectedDocType, setSelectedDocType] = useState<string>('piece_identite');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping type doc achat → purchase_category
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
    accord_transmission: 'autorisation', consentement_donnees: 'autorisation',
    autre: 'autre',
  };
  const [loading, setLoading] = useState(true);
  
  // Hooks pour la gestion des candidats et solvabilité
  const { candidates, refresh: refreshCandidates } = useClientCandidates(client?.id);
  const purchaseHook = usePurchaseProject({ userId: user?.id, clientId: client?.id });
  const isAcheteur = isPurchaseBuyer(client, purchaseHook.project);
  const solvabilityResult = useSolvabilityCheck(client, candidates);
  const purchaseSolvabilityResult = usePurchaseSolvabilityCheck(client, candidates);

  useEffect(() => {
    loadData();
  }, [user?.id]);

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

      // Load documents. Pour un acheteur, rattacher les anciens uploads au projet achat si possible
      // et filtrer strictement les documents achat afin de ne jamais afficher la liste location.
      const { data: purchaseProjectForDocs } = await supabase
        .from('purchase_projects')
        .select('id, client_id, user_id')
        .or(`client_id.eq.${clientData.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isBuyerForDocs = isPurchaseBuyer(clientData, purchaseProjectForDocs);
      if (isBuyerForDocs && purchaseProjectForDocs?.id) {
        await supabase
          .from('documents')
          .update({ purchase_project_id: purchaseProjectForDocs.id, purchase_category: 'autre' } as any)
          .eq('user_id', user.id)
          .is('purchase_project_id', null);
      }

      let docsQuery = supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('date_upload', { ascending: false });
      if (isBuyerForDocs && purchaseProjectForDocs?.id) {
        docsQuery = docsQuery.eq('purchase_project_id', purchaseProjectForDocs.id);
      }
      const { data: docsData } = await docsQuery;

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
        const purchaseCategory = isAcheteur
          ? (PURCHASE_DOC_CATEGORY_MAP[selectedDocType] || 'autre')
          : null;
        const { error } = await supabase
          .from('documents')
          .insert({
            nom: file.name,
            type: file.type,
            taille: file.size,
            user_id: user!.id,
            client_id: client.id,
            purchase_project_id: isAcheteur ? purchaseHook.project?.id || null : null,
            purchase_category: purchaseCategory,
            type_document: isAcheteur ? selectedDocType : undefined,
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
    setEditProfileDialogOpen(true);
  };

  const calculateAnciennete = (dateEngagement: string | null, ancienneteMois: number | null) => {
    if (ancienneteMois) {
      const years = Math.floor(ancienneteMois / 12);
      const months = ancienneteMois % 12;
      if (years > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
      return `${months} mois`;
    }
    
    if (dateEngagement) {
      const start = new Date(dateEngagement);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      if (years > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
      return `${months} mois`;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">Chargement de votre dossier...</p>
        </div>
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
        <Card className="max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Profil non chargé</h2>
            <p className="text-muted-foreground mb-4">
              Impossible de charger votre profil client. Cliquez sur le bouton ci-dessous pour réessayer.
            </p>
            <div className="space-y-2">
              <Button onClick={loadData} className="w-full group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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

  // 🛡️ Acheteurs : isolation stricte. Aucun contenu location dans le dossier.
  const isBuyerClient = isPurchaseBuyer(client, purchaseHook.project);
  if (isBuyerClient) {
    const project = purchaseHook.project;
    const isActive = project?.statut === 'actif';
    const progression = computeProgression(project?.date_debut_progression, Math.max(180, project?.duree_progression_jours || 180));
    const financing = purchaseHook.financing;
    const computed = purchaseHook.computed;
    const financingComplete = !!computed && (financing?.revenu_annuel_retenu || 0) > 0 && (financing?.prix_cible || 0) > 0;
    const fmt = (value?: number | null) => formatCHF(value || 0);
    const achatDocuments = [
      // Identité
      { label: "Pièce d'identité (passeport / carte d'identité)", category: 'Identité' },
      { label: 'Permis de séjour (si applicable)', category: 'Identité' },
      // Revenus
      { label: 'Certificat de salaire annuel', category: 'Revenus' },
      { label: 'Fiche de salaire (3 derniers mois)', category: 'Revenus' },
      { label: 'Contrat de travail', category: 'Revenus' },
      { label: "Attestation employeur (si nécessaire)", category: 'Revenus' },
      // Fonds propres
      { label: 'Relevé bancaire fonds propres', category: 'Fonds propres' },
      { label: 'Attestation 3e pilier (3a)', category: 'Fonds propres' },
      { label: 'Attestation LPP', category: 'Fonds propres' },
      { label: 'Attestation EPL / retrait pour logement principal', category: 'Fonds propres' },
      { label: 'Attestation libre passage', category: 'Fonds propres' },
      { label: 'Justificatif placements financiers', category: 'Fonds propres' },
      { label: "Justificatif donation / avance d'hoirie", category: 'Fonds propres' },
      // Charges
      { label: 'Justificatif crédit privé', category: 'Charges' },
      { label: 'Justificatif leasing', category: 'Charges' },
      { label: 'Justificatif carte de crédit (mensualités)', category: 'Charges' },
      { label: 'Justificatif pension alimentaire', category: 'Charges' },
      // Fiscalité
      { label: 'Dernière décision de taxation', category: 'Fiscalité' },
      { label: 'Déclaration fiscale (si nécessaire)', category: 'Fiscalité' },
      // Autorisations
      { label: 'Accord de transmission aux partenaires financiers', category: 'Autorisations' },
      { label: 'Consentement traitement des données financières', category: 'Autorisations' },
    ];

    return (
      <div className="relative flex-1 overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
        </div>
        <div className="relative z-10 p-4 md:p-8 space-y-6">
          <PremiumPageHeader
            title="Mon dossier achat"
            subtitle="Votre dossier d'accompagnement à l'achat immobilier"
            icon={FolderOpen}
            action={<Badge className="bg-primary/10 text-primary border-primary/20">Acheteur</Badge>}
            className="mb-6"
          />

          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-xl">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>{isActive ? "Projet d'achat actif" : "Projet d'achat en attente d'activation"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Durée contractuelle du mandat achat : 6 mois à compter de l'activation par Immo-Rama.ch.</p>
                </div>
                <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Actif' : 'En attente'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isActive ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Mandat achat actif — 6 mois</span>
                    <span>{progression.pourcentage}%</span>
                  </div>
                  <Progress value={progression.pourcentage} className="h-3" />
                  <p className="text-xs text-muted-foreground">Progression du mandat d'accompagnement à l'achat (durée contractuelle 6 mois).</p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
                  Votre suivi démarrera après activation par votre conseiller.
                </div>
              )}
            </CardContent>
          </Card>

          <PremiumDossierSection title="Financement achat" icon={Wallet} delay={100}>
            {!financingComplete ? (
              <div className="rounded-xl border border-primary/20/20 bg-blue-500/10 p-4">
                <p className="font-semibold text-primary dark:text-blue-300">Financement à compléter</p>
                <p className="text-sm text-muted-foreground mt-1">Votre conseiller complétera votre capacité d'achat, vos fonds propres et votre statut bancaire.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PremiumFinanceCard title="Revenu annuel retenu" value={computed.revenuTotal} icon={DollarSign} variant="default" delay={0} />
                <PremiumFinanceCard title="Fonds propres disponibles" value={computed.fondsPropresTotal} icon={Wallet} variant="success" delay={50} />
                <PremiumFinanceCard title="Prix cible" value={computed.prixCible} icon={Home} variant="warning" delay={100} />
                <PremiumFinanceCard title="Capacité d'achat" value={computed.capaciteAchatMax} icon={Search} variant="success" delay={150} />
                <PremiumFinanceCard title="Hypothèque estimée" value={computed.montantHypothecaire} icon={Building2} variant="info" delay={200} />
                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-sm text-muted-foreground">Fonds propres requis</p>
                  <p className="text-xl font-bold">{fmt(computed.fondsPropresRequis)}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-sm text-muted-foreground">Charges théoriques mensuelles</p>
                  <p className="text-xl font-bold">{fmt(computed.chargesMensuelles)}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-sm text-muted-foreground">Taux d'effort</p>
                  <p className="text-xl font-bold">{computed.tauxEffort.toFixed(1)}%</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-sm text-muted-foreground">Statut bancaire</p>
                  <p className="text-xl font-bold">{financing?.statut_bancaire || 'À évaluer'}</p>
                </div>
              </div>
            )}
          </PremiumDossierSection>

          <PremiumDossierSection
            title="Documents achat"
            icon={FileText}
            delay={200}
            action={
              <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="group relative overflow-hidden">
                <Upload className="w-4 h-4 mr-2" />
                Ajouter un document
              </Button>
            }
          >
            {(() => {
              const categories = [...new Set(achatDocuments.map(d => d.category))];
              return (
                <div className="space-y-4 mb-6">
                  {categories.map(cat => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {achatDocuments.filter(d => d.category === cat).map(doc => (
                          <div key={doc.label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/30 transition-colors">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm">{doc.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc, index) => (
                  <PremiumDocumentCard key={doc.id} document={doc} onDownload={handleDownload} onDelete={(doc) => { setSelectedDoc(doc); setDeleteDialogOpen(true); }} delay={index * 50} />
                ))}
              </div>
            ) : (
              <PremiumDocumentEmptyState onUpload={() => setUploadDialogOpen(true)} />
            )}
          </PremiumDossierSection>

          {agent && (
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative p-2 bg-primary/10 rounded-xl"><User className="w-5 h-5 text-primary" /></div>
                <h2 className="text-xl font-semibold">Mon conseiller</h2>
              </div>
              <PremiumAgentCard agent={agent} onMessage={() => navigate('/client/messagerie')} onCall={() => window.location.href = `tel:${agent.telephone}`} />
            </div>
          )}
        </div>

        {/* Upload Dialog achat */}
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) setSelectedDocType('piece_identite'); }}>
          <DialogContent className="backdrop-blur-xl bg-card/95 border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" />Ajouter un document achat</DialogTitle>
              <DialogDescription>Formats acceptés : PDF, JPG, PNG (max 5 MB)</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type de document</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="bg-background/50 border-border/50 focus:border-primary/50">
                  <SelectValue placeholder="Choisir le type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece_identite">🪪 Pièce d'identité</SelectItem>
                  <SelectItem value="permis_sejour">🪪 Permis de séjour</SelectItem>
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
                  <SelectItem value="justificatif_pension_alimentaire">👶 Justificatif pension alimentaire</SelectItem>
                  <SelectItem value="decision_taxation">📋 Décision de taxation</SelectItem>
                  <SelectItem value="declaration_fiscale">📋 Déclaration fiscale</SelectItem>
                  <SelectItem value="accord_transmission">✅ Accord de transmission partenaires</SelectItem>
                  <SelectItem value="consentement_donnees">✅ Consentement traitement données</SelectItem>
                  <SelectItem value="autre">📄 Autre document achat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${dragActive ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><Upload className="w-8 h-8 text-primary" /></div>
              <p className="text-sm font-medium mb-2">Glissez-déposez votre fichier ici</p>
              <p className="text-xs text-muted-foreground mb-4">ou</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="group"><Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />Sélectionner un fichier</Button>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Annuler</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="backdrop-blur-xl bg-card/95 border-border/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" />Supprimer le document</AlertDialogTitle>
              <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer "{selectedDoc?.nom}" ? Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
  const daysRemaining = calculateDaysRemaining(client.date_ajout || client.created_at);
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  return (
    <div className="relative flex-1 overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/10 animate-float"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${5 + i}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 md:p-8 space-y-6">
        {/* Premium Header */}
        <PremiumPageHeader 
          title="Mon dossier"
          subtitle="Toutes vos informations personnelles"
          icon={FolderOpen}
          action={
            <Button onClick={handleEditProfileClick} className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Edit className="w-4 h-4 mr-2" />
              Modifier mes informations
            </Button>
          }
          className="mb-6"
        />

        {/* Premium Mandat Progress */}
        {(() => {
          // Check if client is relogged - need to load candidatures
          const isRelogged = client.statut === 'reloge';
          
          return (
            <PremiumMandatProgress
              daysElapsed={daysElapsed}
              daysRemaining={daysRemaining}
              startDate={client.date_ajout || client.created_at}
              isRelogged={isRelogged}
              reloggedStatus={isRelogged ? 'cles_remises' : null}
            />
          );
        })()}

        {/* Extrait de poursuites — bandeau hero */}
        <ExtraitPoursuitesHeroCard showWhenValid className="mb-6" />

        {/* Alerte documents manquants */}
        <MissingDocumentsAlert documents={documents} />

        {/* Situation financière */}
        <PremiumDossierSection title="Situation financière" icon={Wallet} delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <PremiumFinanceCard
              title="Revenu mensuel"
              value={client.revenus_mensuels || 0}
              icon={DollarSign}
              variant="default"
              delay={0}
            />
            
            <PremiumFinanceCard
              title={isAcheteur ? "Prix d'achat recherché" : "Budget maximum"}
              value={client.budget_max || 0}
              icon={DollarSign}
              variant="warning"
              delay={50}
            />
            
            {isAcheteur ? (
              <PremiumFinanceCard
                title="Prix max finançable"
                value={purchaseSolvabilityResult.prixAchatMax}
                icon={Home}
                variant="info"
                badge="Règle 33% charges"
                delay={100}
              />
            ) : (
              <PremiumFinanceCard
                title="Budget recommandé"
                value={budgetRecommande}
                icon={DollarSign}
                variant="success"
                badge="Règle du tiers"
                delay={100}
              />
            )}
          </div>

          {/* Section Capacité d'achat pour les acheteurs */}
          {isAcheteur && (
            <div className="p-4 rounded-xl bg-blue-500/5 border border-primary/20/20 mb-6">
              <h4 className="font-medium flex items-center gap-2 mb-4">
                <Home className="w-5 h-5 text-primary" />
                Capacité d'achat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Prix max finançable</p>
                  <p className="font-bold text-lg">{purchaseSolvabilityResult.prixAchatMax.toLocaleString('fr-CH')} CHF</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Apport disponible</p>
                  <p className="font-bold text-lg">{(client.apport_personnel || 0).toLocaleString('fr-CH')} CHF</p>
                  <p className="text-xs text-muted-foreground">
                    Requis (26%): {purchaseSolvabilityResult.apportRequis.toLocaleString('fr-CH')} CHF
                  </p>
                  {purchaseSolvabilityResult.apportManquant > 0 && (
                    <p className="text-xs text-red-500">
                      Manque: {purchaseSolvabilityResult.apportManquant.toLocaleString('fr-CH')} CHF
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Charges mensuelles estimées</p>
                  <p className="font-bold text-lg">{purchaseSolvabilityResult.chargesMensuelles.toLocaleString('fr-CH')} CHF</p>
                  <p className="text-xs text-muted-foreground">Intérêts + amortissement + entretien</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Taux d'effort</p>
                  <p className={`font-bold text-lg ${purchaseSolvabilityResult.tauxEffort > 33 ? 'text-red-500' : 'text-green-600'}`}>
                    {purchaseSolvabilityResult.tauxEffort}%
                  </p>
                  <p className="text-xs text-muted-foreground">Maximum recommandé: 33%</p>
                </div>
              </div>
            </div>
          )}

          {/* Détails des charges */}
          <div className="mb-6">
            <h4 className="font-medium flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              Détails des charges
            </h4>
            <PremiumInfoGrid
              columns={2}
              items={[
                { 
                  icon: Home, 
                  label: 'Loyer actuel', 
                  value: client.loyer_actuel ? `${client.loyer_actuel.toLocaleString('fr-CH')} CHF/mois` : '-' 
                },
                { 
                  icon: DollarSign, 
                  label: 'Charges mensuelles', 
                  value: client.charges_mensuelles ? `${client.charges_mensuelles.toLocaleString('fr-CH')} CHF/mois` : '-' 
                },
                { 
                  icon: DollarSign, 
                  label: 'Charges extraordinaires', 
                  value: client.charges_extraordinaires 
                    ? `Oui${client.montant_charges_extra ? ` (${client.montant_charges_extra.toLocaleString('fr-CH')} CHF)` : ''}`
                    : 'Non'
                },
                { 
                  icon: DollarSign, 
                  label: 'Autres crédits en cours', 
                  value: client.autres_credits ? 'Oui' : 'Non'
                },
                { 
                  icon: DollarSign, 
                  label: 'Apport personnel disponible', 
                  value: client.apport_personnel ? `${client.apport_personnel.toLocaleString('fr-CH')} CHF` : '-' 
                },
              ]}
            />
          </div>

          {/* Statuts légaux */}
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              Statuts légaux
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
                <p className="text-sm text-muted-foreground">Poursuites / Actes de défaut</p>
                <Badge variant={client.poursuites ? "destructive" : "secondary"} className={client.poursuites ? "" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"}>
                  {client.poursuites ? (
                    <><XCircle className="w-3 h-3 mr-1" /> Oui</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Aucune</>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
                <p className="text-sm text-muted-foreground">Sous curatelle</p>
                <Badge variant={client.curatelle ? "destructive" : "secondary"} className={client.curatelle ? "" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"}>
                  {client.curatelle ? (
                    <><XCircle className="w-3 h-3 mr-1" /> Oui</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Non</>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </PremiumDossierSection>

        {/* Solvabilité - Alerte détaillée */}
        {isAcheteur ? (
          <PurchaseSolvabilityAlert result={purchaseSolvabilityResult} />
        ) : (
          <SolvabilityAlert result={solvabilityResult} />
        )}

        {/* Gestion des candidats */}
        <ClientCandidatesManager 
          clientId={client.id}
          clientRevenus={client.revenus_mensuels || 0}
          budgetDemande={client.budget_max || 0}
          onCandidatesChange={refreshCandidates}
        />

        {/* Informations personnelles */}
        <PremiumDossierSection title="Informations personnelles" icon={User} delay={200}>
          <PremiumInfoGrid
            columns={2}
            items={[
              { icon: Mail, label: 'Email', value: profile.email },
              { icon: Phone, label: 'Téléphone', value: profile.telephone || 'Non renseigné' },
              { icon: Users, label: 'Situation familiale', value: client.situation_familiale || 'Non renseigné' },
              { icon: Building2, label: 'Nationalité / Permis', value: `${client.nationalite || 'Non renseigné'} • ${client.type_permis || 'Non renseigné'}` },
            ]}
          />
        </PremiumDossierSection>

        {/* Situation professionnelle */}
        <PremiumDossierSection title="Situation professionnelle" icon={Briefcase} delay={300}>
          <PremiumInfoGrid
            columns={2}
            items={[
              { icon: Briefcase, label: 'Profession', value: client.profession || '-' },
              { icon: Building2, label: 'Employeur', value: client.employeur || '-' },
              { icon: Building2, label: "Secteur d'activité", value: client.secteur_activite || '-' },
              { icon: FileText, label: 'Type de contrat', value: client.type_contrat || '-' },
              { icon: Calendar, label: "Date d'engagement", value: client.date_engagement ? new Date(client.date_engagement).toLocaleDateString('fr-CH') : '-' },
              { icon: Calendar, label: 'Ancienneté', value: calculateAnciennete(client.date_engagement, client.anciennete_mois) || '-' },
              { icon: DollarSign, label: 'Source des revenus', value: client.source_revenus || '-' },
              { icon: DollarSign, label: 'Revenu mensuel net', value: `${(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF` },
            ]}
          />
        </PremiumDossierSection>

        {/* Critères de recherche */}
        <PremiumDossierSection title="Critères de recherche" icon={Search} delay={400}>
          <PremiumInfoGrid
            columns={2}
            items={[
              { icon: Home, label: 'Type de bien', value: client.type_bien || 'Non renseigné' },
              { icon: Home, label: 'Nombre de pièces souhaité', value: client.pieces ? `${client.pieces} pièces` : 'Non renseigné' },
              { icon: DollarSign, label: isAcheteur ? "Prix d'achat recherché" : 'Budget maximum', value: `${(client.budget_max || 0).toLocaleString('fr-CH')} CHF` },
              { icon: MapPin, label: 'Région recherchée', value: client.region_recherche || 'Non renseigné' },
            ]}
          />

          {/* Souhaits particuliers */}
          {(client.souhaits_particuliers || client.animaux !== null || client.vehicules !== null || client.instrument_musique !== null) && (
            <div className="mt-6 pt-6 border-t border-border/30">
              <h4 className="font-medium flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary" />
                Souhaits particuliers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-2">
                  <span>🐾</span>
                  <span className="text-sm">Animaux: {client.animaux ? 'Oui' : 'Non'}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-2">
                  <span>🚗</span>
                  <span className="text-sm">Véhicules: {client.vehicules ? 'Oui' : 'Non'}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-2">
                  <span>🎵</span>
                  <span className="text-sm">Instrument: {client.instrument_musique ? 'Oui' : 'Non'}</span>
                </div>
                {client.numero_plaques && (
                  <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-2">
                    <Car className="w-4 h-4 text-primary" />
                    <span className="text-sm">Plaques: {client.numero_plaques}</span>
                  </div>
                )}
              </div>
              {client.souhaits_particuliers && (
                <div className="p-4 rounded-xl bg-muted/30 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{client.souhaits_particuliers}</p>
                </div>
              )}
            </div>
          )}

          {/* Logement actuel */}
          <div className="mt-6 pt-6 border-t border-border/30">
            <h4 className="font-medium flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-primary" />
              Logement actuel
            </h4>
            <PremiumInfoGrid
              columns={2}
              items={[
                { icon: Home, label: 'Loyer actuel', value: client.loyer_actuel ? `${client.loyer_actuel.toLocaleString('fr-CH')} CHF/mois` : '-' },
                { icon: Home, label: 'Nombre de pièces', value: client.pieces_actuel ? `${client.pieces_actuel} pièces` : '-' },
                { icon: Calendar, label: 'Depuis le', value: client.depuis_le ? new Date(client.depuis_le).toLocaleDateString('fr-CH') : '-' },
                { icon: Building2, label: 'Gérance actuelle', value: client.gerance_actuelle || '-' },
                { icon: Phone, label: 'Contact gérance', value: client.contact_gerance || '-' },
                { icon: FileText, label: 'Motif de changement', value: client.motif_changement || '-' },
              ]}
            />
          </div>
        </PremiumDossierSection>

        {/* Mon agent */}
        {agent && (
          <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative p-2 bg-primary/10 rounded-xl">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Mon agent</h2>
            </div>
            <PremiumAgentCard
              agent={agent}
              onMessage={() => navigate('/client/messagerie')}
              onCall={() => window.location.href = `tel:${agent.telephone}`}
            />
          </div>
        )}

        {/* Mes documents */}
        <PremiumDossierSection 
          title="Mes documents" 
          icon={FileText} 
          delay={600}
          action={
            <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Upload className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          }
        >
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc, index) => (
                <PremiumDocumentCard
                  key={doc.id}
                  document={doc}
                  onDownload={handleDownload}
                  onDelete={(doc) => {
                    setSelectedDoc(doc);
                    setDeleteDialogOpen(true);
                  }}
                  delay={index * 50}
                />
              ))}
            </div>
          ) : (
            <PremiumDocumentEmptyState onUpload={() => setUploadDialogOpen(true)} />
          )}
        </PremiumDossierSection>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="backdrop-blur-xl bg-card/95 border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Ajouter un document
            </DialogTitle>
            <DialogDescription>
              Formats acceptés : PDF, JPG, PNG (max 5 MB)
            </DialogDescription>
          </DialogHeader>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              dragActive
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium mb-2">
              Glissez-déposez votre fichier ici
            </p>
            <p className="text-xs text-muted-foreground mb-4">ou</p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="group"
            >
              <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
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
        <AlertDialogContent className="backdrop-blur-xl bg-card/95 border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Supprimer le document
            </AlertDialogTitle>
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
      <EditClientProfileDialog
        open={editProfileDialogOpen}
        onOpenChange={setEditProfileDialogOpen}
        client={client}
        profile={profile}
        isAcheteur={isAcheteur}
        financing={purchaseHook.financing}
        onSaveFinancing={purchaseHook.updateFinancing}
        onSaved={loadData}
      />

      {/* Candidate Documents Section - affichée comme section additionnelle */}
      {client && candidates.length > 0 && (
        <div className="p-4 md:p-8 pt-0">
          <CandidateDocumentsSection
            clientId={client.id}
            clientUserId={user?.id || ''}
            clientName={profile ? `${profile.prenom} ${profile.nom}` : ''}
            candidates={candidates}
            onDocumentsChange={loadData}
          />
        </div>
      )}
    </div>
  );
}
