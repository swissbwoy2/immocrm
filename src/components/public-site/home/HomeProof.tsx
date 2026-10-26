import { useEffect, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import allianzLogo from '@/assets/partners/allianz.svg';
import axaLogo from '@/assets/partners/axa.svg';
import resolveLogo from '@/assets/partners/resolve.svg';
import firstcautionLogo from '@/assets/partners/firstcaution.svg';
import flatfoxLogo from '@/assets/partners/flatfox.svg';
import immobilierChLogo from '@/assets/partners/immobilier-ch.svg';
import realadvisorLogo from '@/assets/partners/realadvisor.png';
import { supabase } from '@/integrations/supabase/client';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { cn } from '@/lib/utils';
import { ACCENT_TEXT, CONTAINER, Cta, H2, H3, Reveal } from './homeUi';

const heroPartnersLocation = [
  { name: 'FirstCaution', logo: firstcautionLogo, href: 'https://www.firstcaution.ch/fr/onboarding/?ref=link=0062863', desc: 'La meilleure garantie de loyer dès 8.-' },
  { name: 'Resolve', logo: resolveLogo, href: 'https://app.resolve.ch/?ref=3cDockrkQdpgjmMqm&utm_source=referral_link_user', desc: 'Comparateur indépendant pour votre hypothèque' },
];
const heroPartnersAchat = [
  { name: 'Resolve', logo: resolveLogo, href: 'https://app.resolve.ch/?ref=3cDockrkQdpgjmMqm&utm_source=referral_link_user', desc: 'Comparateur indépendant pour votre hypothèque' },
  { name: 'Immobilier.ch', logo: immobilierChLogo, href: 'https://www.immobilier.ch', desc: 'Le portail immobilier n°1 en Suisse romande' },
];
const otherPartners = [
  { name: 'Allianz', logo: allianzLogo },
  { name: 'AXA', logo: axaLogo },
  { name: 'Flatfox', logo: flatfoxLogo },
  { name: 'Immobilier.ch', logo: immobilierChLogo },
  { name: 'RealAdvisor', logo: realadvisorLogo },
];
const cantons = ['Vaud', 'Genève', 'Valais', 'Fribourg', 'Neuchâtel', 'Jura'];

/** Preuves : chiffres, partenaires et couverture, sur une seule bande grise. */
export function HomeProof() {
  const { isAchat } = useSearchType();
  const heroPartners = isAchat ? heroPartnersAchat : heroPartnersLocation;
  const [counts, setCounts] = useState({ clients: 500, transactions: 500 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, t] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('statut', 'conclu'),
        ]);
        if (alive) setCounts({ clients: c.count || 500, transactions: t.count || 500 });
      } catch {
        /* chiffres par défaut */
      }
    })();
    return () => { alive = false; };
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('fr-CH').format(n);
  const stats = [
    { value: `${fmt(counts.clients)}+`, label: 'Familles relogées avec succès' },
    { value: `${fmt(counts.transactions)}+`, label: 'Baux signés grâce à nous' },
    { value: '98%', label: 'Recommanderaient Immo-Rama' },
    { value: '45 jours', label: 'En moyenne pour emménager' },
  ];

  return (
    <section id="partenaires" className="mt-14 scroll-mt-28 bg-[var(--home-surface)] py-14 md:mt-20 md:py-20" aria-labelledby="home-proof-title">
      <div className={CONTAINER}>
        <Reveal>
          <h2 id="home-proof-title" className={H2}>Des chiffres qui parlent d’eux-mêmes</h2>
          <p className="mt-2 text-[16px] text-foreground/80">Pas des promesses, des résultats vérifiables</p>
        </Reveal>

        <Reveal className="mt-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-[var(--home-rule)] lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white px-5 py-5">
                <p className="text-[28px] font-semibold leading-none tabular-nums text-foreground md:text-[34px]">{s.value}</p>
                <p className="mt-2 text-[15px] leading-snug text-foreground/80">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14">
          <Reveal>
            <h3 className={H3}>Nos partenaires de confiance</h3>
            <p className="mt-1 text-[15px] text-foreground/80">
              Nous collaborons avec les acteurs majeurs de l’immobilier et de l’assurance en Suisse
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {heroPartners.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex cursor-pointer flex-col rounded-[14px] bg-white p-5 transition-colors duration-150 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  <span className="text-[13px] text-foreground/70">Partenaire privilégié</span>
                  <img src={p.logo} alt={p.name} loading="lazy" className="mt-3 h-9 w-auto self-start object-contain" />
                  <span className="mt-3 text-[15px] leading-snug text-foreground group-hover:underline">{p.desc}</span>
                </a>
              ))}
            </div>
            <p className="mt-6 text-[14px] text-foreground/70">Autres partenaires</p>
            <ul className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4">
              {otherPartners.map((p) => (
                <li key={p.name}>
                  <img src={p.logo} alt={p.name} title={p.name} loading="lazy" className="h-6 w-auto max-w-[120px] object-contain opacity-80 grayscale" />
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08}>
            <h3 className={H3}>Toute la Suisse romande</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {cantons.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[15px] font-medium text-foreground">
                  <MapPin className={cn('h-4 w-4', ACCENT_TEXT)} aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
            <ul className="mt-4 space-y-1 text-[15px] text-foreground/80">
              <li>+50 agences partenaires</li>
              <li>Accès aux offres exclusives</li>
            </ul>
            <Cta to="/nouveau-mandat" variant="secondary" className="mt-5">
              Démarre ta recherche
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Cta>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
