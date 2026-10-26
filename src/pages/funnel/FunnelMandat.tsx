import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera, CheckCircle2, ChevronDown, ChevronLeft, ClipboardCheck, FileSignature, Handshake, KeyRound, Landmark,
  MapPin, MessageCircleOff, Search, ShieldCheck, Timer, Users, Wallet,
} from 'lucide-react';
import logo from '@/assets/logisorama-logo.png';
import photoLouer from '@/assets/guarantee-keys-couple.jpg';
import photoAcheter from '@/assets/hero-bg.jpg';
import christ from '@/assets/team/christ-ramazani.png';
import appNouvelle from '@/assets/funnel/logisorama-nouvelle-version.jpg';
import coupleKeys from '@/assets/hero-couple-keys.jpg';
import teamWork from '@/assets/b2b-team.jpg';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { prefillMandat, readFunnel, trackPixel } from './funnelShared';

/*
 * Page de vente du mandat — structure « fiche » de marketplace (référence Airbnb) :
 * photo, titre sobre, lignes d'équipements séparées par des filets, carte de réservation
 * (colonne collante sur ordinateur, barre fixe en bas sur mobile), un seul accent vert.
 */

type Offer = {
  badge: string;
  title: string;
  subtitle: string;
  photo: string;
  photoAlt: string;
  intro: string;
  steps: { icon: any; t: string; d: string }[];
  included: { icon: any; t: string }[];
  price: string;
  priceNote: string;
  rows: { k: string; v: string }[];
  guarantee: string;
  faq: { q: string; a: string }[];
  activation: number;
};

