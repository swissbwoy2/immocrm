import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';
import { useSearchType } from '@/contexts/SearchTypeContext';

const faqsLocation = [
  { q: "Que se passe-t-il si vous ne trouvez rien en 90 jours ?", a: "Vous êtes remboursé intégralement. Notre garantie est claire : si nous ne trouvons pas de logement correspondant à vos critères dans les 90 jours, votre acompte de 300 CHF vous est restitué." },
  { q: "Combien coûte le service ?", a: "Un acompte de 300 CHF à l'inscription (déduit de la commission finale), puis une commission d'un mois de loyer uniquement en cas de succès. Aucun frais caché." },
  { q: "Comment fonctionne la recherche ?", a: "Votre agent dédié contacte les régies, scrute les annonces en ligne et active son réseau professionnel chaque jour. Vous recevez uniquement les biens correspondant à vos critères, avec un suivi en temps réel." },
  { q: "Puis-je annuler à tout moment ?", a: "Le mandat est de 90 jours. Vous pouvez interrompre la recherche à tout moment. Si aucun bien n'a été trouvé à l'issue des 90 jours, vous êtes remboursé." },
  { q: "Est-ce que le service fonctionne dans toute la Suisse ?", a: "Nous couvrons toute la Suisse romande : Genève, Vaud, Fribourg, Neuchâtel, Valais et Jura. Notre réseau de régies et de contacts est particulièrement dense à Genève et Lausanne." },
];

const faqsAchat = [
  { q: "Que se passe-t-il si vous ne trouvez rien en 6 mois ?", a: "Si nous mettons fin au mandat, ou au terme des 6 mois sans acquisition (dénonciation ordinaire notifiée dans les 15 derniers jours), votre montant d'activation de 2'500 CHF vous est remboursé sous 30 jours. En cas de résiliation anticipée de votre part, il reste acquis en rémunération des démarches déjà engagées." },
  { q: "Combien coûte le service ?", a: "La commission est de 1 % du prix de vente (min. CHF 500, + TVA si due). Un montant d'activation de 2'500 CHF est versé à la signature et imputé sur la commission ; le solde (1 % − 2'500 CHF) n'est dû qu'en cas de succès, à la conclusion de l'acte. Aucun frais caché." },
  { q: "Comment fonctionne la recherche d'un bien ?", a: "Votre agent accède aux biens off-market via son réseau professionnel, contacte directement vendeurs, notaires et régies, et vous présente une sélection sur-mesure. Vous ne visitez que les biens qui correspondent vraiment à votre projet." },
  { q: "M'aidez-vous pour le financement hypothécaire ?", a: "Oui. Nous vous mettons en relation avec notre comparateur indépendant pour obtenir les meilleurs taux auprès de nos partenaires bancaires : UBS, Raiffeisen, BCV, BCGE, Crédit Agricole et d'autres établissements." },
  { q: "Couvrez-vous toute la Suisse romande ?", a: "Nous intervenons dans les cantons de Genève, Vaud, Fribourg, Neuchâtel, Valais et Jura. Notre réseau de contacts est particulièrement dense sur l'Arc lémanique." },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { isAchat } = useSearchType();
  const faqs = isAchat ? faqsAchat : faqsLocation;

  // Reset accordion when mode switches
  useEffect(() => {
    setOpenIndex(null);
  }, [isAchat]);

  return (
    <section id="faq" className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">

        <ScrollReveal variant="fade-up" className="text-center mb-4">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium mb-3">
            Questions fréquentes
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-serif">
            Tout ce que vous devez savoir
          </h2>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={0.1}>
          <GoldDivider className="mb-12" />
        </ScrollReveal>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={`${isAchat ? 'achat' : 'location'}-${i}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const }}
            >
              <Collapsible open={openIndex === i} onOpenChange={(open) => setOpenIndex(open ? i : null)}>
                <CollapsibleTrigger
                  className={`w-full flex items-center justify-between gap-4 p-4 md:p-5 rounded-xl backdrop-blur-sm border transition-all duration-300 text-left group
                    ${openIndex === i
                      ? 'bg-primary/10 border-primary/30 shadow-md'
                      : 'bg-card/50 border-primary/30 hover:border-primary/30 hover:bg-primary/10'
                    }`}
                >
                  <span className="text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 45 : 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' as const }}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </motion.div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' as const }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 md:px-5 pb-4 pt-3">
                          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">{faq.a}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
