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
  Download, Trash2, User, MessageSquare, Edit, RefreshCw,
  Sparkles, Wallet, Search, FolderOpen
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
import { EditClientProfileDialog } from '@/components/EditClientProfileDialog';
import { MissingDocumentsAlert } from '@/components/MissingDocumentsAlert';
import { useClientCandidates, ClientCandidate } from '@/hooks/useClientCandidates';
import { useSolvabilityCheck } from '@/hooks/useSolvabilityCheck';
import { usePurchaseSolvabilityCheck } from '@/hooks/usePurchaseSolvabilityCheck';
import { SolvabilityAlert } from '@/components/SolvabilityAlert';
import { PurchaseSolvabilityAlert } from '@/components/PurchaseSolvabilityAlert';
import { ClientCandidatesManager } from '@/components/ClientCandidatesManager';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  
  // Hooks pour la gestion des candidats et solvabilité
  const { candidates, refresh: refreshCandidates } = useClientCandidates(client?.id);
  const isAcheteur = client?.type_recherche === 'Acheter';
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
    setEditProfileDialogOpen(true);
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

  const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
  const daysRemaining = calculateDaysRemaining(client.date_ajout || client.created_at);
  const progressPercentage = Math.min((daysElapsed / 90) * 100, 100);
  const budgetRecommande = Math.round((client.revenus_mensuels || 0) / 3);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header avec animation */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-border/50 backdrop-blur-sm animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 rounded-xl backdrop-blur-sm">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Mon dossier
                </h1>
              </div>
              <p className="text-muted-foreground">Toutes vos informations personnelles</p>
            </div>
            <Button onClick={handleEditProfileClick} className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Edit className="w-4 h-4 mr-2" />
              Modifier mes informations
            </Button>
          </div>
        </div>

        {/* Barre de progression du mandat */}
        <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Progression du mandat
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.floor(daysElapsed)} jours écoulés sur 90
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{formatTimeRemaining(daysRemaining)}</p>
                <p className="text-sm text-muted-foreground">temps restant</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <Progress 
              value={progressPercentage} 
              className="h-3"
              indicatorClassName={
                daysElapsed < 60 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                daysElapsed < 90 ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                'bg-gradient-to-r from-red-500 to-rose-400'
              }
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Début: {new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}</span>
              <span>Fin: {new Date(new Date(client.date_ajout || client.created_at).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-CH')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Alerte documents manquants */}
        <MissingDocumentsAlert documents={documents} />

        {/* Situation financière */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Situation financière</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm">Revenu mensuel</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-2xl font-bold">{(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF</p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm">
                    {isAcheteur ? 'Prix d\'achat recherché' : 'Budget maximum'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-2xl font-bold">{(client.budget_max || 0).toLocaleString('fr-CH')} CHF</p>
              </CardContent>
            </Card>

            {isAcheteur ? (
              <Card className="backdrop-blur-xl bg-blue-500/10 border-blue-500/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <CardHeader className="pb-3 relative">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                    </div>
                    <CardTitle className="text-sm">Prix max finançable</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {purchaseSolvabilityResult.prixAchatMax.toLocaleString('fr-CH')} CHF
                  </p>
                  <Badge variant="secondary" className="mt-1 bg-blue-500/20 text-blue-700 dark:text-blue-300">Règle 33% charges</Badge>
                </CardContent>
              </Card>
            ) : (
              <Card className="backdrop-blur-xl bg-green-500/10 border-green-500/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <CardHeader className="pb-3 relative">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-500/20 rounded-lg">
                      <DollarSign className="w-4 h-4 text-green-500" />
                    </div>
                    <CardTitle className="text-sm">Budget recommandé</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {budgetRecommande.toLocaleString('fr-CH')} CHF
                  </p>
                  <Badge variant="secondary" className="mt-1 bg-green-500/20 text-green-700 dark:text-green-300">Règle du tiers</Badge>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Section Capacité d'achat pour les acheteurs */}
          {isAcheteur && (
            <Card className="mt-4 backdrop-blur-xl bg-blue-500/5 border-blue-500/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-500" />
                  Capacité d'achat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Prix max finançable</p>
                    <p className="font-bold text-lg">{purchaseSolvabilityResult.prixAchatMax.toLocaleString('fr-CH')} CHF</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
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
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Charges mensuelles estimées</p>
                    <p className="font-bold text-lg">{purchaseSolvabilityResult.chargesMensuelles.toLocaleString('fr-CH')} CHF</p>
                    <p className="text-xs text-muted-foreground">Intérêts + amortissement + entretien</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground">Taux d'effort</p>
                    <p className={`font-bold text-lg ${purchaseSolvabilityResult.tauxEffort > 33 ? 'text-red-500' : 'text-green-600'}`}>
                      {purchaseSolvabilityResult.tauxEffort}%
                    </p>
                    <p className="text-xs text-muted-foreground">Maximum recommandé: 33%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Détails des charges */}
          <Card className="mt-4 backdrop-blur-xl bg-card/80 border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Détails des charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Loyer actuel</p>
                  <p className="font-medium">
                    {client.loyer_actuel ? `${client.loyer_actuel.toLocaleString('fr-CH')} CHF/mois` : '-'}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Charges mensuelles</p>
                  <p className="font-medium">
                    {client.charges_mensuelles ? `${client.charges_mensuelles.toLocaleString('fr-CH')} CHF/mois` : '-'}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Charges extraordinaires</p>
                  <p className="font-medium">
                    {client.charges_extraordinaires 
                      ? `Oui${client.montant_charges_extra ? ` (${client.montant_charges_extra.toLocaleString('fr-CH')} CHF)` : ''}`
                      : 'Non'}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Autres crédits en cours</p>
                  <p className="font-medium">{client.autres_credits ? 'Oui' : 'Non'}</p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Apport personnel disponible</p>
                  <p className="font-medium">
                    {client.apport_personnel ? `${client.apport_personnel.toLocaleString('fr-CH')} CHF` : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Statuts légaux */}
          <Card className="mt-4 backdrop-blur-xl bg-card/80 border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Statuts légaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Poursuites / Actes de défaut</p>
                  <Badge variant={client.poursuites ? "destructive" : "secondary"} className={client.poursuites ? "" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"}>
                    {client.poursuites ? '⚠️ Oui' : '✅ Aucune'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Sous curatelle</p>
                  <Badge variant={client.curatelle ? "destructive" : "secondary"} className={client.curatelle ? "" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"}>
                    {client.curatelle ? '⚠️ Oui' : '✅ Non'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informations personnelles */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Informations personnelles</h2>
          </div>
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg">
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{profile.telephone || 'Non renseigné'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Situation familiale</p>
                  <p className="font-medium">{client.situation_familiale || 'Non renseigné'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Building2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Nationalité / Permis</p>
                  <p className="font-medium">{client.nationalite || 'Non renseigné'} • {client.type_permis || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Situation professionnelle */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Situation professionnelle</h2>
          </div>
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Emploi et revenus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Profession</p>
                  <p className="font-medium">{client.profession || '-'}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Employeur</p>
                  <p className="font-medium">{client.employeur || '-'}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Secteur d'activité</p>
                  <p className="font-medium">{client.secteur_activite || '-'}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Type de contrat</p>
                  <p className="font-medium">{client.type_contrat || '-'}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Date d'engagement</p>
                  <p className="font-medium">
                    {client.date_engagement 
                      ? new Date(client.date_engagement).toLocaleDateString('fr-CH')
                      : '-'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Ancienneté</p>
                  <p className="font-medium">
                    {calculateAnciennete(client.date_engagement, client.anciennete_mois) || '-'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Source des revenus</p>
                  <p className="font-medium">{client.source_revenus || '-'}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Revenu mensuel net</p>
                  <p className="font-medium">{(client.revenus_mensuels || 0).toLocaleString('fr-CH')} CHF</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critères de recherche */}
        <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Critères de recherche</h2>
          </div>
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg">
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Type de bien</p>
                  <p className="font-medium">{client.type_bien || 'Non renseigné'}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Nombre de pièces souhaité</p>
                  <p className="font-medium">{client.pieces || 'Non renseigné'} pièces</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    {isAcheteur ? 'Prix d\'achat recherché' : 'Budget maximum'}
                  </p>
                  <p className="font-medium">{(client.budget_max || 0).toLocaleString('fr-CH')} CHF</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">Région recherchée</p>
                  <p className="font-medium">{client.region_recherche || 'Non renseigné'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mon agent */}
        {agent && (
          <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Mon agent</h2>
            </div>
            <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{agent.prenom} {agent.nom}</p>
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                        <Mail className="w-4 h-4 text-primary" />
                        <a href={`mailto:${agent.email}`} className="text-primary hover:underline">
                          {agent.email}
                        </a>
                      </div>
                      {agent.telephone && (
                        <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                          <Phone className="w-4 h-4 text-primary" />
                          <a href={`tel:${agent.telephone}`} className="text-primary hover:underline">
                            {agent.telephone}
                          </a>
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-4 group"
                      onClick={() => navigate('/client/messagerie')}
                    >
                      <MessageSquare className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Envoyer un message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mes documents */}
        <div className="animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Mes documents</h2>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Upload className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc, index) => (
                <Card key={doc.id} className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group animate-fade-in" style={{ animationDelay: `${0.1 * index}s` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <CardContent className="p-4 relative">
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
                        className="flex-1 group/btn"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-3 h-3 mr-1 group-hover/btn:scale-110 transition-transform" />
                        Télécharger
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setDeleteDialogOpen(true);
                        }}
                        className="hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-lg">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Aucun document uploadé
                </p>
                <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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
