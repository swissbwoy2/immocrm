import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, MapPin, Filter, List, Map as MapIcon, 
  ChevronDown, X, SlidersHorizontal, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicAnnonceCard } from '@/components/public/PublicAnnonceCard';
import { PublicAnnoncesMap } from '@/components/public/PublicAnnoncesMap';
import { cn } from '@/lib/utils';

export default function RechercheAnnonces() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [hoveredAnnonceId, setHoveredAnnonceId] = useState<string | null>(null);

  // Filter state from URL
  const transactionType = searchParams.get('type') || '';
  const searchLocation = searchParams.get('lieu') || '';
  const category = searchParams.get('categorie') || '';
  const prixMin = searchParams.get('prix_min') || '';
  const prixMax = searchParams.get('prix_max') || '';
  const piecesMin = searchParams.get('pieces_min') || '';
  const piecesMax = searchParams.get('pieces_max') || '';
  const surfaceMin = searchParams.get('surface_min') || '';
  const sortBy = searchParams.get('tri') || 'date';

  // Local filter state for UI
  const [localFilters, setLocalFilters] = useState({
    type: transactionType,
    lieu: searchLocation,
    categorie: category,
    prix_min: prixMin,
    prix_max: prixMax,
    pieces_min: piecesMin,
    pieces_max: piecesMax,
    surface_min: surfaceMin,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-annonces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories_annonces')
        .select('*')
        .eq('est_active', true)
        .order('ordre');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch listings with filters
  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ['search-annonces', transactionType, searchLocation, category, prixMin, prixMax, piecesMin, piecesMax, surfaceMin, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          categories_annonces(nom, slug, icone),
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('statut', 'publie');

      // Apply filters
      if (transactionType) {
        query = query.eq('type_transaction', transactionType);
      }
      if (searchLocation) {
        query = query.or(`ville.ilike.%${searchLocation}%,canton.ilike.%${searchLocation}%,code_postal.ilike.%${searchLocation}%`);
      }
      if (category) {
        const cat = categories.find(c => c.slug === category);
        if (cat) {
          query = query.eq('categorie_id', cat.id);
        }
      }
      if (prixMin) {
        query = query.gte('prix', parseInt(prixMin));
      }
      if (prixMax) {
        query = query.lte('prix', parseInt(prixMax));
      }
      if (piecesMin) {
        query = query.gte('nombre_pieces', parseFloat(piecesMin));
      }
      if (piecesMax) {
        query = query.lte('nombre_pieces', parseFloat(piecesMax));
      }
      if (surfaceMin) {
        query = query.gte('surface_habitable', parseInt(surfaceMin));
      }

      // Sorting
      switch (sortBy) {
        case 'prix_asc':
          query = query.order('prix', { ascending: true });
          break;
        case 'prix_desc':
          query = query.order('prix', { ascending: false });
          break;
        case 'surface':
          query = query.order('surface_habitable', { ascending: false, nullsFirst: false });
          break;
        default:
          query = query.order('est_mise_en_avant', { ascending: false }).order('date_publication', { ascending: false });
      }

      query = query.limit(50);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: categories.length > 0 || !category
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (localFilters.type) params.set('type', localFilters.type);
    if (localFilters.lieu) params.set('lieu', localFilters.lieu);
    if (localFilters.categorie) params.set('categorie', localFilters.categorie);
    if (localFilters.prix_min) params.set('prix_min', localFilters.prix_min);
    if (localFilters.prix_max) params.set('prix_max', localFilters.prix_max);
    if (localFilters.pieces_min) params.set('pieces_min', localFilters.pieces_min);
    if (localFilters.pieces_max) params.set('pieces_max', localFilters.pieces_max);
    if (localFilters.surface_min) params.set('surface_min', localFilters.surface_min);
    if (sortBy !== 'date') params.set('tri', sortBy);
    
    setSearchParams(params);
    setIsFiltersOpen(false);
  };

  const clearFilters = () => {
    setLocalFilters({
      type: '',
      lieu: '',
      categorie: '',
      prix_min: '',
      prix_max: '',
      pieces_min: '',
      pieces_max: '',
      surface_min: '',
    });
    setSearchParams(new URLSearchParams());
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (transactionType) count++;
    if (searchLocation) count++;
    if (category) count++;
    if (prixMin || prixMax) count++;
    if (piecesMin || piecesMax) count++;
    if (surfaceMin) count++;
    return count;
  }, [transactionType, searchLocation, category, prixMin, prixMax, piecesMin, piecesMax, surfaceMin]);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Search Bar - Sticky */}
      <div className="sticky top-16 z-40 bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Transaction type tabs */}
            <Tabs 
              value={localFilters.type || 'all'} 
              onValueChange={(v) => {
                setLocalFilters(prev => ({ ...prev, type: v === 'all' ? '' : v }));
                const params = new URLSearchParams(searchParams);
                if (v === 'all') {
                  params.delete('type');
                } else {
                  params.set('type', v);
                }
                setSearchParams(params);
              }}
              className="shrink-0"
            >
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="location">Louer</TabsTrigger>
                <TabsTrigger value="vente">Acheter</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search input */}
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ville, région ou code postal..."
                value={localFilters.lieu}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, lieu: e.target.value }))}
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>

            {/* Filter button */}
            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[320px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filtrer les annonces</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                  <div className="space-y-6 py-4">
                    {/* Category */}
                    <div className="space-y-2">
                      <Label>Type de bien</Label>
                      <Select 
                        value={localFilters.categorie} 
                        onValueChange={(v) => setLocalFilters(prev => ({ ...prev, categorie: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tous les types</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.slug}>{cat.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price range */}
                    <div className="space-y-2">
                      <Label>Budget</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={localFilters.prix_min}
                          onChange={(e) => setLocalFilters(prev => ({ ...prev, prix_min: e.target.value }))}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={localFilters.prix_max}
                          onChange={(e) => setLocalFilters(prev => ({ ...prev, prix_max: e.target.value }))}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">CHF</span>
                      </div>
                    </div>

                    {/* Rooms */}
                    <div className="space-y-2">
                      <Label>Nombre de pièces</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          step="0.5"
                          value={localFilters.pieces_min}
                          onChange={(e) => setLocalFilters(prev => ({ ...prev, pieces_min: e.target.value }))}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          step="0.5"
                          value={localFilters.pieces_max}
                          onChange={(e) => setLocalFilters(prev => ({ ...prev, pieces_max: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Surface */}
                    <div className="space-y-2">
                      <Label>Surface minimale</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Surface min"
                          value={localFilters.surface_min}
                          onChange={(e) => setLocalFilters(prev => ({ ...prev, surface_min: e.target.value }))}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">m²</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={clearFilters} className="flex-1">
                        Effacer
                      </Button>
                      <Button onClick={applyFilters} className="flex-1">
                        Appliquer
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Search button */}
            <Button onClick={applyFilters} className="shrink-0">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>

            {/* View mode toggle */}
            <div className="hidden md:flex border rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('map')}
                className="rounded-l-none"
              >
                <MapIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active filters badges */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {transactionType && (
                <Badge variant="secondary" className="gap-1">
                  {transactionType === 'location' ? 'Location' : 'Vente'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('type');
                      setSearchParams(params);
                      setLocalFilters(prev => ({ ...prev, type: '' }));
                    }}
                  />
                </Badge>
              )}
              {searchLocation && (
                <Badge variant="secondary" className="gap-1">
                  {searchLocation}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('lieu');
                      setSearchParams(params);
                      setLocalFilters(prev => ({ ...prev, lieu: '' }));
                    }}
                  />
                </Badge>
              )}
              {category && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.slug === category)?.nom || category}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('categorie');
                      setSearchParams(params);
                      setLocalFilters(prev => ({ ...prev, categorie: '' }));
                    }}
                  />
                </Badge>
              )}
              {(prixMin || prixMax) && (
                <Badge variant="secondary" className="gap-1">
                  {prixMin && prixMax ? `${prixMin} - ${prixMax} CHF` : prixMin ? `Dès ${prixMin} CHF` : `Max ${prixMax} CHF`}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('prix_min');
                      params.delete('prix_max');
                      setSearchParams(params);
                      setLocalFilters(prev => ({ ...prev, prix_min: '', prix_max: '' }));
                    }}
                  />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                Effacer tout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">
              {annonces.length} annonce{annonces.length !== 1 ? 's' : ''} trouvée{annonces.length !== 1 ? 's' : ''}
            </h1>
            <p className="text-sm text-muted-foreground">
              {transactionType === 'location' ? 'Biens à louer' : transactionType === 'vente' ? 'Biens à vendre' : 'Tous les biens'}
              {searchLocation && ` à ${searchLocation}`}
            </p>
          </div>

          {/* Sort */}
          <Select 
            value={sortBy} 
            onValueChange={(v) => {
              const params = new URLSearchParams(searchParams);
              if (v === 'date') {
                params.delete('tri');
              } else {
                params.set('tri', v);
              }
              setSearchParams(params);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Plus récentes</SelectItem>
              <SelectItem value="prix_asc">Prix croissant</SelectItem>
              <SelectItem value="prix_desc">Prix décroissant</SelectItem>
              <SelectItem value="surface">Surface</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted animate-pulse rounded-xl h-80" />
            ))}
          </div>
        ) : annonces.length > 0 ? (
          <div className={cn(
            viewMode === 'list' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "grid grid-cols-1 lg:grid-cols-2 gap-6"
          )}>
            {viewMode === 'map' && (
              <div className="lg:col-span-1 h-[500px] lg:h-[calc(100vh-280px)] rounded-xl sticky top-40">
                <PublicAnnoncesMap 
                  annonces={annonces}
                  onAnnonceClick={(id, slug) => navigate(`/annonces/${slug || id}`)}
                  hoveredAnnonceId={hoveredAnnonceId}
                  onMarkerHover={setHoveredAnnonceId}
                />
              </div>
            )}
            <div className={cn(viewMode === 'map' && "lg:col-span-1")}>
              <div className={cn(
                viewMode === 'map' 
                  ? "space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              )}>
                {annonces.map((annonce) => (
                  <div
                    key={annonce.id}
                    onMouseEnter={() => viewMode === 'map' && setHoveredAnnonceId(annonce.id)}
                    onMouseLeave={() => viewMode === 'map' && setHoveredAnnonceId(null)}
                    className={cn(
                      viewMode === 'map' && hoveredAnnonceId === annonce.id && 'ring-2 ring-primary rounded-xl'
                    )}
                  >
                    <PublicAnnonceCard 
                      annonce={annonce} 
                      compact={viewMode === 'map'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Aucune annonce trouvée</h2>
            <p className="text-muted-foreground mb-6">
              Essayez de modifier vos critères de recherche
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}