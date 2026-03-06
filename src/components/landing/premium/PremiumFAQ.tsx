import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    q: "Que se passe-t-il si vous ne trouvez rien en 90 jours ?",
    a: "Vous êtes remboursé intégralement. Notre garantie est claire : si nous ne trouvons pas de logement correspondant à vos critères dans les 90 jours, votre acompte de 300 CHF vous est restitué.",
  },
  {
    q: "Combien coûte le service ?",
    a: "Un acompte de 300 CHF à l'inscription (déduit de la commission finale), puis une commission d'un mois de loyer uniquement en cas de succès. Aucun frais caché.",
  },
  {
    q: "Comment fonctionne la recherche ?",
    a: "Votre agent dédié contacte les régies, scrute les annonces en ligne et active son réseau professionnel chaque jour. Vous recevez uniquement les biens correspondant à vos critères, avec un suivi en temps réel.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Le mandat est de 90 jours. Vous pouvez interrompre la recherche à tout moment. Si aucun bien n'a été trouvé à l'issue des 90 jours, vous êtes remboursé.",
  },
  {
    q: "Est-ce que le service fonctionne dans toute la Suisse ?",
    a: "Nous couvrons toute la Suisse romande : Genève, Vaud, Fribourg, Neuchâtel, Valais et Jura. Notre réseau de régies et de contacts est particulièrement dense à Genève et Lausanne.",
  },
];

export function PremiumFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium mb-3">
            Questions fréquentes
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Tout ce que vous devez savoir
          </h2>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <Collapsible
              key={i}
              open={openIndex === i}
              onOpenChange={(open) => setOpenIndex(open ? i : null)}
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between gap-4 p-4 md:p-5 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors text-left">
                <span className="text-sm md:text-base font-semibold text-foreground">{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 md:px-5 pb-4 pt-2">
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </section>
  );
}
