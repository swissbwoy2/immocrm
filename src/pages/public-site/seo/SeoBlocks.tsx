import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Mail, MapPin, Phone } from 'lucide-react';
import { PublicSiteLayout } from '@/components/public-site/PublicSiteLayout';
import { CONTAINER, Cta, FaqRow, H2, Reveal, SURFACE } from '@/components/public-site/home/homeUi';
import { cn } from '@/lib/utils';
import { AGENCE, HUB_PATH, ZONES, type SeoFaq, type SeoSection, type SeoSource } from '@/content/seoPages';

/** Gabarit commun des pages de référencement local (même style que la page d'accueil). */
export function SeoShell({ children }: { children: ReactNode }) {
  return (
    <PublicSiteLayout>
      <div className="home-tokens bg-white pb-20">{children}</div>
    </PublicSiteLayout>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className={cn(CONTAINER, 'pt-6')}>
      <ol className="flex flex-wrap items-center gap-1 text-[14px] text-foreground/75">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            {it.to ? (
              <Link to={it.to} className="underline-offset-4 hover:text-foreground hover:underline">{it.label}</Link>
            ) : (
              <span aria-current="page" className="text-foreground">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ h1, lede }: { h1: string; lede: string }) {
  return (
    <header className={cn(CONTAINER, 'pt-5')}>
      <h1 className="max-w-[24ch] text-[32px] leading-[1.08] tracking-[-0.025em] text-foreground md:text-[44px]" style={{ overflowWrap: 'break-word' }}>
        {h1}
      </h1>
      <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.6] text-foreground/85">{lede}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Cta to="/nouveau-mandat">
          Activer ma recherche
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Cta>
        <Cta to="/analyse-dossier?type=location" variant="secondary">Analyser gratuitement mon dossier</Cta>
      </div>
    </header>
  );
}

export function Sections({ sections }: { sections: SeoSection[] }) {
  return (
    <div className="space-y-10">
      {sections.map((s) => (
        <Reveal key={s.h2}>
          <section>
            <h2 className={H2}>{s.h2}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 max-w-[68ch] text-[16px] leading-[1.7] text-foreground/90">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-4 max-w-[68ch] space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-[16px] leading-[1.6] text-foreground/90">
                    <span className="mt-[0.6em] h-1.5 w-1.5 flex-none rounded-full bg-[var(--home-accent)]" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>
      ))}
    </div>
  );
}

export function FaqBlock({ faq, title = 'Questions fréquentes' }: { faq: SeoFaq[]; title?: string }) {
  return (
    <section className="mt-14" aria-labelledby="seo-faq-title">
      <h2 id="seo-faq-title" className={H2}>{title}</h2>
      <div className="mt-5 max-w-[760px] space-y-2">
        {faq.map((f) => <FaqRow key={f.q} q={f.q} a={f.a} />)}
      </div>
    </section>
  );
}

export function SourcesNote({ sources }: { sources?: SeoSource[] }) {
  if (!sources?.length) return null;
  return (
    <aside className="mt-10 max-w-[760px] text-[13px] leading-[1.5] text-foreground/70">
      <p className="font-medium text-foreground/80">Sources</p>
      <ul className="mt-1 space-y-1">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{s.label}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Carte de contact (nom, adresse, téléphone) identique sur toutes les pages : cohérence NAP. */
export function ContactCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[14px] p-5', SURFACE, className)}>
      <p className="text-[16px] font-semibold text-foreground">Logisorama by Immo-rama.ch</p>
      <address className="mt-2 space-y-2 not-italic text-[15px] text-foreground/85">
        <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />{AGENCE.address.street}, {AGENCE.address.postalCode} {AGENCE.address.locality}</p>
        <p><a href={`tel:${AGENCE.phoneE164}`} className="flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"><Phone className="h-4 w-4" aria-hidden="true" />{AGENCE.phoneDisplay}</a></p>
        <p><a href={`mailto:${AGENCE.email}`} className="flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"><Mail className="h-4 w-4" aria-hidden="true" />{AGENCE.email}</a></p>
      </address>
      <Link to={AGENCE.path} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[var(--home-accent)] underline-offset-4 hover:underline">
        Notre agence à Crissier
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Liens vers les autres zones (maillage interne en étoile autour de la page hub). */
export function ZoneLinks({ exclude, title = 'Nos autres zones de recherche' }: { exclude?: string; title?: string }) {
  return (
    <section className="mt-14" aria-labelledby="seo-zones-title">
      <h2 id="seo-zones-title" className={H2}>{title}</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ZONES.filter((z) => z.slug !== exclude).map((z) => (
          <li key={z.slug}>
            <Link
              to={z.path}
              className={cn('flex min-h-12 items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-[16px] font-semibold text-foreground transition-colors duration-150 hover:bg-[var(--home-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground', SURFACE)}
            >
              Appartement : {z.name}
              <ArrowRight className="h-4 w-4 flex-none" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[15px]">
        <Link to={HUB_PATH} className="font-semibold text-[var(--home-accent)] underline-offset-4 hover:underline">Toutes nos zones en Suisse romande</Link>
      </p>
    </section>
  );
}
