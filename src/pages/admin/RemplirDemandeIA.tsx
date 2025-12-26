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
      <div className="flex-1 overflow-hidden">
        <SmartRentalFormFiller />
      </div>
    </div>
  );
}
