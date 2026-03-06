import { Info } from 'lucide-react';

export default function MandatV3Step5Financial() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Conditions financières</h2>
        <p className="text-sm text-muted-foreground mt-1">Récapitulatif des conditions applicables au mandat.</p>
      </div>

      <div className="bg-muted/30 rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Acompte d'activation</h3>
            <p className="text-2xl font-bold text-primary mt-1">CHF 300.–</p>
            <p className="text-sm text-muted-foreground mt-1">
              Versé à la signature du mandat. Déduit de la commission finale.
              Non remboursable en cas de résiliation anticipée sans motif légitime.
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-foreground">Commission de l'agence</h3>
          <p className="text-2xl font-bold text-primary mt-1">1 mois de loyer brut</p>
          <p className="text-sm text-muted-foreground mt-1">
            Due uniquement en cas de conclusion d'un contrat de bail grâce à l'intervention de l'agence.
            TVA en sus si applicable.
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-foreground">Durée du mandat</h3>
          <p className="text-2xl font-bold text-primary mt-1">3 mois</p>
          <p className="text-sm text-muted-foreground mt-1">
            Renouvelable tacitement pour des périodes de 3 mois.
            Résiliation possible avec un préavis de 30 jours avant l'échéance.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
        Ces conditions sont détaillées dans le contrat intégral présenté à l'étape suivante.
      </div>
    </div>
  );
}
