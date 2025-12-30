import { useState, useEffect, useMemo } from 'react';
import { Home, Search, Loader2, Building2, TrendingUp, Heart, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PremiumAnnonceCard } from '@/components/premium/PremiumAnnonceCard';
import { PremiumPageHeader, PremiumKPICard, PremiumEmptyState } from '@/components/premium';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

interface Immeuble {
  id: string;
  nom: string;
  type_bien: string;
  ville: string;
  canton: string;
  surface_totale: number;
  nombre_pieces: number;
  prix_vente_demande: number;
  description_commerciale?: string;
  points_forts?: string[];
  proprietaire_id: string;
  created_at?: string;
}

interface Photo {
  id: string;
  url: string;
  est_principale: boolean;
  immeuble_id: string;
}

interface Agent {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  avatar_url?: string;
}

export default function ClientAnnonces() {
  const { user } = useAuth();
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({});
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [submittingInteret, setSubmittingInteret] = useState<string | null>(null);
  const [clientBudget, setClientBudget] = useState<number | null>(null);
  const [visitesCount, setVisitesCount] = useState(0);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load client budget and visites count in parallel with immeubles
      const [immeublesResult, clientResult, interetsResult] = await Promise.all([
        supabase
          .from('immeubles')
          .select('*')
          .eq('publier_espace_acheteur', true)
          .eq('statut_vente', 'publie')
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('id, budget_max')
          .eq('user_id', user?.id)
          .single(),
        user ? supabase
          .from('interets_acheteur')
          .select('id')
          .eq('type_interet', 'demande_visite') : Promise.resolve({ data: [], error: null })
      ]);

      if (immeublesResult.error) throw immeublesResult.error;
      
      if (clientResult.data) {
        setClientBudget(clientResult.data.budget_max);
        
        // Get visites count for this client
        const { count } = await supabase
          .from('interets_acheteur')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientResult.data.id)
          .eq('type_interet', 'demande_visite');
        
        setVisitesCount(count || 0);
      }

      if (!immeublesResult.data || immeublesResult.data.length === 0) {
        setImmeubles([]);
        return;
      }

      const mappedData: Immeuble[] = immeublesResult.data.map((i: any) => ({
        id: i.id,
        nom: i.nom,
        type_bien: i.type_bien,
        ville: i.ville || '',
        canton: i.canton || '',
        surface_totale: i.surface_totale || 0,
        nombre_pieces: i.nombre_pieces || 0,
        prix_vente_demande: i.prix_vente_demande || 0,
        description_commerciale: i.description_commerciale,
        points_forts: i.points_forts,
        proprietaire_id: i.proprietaire_id,
        created_at: i.created_at
      }));
      setImmeubles(mappedData);

      const immeubleIds = mappedData.map(i => i.id);
      const { data: photosData } = await supabase
        .from('photos_immeuble')
        .select('*')
        .in('immeuble_id', immeubleIds);

      if (photosData) {
        const photosByImmeuble: Record<string, Photo[]> = {};
        (photosData as any[]).forEach((photo) => {
          if (photo.niveau_confidentialite === 'public') {
            if (!photosByImmeuble[photo.immeuble_id]) photosByImmeuble[photo.immeuble_id] = [];
            photosByImmeuble[photo.immeuble_id].push({
              id: photo.id,
              url: photo.url,
              est_principale: photo.est_principale,
              immeuble_id: photo.immeuble_id
            });
          }
        });
        setPhotos(photosByImmeuble);
      }
    } catch (error) {
      console.error('Error loading annonces:', error);
      toast.error('Erreur lors du chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  const handleInteret = async (immeubleId: string, type: 'interet' | 'visite' | 'brochure') => {
    if (!user) return;
    setSubmittingInteret(immeubleId);

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) {
        toast.error('Profil client non trouvé');
        return;
      }

      if (type === 'brochure') {
        const { data, error } = await supabase.functions.invoke('generate-brochure-pdf', {
          body: { immeuble_id: immeubleId }
        });
        if (error) throw error;

        const blob = new Blob([Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename || 'brochure.pdf';
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success('Brochure téléchargée');
      } else {
        const { error } = await supabase
          .from('interets_acheteur')
          .insert({
            immeuble_id: immeubleId,
            client_id: clientData.id,
            type_interet: type === 'visite' ? 'demande_visite' : 'interet_general',
            statut: 'nouveau'
          });

        if (error?.code === '23505') {
          toast.info('Vous avez déjà manifesté votre intérêt pour ce bien');
        } else if (error) {
          throw error;
        } else {
          toast.success(type === 'visite' ? 'Demande de visite envoyée !' : 'Intérêt enregistré !');
          if (type === 'visite') setVisitesCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error handling interet:', error);
      toast.error('Erreur lors de l\'opération');
    } finally {
      setSubmittingInteret(null);
    }
  };

  const filteredImmeubles = immeubles.filter(immeuble => {
    const matchesSearch = searchTerm === '' || 
      immeuble.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      immeuble.ville.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || immeuble.type_bien === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(immeubles.map(i => i.type_bien))];

  // KPI calculations
  const kpiData = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const nouveaux = immeubles.filter(i => 
      i.created_at && new Date(i.created_at) > sevenDaysAgo
    ).length;

    const dansBudget = clientBudget 
      ? immeubles.filter(i => i.prix_vente_demande <= clientBudget).length 
      : immeubles.length;

    return { nouveaux, dansBudget };
  }, [immeubles, clientBudget]);

  return (
    <div className="relative space-y-6 p-4 md:p-6">
      <FloatingParticles count={6} />
      
      <PremiumPageHeader
        icon={Home}
        title="Biens à vendre"
        subtitle="Découvrez les biens correspondant à vos critères"
        badge="Vitrine"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <PremiumKPICard
          title="Biens disponibles"
          value={filteredImmeubles.length}
          icon={Building2}
          delay={0}
        />
        <PremiumKPICard
          title="Nouveaux"
          value={kpiData.nouveaux}
          icon={TrendingUp}
          variant="success"
          delay={50}
        />
        <PremiumKPICard
          title="Dans mon budget"
          value={kpiData.dansBudget}
          icon={Heart}
          variant="warning"
          delay={100}
        />
        <PremiumKPICard
          title="Visites demandées"
          value={visitesCount}
          icon={Calendar}
          delay={150}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, ville..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Type de bien" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {uniqueTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filteredImmeubles.length} bien{filteredImmeubles.length > 1 ? 's' : ''} trouvé{filteredImmeubles.length > 1 ? 's' : ''}</p>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {!loading && filteredImmeubles.length === 0 && (
        <PremiumEmptyState
          icon={Home}
          title="Aucun bien disponible"
          description="Aucun bien ne correspond à vos critères pour le moment."
        />
      )}

      {!loading && filteredImmeubles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          {filteredImmeubles.map((immeuble) => (
            <PremiumAnnonceCard
              key={immeuble.id}
              immeuble={{ ...immeuble, commune: immeuble.ville }}
              photos={photos[immeuble.id] || []}
              agent={agents[immeuble.proprietaire_id]}
              onInteret={(type) => handleInteret(immeuble.id, type)}
              isLoading={submittingInteret === immeuble.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