const OFFERS: Record<'louer' | 'acheter', Offer> = {
  louer: {
    badge: 'Mandat de recherche',
    title: 'Un courtier dédié trouve ton logement',
    subtitle: 'Location · Vaud, Genève et Suisse romande · 90 jours',
    photo: photoLouer,
    photoAlt: 'Couple montrant les clés de son nouvel appartement',
    intro: 'Des dizaines de dossiers pour chaque appartement, des visites aux heures de bureau, des régies qui ne répondent pas : chercher seul, c’est un deuxième travail. Ton courtier le fait à ta place, du premier tri jusqu’à la remise des clés.',
    steps: [
      { icon: FileSignature, t: 'Tu actives ton mandat en ligne', d: 'Signature électronique en 5 minutes, ta recherche démarre aussitôt.' },
      { icon: Search, t: 'Ton courtier cherche pour toi', d: 'Annonces publiées et biens de notre réseau, triés selon tes critères.' },
      { icon: Camera, t: 'On visite à ta place', d: 'Photos, vidéo et compte rendu détaillé de chaque logement.' },
      { icon: KeyRound, t: 'On postule jusqu’aux clés', d: 'Dossier transmis, régies relancées, signature du bail et remise des clés.' },
    ],
    included: [
      { icon: Users, t: 'Un courtier dédié qui connaît les régies de ta région' },
      { icon: Camera, t: 'Visites déléguées : photos, vidéo et compte rendu' },
      { icon: ClipboardCheck, t: 'Ton dossier optimisé et transmis aux bonnes personnes' },
      { icon: Timer, t: 'Relances des régies, sans courir après personne' },
      { icon: KeyRound, t: 'Accompagnement jusqu’à la signature du bail et la remise des clés' },
      { icon: ShieldCheck, t: 'Aide pour la garantie de loyer et l’assurance RC' },
    ],
    price: '300 CHF',
    priceNote: 'activation, déduite de la commission',
    rows: [
      { k: 'Commission', v: '1 mois de loyer brut, seulement si un bail est signé' },
      { k: 'Déjà versé', v: '− 300 CHF déduits de la commission' },
      { k: 'Durée du mandat', v: '90 jours' },
    ],
    guarantee: 'Au terme des 90 jours sans bail signé, ton activation de 300 CHF t’est remboursée sous 30 jours. En cas de résiliation anticipée de ta part, elle reste acquise pour le travail effectué.',
    faq: [
      { q: 'Combien ça coûte au total ?', a: 'L’activation de 300 CHF, puis un mois de loyer brut seulement si tu signes un bail grâce à nous, moins les 300 CHF déjà versés. Aucun frais caché.' },
      { q: 'Et si vous ne trouvez rien ?', a: 'Au terme des 90 jours sans bail signé, les 300 CHF te sont remboursés sous 30 jours.' },
      { q: 'Allez-vous m’appeler ?', a: 'Pas de démarchage. Ton courtier te contacte une fois ton mandat activé, pour lancer ta recherche avec toi.' },
      { q: 'Combien de temps pour démarrer ?', a: 'Le mandat se remplit et se signe en ligne en 5 minutes environ. Ta recherche démarre dès l’activation.' },
    ],
    activation: 300,
  },
  acheter: {
    badge: 'Mandat de recherche',
    title: 'Un courtier dédié trouve ton futur bien',
    subtitle: 'Achat · Vaud, Genève et Suisse romande · 6 mois',
    photo: photoAcheter,
    photoAlt: 'Maison contemporaine avec piscine',
    intro: 'Les meilleurs biens partent avant d’être publiés, une PPE peut cacher des travaux et chaque banque finance différemment. Ton courtier sécurise ton achat, de la recherche jusqu’à l’acte authentique.',
    steps: [
      { icon: FileSignature, t: 'Tu actives ton mandat en ligne', d: 'Signature électronique, ton courtier dédié se met au travail.' },
      { icon: Search, t: 'Recherche active', d: 'Sur le marché et hors marché, grâce à notre réseau.' },
      { icon: ClipboardCheck, t: 'Analyse avant chaque offre', d: 'Procès-verbaux, décompte PPE, fonds de rénovation, travaux à venir, règlement.' },
      { icon: Handshake, t: 'Jusqu’à l’acte authentique', d: 'Visites accompagnées, négociation du prix, appel d’offres bancaire 100 % indépendant.' },
    ],
    included: [
      { icon: Search, t: 'Recherche active, y compris des biens jamais publiés en ligne' },
      { icon: ClipboardCheck, t: 'Analyse complète de chaque offre avant de t’engager' },
      { icon: Users, t: 'Visites accompagnées d’un courtier expérimenté ou d’un expert' },
      { icon: Handshake, t: 'Négociation du prix avec le vendeur' },
      { icon: Landmark, t: 'Appel d’offres bancaire 100 % indépendant et transparent' },
      { icon: FileSignature, t: 'Accompagnement jusqu’à la signature de l’acte authentique' },
    ],
    price: "2'500 CHF",
    priceNote: 'activation, imputée sur la commission',
    rows: [
      { k: 'Commission', v: '1 % du prix (min. 500 CHF, + TVA si due)' },
      { k: 'Solde', v: 'Dû uniquement à la signature de l’acte' },
      { k: 'Durée du mandat', v: '6 mois, résiliable (art. 404 CO)' },
    ],
    guarantee: "Au terme des 6 mois sans acquisition, ton activation de 2'500 CHF t’est remboursée sous 30 jours. En cas de résiliation anticipée de ta part, elle reste acquise.",
    faq: [
      { q: 'Combien ça coûte au total ?', a: "1 % du prix d'achat (min. 500 CHF, + TVA si due). L'activation de 2'500 CHF est imputée sur cette commission ; le solde n'est dû qu'à la signature de l'acte." },
      { q: 'Et si vous ne trouvez rien ?', a: "Au terme des 6 mois sans acquisition, l'activation de 2'500 CHF t'est remboursée sous 30 jours." },
      { q: 'Allez-vous m’appeler ?', a: 'Pas de démarchage. Ton courtier te contacte une fois ton mandat activé.' },
      { q: 'Combien de temps pour démarrer ?', a: 'Le mandat se remplit et se signe en ligne. Ton courtier démarre dès l’activation.' },
    ],
    activation: 2500,
  },
};

