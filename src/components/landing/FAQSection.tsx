import { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
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
    <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-background via-muted/5 to-background">
      {/* Premium background effects - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        
        {/* Floating sparkles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            <Sparkles 
              className="h-3 w-3 text-primary/30 animate-pulse" 
              style={{ animationDuration: `${2 + Math.random() * 2}s`, animationDelay: `${i * 0.3}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header - Premium style */}
        <div className="text-center mb-10 md:mb-14 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4 relative overflow-hidden group">
            {/* Shine effect on badge */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium relative z-10">Questions fréquentes</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
            Tout ce que tu veux savoir
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Les réponses aux questions les plus courantes de nos clients
          </p>
        </div>

        {/* FAQ items - Premium style */}
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
          {faqItems.map((item, index) => (
            <Collapsible
              key={index}
              open={openItems.includes(index)}
              onOpenChange={() => toggleItem(index)}
              className="animate-fade-in group/faq"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Animated border gradient */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-xl md:rounded-2xl opacity-0 group-hover/faq:opacity-100 transition-opacity duration-500 blur-sm -z-10" />
              
              <div className="relative glass-morphism rounded-xl md:rounded-2xl border border-border/30 group-hover/faq:border-primary/40 transition-all duration-300 overflow-hidden bg-background/80 group-hover/faq:shadow-lg group-hover/faq:shadow-primary/10">
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover/faq:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover/faq:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                
                {/* Floating sparkle on hover */}
                <div className="absolute top-3 right-12 opacity-0 group-hover/faq:opacity-100 transition-opacity duration-300">
                  <Sparkles className="h-4 w-4 text-primary/40 animate-pulse" />
                </div>
                
                <CollapsibleTrigger className="w-full px-5 py-4 md:px-6 md:py-5 flex items-center justify-between gap-4 text-left touch-target relative z-10">
                  <span className="font-semibold text-foreground text-sm md:text-base pr-2 group-hover/faq:text-primary transition-colors duration-300">
                    {item.question}
                  </span>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-muted-foreground flex-shrink-0 transition-all duration-300",
                      openItems.includes(index) ? 'rotate-180 text-primary' : 'group-hover/faq:text-primary'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="px-5 pb-4 md:px-6 md:pb-5 pt-0 relative z-10">
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        {/* CTA - Premium style */}
        <div className="text-center mt-10 md:mt-14 animate-fade-in">
          <p className="text-muted-foreground mb-2 text-sm md:text-base">
            Tu as d'autres questions ?
          </p>
          <a 
            href="mailto:contact@immo-rama.ch" 
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline group"
          >
            <span>Contacte-nous directement</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
