import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CONTAINER, H2, Reveal, SURFACE } from '@/components/public-site/home/homeUi';
import { cn } from '@/lib/utils';
import { HUB, ZONES } from '@/content/seoPages';
import { Breadcrumbs, ContactCard, PageHeader, Sections, SeoShell } from './SeoBlocks';

/** Page hub : /recherche-appartement, relie toutes les zones et l'agence. */
export default function SeoHubPage() {
  return (
    <SeoShell>
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Recherche d’appartement' }]} />
      <PageHeader h1={HUB.h1} lede={HUB.lede} />

      <section className={cn(CONTAINER, 'mt-12')} aria-labelledby="hub-zones-title">
        <h2 id="hub-zones-title" className={H2}>Nos zones de recherche</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZONES.map((z, i) => (
            <Reveal as="li" key={z.slug} delay={i * 0.04}>
              <Link
                to={z.path}
                className={cn('flex h-full flex-col rounded-[14px] p-5 transition-colors duration-150 hover:bg-[var(--home-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground', SURFACE)}
              >
                <span className="text-[18px] font-semibold text-foreground">{z.name}</span>
                <span className="mt-2 text-[15px] leading-[1.5] text-foreground/80">{z.communes.slice(0, 5).join(', ')}…</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[15px] font-semibold text-[var(--home-accent)]">
                  Voir la zone
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      <div className={cn(CONTAINER, 'mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14')}>
        <article>
          <Sections sections={HUB.sections} />
          <p className="mt-10 max-w-[68ch] text-[16px] leading-[1.7] text-foreground/90">
            Découvrez aussi notre{' '}
            <Link to="/chasseur-appartement" className="font-semibold text-[var(--home-accent)] underline-offset-4 hover:underline">service de chasseur d’appartement</Link>,
            l’<Link to="/accompagnement-achat" className="font-semibold text-[var(--home-accent)] underline-offset-4 hover:underline">accompagnement à l’achat</Link>{' '}
            et la <Link to="/relouer-mon-appartement" className="font-semibold text-[var(--home-accent)] underline-offset-4 hover:underline">recherche d’un repreneur pour une reprise de bail</Link>.
          </p>
        </article>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ContactCard />
        </aside>
      </div>
    </SeoShell>
  );
}
