import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { FormulaireChamp } from '../types';
import { SIGNATURE_KEY } from '../keys';

/** pdf-lib (WinAnsi) ne supporte pas certains espaces unicode */
export function sanitizePdfText(input: string): string {
  return (input ?? '')
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2019/g, "'")
    .replace(/[\u2013\u2014]/g, '-');
}

export interface FillOptions {
  templateBytes: ArrayBuffer | Uint8Array;
  annexeBytes?: ArrayBuffer | Uint8Array | null;
  champs: FormulaireChamp[];
  values: Record<string, string>;
  /** dataURL PNG */
  signatureDataUrl?: string | null;
}

/**
 * Remplissage 100% déterministe : chaque valeur est écrite exactement
 * aux coordonnées du mapping (origine haut-gauche, points PDF).
 */
export async function fillPdfTemplate({
  templateBytes,
  annexeBytes,
  champs,
  values,
  signatureDataUrl,
}: FillOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  let signatureImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (signatureDataUrl?.startsWith('data:image')) {
    try {
      signatureImage = await pdfDoc.embedPng(signatureDataUrl);
    } catch {
      signatureImage = null;
    }
  }

  for (const champ of champs) {
    const page = pages[champ.page - 1];
    if (!page) continue;
    const pageHeight = page.getHeight();

    if (champ.cle_champ === SIGNATURE_KEY) {
      if (!signatureImage) continue;
      const boxW = Number(champ.largeur) || 140;
      const boxH = Number(champ.hauteur) || 50;
      const ratio = signatureImage.width / signatureImage.height;
      let w = boxW;
      let h = w / ratio;
      if (h > boxH) {
        h = boxH;
        w = h * ratio;
      }
      page.drawImage(signatureImage, {
        x: Number(champ.pos_x),
        y: pageHeight - Number(champ.pos_y) - h,
        width: w,
        height: h,
      });
      continue;
    }

    const raw = values[champ.cle_champ];
    if (!raw) continue;
    const text = sanitizePdfText(String(raw));
    const size = Number(champ.taille_police) || 10;
    const textWidth = font.widthOfTextAtSize(text, size);
    const boxW = Number(champ.largeur) || 0;

    let x = Number(champ.pos_x);
    if (champ.alignement === 'center') x += Math.max(0, (boxW - textWidth) / 2);
    else if (champ.alignement === 'right') x += Math.max(0, boxW - textWidth);

    // baseline : bas de la boîte, légèrement remonté
    const y = pageHeight - Number(champ.pos_y) - size;

    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  }

  if (annexeBytes) {
    try {
      const annexe = await PDFDocument.load(annexeBytes);
      const copied = await pdfDoc.copyPages(annexe, annexe.getPageIndices());
      copied.forEach((p) => pdfDoc.addPage(p));
    } catch {
      // annexe illisible : on ignore silencieusement
    }
  }

  return pdfDoc.save();
}
