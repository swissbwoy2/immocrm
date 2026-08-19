import { useState } from 'react';
import { useShowcase, ShowcaseItem } from '../showcase/useShowcase';
import { ShowcaseStoryRow } from '../showcase/ShowcaseStoryRow';
import { ShowcaseDetailDialog } from '../showcase/ShowcaseDetailDialog';

export function StoriesShowcaseSection() {
  const { offres, visites, annonces, loading } = useShowcase();
  const [selected, setSelected] = useState<ShowcaseItem | null>(null);

  const aLouer = annonces.filter((a) => a.type_transaction !== 'vente');
  const aVendre = annonces.filter((a) => a.type_transaction === 'vente');

  if (loading || (offres.length === 0 && visites.length === 0 && annonces.length === 0)) return null;

  return (
    <section className="rounded-2xl border border-primary/15 bg-primary/5 py-6 md:py-8">
      <div className="px-4">
        <div className="mb-6 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-foreground font-serif">
            Les biens que nous traitons <span className="text-primary">en direct</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Visites planifiées et offres envoyées par nos chasseurs — mises à jour en continu.
          </p>
        </div>


        <div className="space-y-8">
          {aLouer.length > 0 && (
            <ShowcaseStoryRow title="Annonces à louer" items={aLouer} onSelect={setSelected} />
          )}
          {aVendre.length > 0 && (
            <ShowcaseStoryRow title="Annonces à vendre" items={aVendre} onSelect={setSelected} />
          )}
          {visites.length > 0 && (
            <ShowcaseStoryRow title="Visites à venir" items={visites} onSelect={setSelected} />
          )}
          {offres.length > 0 && (
            <ShowcaseStoryRow title="Offres envoyées" items={offres} onSelect={setSelected} />
          )}
        </div>
      </div>



      <ShowcaseDetailDialog item={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </section>
  );
}
