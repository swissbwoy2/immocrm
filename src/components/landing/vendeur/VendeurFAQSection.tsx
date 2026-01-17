import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: "Comment est-ce possible de vendre sans commission ?",
    answer: "Notre modèle est unique : au lieu de prélever une commission sur votre prix de vente, nous intégrons nos frais dans le prix acheteur. L'acheteur paie un prix légèrement supérieur qui inclut notre commission. Vous, vendeur, gardez 100% de votre prix net demandé. C'est un modèle gagnant-gagnant : vous économisez des milliers de francs, et l'acheteur bénéficie d'un accès privilégié à des biens off-market."
  },
  {
    question: "Qui sont vos acheteurs qualifiés ?",
    answer: "Nos acheteurs sont des familles, couples, investisseurs et expatriés qui ont passé un processus de qualification rigoureux. Nous vérifions leur capacité financière, leurs critères de recherche précis et leur motivation à acheter rapidement. Ils paient un dépôt d'activation qui garantit leur sérieux. Ce ne sont pas des curieux, mais des personnes prêtes à passer à l'action."
  },
  {
    question: "Comment fonctionne le matching intelligent ?",
    answer: "Notre système analyse en temps réel les critères de tous nos acheteurs actifs : budget, localisation, type de bien, nombre de pièces, équipements souhaités, etc. Dès que vous inscrivez votre bien, notre algorithme identifie les acheteurs compatibles et leur présente votre propriété en exclusivité. Pas de perte de temps, uniquement des contacts pertinents."
  },
  {
    question: "Mon bien sera-t-il visible sur les portails immobiliers ?",
    answer: "Non, c'est justement notre différence ! Votre bien reste totalement invisible sur Homegate, Immoscout, Comparis ou tout autre portail public. Il est présenté uniquement à nos acheteurs qualifiés, en off-market. Cela vous protège de la surexposition, de la dépréciation, et garantit une discrétion totale."
  },
  {
    question: "Combien de temps pour vendre mon bien ?",
    answer: "En moyenne, nos vendeurs trouvent un acheteur en 3 à 6 semaines. C'est beaucoup plus rapide qu'une agence classique (souvent 3-6 mois) car nos acheteurs sont déjà qualifiés et activement à la recherche. Le matching ciblé évite les visites inutiles et accélère le processus."
  },
  {
    question: "Comment optimiser l'impôt sur le gain immobilier ?",
    answer: "L'impôt sur le gain immobilier en Suisse dépend de plusieurs facteurs : durée de détention (plus c'est long, moins vous payez), frais déductibles (travaux de plus-value, frais de vente) et possibilité de report en cas de remploi. Nous vous accompagnons pour identifier toutes les déductions possibles et optimiser votre situation fiscale. Une planification fiscale peut vous faire économiser des milliers de francs."
  },
  {
    question: "Que se passe-t-il si aucun acheteur ne correspond ?",
    answer: "C'est rare, mais si après quelques semaines aucun acheteur ne correspond parfaitement à votre bien, nous vous proposerons plusieurs options : ajuster légèrement les critères, élargir la zone géographique, ou revoir le positionnement prix. Notre objectif est toujours de trouver le bon acheteur au bon prix pour vous."
  },
  {
    question: "Y a-t-il des frais cachés ?",
    answer: "Absolument aucun. Zéro commission vendeur, zéro frais d'inscription, zéro frais de dossier. L'inscription et le matching sont 100% gratuits pour vous. Vous ne payez rien du tout. Seul l'acheteur paie notre commission, qui est incluse dans son budget d'achat."
  },
];

export function VendeurFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Questions Fréquentes</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Tout ce que vous devez
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              savoir
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Les réponses aux questions les plus courantes de nos vendeurs.
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className={cn(
                "rounded-2xl border transition-all duration-300",
                openIndex === index 
                  ? "bg-card border-primary/30 shadow-lg shadow-primary/5" 
                  : "bg-card/50 border-border/50 hover:border-border"
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <span className={cn(
                  "font-semibold text-lg pr-4",
                  openIndex === index ? "text-primary" : "text-foreground"
                )}>
                  {faq.question}
                </span>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  openIndex === index 
                    ? "bg-primary text-primary-foreground rotate-180" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                openIndex === index ? "max-h-96" : "max-h-0"
              )}>
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Vous avez d'autres questions ?
          </p>
          <a 
            href="tel:+41216342839"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Appelez-nous au 021 634 28 39
          </a>
        </div>
      </div>
    </section>
  );
}
