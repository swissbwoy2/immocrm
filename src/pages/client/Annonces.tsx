import { useState, useEffect } from 'react';
import { Home, Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PremiumAnnonceCard } from '@/components/premium/PremiumAnnonceCard';

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

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: immeublesData, error } = await supabase
        .from('immeubles')
        .select('id, nom, type_bien, ville, canton, surface_totale, nombre_pieces, prix_vente_demande, description_commerciale, points_forts, proprietaire_id')
        .eq('publier_espace_acheteur', true)
        .eq('statut_vente', 'publie')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!immeublesData || immeublesData.length === 0) {
        setImmeubles([]);
        return;
      }

      setImmeubles(immeublesData as Immeuble[]);

      const immeubleIds = immeublesData.map((i: any) => i.id);
      const { data: photosData } = await supabase
        .from('photos_immeuble')
        .select('id, url, est_principale, immeuble_id')
        .in('immeuble_id', immeubleIds)
        .eq('niveau_confidentialite', 'public');

      if (photosData) {
        const photosByImmeuble: Record<string, Photo[]> = {};
        photosData.forEach((photo: any) => {
          if (!photosByImmeuble[photo.immeuble_id]) photosByImmeuble[photo.immeuble_id] = [];
          photosByImmeuble[photo.immeuble_id].push(photo);
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <Home className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Biens à vendre</h1>
          <p className="text-muted-foreground">Découvrez les biens correspondant à vos critères</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
        <div className="text-center py-12">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold">Aucun bien disponible</h3>
          <p className="text-muted-foreground">Aucun bien ne correspond à vos critères pour le moment.</p>
        </div>
      )}

      {!loading && filteredImmeubles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
