import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Bookmark, Plus, Search, Clock, CheckCircle2, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWishlist, WishlistStatut } from '@/hooks/useWishlist';
import { WishlistAddDialog } from '@/components/wishlist/WishlistAddDialog';
import { WishlistCard } from '@/components/wishlist/WishlistCard';

const STATUS_FILTERS: { value: WishlistStatut | 'all'; label: string; icon?: any }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'a_contacter', label: 'À contacter', icon: Clock },
  { value: 'contacte_sans_reponse', label: 'Sans réponse', icon: Clock },
  { value: 'offre_envoyee', label: 'Offre envoyée', icon: CheckCircle2 },
  { value: 'archive', label: 'Archivés', icon: Archive },
];

export default function Wishlist() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { items, loading } = useWishlist();
  const [filter, setFilter] = useState<WishlistStatut | 'all'>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === '1');

  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/agent';

  const kpis = useMemo(() => ({
    total: items.length,
    a_contacter: items.filter((i) => i.statut === 'a_contacter').length,
    sans_reponse: items.filter((i) => i.statut === 'contacte_sans_reponse').length,
    offre_envoyee: items.filter((i) => i.statut === 'offre_envoyee').length,
  }), [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') {
      list = list.filter((i) => i.statut === filter);
    } else {
      list = list.filter((i) => i.statut !== 'archive');
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.adresse.toLowerCase().includes(q) ||
        (i.contact_nom ?? '').toLowerCase().includes(q) ||
        (i.notes ?? '').toLowerCase().includes(q) ||
        (i.ville ?? '').toLowerCase().includes(q) ||
        (i.source_portail ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Bookmark className="h-7 w-7 text-primary" /> Biens à suivre
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Annonces intéressantes en attente de retour annonceur. Statut "Offre envoyée" marqué automatiquement.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" /> Ajouter un bien
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total" value={kpis.total} accent="bg-primary/10 text-primary border-primary/20" />
          <KpiCard label="À contacter" value={kpis.a_contacter} accent="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/30" />
          <KpiCard label="Sans réponse" value={kpis.sans_reponse} accent="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/30" />
          <KpiCard label="Offre envoyée" value={kpis.offre_envoyee} accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/30" />
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (adresse, contact, notes, ville…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.value;
              return (
                <Button
                  key={f.value}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => setFilter(f.value)}
                  className="gap-1"
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />} {f.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} hasAny={items.length > 0} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <WishlistCard key={item.id} item={item} basePath={basePath} />
            ))}
          </div>
        )}
      </div>

      <WishlistAddDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <div className="text-center py-16 border-2 border-dashed rounded-xl">
      <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50" />
      <h3 className="mt-4 font-semibold">{hasAny ? 'Aucun bien dans ce filtre' : 'Aucun bien suivi pour le moment'}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {hasAny ? 'Change de filtre ou ajoute un nouveau bien.' : 'Ajoute des annonces intéressantes pour les garder à portée de main.'}
      </p>
      <Button onClick={onAdd} className="mt-4">
        <Plus className="h-4 w-4 mr-2" /> Ajouter mon premier bien
      </Button>
    </div>
  );
}
