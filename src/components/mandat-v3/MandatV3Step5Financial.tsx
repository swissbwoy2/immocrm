import { Info, CreditCard, Clock, Receipt } from 'lucide-react';

export default function MandatV3Step5Financial() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Conditions financières</h2>
        <p className="text-sm text-muted-foreground mt-1">Récapitulatif des conditions applicables au mandat.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Card: Acompte */}
        <div className="rounded-xl border bg-muted/30 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground">Acompte d'activation</h3>
            <p className="text-xl sm:text-2xl font-bold text-primary mt-0.5">CHF 300.–</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Versé à la signature. Déduit de la commission finale. Non remboursable en cas de résiliation anticipée.
            </p>
          </div>
        </div>

        {/* Card: Commission */}
        <div className="rounded-xl border bg-muted/30 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground">Commission de l'agence</h3>
            <p className="text-xl sm:text-2xl font-bold text-primary mt-0.5">1 mois de loyer brut</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Due uniquement en cas de conclusion d'un bail grâce à l'agence. TVA en sus si applicable.
            </p>
          </div>
        </div>

        {/* Card: Durée */}
        <div className="rounded-xl border bg-muted/30 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground">Durée du mandat</h3>
            <p className="text-xl sm:text-2xl font-bold text-primary mt-0.5">3 mois</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Renouvelable tacitement. Résiliation avec préavis de 30 jours avant l'échéance.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
        Ces conditions sont détaillées dans le contrat intégral présenté à l'étape suivante.
      </div>
    </div>
  );
}
