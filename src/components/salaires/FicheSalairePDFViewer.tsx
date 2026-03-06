import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatCHF, MOIS_LABELS } from '@/lib/swissPayroll';
import { useFileDownload } from '@/hooks/useFileDownload';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiche: any | null;
}

async function generateSalaryPDF(fiche: any, employe: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const darkBlue = rgb(0.1, 0.15, 0.35);
  let y = height - 50;
  const lm = 50; // left margin
  const rm = 545; // right margin

  // Header - Employee info (left)
  const fullName = `${employe.prenom} ${employe.nom}`;
  page.drawText(fullName, { x: lm, y, font: fontBold, size: 11, color: black });
  y -= 15;
  if (employe.adresse) { page.drawText(employe.adresse, { x: lm, y, font, size: 9, color: black }); y -= 13; }
  if (employe.code_postal || employe.ville) {
    page.drawText(`${employe.code_postal || ''} ${employe.ville || ''}`, { x: lm, y, font, size: 9, color: black });
    y -= 13;
  }

  // Header - Company info (right)
  const companyLines = [
    "L'agence Immo-Rama",
    'Chemin du Bochet 12',
    '1024 Ecublens VD',
    '',
    'Responsable: Immo-Rama Ecublens',
    'Téléphone: 021 634 28 39',
    'E-Mail: info@immo-rama.ch',
  ];
  let cy = height - 50;
  for (const line of companyLines) {
    if (line) {
      const tw = font.widthOfTextAtSize(line, 9);
      page.drawText(line, { x: rm - tw, y: cy, font, size: 9, color: black });
    }
    cy -= 13;
  }

  // Title
  y = height - 180;
  const moisLabel = MOIS_LABELS[(fiche.mois || 1) - 1];
  const title = `Décompte de salaire ${moisLabel.toLowerCase()} ${fiche.annee}`;
  page.drawText(title, { x: lm, y, font: fontBold, size: 16, color: darkBlue });
  y -= 20;

  // Date
  const now = new Date();
  const dateStr = `Ecublens VD, ${now.toLocaleDateString('fr-CH')}`;
  page.drawText(dateStr, { x: lm, y, font, size: 9, color: gray });
  y -= 35;

  // Table header
  const cols = [lm, 200, 300, 400, rm];
  const headers = ['Composant de salaire', 'Nombre', 'Taux', 'Sous-total'];
  page.drawRectangle({ x: lm - 5, y: y - 5, width: rm - lm + 10, height: 20, color: rgb(0.93, 0.93, 0.96) });
  headers.forEach((h, i) => {
    const x = i === 3 ? cols[3] : cols[i];
    page.drawText(h, { x, y, font: fontBold, size: 8, color: darkBlue });
  });
  y -= 25;

  // Helper to draw a row
  const drawRow = (label: string, nombre: string, taux: string, sousTotal: string, total: string = '', bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(label, { x: lm, y, font: f, size: 9, color: black });
    if (nombre) page.drawText(nombre, { x: 200, y, font, size: 9, color: black });
    if (taux) page.drawText(taux, { x: 300, y, font, size: 9, color: black });
    if (sousTotal) {
      const tw = font.widthOfTextAtSize(sousTotal, 9);
      page.drawText(sousTotal, { x: 430 - tw, y, font, size: 9, color: black });
    }
    if (total) {
      const tw = fontBold.widthOfTextAtSize(total, 9);
      page.drawText(total, { x: rm - tw, y, font: fontBold, size: 9, color: black });
    }
    y -= 18;
  };

  // Salary components
  if (fiche.salaire_base > 0)
    drawRow('Salaire mensuel', formatCHF(fiche.salaire_base), '100.000 %', formatCHF(fiche.salaire_base));
  if (fiche.absences_payees > 0)
    drawRow('Absences payées - SH', formatCHF(fiche.absences_payees), '1.00', formatCHF(fiche.absences_payees));
  if (fiche.heures_supplementaires > 0)
    drawRow('Heures supplémentaires', formatCHF(fiche.heures_supplementaires), '', formatCHF(fiche.heures_supplementaires));
  if (fiche.primes > 0)
    drawRow('Primes / Bonus', '', '', formatCHF(fiche.primes));

  // Gross line
  page.drawLine({ start: { x: lm, y: y + 5 }, end: { x: rm, y: y + 5 }, thickness: 0.5, color: gray });
  drawRow('Salaire brut', '', '', '', formatCHF(fiche.salaire_brut), true);
  y -= 5;

  // Deductions
  if (fiche.montant_avs > 0) drawRow('Cotisation AVS / AI / APG', formatCHF(fiche.salaire_brut), `${fiche.taux_avs} %`, `-${formatCHF(fiche.montant_avs)}`);
  if (fiche.montant_ac > 0) drawRow('Cotisation AC', formatCHF(fiche.salaire_brut), `${fiche.taux_ac} %`, `-${formatCHF(fiche.montant_ac)}`);
  if (fiche.montant_lpcfam > 0) drawRow('Cotisation LPCFam VD', formatCHF(fiche.salaire_brut), `${fiche.taux_lpcfam} %`, `-${formatCHF(fiche.montant_lpcfam)}`);
  if (fiche.montant_aanp > 0) drawRow('Cotisation ANP', formatCHF(fiche.salaire_brut), `${fiche.taux_aanp} %`, `-${formatCHF(fiche.montant_aanp)}`);
  if (fiche.montant_ijm > 0) drawRow('Cotisation IJM', formatCHF(fiche.salaire_brut), `${fiche.taux_ijm} %`, `-${formatCHF(fiche.montant_ijm)}`);
  if (fiche.montant_lpp > 0) drawRow('Cotisations LPP fixe', '', '', `-${formatCHF(fiche.montant_lpp)}`);
  if (fiche.montant_impot_source > 0) drawRow('Impôt à la source', formatCHF(fiche.salaire_brut), `${fiche.taux_impot_source} %`, `-${formatCHF(fiche.montant_impot_source)}`);

  // Net line
  y -= 5;
  page.drawLine({ start: { x: lm, y: y + 5 }, end: { x: rm, y: y + 5 }, thickness: 0.5, color: gray });
  drawRow('Salaire net', '', '', '', formatCHF(fiche.salaire_net), true);

  // Payment info
  y -= 20;
  page.drawText('Paiements', { x: lm, y, font: fontBold, size: 10, color: darkBlue });
  y -= 18;
  const paymentText = `CHF ${fiche.salaire_net?.toFixed(2)} sur compte bancaire ${employe.iban || 'N/A'}, ${employe.banque || ''}`;
  page.drawText(paymentText, { x: lm, y, font, size: 9, color: black });

  return pdfDoc.save();
}

