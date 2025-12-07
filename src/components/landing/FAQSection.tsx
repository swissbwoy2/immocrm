import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const faqItems = [
  {
    question: "Comment ça marche concrètement ?",
    answer: "C'est simple : tu remplis le formulaire de mandat, tu verses l'acompte de 300 CHF, et notre agent dédié prend le relais. Il recherche activement des biens correspondant à tes critères, contacte les régies, prépare et envoie ton dossier. Tu reçois des offres directement dans ton espace client et tu choisis ce qui te plaît !",
  },
  {
    question: "Est-ce que les 300 CHF sont remboursables ?",
    answer: "Oui, à 100% ! Si au bout de 3 mois nous n'avons pas trouvé ton appartement, tu es intégralement remboursé. C'est notre garantie \"Satisfait ou remboursé\". On prend le risque à ta place.",
  },
  {
    question: "Qu'est-ce qui vous différencie des agences classiques ?",
    answer: "Nous travaillons POUR toi, pas pour les propriétaires. Les agences classiques représentent les propriétaires et cherchent des locataires pour leurs biens. Nous, c'est l'inverse : on te représente TOI et on cherche le bien parfait pour toi, en te mettant en relation avec notre réseau d'agences partenaires.",
  },
  {
    question: "Dans quels cantons êtes-vous actifs ?",
    answer: "Nous couvrons toute la Suisse romande : Genève, Vaud, Valais, Neuchâtel, Fribourg et Jura. Notre réseau d'agences partenaires nous permet d'accéder à des offres dans toutes ces régions.",
  },
  {
    question: "Combien de temps faut-il en moyenne pour trouver ?",
    answer: "En moyenne, nos clients trouvent leur appartement en moins de 3 mois. Évidemment, cela dépend de tes critères et du marché local, mais notre expertise et notre réseau accélèrent considérablement le processus.",
  },
  {
    question: "Que se passe-t-il si je trouve moi-même un appartement ?",
    answer: "Pas de problème ! Si tu trouves par toi-même pendant notre collaboration, tu nous préviens et on arrête les recherches. L'acompte de 300 CHF reste acquis pour couvrir le travail déjà effectué, mais tu ne paies pas les honoraires de succès.",
  },
  {
    question: "Comment fonctionne la messagerie directe ?",
    answer: "Dès que tu deviens client, tu accèdes à ton espace personnel avec une messagerie intégrée. Tu peux échanger directement avec ton agent dédié, recevoir les offres, suivre l'avancement de tes candidatures et gérer tous tes documents en un seul endroit.",
  },
  {
    question: "Puis-je déléguer les visites ?",
    answer: "Absolument ! Si tu n'es pas disponible (par exemple si tu vis à l'étranger ou si tu as des horaires compliqués), notre agent peut effectuer les visites à ta place. Il te fait un compte-rendu détaillé avec photos et vidéos pour que tu puisses décider en toute connaissance de cause.",
  },
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-background via-muted/5 to-background">
      {/* Background effects - hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-10 md:mb-14 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium">Questions fréquentes</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
            Tout ce que tu veux savoir
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Les réponses aux questions les plus courantes de nos clients
          </p>
        </div>

        {/* FAQ items */}
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
          {faqItems.map((item, index) => (
            <Collapsible
              key={index}
              open={openItems.includes(index)}
              onOpenChange={() => toggleItem(index)}
            >
              <div 
                className="animate-fade-in glass-morphism rounded-xl md:rounded-2xl border border-border/30 hover:border-primary/30 transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CollapsibleTrigger className="w-full px-5 py-4 md:px-6 md:py-5 flex items-center justify-between gap-4 text-left touch-target">
                  <span className="font-semibold text-foreground text-sm md:text-base pr-2">
                    {item.question}
                  </span>
                  <ChevronDown 
                    className={`h-5 w-5 text-primary flex-shrink-0 transition-transform duration-300 ${
                      openItems.includes(index) ? 'rotate-180' : ''
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="px-5 pb-4 md:px-6 md:pb-5 pt-0">
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10 md:mt-14 animate-fade-in">
          <p className="text-muted-foreground mb-2 text-sm md:text-base">
            Tu as d'autres questions ?
          </p>
          <a 
            href="mailto:contact@immo-rama.ch" 
            className="text-primary font-medium hover:underline"
          >
            Contacte-nous directement →
          </a>
        </div>
      </div>
    </section>
  );
}