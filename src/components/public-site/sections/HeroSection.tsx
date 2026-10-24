import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Building2, CheckCircle2, FileSearch, Hammer, Home, Key, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroCouple from '@/assets/hero-couple-keys.jpg';
import logoLogisorama from '@/assets/logisorama-logo.png';
import { Button } from '@/components/ui/button';
import { useSearchType } from '@/contexts/SearchTypeContext';

const ownerServices = [
  { href: 'https://logisorama.ch/relouer-mon-appartement', icon: KeyRound, label: 'Mettre en location' },
  { href: 'https://immo-rama.ch/vendre-mon-bien', icon: Building2, label: 'Vendre mon bien' },
  { href: 'https://immo-rama.ch/project-management', icon: Hammer, label: 'Construire et rénover' },
];

const reveal = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export function HeroSection() {
  const { searchType, setSearchType, isLocation, isAchat } = useSearchType();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="overflow-x-clip bg-muted px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto grid min-h-[calc(100svh-118px)] max-w-[1560px] gap-3 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="order-2 flex min-w-0 flex-col rounded-[28px] bg-white px-5 py-6 sm:px-9 sm:py-9 lg:order-1 lg:px-14 lg:py-12">
          <div className="flex items-center justify-between gap-5">
            <img src={logoLogisorama} alt="Logisorama" className="h-9 w-auto sm:h-11" />
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Se connecter
            </Link>
          </div>

          <motion.div
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            variants={reveal}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="my-auto py-10 sm:py-14"
          >
            <h1 className="max-w-[16ch] text-balance text-[clamp(2.7rem,6vw,5.8rem)] font-bold leading-[0.96] tracking-[-0.055em] text-foreground">
              Votre recherche, notre mission.
            </h1>
            <p className="mt-7 max-w-[48ch] text-base leading-7 text-muted-foreground sm:text-lg">
              En Suisse romande, choisissez votre projet et avancez avec un expert.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-2 rounded-[18px] bg-secondary p-1.5" aria-label="Type de recherche">
              <button
                type="button"
                onClick={() => setSearchType('location')}
                aria-pressed={isLocation || !searchType}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:text-base ${isLocation || !searchType ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background'}`}
              >
                <Key className="h-5 w-5" aria-hidden="true" />
                Louer
              </button>
              <button
                type="button"
                onClick={() => setSearchType('achat')}
                aria-pressed={isAchat}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:text-base ${isAchat ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background'}`}
              >
                <Home className="h-5 w-5" aria-hidden="true" />
                Acheter
              </button>
            </div>

            <motion.div
              key={isAchat ? 'achat' : 'location'}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-7 max-w-xl"
            >
              {isAchat ? (
                <>
                  <p className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">Accédez aux biens du marché et aux opportunités off-market de votre région.</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Mandat de 6 mois avec une activation de 2’500 CHF. La commission représente 1 % du prix d’achat, acompte déduit. Remboursement en cas d’échec.</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="min-h-14 flex-1 rounded-full bg-primary text-base text-primary-foreground hover:bg-primary/90">
                      <Link to="/nouveau-mandat">Trouver mon bien<ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="min-h-14 flex-1 rounded-full border-border text-base text-foreground hover:bg-secondary">
                      <Link to="/analyse-dossier?type=achat"><FileSearch className="mr-2 h-5 w-5" aria-hidden="true" />Tester ma solvabilité</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">Confiez-nous votre recherche jusqu’à la remise des clés.</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Recherche ciblée, dossier optimisé, visites déléguées et accompagnement jusqu’au bail. Acompte de 300 CHF, commission seulement en cas de succès.</p>
                  <Button asChild size="lg" className="mt-6 min-h-14 w-full rounded-full bg-primary text-base text-primary-foreground hover:bg-primary/90 sm:w-auto sm:px-8">
                    <Link to="/analyse-dossier?type=location">Analyser gratuitement mon dossier<ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></Link>
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>

          <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Réponse sous 24 h</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Accompagnement humain</p>
            <p className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Sans carte bancaire</p>
          </div>
        </div>

        <div className="relative order-1 min-h-[54svh] overflow-hidden rounded-[28px] bg-foreground lg:order-2 lg:sticky lg:top-[106px] lg:h-[calc(100svh-126px)]">
          <img src={heroCouple} alt="Un couple reçoit les clés de son nouveau logement" className="h-full w-full object-cover" width="1600" height="1200" loading="eager" decoding="async" />
          <div className="absolute inset-x-0 bottom-0 bg-foreground/90 px-5 py-5 text-background sm:px-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <p className="max-w-[32ch] text-lg font-semibold leading-snug">Plus de 500 familles accompagnées en Suisse romande.</p>
              <p className="text-sm text-background/75">Mandat de 90 jours, transparence totale</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-3 max-w-[1560px] rounded-[28px] bg-foreground px-5 py-6 text-background sm:px-9">
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <p className="text-lg font-semibold">Vous êtes propriétaire ?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ownerServices.map(({ href, icon: Icon, label }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between rounded-full bg-background/10 px-5 text-sm font-semibold outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-foreground">
                <span className="flex items-center gap-2"><Icon className="h-4 w-4" aria-hidden="true" />{label}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
