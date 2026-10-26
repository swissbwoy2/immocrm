import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Mail, Phone, MapPin, Calendar, Users, DollarSign,
  Home, Building2, Briefcase, Heart, Car, Upload, FileText,
  Download, Trash2, User, Edit, RefreshCw,
  Wallet, Search, CheckCircle2, XCircle, PawPrint, Music,
  Image as ImageIcon, File as FileGenericIcon, Clock, TrendingUp, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { calculateDaysElapsed, calculateDaysRemaining, formatTimeRemaining } from '@/utils/calculations';
import { getMandatDates } from '@/utils/mandatDates';
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
import { EditClientProfileDialog } from '@/components/EditClientProfileDialog';
import { MissingDocumentsAlert } from '@/components/MissingDocumentsAlert';
import { ExtraitPoursuitesHeroCard } from '@/components/ExtraitPoursuitesHeroCard';
import { useClientCandidates, ClientCandidate } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck } from '@/hooks/useSolvabilityCheck';
import { usePurchaseSolvabilityCheck } from '@/hooks/usePurchaseSolvabilityCheck';
import { usePurchaseProject, computeProgression } from '@/hooks/usePurchaseProject';
import { getBuyerAnnualIncome, getBuyerMonthlyIncome, parseZones, formatZones } from '@/lib/buyerProfile';
import { isPurchaseBuyer } from '@/lib/journey';
import { formatCHF, libelleStatutBancaire } from '@/lib/purchaseFinancing';
import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { PurchaseSolvabilityAlert } from '@/components/PurchaseSolvabilityAlert';
import { ClientCandidatesManager } from '@/components/ClientCandidatesManager';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';
import { Progress } from '@/components/ui/progress';
import { PremiumAgentCard } from '@/components/premium';
import {
  DASH_CARD,
  DashPage,
  DashPageHeader,
  DashSection,
  DashEmptyState,
  DashBadge,
  TodoCard,
} from '@/components/client/dashboard/DashPrimitives';

/* ------------------------------------------------------------------ */
/* Briques locales (même rendu que le tableau de bord achat)           */
/* ------------------------------------------------------------------ */

/** Pastille ronde d'icône. */
function IconDot({ icon: Icon, tone = 'primary', size = 'md' }: { icon: LucideIcon; tone?: 'primary' | 'muted' | 'amber' | 'success'; size?: 'md' | 'lg' }) {
  const toneCls = {
    primary: 'bg-primary/10 text-primary',
    muted: 'bg-muted text-foreground',
    amber: 'bg-amber-500/10 text-amber-600',
    success: 'bg-emerald-500/10 text-emerald-600',
  }[tone];
  const sizeCls = size === 'lg' ? 'h-10 w-10' : 'h-9 w-9';
  return (
    <span className={`flex ${sizeCls} shrink-0 items-center justify-center rounded-full ${toneCls}`}>
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]'} />
    </span>
  );
}

