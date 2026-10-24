import { Navigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { CONTAINER, SURFACE } from '@/components/public-site/home/homeUi';
import { cn } from '@/lib/utils';
import { HUB, HUB_PATH, findZone } from '@/content/seoPages';
import { Breadcrumbs, ContactCard, FaqBlock, PageHeader, Sections, SeoShell, SourcesNote, ZoneLinks } from './SeoBlocks';

/** Page de zone : /recherche-appartement/:slug */
export default function SeoZonePage() {
  const { slug } = useParams();
  const zone = findZone(slug);
  if (!zone) return <Navigate to={HUB_PATH} replace />;

  return (
    <SeoShell>
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Recherche d’appartement', to: HUB.path }, { label: zone.name }]} />
      <PageHeader h1={zone.h1} lede={zone.lede} />

      <div className={cn(CONTAINER, 'mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14')}>
        <article>
          <Sections sections={zone.sections} />
          <FaqBlock faq={zone.faq} />
          <SourcesNote sources={zone.sources} />
        </article>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className={cn('rounded-[14px] p-5', SURFACE)}>
            <p className="text-[16px] font-semibold text-foreground">Communes couvertes</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {zone.communes.map((c) => (
                <li key={c}>
                  <a
                    href={`/annonces/recherche?lieux=${encodeURIComponent(c)}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[14px] text-foreground underline-offset-4 hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {c}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-foreground/70">Liens vers les annonces disponibles dans chaque commune.</p>
          </div>
          <ContactCard />
        </aside>
      </div>

      <div className={CONTAINER}>
        <ZoneLinks exclude={zone.slug} />
      </div>
    </SeoShell>
  );
}
