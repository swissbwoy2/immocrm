import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Building2, CreditCard, Clock, Scale, Landmark } from 'lucide-react';

interface Props {
  typeRecherche: string;
}

export default function CGVContent({ typeRecherche }: Props) {
  const isAchat = typeRecherche === 'Acheter';

  if (isAchat) {
    return (
      <ScrollArea className="h-64 rounded-xl border border-border/50 bg-muted/20 backdrop-blur-sm">
        <div className="p-4 space-y-4 text-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-border/50">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">MANDAT DE RECHERCHE DE BIEN FONCIER</h3>
          </div>
          
          <div className="space-y-4">
            <Card className="p-3 bg-background/50 border-border/30">
              <p className="font-semibold text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</span>
                MANDAT
              </p>
              <p className="mt-2 text-muted-foreground">
                Le mandant charge le mandataire de lui présenter le bien ci-après désigné et d'intervenir en tant qu'intermédiaire dans le suivi, la négociation et la conclusion dudit mandat.
              </p>
            </Card>

            <Card className="p-3 bg-background/50 border-border/30">
              <p className="font-semibold text-primary flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</span>
                DURÉE
              </p>
              <p className="mt-2 text-muted-foreground">
                Le présent contrat est conclu pour une durée de 6 mois à compter de sa date de signature. En l'absence de résiliation, par lettre recommandée, au moins 30 jours avant son échéance, le présent contrat est réputé renouvelé par reconduction tacite, à chaque fois pour 3 mois supplémentaires.
              </p>
            </Card>

            <Card className="p-3 bg-background/50 border-border/30">
              <p className="font-semibold text-primary flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</span>
                HONORAIRES
              </p>
              <p className="mt-2 text-muted-foreground">
                Le mandant s'engage à payer au mandataire, à la conclusion de l'acte de vente chez un notaire, le montant correspondant à 1 % du prix de vente défini entre les parties. Un acompte de CHF 2'500.- est dû pour activer vos recherches, et sera déduit de la commission en cas de réussite ou remboursé totalement en cas d'échec.
              </p>
              <p className="mt-2 text-muted-foreground">
                En toute confidentialité le mandataire s'engage également à communiquer au mandant toutes les informations nécessaires pour au bon déroulement de cette mission.
              </p>
              <p className="mt-2 text-muted-foreground">
                Si le mandant se porte acquéreur, par ses propres moyens ou par tout autre moyen, d'un bien présenté par le mandataire, la commission est intégralement due au mandataire.
              </p>
            </Card>

            <Card className="p-3 bg-background/50 border-border/30">
              <p className="font-semibold text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">4</span>
                MODIFICATION DU CONTRAT
              </p>
              <p className="mt-2 text-muted-foreground">
                Le présent contrat constitue l'intégralité de l'accord passé par le Mandant et le Mandataire. Il ne pourra être modifié si ce n'est par un accord écrit subséquent entre les parties.
              </p>
            </Card>

            <Card className="p-3 bg-background/50 border-border/30">
              <p className="font-semibold text-primary flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">5</span>
                ÉLECTION DE FOR ET DE DROIT
              </p>
              <p className="mt-2 text-muted-foreground">
                En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties acceptent la compétence exclusive des tribunaux genevois, sous réserve d'un recours au Tribunal Fédéral. Le droit suisse est applicable, sous réserve des dispositions prévues dans le présent contrat.
              </p>
            </Card>
          </div>

          <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">Informations bancaires pour l'activation de vos recherches</h4>
            </div>
            <p className="text-xs text-muted-foreground">Votre dossier sera activé dès réception du paiement ou de la preuve de paiement.</p>
            <div className="mt-3 p-3 bg-background/50 rounded-lg space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">BANQUE RAIFFEISEN DU GROS DE VAUD</p>
                <p className="text-sm text-muted-foreground">Agence Immo-Rama</p>
                <p className="text-sm text-muted-foreground">Chemin de l'Esparcette 5</p>
                <p className="text-sm text-muted-foreground">1023 Crissier</p>
              </div>
              <div className="pt-2 border-t border-border/50 space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">IBAN : </span>
                  <span className="font-mono font-medium text-foreground">CH87 8080 8004 9815 5643 7</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">SWIFT-BIC : </span>
                  <span className="font-mono font-medium text-foreground">RAIFCH22</span>
                </p>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm font-medium">
                  Acompte pour l'activation de vos recherches de bien à acheter: <span className="text-primary font-bold">2'500 CHF</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  // Location (default)
  return (
    <ScrollArea className="h-64 rounded-xl border border-border/50 bg-muted/20 backdrop-blur-sm">
      <div className="p-4 space-y-4 text-sm">
        <h3 className="font-bold text-base pb-3 border-b border-border/50">Dispositions du mandat</h3>
        
        <div className="space-y-3">
          <p>
            <strong className="text-primary">1.</strong> Les chercheurs de logement (chercheurs) chargent Immo-Rama de leur entremettre des offres de logement ou locaux commerciaux pour la location.
          </p>
          <p className="text-muted-foreground">
            A ce propos, Immo-Rama transmet aux chercheurs les informations nécessaires pour qu'ils puissent prendre contact, ou alors c'est Immo-Rama qui contacte les offreurs.
          </p>
          <p className="text-muted-foreground">
            Si le chercheur a d'ailleurs rempli des critères de recherche, Immo-Rama lui transmet de nouvelles offres qui correspondent aux critères de recherche.
          </p>

          <p>
            <strong className="text-primary">2.</strong> Au cas où un contrat de bail serait conclu avec un objet ou un offreur proposé par Immo-Rama, une commission d'agence est due. Les chercheurs doivent également payer une commission lorsqu'un contrat a été conclu avec l'offreur fourni concernant un autre objet que celui indiqué par Immo-Rama. La commission dépend du prix du loyer brut.
          </p>

          <Card className="p-3 bg-primary/5 border-primary/20">
            <p>
              <strong className="text-primary">2.1</strong> La commission est de 1 mois de loyer brut (loyer avec les charges) à la signature du contrat de bail. Une caution à hauteur de <strong>CHF 300.-</strong> doit être versée pour l'activation de votre dossier. Elle sera comptabilisée en cas de réussite et déductible. Le mandat de recherche est valable 3 mois, passé ce délai, le mandat est renouvelable ou prend fin.
            </p>
          </Card>

          <p>
            <strong className="text-primary">2.2</strong> La commission minimale est de CHF 500.-. La commission ne comprend pas la TVA.
          </p>

          <p>
            <strong className="text-primary">2.3</strong> En cas de résiliation du mandat avant terme, l'acompte ne sera pas remboursée, ni entièrement, ni partiellement.
          </p>

          <p>
            <strong className="text-primary">3.</strong> Les chercheurs s'engagent à déclarer immédiatement à Immo-Rama toute conclusion de contrat par oral ou par écrit ainsi que des prolongations ou renouvellements de contrat et des modifications apportées à leur mandat de recherche.
          </p>

          <p>
            <strong className="text-primary">4.</strong> Lorsque les chercheurs connaissent les adresses proposées par Immo-Rama d'une autre source, ils doivent le faire savoir à Immo-Rama dans un délai de 24 heures.
          </p>

          <p>
            <strong className="text-primary">5.</strong> Immo-Rama se réserve le droit de demander des sécurités, des références ou des preuves de la part des chercheurs ou de refuser des chercheurs potentiels sans donner de raisons.
          </p>

          <p>
            <strong className="text-primary">6.</strong> Les informations données par Immo-Rama aux chercheurs ne peuvent être remises à des tierces personnes.
          </p>

          <p>
            <strong className="text-primary">7.</strong> Lorsqu'Immo-Rama est informée de la conclusion d'un contrat de location, il annule le mandat de recherche.
          </p>

          <p>
            <strong className="text-primary">8.</strong> Si un client sous contrat confirme par écrit ou verbalement que son dossier de candidature pour un logement peut être transmis à la gérance en charge, Immo-Rama aura droit à une commission.
          </p>

          <Card className="p-3 bg-muted/50">
            <p>
              <strong className="text-primary">9. Position de Immo-Rama</strong>
            </p>
            <p className="mt-2 text-muted-foreground">
              Immo-Rama ne peut assurer aucune garantie de succès quant à la conclusion d'un contrat. Les contrats sont passés directement entre les chercheurs et les offreurs.
            </p>
          </Card>

          <p>
            <strong className="text-primary">10.</strong> Les chercheurs autorisent Immo-Rama à transmettre les données indiquées ainsi que les résultats des demandes concernant la solvabilité et la référence à des offreurs potentiels.
          </p>

          <p>
            <strong className="text-primary">11.</strong> La juridiction compétente est Berne (Suisse). Le Code des obligations suisse (CO) fait foi.
          </p>
        </div>

        <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Informations bancaires pour l'activation de vos recherches</h4>
          </div>
          <p className="text-xs text-muted-foreground">Votre dossier sera activé dès réception du paiement ou de la preuve de paiement.</p>
          <div className="mt-3 p-3 bg-background/50 rounded-lg space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">BANQUE RAIFFEISEN DU GROS DE VAUD</p>
              <p className="text-sm text-muted-foreground">Agence Immo-Rama</p>
              <p className="text-sm text-muted-foreground">Chemin de l'Esparcette 5</p>
              <p className="text-sm text-muted-foreground">1023 Crissier</p>
            </div>
            <div className="pt-2 border-t border-border/50 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">IBAN : </span>
                <span className="font-mono font-medium text-foreground">CH87 8080 8004 9815 5643 7</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">SWIFT-BIC : </span>
                <span className="font-mono font-medium text-foreground">RAIFCH22</span>
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-sm font-medium">
                Acompte pour l'activation de vos recherches de logement à louer: <span className="text-primary font-bold">300 CHF</span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
