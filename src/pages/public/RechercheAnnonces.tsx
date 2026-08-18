import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { toast } from 'sonner';
import {
  Search, List, Map as MapIcon, X, SlidersHorizontal, Building2, BellPlus, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PublicHeader } from '@/components/public/PublicHeader';
import { AlerteAnnonceDialog } from '@/components/annonces/AlerteAnnonceDialog';
import { LocalitesMultiSelect, parseLocalite, type LocaliteOption } from '@/components/annonces/LocalitesMultiSelect';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicAnnonceCard } from '@/components/public/PublicAnnonceCard';
import { PublicAnnoncesMap } from '@/components/public/PublicAnnoncesMap';
import { cn } from '@/lib/utils';
import { DashboardBanner } from '@/components/common/DashboardBanner';

const setMeta = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const escapeOr = (v: string) => v.replace(/[,()]/g, ' ').trim();
const splitList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

interface AdvancedFilters {
  categories: string[];
  prix_min: string;
  prix_max: string;
  pieces_min: string;
  pieces_max: string;
  surface_min: string;
  surface_max: string;
  mots: string;
  neuf: boolean;
}

export default function RechercheAnnonces() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded: mapsLoaded } = useGoogleMapsLoader();

  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [hoveredAnnonceId, setHoveredAnnonceId] = useState<string | null>(null);
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [neighboursLoading, setNeighboursLoading] = useState(false);
  const [alerteDialogOpen, setAlerteDialogOpen] = useState(false);

  // ---- URL state (source de vérité) ----
  const transactionType = searchParams.get('type') || '';
  const lieuxParam = searchParams.get('lieux') || searchParams.get('lieu') || '';
  const lieux = useMemo(() => splitList(lieuxParam), [lieuxParam]);
  const localites: LocaliteOption[] = useMemo(() => lieux.map(parseLocalite), [lieux]);
  const categorieSlugs = useMemo(() => splitList(searchParams.get('categories') || searchParams.get('categorie') || ''), [searchParams]);
  const prixMin = searchParams.get('prix_min') || '';
  const prixMax = searchParams.get('prix_max') || '';
  const piecesMin = searchParams.get('pieces_min') || '';
  const piecesMax = searchParams.get('pieces_max') || '';
  const surfaceMin = searchParams.get('surface_min') || '';
  const surfaceMax = searchParams.get('surface_max') || '';
  const motsCles = searchParams.get('mots') || '';
  const neufOnly = searchParams.get('neuf') === '1';
  const sortBy = searchParams.get('tri') || 'date';

  // ---- Local (panneau filtres) ----
  const [draft, setDraft] = useState<AdvancedFilters>({
    categories: categorieSlugs,
    prix_min: prixMin,
    prix_max: prixMax,
    pieces_min: piecesMin,
    pieces_max: piecesMax,
    surface_min: surfaceMin,
    surface_max: surfaceMax,
    mots: motsCles,
    neuf: neufOnly,
  });

  useEffect(() => {
    if (isFiltersOpen) {
      setDraft({
        categories: categorieSlugs,
        prix_min: prixMin,
        prix_max: prixMax,
        pieces_min: piecesMin,
        pieces_max: piecesMax,
        surface_min: surfaceMin,
        surface_max: surfaceMax,
        mots: motsCles,
        neuf: neufOnly,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFiltersOpen]);

  const patchParams = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    params.delete('lieu');
    params.delete('categorie');
    mutate(params);
    setSearchParams(params);
  };

  const setLocalites = (next: LocaliteOption[]) => {
    patchParams((p) => {
      const v = next.map((l) => l.value).join(',');
      if (v) p.set('lieux', v);
      else p.delete('lieux');
    });
  };

  // ---- SEO ----
  useEffect(() => {
    const label = transactionType === 'location' ? 'Location' : transactionType === 'vente' ? 'Vente' : 'Immobilier';
    const lieu = lieux.length ? ` à ${lieux.join(', ')}` : ' en Suisse romande';
    document.title = `${label} — Annonces immobilières${lieu} | Logisorama`.slice(0, 60);
    setMeta(
      'description',
      `Annonces immobilières${lieu} : appartements, maisons et locaux à louer ou à vendre. Recherche multi-villes, filtres et alertes e-mail.`.slice(0, 158),
    );
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/annonces/recherche`;
  }, [transactionType, lieux]);

  // ---- Centre de carte (1ère localité) ----
  useEffect(() => {
    if (!lieux.length || !mapsLoaded || !window.google?.maps) {
      setSearchCoords(null);
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: `${lieux[0]}, Suisse`, region: 'CH' }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location;
        setSearchCoords({ lat: loc.lat(), lng: loc.lng() });
      } else {
        setSearchCoords(null);
      }
    });
  }, [lieuxParam, mapsLoaded, lieux]);

  // ---- Catégories ----
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
    },
  });

  // ---- Résultats ----
  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ['search-annonces', transactionType, lieuxParam, categorieSlugs.join(','), prixMin, prixMax, piecesMin, piecesMax, surfaceMin, surfaceMax, motsCles, neufOnly, sortBy, categories.length],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      let query = supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          categories_annonces(nom, slug, icone),
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('statut', 'publie')
        .or(`date_expiration.is.null,date_expiration.gt.${nowIso}`);

      if (transactionType) query = query.eq('type_transaction', transactionType);

      // Multi-localités : OR sur ville / canton / NPA
      if (lieux.length) {
        const conds = lieux.flatMap((l) => {
          const v = escapeOr(l);
          return /^\d{4}$/.test(v)
            ? [`code_postal.eq.${v}`]
            : [`ville.ilike.%${v}%`, `canton.ilike.%${v}%`];
        });
        query = query.or(conds.join(','));
      }

      // Types de bien (multi)
      if (categorieSlugs.length) {
        const ids = categorieSlugs.map((s) => categories.find((c) => c.slug === s)?.id).filter(Boolean) as string[];
        const conds: string[] = [];
        if (ids.length) conds.push(`categorie_id.in.(${ids.join(',')})`);
        conds.push(`sous_type.in.(${categorieSlugs.map(escapeOr).join(',')})`);
        query = query.or(conds.join(','));
      }

      if (prixMin) query = query.gte('prix', parseInt(prixMin));
      if (prixMax) query = query.lte('prix', parseInt(prixMax));
      if (piecesMin) query = query.gte('nombre_pieces', parseFloat(piecesMin));
      if (piecesMax) query = query.lte('nombre_pieces', parseFloat(piecesMax));
      if (surfaceMin) query = query.gte('surface_habitable', parseInt(surfaceMin));
      if (surfaceMax) query = query.lte('surface_habitable', parseInt(surfaceMax));
      if (neufOnly) query = query.ilike('etat_bien', '%neuf%');

      // Mots-clés : chaque mot doit être présent (titre / description / points forts)
      splitList(motsCles.replace(/\s+/g, ' ')).forEach(() => {});
      motsCles
        .split(/[\s,]+/)
        .map((m) => escapeOr(m))
        .filter(Boolean)
        .forEach((mot) => {
          query = query.or(
            `titre.ilike.%${mot}%,description.ilike.%${mot}%,description_courte.ilike.%${mot}%,quartier.ilike.%${mot}%`,
          );
        });

      switch (sortBy) {
        case 'prix_asc':
          query = query.order('prix', { ascending: true });
          break;
        case 'prix_desc':
          query = query.order('prix', { ascending: false });
          break;
        case 'pieces_asc':
          query = query.order('nombre_pieces', { ascending: true, nullsFirst: false });
          break;
        case 'pieces_desc':
          query = query.order('nombre_pieces', { ascending: false, nullsFirst: false });
          break;
        case 'surface':
          query = query.order('surface_habitable', { ascending: false, nullsFirst: false });
          break;
        default:
          query = query.order('est_mise_en_avant', { ascending: false }).order('date_publication', { ascending: false });
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: categories.length > 0 || categorieSlugs.length === 0,
  });

  // ---- Localités voisines ----
  const addNeighbours = async () => {
    if (!searchCoords) {
      toast.error("Impossible de localiser la première ville sélectionnée");
      return;
    }
    setNeighboursLoading(true);
    try {
      const d = 0.18; // ~20 km
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select('ville')
        .eq('statut', 'publie')
        .gte('latitude', searchCoords.lat - d)
        .lte('latitude', searchCoords.lat + d)
        .gte('longitude', searchCoords.lng - d * 1.5)
        .lte('longitude', searchCoords.lng + d * 1.5)
        .limit(1000);
      if (error) throw error;
      const existing = new Set(lieux.map((l) => l.toLowerCase()));
      const extra = Array.from(new Set((data || []).map((r: any) => r.ville).filter(Boolean)))
        .filter((v) => !existing.has(String(v).toLowerCase()))
        .slice(0, 12) as string[];
      if (!extra.length) {
        toast.info('Aucune localité voisine supplémentaire trouvée');
        return;
      }
      setLocalites([...localites, ...extra.map(parseLocalite)]);
      toast.success(`${extra.length} localité(s) voisine(s) ajoutée(s)`);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la recherche des localités voisines');
    } finally {
      setNeighboursLoading(false);
    }
  };

  // ---- Application des filtres avancés ----
  const applyDraft = () => {
    patchParams((p) => {
      const set = (k: string, v: string) => (v ? p.set(k, v) : p.delete(k));
      if (draft.categories.length) p.set('categories', draft.categories.join(','));
      else p.delete('categories');
      set('prix_min', draft.prix_min);
      set('prix_max', draft.prix_max);
      set('pieces_min', draft.pieces_min);
      set('pieces_max', draft.pieces_max);
      set('surface_min', draft.surface_min);
      set('surface_max', draft.surface_max);
      set('mots', draft.mots.trim());
      if (draft.neuf) p.set('neuf', '1');
      else p.delete('neuf');
    });
    setIsFiltersOpen(false);
  };

  const resetDraft = () =>
    setDraft({
      categories: [], prix_min: '', prix_max: '', pieces_min: '', pieces_max: '',
      surface_min: '', surface_max: '', mots: '', neuf: false,
    });

  const clearAll = () => {
    resetDraft();
    setSearchCoords(null);
    const params = new URLSearchParams();
    if (transactionType) params.set('type', transactionType);
    setSearchParams(params);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categorieSlugs.length) count++;
    if (prixMin || prixMax) count++;
    if (piecesMin || piecesMax) count++;
    if (surfaceMin || surfaceMax) count++;
    if (motsCles) count++;
    if (neufOnly) count++;
    return count;
  }, [categorieSlugs, prixMin, prixMax, piecesMin, piecesMax, surfaceMin, surfaceMax, motsCles, neufOnly]);

  const montantLabel = transactionType === 'vente' ? 'Prix (CHF)' : 'Loyer mensuel (CHF)';

  const alerteCriteres = useMemo(
    () =>
      ({
        type_transaction: transactionType || null,
        categorie_id: categorieSlugs.length ? categories.find((c) => c.slug === categorieSlugs[0])?.id ?? null : null,
        categories: categorieSlugs,
        ville: lieux[0] || null,
        villes: lieux,
        rayon_km: null,
        latitude: searchCoords?.lat ?? null,
        longitude: searchCoords?.lng ?? null,
        prix_min: prixMin ? parseInt(prixMin) : null,
        prix_max: prixMax ? parseInt(prixMax) : null,
        pieces_min: piecesMin ? parseFloat(piecesMin) : null,
        pieces_max: piecesMax ? parseFloat(piecesMax) : null,
        surface_min: surfaceMin ? parseInt(surfaceMin) : null,
        surface_max: surfaceMax ? parseInt(surfaceMax) : null,
        mots_cles: motsCles || null,
        neuf: neufOnly,
      }) as any,
    [transactionType, categorieSlugs, categories, lieux, searchCoords, prixMin, prixMax, piecesMin, piecesMax, surfaceMin, surfaceMax, motsCles, neufOnly],
  );

  const alerteNom = [
    transactionType === 'location' ? 'Location' : transactionType === 'vente' ? 'Vente' : 'Tous biens',
    lieux.length ? lieux.join(', ') : 'Suisse',
  ].join(' — ');

  const filtersPanel = (
    <div className="space-y-6 py-4">
      {/* Type de bien (multi) */}
      <div className="space-y-2">
        <Label>Type de bien</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((cat) => {
            const checked = draft.categories.includes(cat.slug);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    categories: checked ? p.categories.filter((s) => s !== cat.slug) : [...p.categories, cat.slug],
                  }))
                }
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors duration-200 cursor-pointer',
                  checked ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-accent',
                )}
              >
                <Checkbox checked={checked} className="pointer-events-none" />
                <span className="truncate">{cat.nom}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Montant */}
      <div className="space-y-2">
        <Label>{montantLabel}</Label>
        <div className="flex items-center gap-2">
          <Input type="number" inputMode="numeric" placeholder="Min" value={draft.prix_min}
            onChange={(e) => setDraft((p) => ({ ...p, prix_min: e.target.value }))} />
          <span className="text-muted-foreground">–</span>
          <Input type="number" inputMode="numeric" placeholder="Max" value={draft.prix_max}
            onChange={(e) => setDraft((p) => ({ ...p, prix_max: e.target.value }))} />
        </div>
      </div>

      {/* Pièces */}
      <div className="space-y-2">
        <Label>Pièces</Label>
        <div className="flex items-center gap-2">
          <Input type="number" step="0.5" placeholder="Min" value={draft.pieces_min}
            onChange={(e) => setDraft((p) => ({ ...p, pieces_min: e.target.value }))} />
          <span className="text-muted-foreground">–</span>
          <Input type="number" step="0.5" placeholder="Max" value={draft.pieces_max}
            onChange={(e) => setDraft((p) => ({ ...p, pieces_max: e.target.value }))} />
        </div>
      </div>

      {/* Surface */}
      <div className="space-y-2">
        <Label>Surface (m²)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="Min" value={draft.surface_min}
            onChange={(e) => setDraft((p) => ({ ...p, surface_min: e.target.value }))} />
          <span className="text-muted-foreground">–</span>
          <Input type="number" placeholder="Max" value={draft.surface_max}
            onChange={(e) => setDraft((p) => ({ ...p, surface_max: e.target.value }))} />
        </div>
      </div>

      {/* Mots-clés */}
      <div className="space-y-2">
        <Label htmlFor="mots-cles">Mots-clés</Label>
        <Input
          id="mots-cles"
          placeholder="balcon, terrasse, parking…"
          value={draft.mots}
          onChange={(e) => setDraft((p) => ({ ...p, mots: e.target.value }))}
        />
      </div>

      {/* Neuf */}
      <label className="flex items-center gap-3 cursor-pointer">
        <Checkbox checked={draft.neuf} onCheckedChange={(v) => setDraft((p) => ({ ...p, neuf: v === true }))} />
        <span className="text-sm">Neuf uniquement</span>
      </label>
    </div>
  );

  return (
    <div className="theme-luxury min-h-screen bg-background">
      <PublicHeader />
      <DashboardBanner wrapperClassName="container mx-auto px-4 pt-20" />

      {/* Barre de recherche */}
      <div className="sticky top-16 z-40 bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 space-y-3">
          <div className="flex flex-col md:flex-row md:items-start gap-3">
            <Tabs
              value={transactionType || 'all'}
              onValueChange={(v) => patchParams((p) => (v === 'all' ? p.delete('type') : p.set('type', v)))}
              className="shrink-0"
            >
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="all" className="flex-1 md:flex-none">Tous</TabsTrigger>
                <TabsTrigger value="location" className="flex-1 md:flex-none">Louer</TabsTrigger>
                <TabsTrigger value="vente" className="flex-1 md:flex-none">Acheter</TabsTrigger>
              </TabsList>
            </Tabs>

            <LocalitesMultiSelect
              className="flex-1 min-w-0"
              selected={localites}
              onChange={setLocalites}
              onAddNeighbours={addNeighbours}
              neighboursLoading={neighboursLoading}
            />

            <div className="flex items-center gap-2 shrink-0">
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex-1 md:flex-none cursor-pointer">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtres
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-2 h-5 min-w-5 px-1 flex items-center justify-center text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
                  <SheetHeader className="px-6 pt-6">
                    <SheetTitle>Filtres</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="flex-1 px-6">{filtersPanel}</ScrollArea>
                  <div className="flex gap-2 p-4 border-t bg-background">
                    <Button variant="outline" onClick={resetDraft} className="flex-1 cursor-pointer">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Réinitialiser
                    </Button>
                    <Button onClick={applyDraft} className="flex-1 cursor-pointer">
                      Appliquer
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Button onClick={() => setIsFiltersOpen(false)} className="flex-1 md:flex-none cursor-pointer">
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {categorieSlugs.map((slug) => (
                <Badge key={slug} variant="secondary" className="gap-1">
                  {categories.find((c) => c.slug === slug)?.nom || slug}
                  <X className="h-3 w-3 cursor-pointer" onClick={() =>
                    patchParams((p) => {
                      const rest = categorieSlugs.filter((s) => s !== slug);
                      rest.length ? p.set('categories', rest.join(',')) : p.delete('categories');
                    })} />
                </Badge>
              ))}
              {(prixMin || prixMax) && (
                <Badge variant="secondary" className="gap-1">
                  {prixMin && prixMax ? `${prixMin} – ${prixMax} CHF` : prixMin ? `Dès ${prixMin} CHF` : `Max ${prixMax} CHF`}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => patchParams((p) => { p.delete('prix_min'); p.delete('prix_max'); })} />
                </Badge>
              )}
              {(piecesMin || piecesMax) && (
                <Badge variant="secondary" className="gap-1">
                  {piecesMin && piecesMax ? `${piecesMin} – ${piecesMax} pièces` : piecesMin ? `Dès ${piecesMin} pièces` : `Max ${piecesMax} pièces`}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => patchParams((p) => { p.delete('pieces_min'); p.delete('pieces_max'); })} />
                </Badge>
              )}
              {(surfaceMin || surfaceMax) && (
                <Badge variant="secondary" className="gap-1">
                  {surfaceMin && surfaceMax ? `${surfaceMin} – ${surfaceMax} m²` : surfaceMin ? `Dès ${surfaceMin} m²` : `Max ${surfaceMax} m²`}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => patchParams((p) => { p.delete('surface_min'); p.delete('surface_max'); })} />
                </Badge>
              )}
              {motsCles && (
                <Badge variant="secondary" className="gap-1">
                  « {motsCles} »
                  <X className="h-3 w-3 cursor-pointer" onClick={() => patchParams((p) => p.delete('mots'))} />
                </Badge>
              )}
              {neufOnly && (
                <Badge variant="secondary" className="gap-1">
                  Neuf uniquement
                  <X className="h-3 w-3 cursor-pointer" onClick={() => patchParams((p) => p.delete('neuf'))} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-xs cursor-pointer">
                Effacer tout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-160px)]">
        <div className={cn('flex-1 overflow-hidden flex flex-col', viewMode === 'list' ? 'lg:w-full' : 'lg:w-[55%] xl:w-[50%]')}>
          {/* Barre de résultats */}
          <div className="px-4 lg:px-6 py-3 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate">
                  {isLoading ? 'Recherche…' : `${annonces.length} bien${annonces.length !== 1 ? 's' : ''}`}
                </h1>
                <p className="text-sm text-muted-foreground truncate">
                  {transactionType === 'location' ? 'À louer' : transactionType === 'vente' ? 'À vendre' : 'Tous les biens'}
                  {lieux.length ? ` • ${lieux.join(', ')}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setAlerteDialogOpen(true)}>
                  <BellPlus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Créer une alerte e-mail</span>
                </Button>

                <Select
                  value={sortBy}
                  onValueChange={(v) => patchParams((p) => (v === 'date' ? p.delete('tri') : p.set('tri', v)))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Plus récentes</SelectItem>
                    <SelectItem value="prix_asc">Prix croissant</SelectItem>
                    <SelectItem value="prix_desc">Prix décroissant</SelectItem>
                    <SelectItem value="pieces_asc">Pièces croissant</SelectItem>
                    <SelectItem value="pieces_desc">Pièces décroissant</SelectItem>
                    <SelectItem value="surface">Surface</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border rounded-lg overflow-hidden">
                  <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon"
                    className="rounded-none cursor-pointer" aria-label="Vue liste" onClick={() => setViewMode('list')}>
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === 'map' ? 'default' : 'ghost'} size="icon"
                    className="rounded-none cursor-pointer" aria-label="Vue carte" onClick={() => setViewMode('map')}>
                    <MapIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 lg:overflow-y-auto px-4 lg:px-6 py-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-muted animate-pulse rounded-xl h-56" />
                ))}
              </div>
            ) : annonces.length > 0 ? (
              <div className={cn('grid gap-4', viewMode === 'list' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2')}>
                {annonces.map((annonce, index) => (
                  <div
                    key={annonce.id}
                    onMouseEnter={() => viewMode === 'map' && setHoveredAnnonceId(annonce.id)}
                    onMouseLeave={() => viewMode === 'map' && setHoveredAnnonceId(null)}
                    className={cn(
                      'transition-all duration-200 animate-fade-in',
                      viewMode === 'map' && hoveredAnnonceId === annonce.id && 'ring-2 ring-primary rounded-xl shadow-lg',
                    )}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <PublicAnnonceCard annonce={annonce} featured={annonce.est_mise_en_avant} compact={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold mb-2">Aucune annonce trouvée</h2>
                <p className="text-muted-foreground mb-6">
                  Essayez d'ajouter des localités voisines ou d'assouplir vos filtres.
                </p>
                <Button variant="outline" onClick={clearAll} className="cursor-pointer">
                  Effacer les filtres
                </Button>
              </div>
            )}
          </div>
        </div>

        {viewMode === 'map' && (
          <>
            <div className="hidden lg:block lg:w-[45%] xl:w-[50%] h-full border-l bg-muted/30">
              <PublicAnnoncesMap
                annonces={annonces}
                onAnnonceClick={(id, slug) => navigate(`/annonces/${slug || id}`)}
                hoveredAnnonceId={hoveredAnnonceId}
                onMarkerHover={setHoveredAnnonceId}
                searchCenter={searchCoords}
              />
            </div>
            <div className="lg:hidden h-[50vh] border-t">
              <PublicAnnoncesMap
                annonces={annonces}
                onAnnonceClick={(id, slug) => navigate(`/annonces/${slug || id}`)}
                hoveredAnnonceId={hoveredAnnonceId}
                onMarkerHover={setHoveredAnnonceId}
                searchCenter={searchCoords}
              />
            </div>
          </>
        )}
      </div>

      <PublicFooter />

      <AlerteAnnonceDialog
        open={alerteDialogOpen}
        onOpenChange={setAlerteDialogOpen}
        criteres={alerteCriteres}
        defaultNom={alerteNom}
      />
    </div>
  );
}
