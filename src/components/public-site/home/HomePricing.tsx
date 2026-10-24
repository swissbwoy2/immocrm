import type { ReactNode } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { cn } from '@/lib/utils';
import { ACCENT_TEXT, CONTAINER, Cta, H2, H3, Reveal, SURFACE } from './homeUi';

type Offer = {
  title: string;
  lede: string;
  guaranteeTitle: string;
  guaranteeText: ReactNode;
  guaranteeLink: string;
  price: string;
  priceNote: string;
  priceDescription: string;
  rows: { k: string; v: string; d: string }[];
  promise: string;
  promiseItems: string[];
  features: string[];
  subtext: string;
};

const OFFERS: Record<'location' | 'achat', Offer> = {
  location: {
    title: 'Un modèle simple et sans surprise',
    lede: 'Au terme sans bail : activation remboursée sous 30 jours.',
    guaranteeTitle: "Tellement confiant qu’on te rembourse",
    guaranteeText: (
      <>
        Après ta shortlist personnalisée, tu peux nous confier ta recherche pendant <strong className="font-semibold text-foreground">90 jours</strong>.
        Au terme sans bail signé, <strong className="font-semibold text-foreground">l’activation de 300 CHF est remboursée sous 30 jours.</strong>
      </>
    ),
    guaranteeLink: 'Découvrir le mandat 90 jours',
    price: '300 CHF',
    priceNote: 'Acompte unique',
    priceDescription: "Acompte unique à l’inscription. Déduit de la commission finale.",
    rows: [
      { k: 'Succès', v: '1 mois de loyer', d: 'Commission uniquement si nous trouvons votre logement. Moins les 300 CHF déjà versés.' },
      { k: 'Garantie', v: '90 jours', d: 'Si nous ne trouvons rien en 90 jours, vous êtes remboursé intégralement.' },
      { k: 'Fin sans bail ?', v: 'Activation remboursée', d: 'Sous 30 j au terme ; conservée si résiliation anticipée' },
    ],
    promise: 'Garantie 100% remboursé',
    promiseItems: ['Zéro condition cachée'],
    features: ['Sans engagement', 'Remboursable si échec', 'Paiement sécurisé', 'Zéro risque', 'Payable au bail signé', 'Visites incluses', 'Engagement écrit', 'Remboursement intégral', '100% sécurisé'],
    subtext: 'Sans engagement, acompte remboursable après 90 jours',
  },
  achat: {
    title: 'Une commission claire, alignée sur votre succès',
    lede: "Commission de 1 % du prix, activation de 2'500 CHF imputée.",
    guaranteeTitle: 'Commission transparente de 1%',
    guaranteeText: (
      <>
        Mandat de <strong className="font-semibold text-foreground">6 mois</strong> : on cherche activement ton bien idéal.{' '}
        <strong className="font-semibold text-foreground">Au terme sans acquisition, l’activation de 2'500 CHF est remboursée sous 30 jours.</strong>
      </>
    ),
    guaranteeLink: "Démarrer ma recherche d’achat",
    price: "2'500 CHF",
    priceNote: "Acompte d’engagement",
    priceDescription: "Montant d’activation imputé sur la commission (1 % du prix, min. CHF 500).",
    rows: [
      { k: 'Succès', v: "1% du prix d’achat", d: "Commission uniquement à l’acte authentique. Acompte déduit." },
      { k: 'Garantie', v: '6 mois', d: 'Pas de bien trouvé en 6 mois ? Acompte intégralement remboursé.' },
      { k: 'Fin sans achat ?', v: 'Activation remboursée', d: 'Sous 30 j au terme ; conservée si résiliation anticipée' },
    ],
    promise: 'Garantie remboursement 6 mois',
    promiseItems: ['Commission 1%', 'Acompte déduit', 'Remboursé si échec après 6 mois'],
    features: ['Sans engagement', 'Imputé sur la commission', 'Mandat exclusif', 'Acompte déduit', "Payable à l’acte", 'Off-market inclus', 'Engagement écrit', 'Remboursement intégral'],
    subtext: 'Sans engagement, acompte remboursable après 6 mois',
  },
};

/** Tarifs et garantie (ancre #tarifs), avec la carte de prix collante comme le tunnel /courtier. */
export function HomePricing() {
  const { isAchat } = useSearchType();
  const o = OFFERS[isAchat ? 'achat' : 'location'];

  const card = (
    <div className={cn('rounded-[14px] p-6', SURFACE)}>
      <p className="text-[24px] font-semibold leading-snug text-foreground">
        {o.price} <span className="text-[16px] font-normal text-foreground/70">{o.priceNote}</span>
      </p>
      <p className="mt-1 text-[15px] text-foreground/80">{o.priceDescription}</p>
      <div className="mt-5 space-y-3">
        {o.rows.map((r) => (
          <div key={r.k} className="rounded-lg bg-white px-4 py-3">
            <p className="text-[13px] text-foreground/70">{r.k}</p>
            <p className="text-[16px] font-semibold text-foreground">{r.v}</p>
            <p className="mt-0.5 text-[14px] leading-[1.45] text-foreground/80">{r.d}</p>
          </div>
        ))}
      </div>
      <Cta to="/nouveau-mandat" className="mt-5 w-full">
        Activer ma recherche maintenant
      </Cta>
      <p className="mt-3 text-center text-[14px] text-foreground/80">{o.subtext}</p>
      <div className="mt-5 flex gap-3">
        <ShieldCheck className={cn('mt-0.5 h-5 w-5 flex-none', ACCENT_TEXT)} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <p className="text-[15px] font-semibold text-foreground">{o.promise}</p>
          <ul className="mt-1 space-y-0.5">
            {o.promiseItems.map((t) => (
              <li key={t} className="text-[14px] text-foreground/80">{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <section id="tarifs" className="scroll-mt-28 bg-white pt-14 md:pt-20" aria-labelledby="home-pricing-title">
      <div className={CONTAINER}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div>
            <Reveal>
              <h2 id="home-pricing-title" className={H2}>{o.title}</h2>
              <p className="mt-2 text-[16px] text-foreground/80">{o.lede}</p>
            </Reveal>

            <Reveal className="mt-8">
              <h3 className={H3}>{o.guaranteeTitle}</h3>
              <p className="mt-2 text-[16px] leading-[1.6] text-foreground/85">{o.guaranteeText}</p>
              <a
                href="/nouveau-mandat"
                className={cn('mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[16px] font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground', ACCENT_TEXT)}
              >
                {o.guaranteeLink}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Reveal>

            <Reveal className="mt-8">
              <h3 className={H3}>Ce qui est inclus</h3>
              <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {o.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[16px] text-foreground">
                    <Check className={cn('h-5 w-5 flex-none', ACCENT_TEXT)} strokeWidth={2} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Carte de prix dans le flux sur téléphone et tablette */}
            <Reveal className="mt-10 lg:hidden">{card}</Reveal>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-28">{card}</div>
          </aside>
        </div>
      </div>
    </section>
  );
}
