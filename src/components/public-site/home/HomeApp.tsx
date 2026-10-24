import { ArrowRight, BarChart3, Check, FileCheck, FileSearch, Footprints, FolderCheck, LayoutDashboard, Radar, Send, Target, UserCheck } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ACCENT_TEXT, CONTAINER, Cta, H2, H3, Reveal } from './homeUi';

const appFeatures = [
  { icon: UserCheck, label: 'Agent immobilier personnel' },
  { icon: Target, label: 'Offres ciblées selon vos critères' },
  { icon: Footprints, label: 'Délégations de visite' },
  { icon: Send, label: 'Postulations instantanées' },
  { icon: FolderCheck, label: 'Suivi du dossier' },
  { icon: FileSearch, label: 'Analyse de dossier complète' },
];

const tools = [
  { icon: Radar, title: 'Veille 24h/24', description: "Nos robots surveillent tous les portails + notre réseau privé. Dès qu’un bien sort, tu le sais." },
  { icon: BarChart3, title: 'Matching intelligent', description: 'On te propose que les biens qui matchent vraiment avec ton budget et ta situation.' },
  { icon: FileCheck, title: 'Dossier pro généré auto', description: 'Un dossier aux standards des régies, prêt à envoyer. Zéro prise de tête.' },
  { icon: LayoutDashboard, title: 'Ton tableau de bord perso', description: 'Suis chaque étape de ta recherche en direct depuis ton espace client.' },
];

/** L’application et nos outils (ancre #app-showcase), avec la vraie vidéo du tableau de bord client. */
export function HomeApp() {
  const reduce = useReducedMotion();
  return (
    <section id="app-showcase" className="scroll-mt-28 bg-white pt-14 md:pt-20" aria-labelledby="home-app-title">
      <div className={CONTAINER}>
        <div className="grid items-start gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16">
          <Reveal className="mx-auto w-full max-w-[280px] lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-[32px] bg-foreground p-2">
              <video
                src="/videos/dashboard-client.mp4"
                poster="/app-icon.png"
                muted
                loop
                playsInline
                autoPlay={!reduce}
                controls={!!reduce}
                preload="metadata"
                aria-label="Le tableau de bord client Logisorama en vidéo"
                className="aspect-[9/19] w-full rounded-[26px] bg-foreground object-cover"
              />
            </div>
            <p className="mt-3 text-center text-[14px] text-foreground/75">Le tableau de bord client, sur iPhone, Android ou Web</p>
          </Reveal>

          <div>
            <Reveal>
              <h2 id="home-app-title" className={H2}>Optimisez vos recherches depuis votre poche</h2>
              <p className="mt-3 max-w-[60ch] text-[16px] leading-[1.6] text-foreground/85">
                Offres, visites, postulations et messagerie ! Tout est synchronisé en temps réel avec votre agent immobilier
                personnel sur votre iPhone, Android ou Web !
              </p>
              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {appFeatures.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-[16px] text-foreground">
                    <Icon className="h-5 w-5 flex-none text-foreground" strokeWidth={1.6} aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="mt-10">
              <h3 className={H3}>Ce que font nos outils pour toi</h3>
              <p className="mt-1 text-[15px] text-foreground/80">La tech au service de ta recherche, 24h/24. Pendant que tu dors, on bosse.</p>
              <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {tools.map(({ icon: Icon, title, description }) => (
                  <li key={title}>
                    <Icon className="h-6 w-6 text-foreground" strokeWidth={1.6} aria-hidden="true" />
                    <p className="mt-2 text-[16px] font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-[15px] leading-[1.5] text-foreground/80">{description}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[15px] font-medium text-foreground">L’alliance parfaite : humains + robots + réseau privé</p>
            </Reveal>

            <Reveal className="mt-8">
              <Cta to="/nouveau-mandat" className="w-full sm:w-auto">
                Créer mon compte maintenant
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Cta>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-foreground/80">
                <li className="flex items-center gap-1.5"><Check className={cn('h-4 w-4', ACCENT_TEXT)} aria-hidden="true" />Sans engagement</li>
                <li className="flex items-center gap-1.5"><Check className={cn('h-4 w-4', ACCENT_TEXT)} aria-hidden="true" />Activation immédiate</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
