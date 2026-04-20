import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { GoldDivider } from '@/components/public-site/animations/GoldDivider';

const faqs = [
  { q: "Que se passe-t-il si vous ne trouvez rien en 90 jours ?", a: "Vous êtes remboursé intégralement. Notre garantie est claire : si nous ne trouvons pas de logement correspondant à vos critères dans les 90 jours, votre acompte de 300 CHF vous est restitué." },
  { q: "Combien coûte le service ?", a: "Un acompte de 300 CHF à l'inscription (déduit de la commission finale), puis une commission d'un mois de loyer uniquement en cas de succès. Aucun frais caché." },
  { q: "Comment fonctionne la recherche ?", a: "Votre agent dédié contacte les régies, scrute les annonces en ligne et active son réseau professionnel chaque jour. Vous recevez uniquement les biens correspondant à vos critères, avec un suivi en temps réel." },
  { q: "Puis-je annuler à tout moment ?", a: "Le mandat est de 90 jours. Vous pouvez interrompre la recherche à tout moment. Si aucun bien n'a été trouvé à l'issue des 90 jours, vous êtes remboursé." },
  { q: "Est-ce que le service fonctionne dans toute la Suisse ?", a: "Nous couvrons toute la Suisse romande : Genève, Vaud, Fribourg, Neuchâtel, Valais et Jura. Notre réseau de régies et de contacts est particulièrement dense à Genève et Lausanne." },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
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
            <ScrollReveal key={i} variant="fade-up" delay={i * 0.05}>
              <Collapsible open={openIndex === i} onOpenChange={(open) => setOpenIndex(open ? i : null)}>
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-4 p-4 md:p-5 rounded-xl bg-card/50 backdrop-blur-sm border border-[hsl(38_45%_48%/0.15)] hover:border-[hsl(38_45%_48%/0.4)] hover:bg-[hsl(38_45%_48%/0.04)] transition-all duration-300 text-left group">
                  <span className="text-sm md:text-base font-semibold text-foreground group-hover:text-[hsl(38_45%_44%)] transition-colors">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="h-5 w-5 text-[hsl(38_45%_48%)]" />
                  </motion.div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 md:px-5 pb-4 pt-3"
                      >
                        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-[hsl(38_45%_48%/0.4)] pl-4">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
