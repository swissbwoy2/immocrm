import { ScrollArea } from '@/components/ui/scroll-area';

export default function CGVContent() {
  return (
    <ScrollArea className="h-64 rounded-md border p-4 bg-muted/30 text-sm">
      <div className="space-y-4">
        <h3 className="font-semibold">Dispositions du mandat</h3>
        
        <p>
          <strong>1.</strong> Les chercheurs de logement (chercheurs) chargent Immo-Rama de leur entremettre des offres de logement ou locaux commerciaux pour la location.
        </p>
        <p>
          A ce propos, Immo-Rama transmet aux chercheurs les informations nécessaires pour qu'ils puissent prendre contact, ou alors c'est Immo-Rama qui contacte les offreurs.
        </p>
        <p>
          Si le chercheur a d'ailleurs rempli des critères de recherche, Immo-Rama lui transmet de nouvelles offres qui correspondent aux critères de recherche.
        </p>

        <p>
          <strong>2.</strong> Au cas où un contrat de bail serait conclu avec un objet ou un offreur proposé par Immo-Rama, une commission d'agence est due. Les chercheurs doivent également payer une commission lorsqu'un contrat a été conclu avec l'offreur fourni concernant un autre objet que celui indiqué par Immo-Rama. La commission dépend du prix du loyer brut.
        </p>

        <p>
          <strong>2.1</strong> La commission est de 1 mois de loyer brut (loyer avec les charges) à la signature du contrat de bail. Une caution à hauteur de CHF 300.- doit être versée pour l'activation de votre dossier. Elle sera comptabilisée en cas de réussite et déductible. Le mandat de recherche est valable 3 mois, passé ce délai, le mandat est renouvelable ou prend fin. En l'absence de résiliation, par lettre recommandée, au moins 30 jours avant son échéance, le présent contrat est réputé renouvelé par reconduction tacite, à chaque fois pour 3 mois supplémentaires. En cas de non-renouvellement, la caution vous est restituée sous un délai de 30 jours.
        </p>

        <p>
          <strong>2.2</strong> La commission minimale est de CHF 500.-. La commission ne comprend pas la TVA.
        </p>

        <p>
          <strong>2.3</strong> En cas de résiliation du mandat avant terme, l'acompte ne sera pas remboursée, ni entièrement, ni partiellement.
        </p>

        <p>
          <strong>3.</strong> Les chercheurs s'engagent à déclarer immédiatement à Immo-Rama toute conclusion de contrat par oral ou par écrit ainsi que des prolongations ou renouvellements de contrat et des modifications apportées à leur mandat de recherche. Après conclusion d'un contrat, les chercheurs sont tenus de communiquer Immo-Rama l'adresse de leur future demeure ainsi que nom et adresse du futur bailleur.
        </p>

        <p>
          <strong>4.</strong> Lorsque les chercheurs connaissent les adresses proposées par Immo-Rama d'une autre source, ils doivent le faire savoir à Immo-Rama dans un délai de 24 heures, en indiquant cette autre source. Au cas contraire, l'adresse sera estimée être fournie par Immo-Rama.
        </p>

        <p>
          <strong>5.</strong> Immo-Rama se réserve le droit de demander des sécurités, des références ou des preuves de la part des chercheurs ou de refuser des chercheurs potentiels sans donner de raisons. Les chercheurs autorisent explicitement Immo-Rama à demander des renseignements sur leur personne auprès de services de renseignements sur la solvabilité ainsi que de demander des références auprès de son employeur.
        </p>

        <p>
          <strong>6.</strong> Les informations données par Immo-Rama aux chercheurs ne peuvent être remises à des tierces personnes. En cas où des informations seraient tout de même transmises à des tierces personnes, la personne responsable est tenue de supporter tout dommage qui pourrait en résulter, en particulier la commission Immo-Rama aurait perdu par ce fait.
        </p>

        <p>
          <strong>7.</strong> Lorsqu'Immo-Rama est informée de la conclusion d'un contrat de location, il annule le mandat de recherche. Un mandat de recherche peut être retiré à tout moment par les chercheurs ou annulé par Immo-Rama.
        </p>

        <p>
          <strong>8.</strong> Si un client sous contrat confirme par écrit ou verbalement que son dossier de candidature pour un logement peut être transmis à la gérance en charge, et que la gérance informe Immo-Rama de sa décision d'attribuer le logement à ce client, Immo-Rama aura droit à une commission équivalente à un mois de loyer du bien en location concerné.
        </p>

        <p>
          <strong>9. Position de Immo-Rama</strong>
        </p>
        <p>
          Immo-Rama ne peut assurer aucune garantie de succès quant à la conclusion d'un contrat. Immo-Rama ne peut assumer aucune responsabilité quant à l'exactitude des données concernant les offreurs et leurs offres de logement.
        </p>
        <p>
          Les contrats sont passés directement entre les chercheurs et les offreurs. Immo-Rama peut assister les parties contractantes lors de la signature de contrat et répondre aux questions relatives à la conclusion de contrat.
        </p>
        <p>
          Toutefois, Immo-Rama n'assume aucune responsabilité pour les conséquences résultant de contrats défectueux ou de comportements fautifs de la part des parties contractantes. Ceci vaut également lorsque Immo-Rama a été directement impliqué dans les négociations de contrat.
        </p>

        <p>
          <strong>10.</strong> Les chercheurs autorisent Immo-Rama à transmettre les données indiquées ainsi que les résultats des demandes concernant la solvabilité et la référence à des offreurs potentiels. En outre, Immo-Rama a le droit d'utiliser les données de contact pour des envois d'informations propres à la Société.
        </p>

        <p>
          <strong>11.</strong> La juridiction compétente est Berne (Suisse). Sauf indication contraire contenue dans le présent contrat, c'est le Code des obligations suisse (CO) qui fait foi.
        </p>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <h4 className="font-semibold mb-2">Informations bancaires pour l'activation de vos recherches :</h4>
          <p className="text-sm">Votre dossier sera activé dès réception du paiement ou de la preuve de paiement.</p>
          <ul className="mt-2 text-sm space-y-1">
            <li>• Acompte pour l'activation de vos recherches de logement à louer: <strong>300 CHF</strong></li>
            <li>• Acompte pour l'activation de vos recherches de logement à acheter: <strong>2'500 CHF</strong></li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
