import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import { pdfjsLib } from './pdfjs';
import { detectAcroFields, shouldUseAcroform } from './acroform';
import { FORM_BUCKET, fetchBytes } from './storage';

export interface CalibrationResult {
  mode: 'acroform' | 'overlay';
  count: number;
  conjoint: number;
}

/** Rend chaque page du PDF en PNG (base64) pour l'analyse VISION. */
async function renderPagesToImages(bytes: Uint8Array, maxPages = 6) {
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const out: { page: number; image: string; width: number; height: number }[] = [];
  const total = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1400 / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push({
      page: i,
      image: canvas.toDataURL('image/png'),
      width: base.width,
      height: base.height,
    });
  }
  try { doc.destroy(); } catch { /* noop */ }
  return out;
}

/** Position (page + coordonnées haut-gauche) de chaque champ AcroForm. */
async function fieldPositions(bytes: Uint8Array): Promise<Map<string, { page: number; x: number; y: number }>> {
  const map = new Map<string, { page: number; x: number; y: number }>();
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = pdf.getPages();
    for (const field of pdf.getForm().getFields()) {
      const widgets = (field as any).acroField?.getWidgets?.() ?? [];
      const w = widgets[0];
      if (!w) continue;
      const rect = w.getRectangle();
      const ref = w.P?.();
      const idx = ref ? pages.findIndex((p) => p.ref === ref) : 0;
      const page = pages[idx >= 0 ? idx : 0];
      map.set(field.getName(), {
        page: (idx >= 0 ? idx : 0) + 1,
        x: rect.x,
        y: page.getHeight() - rect.y - rect.height,
      });
    }
  } catch { /* noop */ }
  return map;
}

/** Calibration VISION : l'IA lit le formulaire et mémorise son schéma. */
export async function calibrateFormulaire(params: {
  formulaireId: string;
  pdfPath: string | null;
}): Promise<CalibrationResult> {
  const bytes = await fetchBytes(FORM_BUCKET, params.pdfPath);
  if (!bytes) throw new Error('PDF du modèle introuvable');

  const detected = await detectAcroFields(bytes);
  const mode: 'acroform' | 'overlay' = shouldUseAcroform(detected) || detected.length > 0 ? 'acroform' : 'overlay';
  const positions = mode === 'acroform' ? await fieldPositions(bytes) : new Map();
  const pages = await renderPagesToImages(bytes);

  const { data, error } = await supabase.functions.invoke('postulation-calibrate', {
    body: {
      formulaireId: params.formulaireId,
      mode,
      pages,
      fields: detected.map((f) => ({ ...f, ...(positions.get(f.name) ?? {}) })),
    },
  });
  if (error) throw new Error((data as any)?.error ?? error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as CalibrationResult;
}
