import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Users,
  FileCheck,
  CalendarCheck,
  ShieldCheck,
  Clock,
  HandCoins,
  Sparkles,
} from 'lucide-react';
import { LandingFormShell } from '@/components/forms-premium/LandingFormShell';

const BENEFITS = [
  { icon: HandCoins, title: 'Évitez la double charge de loyer', desc: "On accélère la reprise de bail pour stopper l'hémorragie financière." },
  { icon: ShieldCheck, title: 'Un repreneur solvable', desc: 'Dossiers vérifiés : salaire, poursuites, références.' },
  { icon: CalendarCheck, title: 'Visites organisées pour vous', desc: 'Créneaux, confirmations, relances : on s’en occupe.' },
  { icon: Users, title: 'Candidats présélectionnés', desc: 'Vous ne voyez que les profils sérieux.' },
  { icon: FileCheck, title: 'Dossiers prêts pour la régie', desc: 'Un dossier complet, transmis sous le bon format.' },
  { icon: Sparkles, title: 'Accompagnement jusqu’à la reprise', desc: 'On suit la régie ou le propriétaire jusqu’à la signature.' },
];

const STEPS = [
  { n: '01', title: 'Vous nous confiez votre logement', desc: 'Adresse, loyer, date de reprise souhaitée, photos.' },
  { n: '02', title: 'Nous activons la recherche', desc: 'Diffusion ciblée auprès de nos candidats solvables.' },
  { n: '03', title: 'Visites + présélection', desc: 'On organise les visites et on filtre les dossiers.' },
  { n: '04', title: 'Transmission à la régie', desc: 'Dossier complet remis pour validation officielle.' },
];

export default function RelouerMonAppartement() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <LandingFormShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
        <div className="container relative mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <KeyRound className="h-3.5 w-3.5" />
              Spécial locataire sortant
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-5">
              Reprise de bail : trouvez un repreneur solvable<br />
              <span className="bg-gradient-to-r from-primary to-[hsl(var(--imr-green-light))] bg-clip-text text-transparent">
                Évitez de payer deux loyers.
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Vous quittez votre appartement en Suisse romande ? Logisorama vous aide à trouver
              rapidement un locataire de remplacement, organise les visites et transmet un dossier
              complet à votre régie ou propriétaire.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/formulaire-relouer"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl font-bold text-base text-primary-foreground bg-gradient-to-r from-primary to-[hsl(var(--imr-green-light))] shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all"
              >
                Trouver un repreneur maintenant
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/rendez-vous"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                Prendre rendez-vous
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Activation rapide</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Candidats solvables</span>
              <span className="flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5 text-primary" /> Dossier prêt pour la régie</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BÉNÉFICES */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Pourquoi passer par Logisorama ?
            </h2>
            <p className="text-muted-foreground">
              Notre mission : vous libérer du bail le plus vite possible, sans stress et sans
              double loyer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Comment ça marche ?
            </h2>
            <p className="text-muted-foreground">Un parcours simple, en 4 étapes claires.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 p-6"
              >
                <span className="text-4xl font-bold bg-gradient-to-br from-primary to-[hsl(var(--imr-green-light))] bg-clip-text text-transparent">
                  {s.n}
                </span>
                <h3 className="text-lg font-bold text-foreground mt-2 mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RASSURANCE */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 p-6 md:p-10">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Pensé pour les locataires qui doivent partir vite
            </h2>
            <ul className="space-y-3">
              {[
                'Mutation professionnelle, achat, séparation, déménagement : on s’adapte à votre urgence.',
                'Forfait unique de 399.– CHF par appartement, facturé à l’activation de la recherche de locataire.',
                'On reste votre interlocuteur jusqu’à la signature officielle de la reprise de bail.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-foreground/85">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Prêt à libérer votre bail ?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg mb-8">
            Remplissez le formulaire en 3 minutes — on revient vers vous très rapidement.
          </p>
          <Link
            to="/formulaire-relouer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base md:text-lg text-primary-foreground bg-gradient-to-r from-primary to-[hsl(var(--imr-green-light))] shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] transition-all"
          >
            Trouver un repreneur maintenant
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-6">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Retour à l’accueil
            </Link>
          </div>
        </div>
      </section>
    </LandingFormShell>
  );
}
