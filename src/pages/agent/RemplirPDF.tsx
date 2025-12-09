import PDFFormFiller from '@/components/PDFFormFiller';

export default function RemplirPDF() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 md:px-8 py-4 border-b">
        <h1 className="text-2xl font-bold">Remplir et signer un PDF</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importez un PDF, ajoutez du texte, des annotations et votre signature
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <PDFFormFiller />
      </div>
    </div>
  );
}
