import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, CheckCircle2, CreditCard, Eye, Handshake, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { cn } from '@/lib/utils';
import { ACCENT_TEXT, CONTAINER, Cta, H2, Reveal, SURFACE } from './homeUi';

const benefits = [
  { icon: TrendingUp, title: "Jusqu’à 500 CHF par client", description: 'Touche ta commission pour chaque personne relogée grâce à ta recommandation.' },
  { icon: Eye, title: 'Dashboard partenaire dédié', description: 'Suis tes leads, leurs statuts et tes paiements en temps réel depuis ton espace perso.' },
  { icon: CreditCard, title: 'Paiement sous 15 jours', description: 'Virement direct sur ton compte dès la signature du bail. Rapide et sans paperasse.' },
];

const targetProfiles = [
  { icon: Building2, label: 'Agents immobiliers' },
  { icon: Users, label: 'RH & Entreprises' },
  { icon: Briefcase, label: 'Courtiers & Conciergeries' },
  { icon: Handshake, label: 'Coachs emploi & Influenceurs' },
];

/** Dernier appel à l’action, puis le programme partenaire (ancre #programme-partenaire). */
export function HomeClosing() {
  const { isAchat } = useSearchType();
  const checks = isAchat
    ? [
        { icon: CheckCircle2, label: "Activation 2'500 CHF" },
        { icon: CheckCircle2, label: '6 mois de recherche' },
        { icon: ShieldCheck, label: 'Remboursé si échec' },
      ]
    : [
        { icon: CheckCircle2, label: 'Acompte 300 CHF' },
        { icon: CheckCircle2, label: '90 jours garantis' },
        { icon: ShieldCheck, label: 'Remboursé si échec' },
      ];

  return (
    <>
      <section className="bg-white pt-14 md:pt-20" aria-labelledby="home-final-title">
        <div className={CONTAINER}>
          <Reveal className={cn('rounded-[14px] px-6 py-10 md:px-12 md:py-14', SURFACE)}>
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h2 id="home-final-title" className={H2}>Prêt à trouver votre logement ?</h2>
                <p className="mt-3 max-w-[56ch] text-[16px] leading-[1.6] text-foreground/85">
                  Rejoignez les +500 familles qui ont délégué leur recherche à nos experts. Résultat garanti ou remboursé.
                </p>
                <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                  {checks.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2 text-[15px] text-foreground">
                      <Icon className={cn('h-4 w-4', ACCENT_TEXT)} aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Cta to="/nouveau-mandat" className="w-full lg:w-auto">
                  Activer ma recherche maintenant
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Cta>
                <a href="#comment-ca-marche" className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold text-foreground underline underline-offset-4 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
                  Voir comment ça marche
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="programme-partenaire" className="scroll-mt-28 bg-white pt-14 md:pt-20" aria-labelledby="home-partner-title">
        <div className={CONTAINER}>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 id="home-partner-title" className={H2}>Transforme ton réseau en revenus passifs</h2>
              <p className="mt-3 max-w-[52ch] text-[16px] leading-[1.6] text-foreground/85">
                Tu connais quelqu’un qui galère à trouver un appart' ? Envoie-le nous et touche ta commission. Simple comme bonjour.
              </p>
              <p className="mt-5 text-[15px] font-medium text-foreground">Parfait pour :</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {targetProfiles.map(({ icon: Icon, label }) => (
                  <li key={label} className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[14px] text-foreground', SURFACE)}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="mt-6 inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-6 text-[16px] font-medium text-foreground ring-1 ring-inset ring-foreground/80 transition-colors duration-150 hover:bg-[var(--home-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
              >
                Devenir partenaire
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Reveal>
            <ul className="space-y-6">
              {benefits.map(({ icon: Icon, title, description }, i) => (
                <Reveal as="li" key={title} delay={i * 0.06} className="flex gap-4">
                  <Icon className="mt-0.5 h-6 w-6 flex-none text-foreground" strokeWidth={1.6} aria-hidden="true" />
                  <div>
                    <p className="text-[17px] font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-[16px] leading-[1.55] text-foreground/80">{description}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
