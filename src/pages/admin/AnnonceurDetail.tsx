import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ArrowLeft, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Star,
  Globe,
  FileText,
  Ban,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PremiumInfoGrid } from "@/components/premium/PremiumInfoGrid";
import { PremiumKPICard } from "@/components/premium/PremiumKPICard";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";
import { 
  PremiumTable, 
  PremiumTableHeader, 
  PremiumTableRow, 
  TableBody,
  TableHead,
  TableCell
} from "@/components/premium/PremiumTable";

const AnnonceurDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: annonceur, isLoading } = useQuery({
    queryKey: ['annonceur', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonceurs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: annonces = [] } = useQuery({
    queryKey: ['annonces-annonceur', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select('*')
        .eq('annonceur_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const updateStatutMutation = useMutation({
    mutationFn: async (newStatut: string) => {
      const { error } = await supabase
        .from('annonceurs')
        .update({ statut: newStatut })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annonceur', id] });
      toast.success("Statut mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const verifyAnnonceurMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('annonceurs')
        .update({ 
          est_verifie: true, 
          date_verification: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annonceur', id] });
      toast.success("Annonceur vérifié");
    },
    onError: () => {
      toast.error("Erreur lors de la vérification");
    },
  });

  const getStatutBadge = (statut: string | null) => {
    switch (statut) {
      case 'actif':
        return <Badge className="bg-success/20 text-success border-success/30">Actif</Badge>;
      case 'suspendu':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Suspendu</Badge>;
      case 'en_attente':
        return <Badge className="bg-warning/20 text-warning border-warning/30">En attente</Badge>;
      default:
        return <Badge variant="outline">{statut || 'Inconnu'}</Badge>;
    }
  };

  const getAnnonceStatutBadge = (statut: string | null) => {
    switch (statut) {
      case 'publiee':
        return <Badge className="bg-success/20 text-success border-success/30">Publiée</Badge>;
      case 'en_attente':
        return <Badge className="bg-warning/20 text-warning border-warning/30">En attente</Badge>;
      case 'refusee':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Refusée</Badge>;
      case 'expiree':
        return <Badge variant="outline">Expirée</Badge>;
      case 'brouillon':
        return <Badge variant="secondary">Brouillon</Badge>;
      default:
        return <Badge variant="outline">{statut || 'Inconnu'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!annonceur) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PremiumEmptyState
          icon={User}
          title="Annonceur introuvable"
          description="L'annonceur demandé n'existe pas ou a été supprimé."
        />
        <Button onClick={() => navigate('/admin/annonceurs')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const infoItems = [
    { icon: Mail, label: "Email", value: annonceur.email },
    { icon: Phone, label: "Téléphone", value: annonceur.telephone || "Non renseigné" },
    { icon: MapPin, label: "Adresse", value: annonceur.adresse ? `${annonceur.adresse}, ${annonceur.code_postal} ${annonceur.ville}` : "Non renseignée" },
    { icon: Globe, label: "Site web", value: annonceur.site_web || "Non renseigné" },
    { icon: Building2, label: "Type", value: annonceur.type_annonceur === 'particulier' ? 'Particulier' : 'Professionnel' },
    { icon: Calendar, label: "Inscrit le", value: format(new Date(annonceur.created_at || new Date()), 'dd MMM yyyy', { locale: fr }) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/annonceurs')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PremiumPageHeader
          icon={User}
          title={annonceur.nom_entreprise || `${annonceur.prenom || ''} ${annonceur.nom}`}
          subtitle="Détail de l'annonceur"
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
        <PremiumKPICard
          title="Annonces actives"
          value={annonceur.nb_annonces_actives || 0}
          icon={FileText}
          variant="default"
        />
        <PremiumKPICard
          title="Total publiées"
          value={annonceur.nb_annonces_publiees || 0}
          icon={CheckCircle}
          variant="success"
        />
        <PremiumKPICard
          title="Vues totales"
          value={annonceur.nb_vues_totales || 0}
          icon={Eye}
          variant="default"
        />
        <PremiumKPICard
          title="Contacts reçus"
          value={annonceur.nb_contacts_recus || 0}
          icon={MessageSquare}
          variant="warning"
        />
      </div>

      {/* Informations et Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="lg:col-span-2">
          <PremiumCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Informations</h3>
                <div className="flex items-center gap-2">
                  {getStatutBadge(annonceur.statut)}
                  {annonceur.est_verifie && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Vérifié
                    </Badge>
                  )}
                </div>
              </div>
              <PremiumInfoGrid items={infoItems} />
              
              {annonceur.note_moyenne && (
                <div className="mt-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning fill-warning" />
                  <span className="font-medium">{annonceur.note_moyenne.toFixed(1)}</span>
                  <span className="text-muted-foreground">({annonceur.nb_avis || 0} avis)</span>
                </div>
              )}
            </div>
          </PremiumCard>
        </div>

        <PremiumCard>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Actions</h3>
            
            {!annonceur.est_verifie && (
              <Button 
                className="w-full" 
                onClick={() => verifyAnnonceurMutation.mutate()}
                disabled={verifyAnnonceurMutation.isPending}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Vérifier l'annonceur
              </Button>
            )}
            
            {annonceur.statut !== 'actif' && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => updateStatutMutation.mutate('actif')}
                disabled={updateStatutMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Activer le compte
              </Button>
            )}
            
            {annonceur.statut === 'actif' && (
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => updateStatutMutation.mutate('suspendu')}
                disabled={updateStatutMutation.isPending}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspendre le compte
              </Button>
            )}
          </div>
        </PremiumCard>
      </div>

      {/* Annonces de l'annonceur */}
      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <PremiumCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Annonces ({annonces.length})</h3>
            
            {annonces.length === 0 ? (
              <PremiumEmptyState
                icon={FileText}
                title="Aucune annonce"
                description="Cet annonceur n'a pas encore publié d'annonce."
              />
            ) : (
              <PremiumTable>
                <PremiumTableHeader>
                  <PremiumTableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </PremiumTableRow>
                </PremiumTableHeader>
                <TableBody>
                  {annonces.map((annonce) => (
                    <PremiumTableRow key={annonce.id}>
                      <TableCell className="font-medium">
                        {annonce.titre}
                      </TableCell>
                      <TableCell>
                        {annonce.type_transaction === 'location' ? 'Location' : 'Vente'}
                      </TableCell>
                      <TableCell>
                        {annonce.prix.toLocaleString('fr-CH')} CHF
                        {annonce.type_transaction === 'location' && '/mois'}
                      </TableCell>
                      <TableCell>
                        {getAnnonceStatutBadge(annonce.statut)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(annonce.created_at || new Date()), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/admin/annonces-publiques?id=${annonce.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </PremiumTableRow>
                  ))}
                </TableBody>
              </PremiumTable>
            )}
          </div>
        </PremiumCard>
      </div>
    </div>
  );
};

export default AnnonceurDetail;
