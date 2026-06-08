import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "Qu'est-ce qu'une agence de relocation ?",
    a: "Une agence de relocation accompagne les personnes solvables dans leur recherche de logement, de la définition des critères jusqu'à la signature du bail. Chez Logisorama, votre agent dédié contacte les régies, active son réseau professionnel, sélectionne les biens pertinents et vous aide à présenter un dossier locataire solide. L'objectif est de gagner du temps et de maximiser vos chances d'obtenir un appartement à Lausanne, Genève ou ailleurs en Suisse romande.",
  },
  {
    q: "Comment fonctionne une recherche d'appartement avec Logisorama ?",
    a: "Tout commence par une analyse gratuite de votre dossier à notre bureau de Crissier. Nous définissons ensemble votre projet, vos critères et votre budget. Votre agent personnel scrute ensuite les annonces, contacte les régies, organise les visites et dépose vos candidatures. Vous suivez chaque étape dans votre espace client, avec un point régulier sur les réponses obtenues et les pistes en cours.",
  },
  {
    q: "Logisorama est-il un chasseur d'appartement à Lausanne ?",
    a: "Oui. Nous intervenons comme chasseur d'appartement à Lausanne, Crissier, Renens, Prilly, Ecublens, Pully, Lutry et plus largement sur l'Arc lémanique. Notre rôle est d'agir comme votre agent immobilier personnel : trouver les biens correspondant à vos critères, y compris ceux non publiés en ligne, et vous accompagner jusqu'à l'obtention du logement. Le service s'adresse aux locataires solvables qui souhaitent gagner du temps et de l'efficacité.",
  },
  {
    q: "Dans quelles villes Logisorama accompagne-t-il ses clients ?",
    a: "Nous couvrons toute la Suisse romande : Lausanne, Genève, Crissier, Renens, Prilly, Ecublens, Bussigny, Morges, Nyon, Rolle, Gland, Vevey, Montreux, Pully, Lutry, ainsi que Fribourg, Bulle, Neuchâtel, Sion, Martigny et les communes voisines. Notre réseau est particulièrement dense dans l'Ouest lausannois, sur la Riviera, sur La Côte et autour de Genève. Pour les zones étudiantes, nous accompagnons aussi les recherches autour de l'UNIL et de l'EPFL.",
  },
  {
    q: "Pouvez-vous aider pour un appartement à louer ou une maison à louer ?",
    a: "Oui. Nous accompagnons la recherche d'un appartement à louer, d'une maison à louer ou d'un logement plus spécifique (loft, attique, colocation, logement meublé). Selon votre projet, nous activons les bons canaux : régies partenaires, propriétaires privés, annonces en ligne et réseau interne. Vous recevez uniquement les biens qui correspondent réellement à votre cahier des charges, avec un suivi clair des candidatures envoyées.",
  },
  {
    q: "Logisorama accompagne-t-il les étudiants UNIL et EPFL ?",
    a: "Oui. Nous aidons régulièrement des étudiants UNIL, EPFL ou d'autres hautes écoles à trouver un logement à Lausanne, Ecublens, Chavannes-près-Renens, Saint-Sulpice ou Renens. Nous tenons compte du budget étudiant, du calendrier académique et de la nécessité d'un dossier rassurant (garant, attestation, caution). L'objectif est d'éviter les pièges classiques et de sécuriser un logement avant la rentrée.",
  },
  {
    q: "Proposez-vous un service de relocation pour expatriés ?",
    a: "Oui. Pour les expatriés et cadres en mobilité professionnelle, nous proposons un accompagnement complet : recherche de logement à Lausanne ou Genève, visites (sur place ou à distance), constitution du dossier locataire suisse, signature du bail et orientation administrative. Vous bénéficiez d'un interlocuteur unique, francophone et anglophone, qui connaît les attentes des régies locales et facilite l'installation en Suisse romande.",
  },
  {
    q: "Les entreprises peuvent-elles mandater Logisorama pour reloger un collaborateur ?",
    a: "Oui. Nous travaillons avec des entreprises et des responsables RH qui doivent reloger un collaborateur arrivant à Lausanne, Genève ou Crissier. Nous proposons un mandat d'entreprise avec un cahier des charges précis, un reporting régulier et un délai cible. Le collaborateur bénéficie d'un accompagnement humain et professionnel, ce qui sécurise sa prise de poste et libère vos équipes RH des démarches immobilières.",
  },
  {
    q: "Proposez-vous aussi un accompagnement pour la vente ou l'achat immobilier ?",
    a: "Oui. En plus de la relocation, Logisorama accompagne l'achat et la vente immobilière : appartement à vendre, maison à vendre, immeuble à vendre ou recherche d'un bien off-market en Suisse romande. Nous vous orientons vers nos partenaires bancaires pour le financement hypothécaire et nous coordonnons les étapes jusqu'à la signature notariale. L'approche reste la même : transparente, humaine et orientée résultat.",
  },
  {
    q: "Le service garantit-il l'obtention d'un logement ?",
    a: "Non, aucun service sérieux ne peut garantir automatiquement l'obtention d'un logement, car la décision finale appartient toujours à la régie ou au propriétaire. En revanche, nous maximisons vos chances grâce à un dossier soigné, un ciblage précis et une réactivité quotidienne. Si aucun bien n'a été trouvé au terme du mandat de 90 jours, votre acompte de 300 CHF vous est intégralement remboursé.",
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
          {HOME_FAQ.map((faq, i) => (
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
