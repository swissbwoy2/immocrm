import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Building2, CheckCircle2, FileSearch, Hammer, Home, Key, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { cn } from '@/lib/utils';
import { ACCENT_TEXT, CONTAINER, Cta, SURFACE } from './homeUi';
import { SelectionCarousel } from './HomeSelection';

const ownerServices = [
  { href: 'https://logisorama.ch/relouer-mon-appartement', icon: KeyRound, label: 'Mettre en location' },
  { href: 'https://immo-rama.ch/vendre-mon-bien', icon: Building2, label: 'Vendre mon bien' },
  { href: 'https://immo-rama.ch/project-management', icon: Hammer, label: 'Construire et rénover' },
];

const reassurance = [
  { icon: CheckCircle2, label: 'Réponse sous 24 h' },
  { icon: ShieldCheck, label: 'Accompagnement humain' },
  { icon: Lock, label: 'Sans carte bancaire' },
];

/**
 * Haut de page : choix Louer / Acheter, accroche et action du parcours choisi, « Notre sélection »,
 * puis le bandeau propriétaires. Tient sur un écran d’ordinateur.
 */
export function HomeHero() {
  const { searchType, setSearchType, isLocation, isAchat } = useSearchType();
  const reduce = useReducedMotion();
  const louer = isLocation || !searchType;

  const tab = (active: boolean) =>
    cn(
      'relative flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-[16px] font-semibold transition-colors duration-200 active:scale-[0.97]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
      active ? 'imr-lg-lens text-[var(--home-accent)]' : 'text-foreground/70 hover:text-foreground',
    );

  return (
    <section className="bg-white" aria-labelledby="home-hero-title">
      <div className={cn(CONTAINER, 'pt-5 md:pt-8')}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
          {/* Texte et choix du parcours */}
          <div className="min-w-0">
            <h1
              id="home-hero-title"
              className="max-w-[18ch] text-[36px] leading-[1.04] tracking-[-0.03em] text-foreground md:text-[46px] lg:text-[54px]"
              style={{ overflowWrap: 'break-word' }}
            >
              Votre recherche, notre mission.
            </h1>
            <p className="mt-3 max-w-[46ch] text-[17px] leading-[1.5] text-foreground/80">
              En Suisse romande, choisissez votre projet et avancez avec un expert.
            </p>

            <div className="imr-lg-segment mt-6 grid max-w-md grid-cols-2 gap-1 rounded-full p-1" role="group" aria-label="Type de recherche">
              <button type="button" onClick={() => setSearchType('location')} aria-pressed={louer} className={tab(louer)}>
                <Key className="h-5 w-5" aria-hidden="true" />
                Louer
              </button>
              <button type="button" onClick={() => setSearchType('achat')} aria-pressed={isAchat} className={tab(isAchat)}>
                <Home className="h-5 w-5" aria-hidden="true" />
                Acheter
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isAchat ? 'achat' : 'location'}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mt-5 max-w-xl"
              >
                {isAchat ? (
                  <>
                    <p className="text-[20px] font-semibold leading-snug text-foreground md:text-[22px]">
                      Accédez aux biens du marché et aux opportunités off-market de votre région.
                    </p>
                    <p className="mt-2 text-[16px] leading-[1.55] text-foreground/80">
                      Mandat de 6 mois avec une activation de 2’500 CHF. La commission représente 1 % du prix d’achat, acompte
                      déduit. Remboursement en cas d’échec.
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Cta to="/nouveau-mandat" className="sm:flex-1">
                        Trouver mon bien
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </Cta>
                      <Cta to="/analyse-dossier?type=achat" variant="secondary" className="sm:flex-1">
                        <FileSearch className="h-5 w-5" aria-hidden="true" />
                        Tester ma solvabilité
                      </Cta>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[20px] font-semibold leading-snug text-foreground md:text-[22px]">
                      Confiez-nous votre recherche jusqu’à la remise des clés.
                    </p>
                    <p className="mt-2 text-[16px] leading-[1.55] text-foreground/80">
                      Recherche ciblée, dossier optimisé, visites déléguées et accompagnement jusqu’au bail. Acompte de 300 CHF,
                      commission seulement en cas de succès.
                    </p>
                    <div className="mt-5">
                      <Cta to="/analyse-dossier?type=location" className="w-full sm:w-auto">
                        Analyser gratuitement mon dossier
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </Cta>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {reassurance.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-[15px] text-foreground/80">
                  <Icon className={cn('h-4 w-4 flex-none', ACCENT_TEXT)} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Notre sélection (à la place de la photo), identique pour Louer et Acheter */}
          <SelectionCarousel />
        </div>

        {/* Propriétaires */}
        <div className={cn('mt-5 rounded-[14px] p-4 md:mt-6 md:p-5', SURFACE)}>
          <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-6">
            <p className="text-[17px] font-semibold text-foreground">Vous êtes propriétaire ?</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {ownerServices.map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 cursor-pointer items-center justify-between gap-3 rounded-full imr-lg-glass px-5 text-[15px] font-semibold text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
