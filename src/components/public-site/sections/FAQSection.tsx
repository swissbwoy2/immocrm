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
  { q: "Que se passe-t-il si vous ne trouvez rien en 6 mois ?", a: "Votre acompte de 2'500 CHF vous est intégralement remboursé. Notre engagement est total : si nous ne trouvons pas de bien correspondant à vos critères dans les 6 mois, vous ne perdez rien." },
  { q: "Combien coûte le service ?", a: "Un acompte de 2'500 CHF à l'engagement (déduit de la commission finale), puis 1% du prix d'achat payable uniquement à la signature de l'acte authentique chez le notaire. Aucun frais caché." },
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
          <p className="text-xs sm:text-sm tracking-widest uppercase text-[hsl(38_45%_48%)] font-medium mb-3">
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
                      ? 'bg-[hsl(38_45%_48%/0.08)] border-[hsl(38_45%_48%/0.5)] shadow-[0_0_16px_hsl(38_45%_48%/0.1)]'
                      : 'bg-card/50 border-[hsl(38_45%_48%/0.15)] hover:border-[hsl(38_45%_48%/0.4)] hover:bg-[hsl(38_45%_48%/0.04)]'
                    }`}
                >
                  <span className="text-sm md:text-base font-semibold text-foreground group-hover:text-[hsl(38_45%_44%)] transition-colors">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 45 : 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' as const }}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(38_45%_48%/0.1)] border border-[hsl(38_45%_48%/0.25)] flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 text-[hsl(38_45%_48%)]" />
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
                          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-[hsl(38_45%_48%/0.4)] pl-4">{faq.a}</p>
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
