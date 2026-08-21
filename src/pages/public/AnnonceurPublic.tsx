import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicAnnonceCard } from '@/components/public/PublicAnnonceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Star, Shield, RotateCcw, ArrowLeft } from 'lucide-react';

type Transaction = 'tous' | 'location' | 'vente';

const VENTE = ['vente', 'achat', 'vendre'];
const LOCATION = ['location', 'louer'];

export default function AnnonceurPublic() {
  const { id } = useParams<{ id: string }>();

  const [transaction, setTransaction] = useState<Transaction>('tous');
  const [categorie, setCategorie] = useState<string>('all');
  const [ville, setVille] = useState('');
  const [prixMin, setPrixMin] = useState('');
  const [prixMax, setPrixMax] = useState('');
  const [piecesMin, setPiecesMin] = useState('');
  const [surfaceMin, setSurfaceMin] = useState('');
  const [sort, setSort] = useState<'recent' | 'prix_asc' | 'prix_desc'>('recent');

  const { data: annonceur, isLoading: loadingAnnonceur } = useQuery({
    queryKey: ['annonceur-public', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_public_annonceurs')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ['annonceur-public-annonces', id],
    enabled: !!id,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(id, nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          categories_annonces(nom, slug, icone),
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('annonceur_id', id!)
        .eq('statut', 'publie')
        .or(`date_expiration.is.null,date_expiration.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const displayName =
    annonceur?.nom_entreprise || `${annonceur?.prenom || ''} ${annonceur?.nom || ''}`.trim() || 'Annonceur';

  useEffect(() => {
    if (displayName) document.title = `${displayName} — Annonces immobilières | Logisorama`;
  }, [displayName]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    annonces.forEach((a: any) => {
      if (a.categories_annonces?.slug) map.set(a.categories_annonces.slug, a.categories_annonces.nom);
    });
    return Array.from(map.entries());
  }, [annonces]);

  const filtered = useMemo(() => {
    let list = [...(annonces as any[])];
    if (transaction === 'vente') list = list.filter((a) => VENTE.includes(a.type_transaction));
    if (transaction === 'location') list = list.filter((a) => LOCATION.includes(a.type_transaction));
    if (categorie !== 'all') list = list.filter((a) => a.categories_annonces?.slug === categorie);
    if (ville.trim()) {
      const v = ville.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.ville || '').toLowerCase().includes(v) ||
          (a.canton || '').toLowerCase().includes(v) ||
          (a.code_postal || '').toString().includes(v),
      );
    }
    if (prixMin) list = list.filter((a) => Number(a.prix) >= Number(prixMin));
    if (prixMax) list = list.filter((a) => Number(a.prix) <= Number(prixMax));
    if (piecesMin) list = list.filter((a) => Number(a.nombre_pieces || 0) >= Number(piecesMin));
    if (surfaceMin) list = list.filter((a) => Number(a.surface_habitable || 0) >= Number(surfaceMin));

    if (sort === 'prix_asc') list.sort((a, b) => Number(a.prix) - Number(b.prix));
    else if (sort === 'prix_desc') list.sort((a, b) => Number(b.prix) - Number(a.prix));
    else
      list.sort(
        (a, b) =>
          new Date(b.date_publication || b.created_at).getTime() -
          new Date(a.date_publication || a.created_at).getTime(),
      );
    return list;
  }, [annonces, transaction, categorie, ville, prixMin, prixMax, piecesMin, surfaceMin, sort]);

  const resetFilters = () => {
    setTransaction('tous');
    setCategorie('all');
    setVille('');
    setPrixMin('');
    setPrixMax('');
    setPiecesMin('');
    setSurfaceMin('');
    setSort('recent');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/annonces">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Retour au portail
          </Link>
        </Button>

        {/* En-tête annonceur */}
        {loadingAnnonceur ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : !annonceur ? (
          <Card className="p-8 text-center text-muted-foreground">Annonceur introuvable.</Card>
        ) : (
          <Card className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {annonceur.logo_url && (
                <img
                  src={annonceur.logo_url}
                  alt={displayName}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border border-border shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold truncate">{displayName}</h1>
                  {annonceur.est_verifie && <Shield className="h-4 w-4 text-primary" />}
                  <Badge variant="outline" className="capitalize">
                    {annonceur.type_annonceur === 'particulier'
                      ? 'Particulier'
                      : annonceur.type_annonceur === 'agence'
                      ? 'Agence immobilière'
                      : annonceur.type_annonceur === 'promoteur'
                      ? 'Promoteur'
                      : 'Annonceur'}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4 text-primary/80" />
                    {annonces.length} annonce{annonces.length > 1 ? 's' : ''} en ligne
                  </span>
                  {(annonceur.ville || annonceur.canton) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-primary/80" />
                      {[annonceur.ville, annonceur.canton].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {annonceur.note_moyenne != null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      {Number(annonceur.note_moyenne).toFixed(1)} ({annonceur.nb_avis || 0})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Filtres */}
        <Card className="mt-6 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Tabs value={transaction} onValueChange={(v) => setTransaction(v as Transaction)} className="w-full sm:w-auto">
                <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
                  <TabsTrigger value="tous">Tous</TabsTrigger>
                  <TabsTrigger value="location">Louer</TabsTrigger>
                  <TabsTrigger value="vente">Acheter</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="sm:ml-auto flex items-center gap-2">
                <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Plus récentes</SelectItem>
                    <SelectItem value="prix_asc">Prix croissant</SelectItem>
                    <SelectItem value="prix_desc">Prix décroissant</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={resetFilters} aria-label="Réinitialiser les filtres">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type de bien</Label>
                <Select value={categorie} onValueChange={setCategorie}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {categories.map(([slug, nom]) => (
                      <SelectItem key={slug} value={slug}>
                        {nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ville / NPA</Label>
                <Input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Genève" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prix min</Label>
                <Input type="number" value={prixMin} onChange={(e) => setPrixMin(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prix max</Label>
                <Input type="number" value={prixMax} onChange={(e) => setPrixMax(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pièces min</Label>
                <Input type="number" step="0.5" value={piecesMin} onChange={(e) => setPiecesMin(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Surface min (m²)</Label>
                <Input type="number" value={surfaceMin} onChange={(e) => setSurfaceMin(e.target.value)} placeholder="—" />
              </div>
            </div>
          </div>
        </Card>

        {/* Résultats */}
        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3">
            {filtered.length} bien{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
          </p>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              Aucun bien ne correspond à ces critères.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((a: any) => (
                <PublicAnnonceCard key={a.id} annonce={a} />
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