export default function FicheSalairePDFViewer({ open, onOpenChange, fiche }: Props) {
  const { downloadBytes } = useFileDownload();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: employe } = useQuery({
    queryKey: ['employe-for-pdf', fiche?.employe_id],
    queryFn: async () => {
      if (!fiche?.employe_id) return null;
      const { data, error } = await supabase.from('employes').select('*').eq('id', fiche.employe_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!fiche?.employe_id && open,
  });

  useEffect(() => {
    if (!fiche || !employe || !open) return;
    let url: string;
    generateSalaryPDF(fiche, employe).then((bytes) => {
      const blob = new Blob([bytes], { type: 'application/pdf' });
      url = URL.createObjectURL(blob);
      setPdfUrl(url);
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [fiche, employe, open]);

  const handleDownload = async () => {
    if (!fiche || !employe) return;
    const bytes = await generateSalaryPDF(fiche, employe);
    const moisLabel = MOIS_LABELS[(fiche.mois || 1) - 1];
    const filename = `Fiche_salaire_${employe.nom}_${moisLabel}_${fiche.annee}.pdf`;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const result = await downloadBlob(blob, { filename, mimeType: 'application/pdf' });
    if (result.success) toast.success('PDF téléchargé');
    else toast.error('Erreur lors du téléchargement');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Fiche de salaire</DialogTitle>
          <Button onClick={handleDownload} className="gap-2" size="sm">
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
        </DialogHeader>
        <div className="flex-1 min-h-[600px]">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-[600px] rounded-lg border" />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              Génération du PDF...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
