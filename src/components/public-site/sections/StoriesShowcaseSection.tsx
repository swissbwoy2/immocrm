import { useState } from 'react';
import { useShowcase, ShowcaseItem } from '../showcase/useShowcase';
import { ShowcaseStoryRow } from '../showcase/ShowcaseStoryRow';
import { ShowcaseDetailDialog } from '../showcase/ShowcaseDetailDialog';

export function StoriesShowcaseSection() {
  const { offres, visites, loading } = useShowcase();
  const [selected, setSelected] = useState<ShowcaseItem | null>(null);

  if (loading || (offres.length === 0 && visites.length === 0)) return null;

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
            Les biens que nous traitons <span className="text-primary">en direct</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Visites planifiées et offres envoyées par nos chasseurs — mises à jour en continu.
          </p>
        </div>

        <div className="space-y-8">
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
