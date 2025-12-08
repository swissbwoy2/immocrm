import { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles, MessageCircle, ShieldCheck } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const faqItems = [
  {
    question: "Comment ça marche concrètement ?",
    answer: "C'est ultra simple : tu remplis le formulaire (5 min), tu verses l'acompte de 300 CHF, et ton agent dédié prend le relais immédiatement. Il recherche, contacte les régies, prépare ton dossier béton et t'envoie des offres dans ton espace client. Toi, tu valides ce qui te plaît !",
  },
  {
    question: "Est-ce vraiment légal et sérieux ?",
    answer: "Absolument ! Immo-Rama.ch est une entreprise inscrite au Registre du Commerce suisse (IDE : CHE-XXX.XXX.XXX), basée à Lausanne. Nous opérons depuis 2019 avec plus de 500 clients satisfaits. Tu peux vérifier nos avis Google (4.8★) et nous contacter à tout moment.",
  },
  {
    question: "Pourquoi vous êtes différents des chasseurs gratuits ?",
    answer: "Les services 'gratuits' sont payés par les régies, donc ils travaillent pour elles, pas pour toi. Nous, on est payé par TOI, donc on défend TES intérêts. On négocie pour toi, on te conseille honnêtement, et on n'a aucun intérêt à te placer dans un appart' qui ne te convient pas.",
  },
  {
    question: "Les 300 CHF sont-ils vraiment remboursables ?",
    answer: "Oui, à 100% et sans condition ! Si après 3 mois de recherche active on n'a pas trouvé ton appartement, tu es intégralement remboursé sous 7 jours. C'est notre garantie \"Satisfait ou remboursé\". On prend le risque, pas toi.",
  },
  {
    question: "Que se passe-t-il si j'annule avant 90 jours ?",
    answer: "En cas d'annulation de ta part avant les 90 jours, l'acompte de 300 CHF reste acquis car il couvre le travail déjà effectué (recherches, contacts régies, préparation dossier). Le remboursement intégral ne s'applique qu'en cas d'échec de notre part après 3 mois.",
  },
  {
    question: "Dans quels cantons êtes-vous actifs ?",
    answer: "Toute la Suisse romande ! Genève, Vaud, Valais, Neuchâtel, Fribourg et Jura. Notre réseau de +50 agences partenaires nous permet d'accéder à des offres exclusives dans tous ces cantons.",
  },
  {
    question: "Combien de temps pour trouver en moyenne ?",
    answer: "En moyenne 45 jours, mais certains clients trouvent en 2 semaines ! Ça dépend de tes critères et du marché local. Notre expertise et notre réseau accélèrent considérablement le processus par rapport à une recherche solo.",
  },
  {
    question: "Et si je trouve moi-même pendant la recherche ?",
    answer: "Super pour toi ! Tu nous préviens et on arrête les recherches. L'acompte de 300 CHF reste acquis pour couvrir le travail effectué, mais tu ne paies pas les honoraires de succès. Pas de mauvaise surprise.",
  },
  {
    question: "Comment fonctionne la délégation de visite ?",
    answer: "Si tu n'es pas disponible (à l'étranger, horaires compliqués...), ton agent visite à ta place. Tu reçois une vidéo HD + un compte-rendu détaillé sous 24h pour décider en toute connaissance de cause. C'est comme si tu y étais !",
  },
  {
    question: "Comment puis-je vous contacter ?",
    answer: "Bien sûr ! Par email : info@immo-rama.ch ou support@immo-rama.ch. Par téléphone : +41 76 483 91 99. Par courrier : Immo-Rama.ch, Chemin de l'Esparcette 5, 1023 Crissier, Suisse 🇨🇭. On répond sous 24h !",
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
            On répond à <span className="text-primary">toutes tes questions</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Transparence totale. Pas de zones d'ombre.
          </p>
        </div>

        {/* Trust badge */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">Entreprise vérifiée • 4.8★ sur Google</span>
          </div>
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
            Une autre question ? On est là pour toi.
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
