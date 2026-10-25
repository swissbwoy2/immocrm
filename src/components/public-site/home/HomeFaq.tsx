import { useSearchType } from '@/contexts/SearchTypeContext';
import { CONTAINER, FaqRow, H2, Reveal } from './homeUi';

const faqsLocation = [
  { q: 'Que se passe-t-il si vous ne trouvez rien en 90 jours ?', a: 'Si nous mettons fin au mandat, ou au terme d’une période de 90 jours sans conclusion de bail, votre acompte de 300 CHF vous est remboursé sous 30 jours. En cas de résiliation anticipée de votre part, il reste acquis en rémunération des démarches déjà engagées.' },
  { q: 'Combien coûte le service ?', a: 'Un montant d’activation de 300 CHF à l’ouverture du dossier, imputé sur la commission. La commission est d’un mois de loyer brut (charges comprises, min. CHF 500, + TVA si due) et n’est due qu’à la conclusion d’un bail valable obtenu grâce à nous. Aucun frais caché.' },
  { q: 'Comment fonctionne la recherche ?', a: 'Votre agent dédié contacte les régies, scrute les annonces en ligne et active son réseau professionnel chaque jour. Vous recevez uniquement les biens correspondant à vos critères, avec un suivi en temps réel.' },
  { q: 'Puis-je annuler à tout moment ?', a: 'Oui. Le mandat est conclu pour 90 jours et reconduit tacitement par périodes de 90 jours ; la dénonciation ordinaire se notifie entre le 80e et le 90e jour (par écrit ou dans l’application Logisorama.ch). Chaque partie peut aussi résilier avec effet immédiat en tout temps (art. 404 CO) ; dans ce cas, l’acompte de 300 CHF reste acquis.' },
  { q: 'Est-ce que le service fonctionne dans toute la Suisse ?', a: 'Nous couvrons toute la Suisse romande : Genève, Vaud, Fribourg, Neuchâtel, Valais et Jura. Notre réseau de régies et de contacts est particulièrement dense à Genève et Lausanne.' },
];

const faqsAchat = [
  { q: 'Que se passe-t-il si vous ne trouvez rien en 6 mois ?', a: "Si nous mettons fin au mandat, ou au terme des 6 mois sans acquisition (dénonciation ordinaire notifiée dans les 15 derniers jours), votre montant d’activation de 2'500 CHF vous est remboursé sous 30 jours. En cas de résiliation anticipée de votre part, il reste acquis en rémunération des démarches déjà engagées." },
  { q: 'Combien coûte le service ?', a: "La commission est de 1 % du prix de vente (min. CHF 500, + TVA si due). Un montant d’activation de 2'500 CHF est versé à la signature et imputé sur la commission ; le solde (1 % − 2'500 CHF) n’est dû qu’en cas de succès, à la conclusion de l’acte. Aucun frais caché." },
  { q: "Comment fonctionne la recherche d’un bien ?", a: 'Votre agent accède aux biens off-market via son réseau professionnel, contacte directement vendeurs, notaires et régies, et vous présente une sélection sur-mesure. Vous ne visitez que les biens qui correspondent vraiment à votre projet.' },
  { q: "M’aidez-vous pour le financement hypothécaire ?", a: 'Oui. Nous vous mettons en relation avec notre comparateur indépendant pour obtenir les meilleurs taux auprès de nos partenaires bancaires : UBS, Raiffeisen, BCV, BCGE, Crédit Agricole et d’autres établissements.' },
  { q: 'Couvrez-vous toute la Suisse romande ?', a: "Nous intervenons dans les cantons de Genève, Vaud, Fribourg, Neuchâtel, Valais et Jura. Notre réseau de contacts est particulièrement dense sur l’Arc lémanique." },
];

/** Questions fréquentes du parcours choisi (ancre #faq). */
export function HomeFaq() {
  const { isAchat } = useSearchType();
  const faqs = isAchat ? faqsAchat : faqsLocation;
  return (
    <section id="faq" className="scroll-mt-28 bg-white pt-14 md:pt-20" aria-labelledby="home-faq-title">
      <div className={CONTAINER}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <Reveal>
            <h2 id="home-faq-title" className={H2}>Tout ce que vous devez savoir</h2>
          </Reveal>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <Reveal key={`${isAchat ? 'achat' : 'location'}-${i}`} delay={i * 0.05}>
                <FaqRow q={f.q} a={f.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
