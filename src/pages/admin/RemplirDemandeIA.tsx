import SmartRentalFormFiller from '@/components/SmartRentalFormFiller';

export default function RemplirDemandeIA() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 md:px-8 py-4 border-b">
        <h1 className="text-2xl font-bold">Remplir demande de location (IA)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importez un formulaire PDF, sélectionnez un client et laissez l'IA pré-remplir les champs automatiquement
        </p>
      </div>
      <div className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
        <SmartRentalFormFiller />
      </div>
    </div>
  );
}