function PrimaryButton({ onClick, full = true }: { onClick: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${full ? 'w-full px-6' : 'flex-none px-5'} inline-flex h-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg bg-[#1F7A5C] text-[16px] font-medium text-white transition-colors duration-200 hover:bg-[#1A6B50] active:bg-[#155A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2`}
    >
      Démarrer mes recherches
    </button>
  );
}

// Logo « G » officiel de Google (quatre couleurs), pour signaler la note des avis Google.
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Gallery({ photos }: { photos: { src: string; alt: string }[] }) {
  const reduce = useReducedMotion();
  const [main, ...rest] = photos;
  return (
    <>
      {/* Téléphone : carrousel à faire défiler au pouce */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none]">
        {photos.map((p) => (
          <img key={p.src} src={p.src} alt={p.alt} loading="lazy" className="aspect-[4/3] w-[86%] flex-none snap-center rounded-[14px] object-cover" />
        ))}
      </div>
      {/* Ordinateur : une grande photo, quatre petites */}
      <div className="hidden h-[520px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[14px] lg:grid">
        <div className="col-span-2 row-span-2 overflow-hidden">
          <motion.img src={main.src} alt={main.alt} className="h-full w-full object-cover"
            initial={reduce ? false : { scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
        </div>
        {rest.slice(0, 4).map((p) => (
          <div key={p.src} className="overflow-hidden">
            <img src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.04]" />
          </div>
        ))}
      </div>
    </>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[14px] bg-[#f7f7f7] px-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left">
        <span className="text-[16px] font-semibold text-[#222222]">{q}</span>
        <ChevronDown className={`h-5 w-5 flex-none text-[#222222] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="-mt-1 pb-4 text-[16px] leading-relaxed text-[#3f3f3f]">{a}</p>}
    </div>
  );
}

export default function FunnelMandat() {
  const navigate = useNavigate();
  const a = useMemo(() => readFunnel(), []);
  const offer = OFFERS[a?.projet === 'acheter' ? 'acheter' : 'louer'];

  useEffect(() => {
    document.title = 'Ton mandat de recherche | Logisorama';
    window.scrollTo(0, 0);
    trackPixel('ViewContent', { content_name: 'mandat_recherche', content_category: a?.projet ?? 'louer' });
  }, [a?.projet]);

  const start = () => {
    if (a) prefillMandat(a);
    trackPixel('InitiateCheckout', { content_name: 'mandat_recherche', value: offer.activation, currency: 'CHF' });
    navigate('/nouveau-mandat');
  };

  const ReservationCard = (
    <div className="rounded-[14px] bg-[#f7f7f7] p-6">
      <p className="text-[22px] font-semibold leading-snug text-[#222222]">
        {offer.price} <span className="text-[16px] font-normal text-[#6a6a6a]">{offer.priceNote}</span>
      </p>
      <div className="mt-5 space-y-3">
        {offer.rows.map((r) => (
          <div key={r.k} className="rounded-lg bg-white px-4 py-3">
            <p className="text-[13px] text-[#6a6a6a]">{r.k}</p>
            <p className="text-[15px] font-medium text-[#222222]">{r.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4"><PrimaryButton onClick={start} /></div>
      <p className="mt-3 text-center text-[15px] text-[#3f3f3f]">Mandat 100 % en ligne, environ 5 minutes</p>
      <div className="mt-5 flex gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-[#1F7A5C]" strokeWidth={1.8} />
        <p className="text-[15px] leading-[1.5] text-[#3f3f3f]">{offer.guarantee}</p>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-[100dvh] bg-white text-[#222222]" style={{ fontFamily: "Inter, -apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif" }}>
      <header className="sticky top-0 z-30 bg-white">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between px-4 md:px-6">
          <button type="button" onClick={() => navigate('/courtier?etape=4')} aria-label="Retour au formulaire"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#f7f7f7] md:hidden">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Link to="/" aria-label="Logisorama, accueil" className="cursor-pointer"><img src={logo} alt="Logisorama" className="h-6 w-auto" /></Link>
          <span className="hidden text-[14px] font-medium text-[#6a6a6a] md:block">Un service Immo-Rama</span>
          <span className="w-10 md:hidden" />
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-4 pb-36 pt-6 md:px-6 lg:pb-16">
        {(
          <Reveal className="mb-5 flex items-center gap-3 rounded-[14px] bg-[#f7f7f7] p-4">
            <CheckCircle2 className="h-5 w-5 flex-none text-[#1F7A5C]" strokeWidth={2} />
            <p className="text-[16px] leading-[1.45] text-[#222222]">
              {a ? (<><span className="font-semibold">Merci {a.prenom}, ta demande est bien reçue.</span>{' '}Voici comment ton courtier travaille pour toi.</>)
                : (<><span className="font-semibold">Mandat de recherche en ligne.</span>{' '}Ton courtier démarre dès l’activation.</>)}
            </p>
            <div className="ml-auto hidden flex-none lg:block"><PrimaryButton onClick={start} full={false} /></div>
          </Reveal>
        )}

        <Gallery photos={[
          { src: offer.photo, alt: offer.photoAlt },
          { src: appNouvelle, alt: 'L’application Logisorama : suivi des offres, visites et alertes en temps réel' },
          { src: coupleKeys, alt: 'Remise des clés d’un nouvel appartement' },
          { src: offer === OFFERS.acheter ? photoLouer : photoAcheter, alt: offer === OFFERS.acheter ? 'Couple montrant les clés de son nouveau logement' : 'Maison contemporaine' },
          { src: teamWork, alt: 'L’équipe au travail sur un dossier' },
        ]} />

        <div className="mt-8 lg:grid lg:grid-cols-[1fr_360px] lg:gap-16">
          <div>
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222] md:text-[40px] lg:text-[52px]">{offer.title}</h1>
            <p className="mt-1.5 text-[16px] text-[#222222]">{offer.subtitle}</p>
            {a && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { t: a.projet === 'acheter' ? 'Acheter' : 'Louer', i: a.projet === 'acheter' ? Landmark : KeyRound },
                  { t: a.region, i: MapPin },
                  { t: a.budgetLabel, i: Wallet },
                ].filter((c) => c.t).map((c) => (
                  <span key={c.t} className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f2f2] px-3 py-1.5 text-[14px] font-medium">
                    <c.i className="h-4 w-4" strokeWidth={1.8} />{c.t}
                  </span>
                ))}
              </div>
            )}

            {/* Carte « hôte » : l'équipe */}
            <div className="mt-8 flex items-center gap-4 rounded-[14px] bg-[#f7f7f7] p-4">
              <img src={christ} alt="Christ Ramazani" className="h-14 w-14 flex-none rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-[#222222]">Une équipe Immo-Rama, à Crissier</p>
                <p className="text-[15px] text-[#3f3f3f]">Christ Ramazani, dans l’immobilier depuis 2014</p>
              </div>
              <div className="flex flex-none flex-col items-center rounded-xl bg-white px-3 py-2" aria-label="Note de 4,8 sur 5 sur Google">
                <span className="flex items-center gap-1.5">
                  <GoogleG className="h-5 w-5" />
                  <span className="text-[18px] font-bold leading-none text-[#222222]">4,8</span>
                </span>
                <span className="mt-1 flex text-[#FBBC05]" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((k) => (
                    <svg key={k} viewBox="0 0 20 20" className="h-3 w-3 fill-current"><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" /></svg>
                  ))}
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">Avis Google</span>
              </div>
            </div>

            <Reveal><p className="mt-8 text-[17px] leading-[1.6] text-[#222222]">{offer.intro}</p></Reveal>

            <section className="mt-14">
              <h2 className="text-[22px] font-semibold tracking-[-0.2px] text-[#222222]">Comment ça marche</h2>
              <ol className="mt-6 space-y-6">
                {offer.steps.map((s, i) => (
                  <motion.li key={s.t} className="flex gap-4"
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}>
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#f2f2f2] text-[15px] font-semibold text-[#222222]">{i + 1}</span>
                    <div>
                      <p className="text-[16px] font-semibold text-[#222222]">{s.t}</p>
                      <p className="mt-1 text-[16px] leading-[1.5] text-[#3f3f3f]">{s.d}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </section>

            <section className="mt-14">
              <h2 className="text-[22px] font-semibold tracking-[-0.2px] text-[#222222]">Ce qui est inclus</h2>
              <ul className="mt-4">
                {offer.included.map((it, i) => (
                  <motion.li key={it.t} className="flex items-center gap-4 py-3"
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}>
                    <it.icon className="h-6 w-6 flex-none text-[#222222]" strokeWidth={1.5} />
                    <span className="text-[16px] text-[#222222]">{it.t}</span>
                  </motion.li>
                ))}
              </ul>
            </section>

            <section className="mt-14">
              <div className="flex gap-4">
                <MessageCircleOff className="h-6 w-6 flex-none text-[#222222]" strokeWidth={1.5} />
                <div>
                  <p className="text-[16px] font-semibold text-[#222222]">Pas de démarchage</p>
                  <p className="mt-1 text-[16px] leading-[1.5] text-[#3f3f3f]">Ton courtier te contacte une fois ton mandat activé. D’ici là, tu reçois seulement nos conseils et nouvelles offres par e-mail.</p>
                </div>
              </div>
            </section>

            {/* Carte de réservation sur mobile, dans le flux */}
            <Reveal className="mt-10 lg:hidden">{ReservationCard}</Reveal>

            <section className="mt-14">
              <h2 className="text-[22px] font-semibold tracking-[-0.2px] text-[#222222]">Questions fréquentes</h2>
              <div className="mt-5 space-y-2">{offer.faq.map((f, i) => <Reveal key={f.q} delay={i * 0.06}><FaqRow {...f} /></Reveal>)}</div>
            </section>
          </div>

          {/* Colonne collante sur ordinateur */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">{ReservationCard}</div>
          </aside>
        </div>
      </main>

      <footer className="bg-[#f7f7f7] px-4 py-8 text-center text-[13px] text-[#6a6a6a] md:pb-8">
        Logisorama, un service Immo-Rama ·{' '}
        <Link to="/politique-confidentialite" className="cursor-pointer underline">Confidentialité</Link> ·{' '}
        <Link to="/mentions-legales" className="cursor-pointer underline">Mentions légales</Link>
      </footer>

      {/* Barre de réservation fixe sur mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white shadow-[0_-1px_0_#ebebeb] lg:hidden">{/* taste-skill-ignore : barre fixe superposée */}
        <div className="flex items-center justify-between gap-4 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3.5">
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-[#222222]">{offer.price}</p>
            <p className="truncate text-[13px] text-[#6a6a6a]">{offer.priceNote}</p>
          </div>
          <PrimaryButton onClick={start} full={false} />
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
