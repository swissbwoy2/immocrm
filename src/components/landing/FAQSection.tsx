import { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles, Star, MessageCircle } from 'lucide-react';
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
    <section className="py-16 md:py-28 relative overflow-hidden bg-gradient-to-b from-background via-muted/5 to-background">
      {/* Premium background effects - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/8 via-blue-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-purple-500/8 via-pink-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-gradient-to-r from-green-500/5 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>
      
      {/* Floating sparkles and stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        {[...Array(8)].map((_, i) => (
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
        {[...Array(4)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${15 + Math.random() * 70}%`,
            }}
          >
            <Star 
              className="h-2 w-2 text-primary/20 animate-float" 
              style={{ animationDuration: `${3 + Math.random() * 2}s`, animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header - Premium style */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 relative group mb-4">
            {/* Glow behind badge */}
            <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative bg-primary/10 rounded-full px-5 py-2.5 overflow-hidden border border-primary/20">
              {/* Shine effect on badge */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <HelpCircle className="inline-block h-4 w-4 text-primary mr-2" />
              <span className="text-primary font-semibold relative z-10">Questions fréquentes</span>
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 relative inline-block">
            Tout ce que tu veux savoir
            <Sparkles className="absolute -top-2 -right-6 h-5 w-5 text-primary/60 animate-pulse hidden md:block" />
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Les réponses aux questions les plus courantes de nos clients
          </p>
        </div>

        {/* FAQ items - Premium style */}
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
                  {/* Animated border gradient - visible when open or on hover */}
                  <div className={cn(
                    "absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 rounded-2xl transition-opacity duration-500 blur-sm animate-gradient-x",
                    isOpen ? "opacity-100" : "opacity-0 group-hover/faq:opacity-50"
                  )} />
                  
                  {/* Glow effect when open */}
                  <div className={cn(
                    "absolute -inset-2 bg-primary/10 rounded-2xl blur-xl transition-opacity duration-500",
                    isOpen ? "opacity-100" : "opacity-0"
                  )} />
                  
                  <div className={cn(
                    "relative glass-morphism rounded-2xl border transition-all duration-300 overflow-hidden bg-background/90",
                    isOpen ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border/30 group-hover/faq:border-primary/30 group-hover/faq:shadow-md"
                  )}>
                    {/* Shine effect */}
                    <div className="absolute inset-0 opacity-0 group-hover/faq:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 translate-x-[-100%] group-hover/faq:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                    
                    {/* Floating sparkle on hover/open */}
                    <div className={cn(
                      "absolute top-4 right-14 transition-opacity duration-300",
                      isOpen ? "opacity-100" : "opacity-0 group-hover/faq:opacity-60"
                    )}>
                      <Sparkles className="h-4 w-4 text-primary/50 animate-pulse" />
                    </div>
                    
                    <CollapsibleTrigger className="w-full px-6 py-5 md:px-7 md:py-6 flex items-center justify-between gap-4 text-left touch-target relative z-10">
                      <span className={cn(
                        "font-semibold text-sm md:text-base pr-2 transition-colors duration-300",
                        isOpen ? "text-primary" : "text-foreground group-hover/faq:text-primary"
                      )}>
                        {item.question}
                      </span>
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                        isOpen ? "bg-primary/20" : "bg-muted group-hover/faq:bg-primary/10"
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
                        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-5" />
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

        {/* CTA - Premium style with glow and sparkles */}
        <div className="text-center mt-12 md:mt-16 animate-fade-in">
          <p className="text-muted-foreground mb-3 text-sm md:text-base">
            Tu as d'autres questions ?
          </p>
          <a 
            href="mailto:contact@immo-rama.ch" 
            className="inline-flex items-center gap-3 group relative"
          >
            {/* Glow behind CTA */}
            <div className="absolute -inset-3 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative flex items-center gap-2 px-5 py-2.5 rounded-full glass-morphism border border-border/30 group-hover:border-primary/50 transition-all duration-300">
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-full" />
              
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium relative z-10">Contacte-nous directement</span>
              <span className="group-hover:translate-x-1 transition-transform text-primary">→</span>
              
              {/* Sparkle on hover */}
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
