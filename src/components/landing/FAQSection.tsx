import { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles, MessageCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
    question: "Que se passe-t-il si j'annule mon mandat avant 90 jours ?",
    answer: "En cas d'annulation du mandat avant les 90 jours, l'acompte de 300 CHF n'est pas remboursable. Celui-ci couvre le travail déjà effectué par notre équipe (recherches, contacts régies, préparation dossier). Le remboursement intégral ne s'applique qu'en cas d'échec de notre part après 3 mois de recherche active.",
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
    <section className="py-16 md:py-28 relative overflow-hidden bg-gradient-to-b from-background via-primary/[0.02] to-background">
      {/* Subtle background effects - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      {/* Subtle sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${25 + i * 25}%`,
              left: `${20 + i * 30}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/20 animate-pulse" 
              style={{ animationDuration: `${3 + i}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            <div className="relative bg-primary/10 rounded-full px-5 py-2.5 border border-primary/20">
              <HelpCircle className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-primary font-semibold">Questions fréquentes</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Tout ce que tu veux savoir
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Les réponses aux questions les plus courantes de nos clients
          </p>
        </div>

        {/* FAQ items */}
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-5">
          {faqItems.map((item, index) => {
            const isOpen = openItems.includes(index);
            
            return (
              <Collapsible
                key={index}
                open={isOpen}
                onOpenChange={() => toggleItem(index)}
                className="animate-fade-in group/faq"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative">
                  <div className={cn(
                    "relative glass-morphism rounded-2xl border transition-all duration-300 overflow-hidden bg-card/80",
                    isOpen ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border/40 group-hover/faq:border-primary/20 group-hover/faq:shadow-md"
                  )}>
                    <CollapsibleTrigger className="w-full px-6 py-5 md:px-7 md:py-6 flex items-center justify-between gap-4 text-left touch-target relative z-10">
                      <span className={cn(
                        "font-semibold text-sm md:text-base pr-2 transition-colors duration-300",
                        isOpen ? "text-primary" : "text-foreground group-hover/faq:text-primary"
                      )}>
                        {item.question}
                      </span>
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                        isOpen ? "bg-primary/15" : "bg-muted group-hover/faq:bg-primary/10"
                      )}>
                        <ChevronDown 
                          className={cn(
                            "h-5 w-5 transition-all duration-300",
                            isOpen ? "rotate-180 text-primary" : "text-muted-foreground group-hover/faq:text-primary"
                          )}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <div className="px-6 pb-6 md:px-7 md:pb-7 pt-0 relative z-10">
                        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-5" />
                        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </div>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 md:mt-16 animate-fade-in">
          <p className="text-muted-foreground mb-3 text-sm md:text-base">
            Tu as d'autres questions ?
          </p>
          <a 
            href="mailto:contact@immo-rama.ch" 
            className="inline-flex items-center gap-3 group relative"
          >
            <div className="relative flex items-center gap-2 px-5 py-2.5 rounded-full glass-morphism border border-border/40 group-hover:border-primary/30 transition-all duration-300 bg-card/80">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">Contacte-nous directement</span>
              <span className="group-hover:translate-x-1 transition-transform text-primary">→</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}