/** Carte titrée d'un bloc d'informations. */
function InfoCard({ icon, title, action, children }: { icon: LucideIcon; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconDot icon={icon} />
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Montant clé (revenu, budget, capacité) : pastille d'icône, libellé, valeur en CHF. */
function FinanceTile({ title, value, icon, badge, currency = 'CHF' }: { title: string; value: number; icon: LucideIcon; badge?: string; currency?: string }) {
  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex items-center gap-3">
        <IconDot icon={icon} />
        <p className="min-w-0 text-sm text-muted-foreground">{title}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {(value || 0).toLocaleString('fr-CH')} <span className="text-sm font-medium text-muted-foreground">{currency}</span>
      </p>
      {badge && (
        <div className="mt-2">
          <DashBadge tone="muted">{badge}</DashBadge>
        </div>
      )}
    </div>
  );
}

/** Valeur simple : libellé + chiffre, détail éventuel dessous. */
function ValueTile({ label, value, valueClassName = 'text-foreground', className = 'rounded-xl border border-border/70 bg-card p-4', children }: {
  label: string; value: ReactNode; valueClassName?: string; className?: string; children?: ReactNode;
}) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueClassName}`}>{value}</p>
      {children}
    </div>
  );
}

interface InfoItem {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

/** Grille libellé / valeur (remplace PremiumInfoGrid, mêmes données). */
function InfoGrid({ items, columns = 2 }: { items: InfoItem[]; columns?: 1 | 2 }) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${columns === 2 ? 'md:grid-cols-2' : ''}`}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="flex min-w-0 items-start gap-3 rounded-xl border border-border/70 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <div className="truncate text-sm font-medium text-foreground">
                {item.value || <span className="text-muted-foreground">Non renseigné</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Carte document (remplace PremiumDocumentCard, mêmes actions). */
function DocCard({ document: doc, onDownload, onDelete }: { document: any; onDownload: (doc: any) => void; onDelete: (doc: any) => void }) {
  const type: string = doc.type || '';
  const Icon = type.includes('pdf') ? FileText : type.includes('image') ? ImageIcon : FileGenericIcon;
  const fileType = type.includes('pdf') ? 'PDF' : type.includes('png') ? 'PNG' : (type.includes('jpeg') || type.includes('jpg')) ? 'JPG' : 'Fichier';
  const size = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  return (
    <div className={`${DASH_CARD} flex flex-col p-4`}>
      <div className="flex items-start gap-3">
        <IconDot icon={Icon} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground" title={doc.nom}>{doc.nom}</p>
          <div className="mt-1 flex items-center gap-2">
            <DashBadge tone="muted">{fileType}</DashBadge>
            <span className="text-xs text-muted-foreground">{size(doc.taille)}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Ajouté le {new Date(doc.date_upload).toLocaleDateString('fr-CH')}
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => onDownload(doc)}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Télécharger
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(doc)}
          aria-label={`Supprimer ${doc.nom}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** État vide des documents (remplace PremiumDocumentEmptyState). */
function DocEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <DashEmptyState
      icon={FileText}
      title="Aucun document uploadé"
      action={
        <Button onClick={onUpload} size="sm" className="rounded-full">
          Ajouter un document
        </Button>
      }
    />
  );
}

/** Progression du mandat de recherche location (remplace PremiumMandatProgress, mêmes données). */
function MandatProgressCard({ daysElapsed, daysRemaining, startDate, isRelogged, reloggedStatus, totalDays = 90 }: {
  daysElapsed: number;
  daysRemaining: number;
  startDate: string;
  isRelogged: boolean;
  reloggedStatus: 'signature_effectuee' | 'etat_lieux_fixe' | 'cles_remises' | null;
  totalDays?: number;
}) {
  if (isRelogged) {
    const reloggedLabel = reloggedStatus === 'cles_remises'
      ? 'Relogé !'
      : reloggedStatus === 'etat_lieux_fixe'
        ? 'EDL fixé'
        : reloggedStatus === 'signature_effectuee'
          ? 'Bail signé'
          : 'Relogé';
    return (
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        <div className="flex items-start gap-3">
          <IconDot icon={Home} tone="success" size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Mandat terminé avec succès !</h3>
              <DashBadge tone="success">Succès</DashBadge>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{reloggedLabel}</p>
            <p className="text-sm text-muted-foreground">Félicitations ! Le client a trouvé son logement.</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold tabular-nums text-foreground">100%</p>
            <p className="text-xs text-muted-foreground">Terminé</p>
          </div>
        </div>
      </div>
    );
  }

  const pct = Math.min((daysElapsed / totalDays) * 100, 100);
  const endDate = new Date(new Date(startDate).getTime() + totalDays * 24 * 60 * 60 * 1000);
  const status = daysRemaining <= 0
    ? { label: 'Expiré', tone: 'danger' as const, icon: AlertTriangle, bar: 'bg-destructive' }
    : daysElapsed < totalDays * 0.5
      ? { label: 'En bonne voie', tone: 'success' as const, icon: TrendingUp, bar: 'bg-emerald-500' }
      : daysElapsed < totalDays * 0.75
        ? { label: 'Mi-parcours', tone: 'warning' as const, icon: Clock, bar: 'bg-amber-500' }
        : { label: 'Fin proche', tone: 'warning' as const, icon: AlertTriangle, bar: 'bg-amber-500' };
  const StatusIcon = status.icon;

  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconDot icon={Calendar} />
          <h3 className="text-base font-semibold text-foreground">Progression du mandat</h3>
        </div>
        <DashBadge tone={status.tone}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {status.label}
        </DashBadge>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{Math.ceil(daysRemaining)}</p>
          <p className="text-sm text-muted-foreground">jours restants</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-foreground">{Math.round(pct)}%</p>
          <p className="text-xs text-muted-foreground">{Math.floor(daysElapsed)}/{totalDays}j</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${status.bar} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex justify-between gap-2 text-xs text-muted-foreground">
        <div className="text-left">
          <p className="font-medium text-foreground">Début</p>
          <p>{new Date(startDate).toLocaleDateString('fr-CH')}</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Mi-parcours</p>
          <p>45 jours</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-foreground">Fin</p>
          <p>{endDate.toLocaleDateString('fr-CH')}</p>
        </div>
      </div>
    </div>
  );
}

/** Statut légal (poursuites, curatelle) : libellé + pastille Oui / Non. */
function LegalStatusRow({ label, flagged, okLabel }: { label: string; flagged: boolean; okLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <DashBadge tone={flagged ? 'danger' : 'success'}>
        {flagged ? (
          <><XCircle className="mr-1 h-3 w-3" /> Oui</>
        ) : (
          <><CheckCircle2 className="mr-1 h-3 w-3" /> {okLabel}</>
        )}
      </DashBadge>
    </div>
  );
}

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
    extrait_poursuites: 'autre',
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
      <div className="p-4 md:p-8" role="status" aria-label="Chargement du dossier">
        <div className="h-7 w-44 rounded bg-muted/60" />
        <div className="mt-6 h-24 max-w-xl rounded bg-muted/40" />
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
      <div className="flex flex-1 items-center justify-center p-4">
        <div className={`${DASH_CARD} w-full max-w-md p-6 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <User className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Profil non chargé</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Impossible de charger votre profil client. Cliquez sur le bouton ci-dessous pour réessayer.
          </p>
          <div className="mt-5 space-y-2">
            <Button onClick={loadData} className="w-full rounded-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Rafraîchir
            </Button>
            <Button onClick={handleInitializeProfile} variant="outline" className="w-full rounded-full">
              Forcer le chargement
            </Button>
          </div>
        </div>
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
      <DashPage className="space-y-8">
        <DashPageHeader
          title="Mon dossier achat"
          subtitle="Votre dossier d'accompagnement à l'achat immobilier"
          action={
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Acheteur
            </span>
          }
        />

        {/* Mandat d'achat */}
        <DashSection title="Mon mandat d'achat">
          <div className={`${DASH_CARD} p-4 md:p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <IconDot icon={FileText} />
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">
                    {isActive ? "Projet d'achat actif" : "Projet d'achat en attente d'activation"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Durée contractuelle du mandat achat : 6 mois à compter de l'activation par Immo-Rama.ch.</p>
                </div>
              </div>
              <DashBadge tone={isActive ? 'success' : 'muted'}>{isActive ? 'Actif' : 'En attente'}</DashBadge>
            </div>
            <div className="mt-4">
              {isActive ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">Mandat achat actif — 6 mois</span>
                    <span className="font-semibold tabular-nums text-foreground">{progression.pourcentage}%</span>
                  </div>
                  <Progress value={progression.pourcentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">Progression du mandat d'accompagnement à l'achat (durée contractuelle 6 mois).</p>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-3 text-sm text-foreground">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>Votre suivi démarrera après activation par votre conseiller.</span>
                </div>
              )}
            </div>
          </div>
        </DashSection>

        {/* Financement achat */}
        <DashSection title="Financement achat">
          {!financingComplete ? (
            <TodoCard
              icon={Wallet}
              tone="primary"
              title="Financement à compléter"
              description="Votre conseiller complétera votre capacité d'achat, vos fonds propres et votre statut bancaire."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceTile title="Revenu annuel retenu" value={computed.revenuTotal} icon={DollarSign} />
              <FinanceTile title="Fonds propres disponibles" value={computed.fondsPropresTotal} icon={Wallet} />
              <FinanceTile title="Prix cible" value={computed.prixCible} icon={Home} />
              <FinanceTile title="Capacité d'achat" value={computed.capaciteAchatMax} icon={Search} />
              <FinanceTile title="Hypothèque estimée" value={computed.montantHypothecaire} icon={Building2} />
              <ValueTile className={`${DASH_CARD} p-4 md:p-5`} label="Fonds propres requis" value={fmt(computed.fondsPropresRequis)} />
              <ValueTile className={`${DASH_CARD} p-4 md:p-5`} label="Charges théoriques mensuelles" value={fmt(computed.chargesMensuelles)} />
              <ValueTile className={`${DASH_CARD} p-4 md:p-5`} label="Taux d'effort" value={`${computed.tauxEffort.toFixed(1)}%`} />
              <ValueTile className={`${DASH_CARD} p-4 md:p-5`} label="Statut bancaire" value={libelleStatutBancaire(financing?.statut_bancaire)} />
            </div>
          )}
        </DashSection>

        {/* Documents achat */}
        <DashSection
          title="Documents achat"
          action={
            <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="shrink-0 rounded-full" aria-label="Ajouter un document">
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Ajouter un document</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          }
        >
          {(() => {
            const categories = [...new Set(achatDocuments.map(d => d.category))];
            return (
              <div className={`${DASH_CARD} space-y-5 p-4 md:p-5`}>
                {categories.map(cat => (
                  <div key={cat}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {achatDocuments.filter(d => d.category === cat).map(doc => (
                        <div key={doc.label} className="flex items-center gap-2 rounded-xl border border-border/70 p-3">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="text-sm text-foreground">{doc.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((doc) => (
                <DocCard key={doc.id} document={doc} onDownload={handleDownload} onDelete={(doc) => { setSelectedDoc(doc); setDeleteDialogOpen(true); }} />
              ))}
            </div>
          ) : (
            <DocEmptyState onUpload={() => setUploadDialogOpen(true)} />
          )}
        </DashSection>

        {agent && (
          <DashSection title="Mon conseiller">
            <PremiumAgentCard agent={agent} onMessage={() => navigate('/client/messagerie')} onCall={() => window.location.href = `tel:${agent.telephone}`} />
          </DashSection>
        )}

        {/* Upload Dialog achat */}
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) setSelectedDocType('piece_identite'); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Ajouter un document achat</DialogTitle>
              <DialogDescription>Formats acceptés : PDF, JPG, PNG (max 5 MB)</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type de document</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece_identite">Pièce d'identité</SelectItem>
                  <SelectItem value="permis_sejour">Permis de séjour</SelectItem>
                  <SelectItem value="extrait_poursuites">Extrait des poursuites</SelectItem>
                  <SelectItem value="certificat_salaire">Certificat de salaire annuel</SelectItem>
                  <SelectItem value="fiche_salaire_1">Fiche de salaire 1</SelectItem>
                  <SelectItem value="fiche_salaire_2">Fiche de salaire 2</SelectItem>
                  <SelectItem value="fiche_salaire_3">Fiche de salaire 3</SelectItem>
                  <SelectItem value="contrat_travail">Contrat de travail</SelectItem>
                  <SelectItem value="attestation_employeur">Attestation employeur</SelectItem>
                  <SelectItem value="releve_bancaire_fonds_propres">Relevé bancaire fonds propres</SelectItem>
                  <SelectItem value="attestation_3a">Attestation 3e pilier (3a)</SelectItem>
                  <SelectItem value="attestation_lpp">Attestation LPP</SelectItem>
                  <SelectItem value="attestation_epl">Attestation EPL</SelectItem>
                  <SelectItem value="attestation_libre_passage">Attestation libre passage</SelectItem>
                  <SelectItem value="justificatif_placements">Justificatif placements</SelectItem>
                  <SelectItem value="justificatif_donation">Justificatif donation / hoirie</SelectItem>
                  <SelectItem value="justificatif_credit_prive">Justificatif crédit privé</SelectItem>
                  <SelectItem value="justificatif_leasing">Justificatif leasing</SelectItem>
                  <SelectItem value="justificatif_carte_credit">Justificatif carte de crédit</SelectItem>
                  <SelectItem value="justificatif_pension_alimentaire">Justificatif pension alimentaire</SelectItem>
                  <SelectItem value="decision_taxation">Décision de taxation</SelectItem>
                  <SelectItem value="declaration_fiscale">Déclaration fiscale</SelectItem>
                  <SelectItem value="accord_transmission">Accord de transmission partenaires</SelectItem>
                  <SelectItem value="consentement_donnees">Consentement traitement données</SelectItem>
                  <SelectItem value="autre">Autre document achat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-150 ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Upload className="h-7 w-7" /></span>
              <p className="mb-2 text-sm font-medium text-foreground">Glissez-déposez votre fichier ici</p>
              <p className="mb-4 text-xs text-muted-foreground">ou</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-full"><Upload className="mr-2 h-4 w-4" />Sélectionner un fichier</Button>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
            </div>
            <DialogFooter><Button variant="outline" className="rounded-full" onClick={() => setUploadDialogOpen(false)}>Annuler</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" />Supprimer le document</AlertDialogTitle>
              <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer "{selectedDoc?.nom}" ? Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashPage>
    );
  }

  // Source unique de vérité (identique à « Mon contrat » et au tableau de bord) : date de signature du mandat,
  // jours de pause, échéance officielle et reconduction de 90 jours.
  const mandatInfo = getMandatDates(client as any);
  const daysElapsed = mandatInfo.daysSinceSignature;
  const daysRemaining = mandatInfo.daysRemaining;
  const mandatCycleStart = (mandatInfo.cycleStart ?? new Date(client.date_ajout || client.created_at)).toISOString();
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  return (
    <DashPage className="space-y-8">
      <DashPageHeader
        title="Mon dossier"
        subtitle="Toutes vos informations personnelles"
        action={
          <Button onClick={handleEditProfileClick} className="rounded-full">
            <Edit className="mr-2 h-4 w-4" />
            Modifier mes informations
          </Button>
        }
      />

      {/* Mon mandat : progression + alertes du dossier */}
      <DashSection title="Mon mandat">
        {(() => {
          // Check if client is relogged - need to load candidatures
          const isRelogged = client.statut === 'reloge';

          return (
            <MandatProgressCard
              daysElapsed={daysElapsed}
              daysRemaining={daysRemaining}
              startDate={mandatCycleStart}
              isRelogged={isRelogged}
              reloggedStatus={isRelogged ? 'cles_remises' : null}
            />
          );
        })()}

        {/* Extrait de poursuites — bandeau hero */}
        <ExtraitPoursuitesHeroCard showWhenValid />

        {/* Alerte documents manquants */}
        <MissingDocumentsAlert documents={documents} />
      </DashSection>

      {/* Situation financière */}
      <DashSection title="Situation financière">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FinanceTile
            title="Revenu mensuel"
            value={client.revenus_mensuels || 0}
            icon={DollarSign}
          />

          <FinanceTile
            title={isAcheteur ? "Prix d'achat recherché" : "Budget maximum"}
            value={client.budget_max || 0}
            icon={DollarSign}
          />

          {isAcheteur ? (
            <FinanceTile
              title="Prix max finançable"
              value={purchaseSolvabilityResult.prixAchatMax}
              icon={Home}
              badge="Règle 33% charges"
            />
          ) : (
            <FinanceTile
              title="Budget recommandé"
              value={budgetRecommande}
              icon={DollarSign}
              badge="Règle du tiers"
            />
          )}
        </div>

        {/* Section Capacité d'achat pour les acheteurs */}
        {isAcheteur && (
          <InfoCard icon={Home} title="Capacité d'achat">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ValueTile label="Prix max finançable" value={`${purchaseSolvabilityResult.prixAchatMax.toLocaleString('fr-CH')} CHF`} />
              <ValueTile label="Apport disponible" value={`${(client.apport_personnel || 0).toLocaleString('fr-CH')} CHF`}>
                <p className="text-xs text-muted-foreground">
                  Requis (26%): {purchaseSolvabilityResult.apportRequis.toLocaleString('fr-CH')} CHF
                </p>
                {purchaseSolvabilityResult.apportManquant > 0 && (
                  <p className="text-xs text-destructive">
                    Manque: {purchaseSolvabilityResult.apportManquant.toLocaleString('fr-CH')} CHF
                  </p>
                )}
              </ValueTile>
              <ValueTile label="Charges mensuelles estimées" value={`${purchaseSolvabilityResult.chargesMensuelles.toLocaleString('fr-CH')} CHF`}>
                <p className="text-xs text-muted-foreground">Intérêts + amortissement + entretien</p>
              </ValueTile>
              <ValueTile
                label="Taux d'effort"
                value={`${purchaseSolvabilityResult.tauxEffort}%`}
                valueClassName={purchaseSolvabilityResult.tauxEffort > 33 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}
              >
                <p className="text-xs text-muted-foreground">Maximum recommandé: 33%</p>
              </ValueTile>
            </div>
          </InfoCard>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Détails des charges */}
          <InfoCard icon={DollarSign} title="Détails des charges">
            <InfoGrid
                columns={1}
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
          </InfoCard>

          {/* Statuts légaux */}
          <InfoCard icon={FileText} title="Statuts légaux">
            <div className="space-y-3">
              <LegalStatusRow label="Poursuites / Actes de défaut" flagged={!!client.poursuites} okLabel="Aucune" />
              <LegalStatusRow label="Sous curatelle" flagged={!!client.curatelle} okLabel="Non" />
            </div>
          </InfoCard>
        </div>

        {/* Solvabilité - Alerte détaillée */}
        {isAcheteur ? (
          <PurchaseSolvabilityAlert result={purchaseSolvabilityResult} />
        ) : (
          <SolvabilityAlert result={solvabilityResult} appearance="client" />
        )}

        {/* Gestion des candidats */}
        <ClientCandidatesManager
          clientId={client.id}
          clientRevenus={client.revenus_mensuels || 0}
          budgetDemande={client.budget_max || 0}
          onCandidatesChange={refreshCandidates}
        />
      </DashSection>

      {/* Mon profil */}
      <DashSection title="Mon profil">
        <InfoCard icon={User} title="Informations personnelles">
          <InfoGrid
            items={[
              { icon: Mail, label: 'Email', value: profile.email },
              { icon: Phone, label: 'Téléphone', value: profile.telephone || 'Non renseigné' },
              { icon: Users, label: 'Situation familiale', value: client.situation_familiale || 'Non renseigné' },
              { icon: Building2, label: 'Nationalité / Permis', value: `${client.nationalite || 'Non renseigné'} • ${client.type_permis || 'Non renseigné'}` },
            ]}
          />
        </InfoCard>

        <InfoCard icon={Briefcase} title="Situation professionnelle">
          <InfoGrid
            items={[
              { icon: Briefcase, label: 'Profession', value: client.profession || '-' },
              { icon: Building2, label: 'Employeur', value: client.employeur || '-' },
              { icon: Building2, label: "Secteur d'activité", value: client.secteur_activite || '-' },
              { icon: FileText, label: 'Type de contrat', value: client.type_contrat || '-' },
              { icon: Calendar, label: "Date d'engagement", value: client.date_engagement ? new Date(client.date_engagement).toLocaleDateString('fr-CH') : '-' },
              { icon: Calendar, label: 'Ancienneté', value: calculateAnciennete(client.date_engagement, client.anciennete_mois) || '-' },
              { icon: DollarSign, label: 'Source des revenus', value: client.source_revenus || '-' },
              isAcheteur
                ? { icon: DollarSign, label: 'Revenu annuel retenu', value: `${getBuyerAnnualIncome(purchaseHook.financing, client).toLocaleString('fr-CH')} CHF (soit ${getBuyerMonthlyIncome(purchaseHook.financing, client).toLocaleString('fr-CH')} CHF/mois)` }
                : { icon: DollarSign, label: 'Revenu mensuel net', value: `${(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF` },
            ]}
          />
        </InfoCard>
      </DashSection>

      {/* Ma recherche */}
      <DashSection title="Ma recherche">
        {/* Critères de recherche */}
        <InfoCard icon={Search} title="Critères de recherche">
          <InfoGrid
            items={[
              { icon: Home, label: 'Type de bien', value: client.type_bien || 'Non renseigné' },
              { icon: Home, label: 'Nombre de pièces souhaité', value: client.pieces ? `${client.pieces} pièces` : 'Non renseigné' },
              { icon: DollarSign, label: isAcheteur ? "Prix d'achat recherché" : 'Budget maximum', value: `${(client.budget_max || 0).toLocaleString('fr-CH')} CHF` },
              { icon: MapPin, label: parseZones(client.region_recherche).length > 1 ? 'Zones recherchées' : 'Zone recherchée', value: formatZones(parseZones(client.region_recherche)) || 'Non renseigné' },
            ]}
          />

          {/* Souhaits particuliers */}
          {(client.souhaits_particuliers || client.animaux !== null || client.vehicules !== null || client.instrument_musique !== null) && (
            <div className="mt-5 border-t border-border/70 pt-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Heart className="h-4 w-4 text-primary" />
                Souhaits particuliers
              </h4>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3">
                  <PawPrint className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-foreground">Animaux: {client.animaux ? 'Oui' : 'Non'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3">
                  <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-foreground">Véhicules: {client.vehicules ? 'Oui' : 'Non'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3">
                  <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-foreground">Instrument: {client.instrument_musique ? 'Oui' : 'Non'}</span>
                </div>
                {client.numero_plaques && (
                  <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3">
                    <Car className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm text-foreground">Plaques: {client.numero_plaques}</span>
                  </div>
                )}
              </div>
              {client.souhaits_particuliers && (
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{client.souhaits_particuliers}</p>
                </div>
              )}
            </div>
          )}
        </InfoCard>

        {/* Logement actuel */}
        <InfoCard icon={Home} title="Logement actuel">
          <InfoGrid
            items={[
              { icon: Home, label: 'Loyer actuel', value: client.loyer_actuel ? `${client.loyer_actuel.toLocaleString('fr-CH')} CHF/mois` : '-' },
              { icon: Home, label: 'Nombre de pièces', value: client.pieces_actuel ? `${client.pieces_actuel} pièces` : '-' },
              { icon: Calendar, label: 'Depuis le', value: client.depuis_le ? new Date(client.depuis_le).toLocaleDateString('fr-CH') : '-' },
              { icon: Building2, label: 'Gérance actuelle', value: client.gerance_actuelle || '-' },
              { icon: Phone, label: 'Contact gérance', value: client.contact_gerance || '-' },
              { icon: FileText, label: 'Motif de changement', value: client.motif_changement || '-' },
            ]}
          />
        </InfoCard>
      </DashSection>

      {/* Mon agent */}
      {agent && (
        <DashSection title="Mon agent">
          <PremiumAgentCard
            agent={agent}
            onMessage={() => navigate('/client/messagerie')}
            onCall={() => window.location.href = `tel:${agent.telephone}`}
          />
        </DashSection>
      )}

      {/* Mes documents */}
      <DashSection
        title="Mes documents"
        action={
          <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="shrink-0 rounded-full" aria-label="Ajouter un document">
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un document</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        }
      >
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <DocCard
                key={doc.id}
                document={doc}
                onDownload={handleDownload}
                onDelete={(doc) => {
                  setSelectedDoc(doc);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <DocEmptyState onUpload={() => setUploadDialogOpen(true)} />
        )}
      </DashSection>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Ajouter un document
            </DialogTitle>
            <DialogDescription>
              Formats acceptés : PDF, JPG, PNG (max 5 MB)
            </DialogDescription>
          </DialogHeader>

          <div
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-150 ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/40'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-7 w-7" />
            </span>
            <p className="mb-2 text-sm font-medium text-foreground">
              Glissez-déposez votre fichier ici
            </p>
            <p className="mb-4 text-xs text-muted-foreground">ou</p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full"
            >
              <Upload className="mr-2 h-4 w-4" />
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
            <Button variant="outline" className="rounded-full" onClick={() => setUploadDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Supprimer le document
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedDoc?.nom}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
        <CandidateDocumentsSection
          clientId={client.id}
          clientUserId={user?.id || ''}
          clientName={profile ? `${profile.prenom} ${profile.nom}` : ''}
          candidates={candidates}
          onDocumentsChange={loadData}
        />
      )}
    </DashPage>
  );
}
