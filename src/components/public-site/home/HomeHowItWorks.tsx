import { motion, useReducedMotion } from 'framer-motion';
import { Activity, ArrowRight, Clock, Compass, FileCheck, Search, Target, UserCheck } from 'lucide-react';
import christ from '@/assets/team/christ-ramazani.png';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { cn } from '@/lib/utils';
import { CONTAINER, Cta, H2, H3, Reveal, SURFACE } from './homeUi';

const stepsLocation = [
  { title: 'Vous nous décrivez votre besoin', description: "En 2 minutes, remplissez le formulaire : zone, budget, type de bien, situation personnelle. C’est gratuit et sans engagement." },
  { title: 'Votre agent dédié entre en action', description: 'Il active son réseau, contacte les régies, filtre les annonces et vous propose uniquement les biens pertinents.' },
  { title: 'Vous visitez… ou nous visitons pour vous', description: "Quand vous êtes au travail, en vacances ou indisponible, nous visitons pour vous et vous faisons un retour complet. Dossier optimisé, candidature déposée, suivi auprès de la régie : vous n’avez qu’à choisir votre futur logement." },
];
const stepsAchat = [
  { title: 'Vous nous décrivez votre projet', description: 'En 2 minutes : zone, budget, type de bien, situation personnelle et fonds propres. Gratuit, sans engagement.' },
  { title: 'Votre agent dédié active son réseau', description: 'Il accède aux biens off-market, contacte les vendeurs et propriétaires, et vous propose uniquement les biens qui matchent.' },
  { title: 'Visite, financement, signature', description: "Nous vous accompagnons aux visites, comparons les meilleures hypothèques avec nos partenaires bancaires, et vous suivons jusqu’à l’acte authentique chez le notaire." },
];

const profilesLocation = [
  { icon: Clock, title: 'Vous manquez de temps', description: "Entre le travail, la famille et les obligations, vous n’avez pas le temps d’éplucher les annonces et d’appeler les régies." },
  { icon: Target, title: 'Vous ne trouvez rien qui correspond', description: "Les annonces disparaissent en quelques heures. Vous arrivez toujours trop tard ou votre dossier n’est pas retenu." },
  { icon: Compass, title: "Vous venez d’arriver en Suisse", description: "Vous ne connaissez pas encore le marché local, les régies, ni les pratiques. Vous avez besoin d’un guide." },
];
const profilesAchat = [
  { icon: Clock, title: 'Vous manquez de temps', description: "Démarcher banques, visiter, négocier, suivre les notaires : un projet d’achat est un second métier." },
  { icon: Target, title: 'Vous ne trouvez pas le bien idéal', description: "Les bons biens partent en off-market avant même d’être publiés. Vous ratez les meilleures opportunités." },
  { icon: Compass, title: 'Vous voulez le meilleur financement', description: "Comparer les taux hypothécaires de toutes les banques sans vous y noyer : on s’en charge." },
];

const deliverables = [
  { icon: UserCheck, title: 'Un agent dédié', description: 'Un interlocuteur unique qui connaît votre dossier, votre budget et vos contraintes.' },
  { icon: Search, title: 'Recherche active quotidienne', description: 'Votre agent contacte les régies, scrute les annonces et active son réseau chaque jour.' },
  { icon: FileCheck, title: 'Dossier optimisé', description: 'Nous préparons un dossier de candidature complet et professionnel pour maximiser vos chances.' },
  { icon: Activity, title: 'Suivi en temps réel', description: 'Tableau de bord client avec visibilité sur chaque démarche, chaque offre et chaque retour de régie.' },
];

/** Comment ça marche : les 3 étapes, pour qui, et ce qui est inclus (ancre #comment-ca-marche). */
export function HomeHowItWorks() {
  const { isAchat } = useSearchType();
  const reduce = useReducedMotion();
  const steps = isAchat ? stepsAchat : stepsLocation;
  const profiles = isAchat ? profilesAchat : profilesLocation;

  return (
    <section id="comment-ca-marche" className="scroll-mt-28 bg-white pt-14 md:pt-20" aria-labelledby="home-steps-title">
      <div className={CONTAINER}>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <h2 id="home-steps-title" className={H2}>3 étapes simples</h2>
            </Reveal>
            <ol className="mt-6 space-y-6">
              {steps.map((s, i) => (
                <motion.li
                  key={s.title}
                  className="flex gap-4"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--home-surface-strong)] text-[15px] font-semibold text-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[17px] font-semibold text-foreground">{s.title}</p>
                    <p className="mt-1 text-[16px] leading-[1.55] text-foreground/80">{s.description}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
            <div className={cn('mt-8 flex items-center gap-4 rounded-[14px] p-4', SURFACE)}>
              <img src={christ} alt="Christ Ramazani" loading="lazy" className="h-14 w-14 flex-none rounded-full object-cover" />
              <div>
                <p className="text-[16px] font-semibold text-foreground">Une équipe Immo-Rama, à Crissier</p>
                <p className="text-[15px] text-foreground/80">Fondée par Christ Ramazani, dans l’immobilier depuis 2014</p>
              </div>
            </div>
            <Cta to="/nouveau-mandat" className="mt-6 w-full sm:w-auto">
              Activer ma recherche maintenant
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Cta>
          </div>

          <div>
            <Reveal>
              <h2 className={H2}>Ce service est fait pour vous si…</h2>
            </Reveal>
            <ul className="mt-6 space-y-5">
              {profiles.map((p, i) => (
                <Reveal as="li" key={p.title} delay={i * 0.06} className="flex gap-4">
                    <p.icon className="mt-0.5 h-6 w-6 flex-none text-foreground" strokeWidth={1.6} aria-hidden="true" />
                    <div>
                      <p className="text-[17px] font-semibold text-foreground">{p.title}</p>
                      <p className="mt-1 text-[16px] leading-[1.55] text-foreground/80">{p.description}</p>
                    </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14">
          <Reveal>
            <h3 className={H3}>Un accompagnement complet, de A à Z</h3>
          </Reveal>
          <ul className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {deliverables.map((d, i) => (
              <Reveal as="li" key={d.title} delay={i * 0.05}>
                  <d.icon className="h-6 w-6 text-foreground" strokeWidth={1.6} aria-hidden="true" />
                  <p className="mt-3 text-[16px] font-semibold text-foreground">{d.title}</p>
                  <p className="mt-1 text-[15px] leading-[1.5] text-foreground/80">{d.description}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
