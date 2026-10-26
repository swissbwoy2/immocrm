import { CalendarDays } from 'lucide-react';
import { CONTAINER, Cta } from '@/components/public-site/home/homeUi';
import { cn } from '@/lib/utils';
import { AGENCE } from '@/content/seoPages';
import { Breadcrumbs, ContactCard, PageHeader, Sections, SeoShell, ZoneLinks } from './SeoBlocks';

/** Page de l'agence : /agence-immobiliere-crissier (référencement local, NAP, carte). */
export default function AgencePage() {
  const q = encodeURIComponent(`${AGENCE.address.street}, ${AGENCE.address.postalCode} ${AGENCE.address.locality}`);
  return (
    <SeoShell>
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: AGENCE.name }]} />
      <PageHeader h1={AGENCE.h1} lede={AGENCE.lede} />

      <div className={cn(CONTAINER, 'mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14')}>
        <article>
          <Sections sections={AGENCE.sections} />
          <div className="mt-8">
            <Cta to="/rendez-vous">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              Réserver mon rendez-vous au bureau
            </Cta>
          </div>
        </article>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <ContactCard />
          <div className="overflow-hidden rounded-[14px] bg-muted">
            <iframe
              title="Plan d’accès à l’agence Logisorama à Crissier"
              src={`https://www.google.com/maps?q=${q}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block aspect-[4/3] w-full border-0"
            />
          </div>
        </aside>
      </div>

      <div className={CONTAINER}>
        <ZoneLinks title="Nos zones de recherche en Suisse romande" />
      </div>
    </SeoShell>
  );
}
