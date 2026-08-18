import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { FormulaireChamp } from '../types';
import { SIGNATURE_KEY } from '../keys';
import { normalizeName } from './acroform';

/** pdf-lib (WinAnsi) ne supporte pas certains espaces unicode */
export function sanitizePdfText(input: string): string {
  return (input ?? '')
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2019/g, "'")
    .replace(/[\u2013\u2014]/g, '-');
}

/**
 * Garde-fou : on n'écrit JAMAIS le nom d'une clé/champ technique dans le PDF
 * (ex. "bien_loyer_ne", "co_prenom"). Si la valeur ressemble à un identifiant
 * snake_case sans espace, on la considère comme vide.
 */
export function isKeyLikeValue(value: string): boolean {
  const v = (value ?? '').trim();
  if (!v || /\s/.test(v)) return false;
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(v);
}


export interface FillOptions {
  templateBytes: ArrayBuffer | Uint8Array;
  annexeBytes?: ArrayBuffer | Uint8Array | null;
  champs: FormulaireChamp[];
  values: Record<string, string>;
  /** Valeurs résolues par identifiant de champ (prioritaires sur `values`) */
  valuesById?: Record<string, string>;
  /** dataURL PNG */
  signatureDataUrl?: string | null;
}

async function appendAnnexe(pdfDoc: PDFDocument, annexeBytes?: ArrayBuffer | Uint8Array | null) {
  if (!annexeBytes) return;
  try {
    const annexe = await PDFDocument.load(annexeBytes, { ignoreEncryption: true });
    const copied = await pdfDoc.copyPages(annexe, annexe.getPageIndices());
    copied.forEach((p) => pdfDoc.addPage(p));
  } catch {
    // annexe illisible : on ignore silencieusement
  }
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
  valuesById,
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

    const raw = valuesById?.[champ.id] ?? values[champ.cle_champ];
    if (!raw || isKeyLikeValue(String(raw))) continue;
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

  await appendAnnexe(pdfDoc, annexeBytes);

  return pdfDoc.save();
}

/* -------------------------------------------------------------------------- */
/*                       Remplissage natif AcroForm                            */
/* -------------------------------------------------------------------------- */

const TRUTHY = ['oui', 'yes', 'x', 'true', '1', 'coche'];

function pickOption(options: string[], value: string, optionValeur?: string | null): string | null {
  if (optionValeur && options.includes(optionValeur)) return optionValeur;
  const v = normalizeName(value);
  if (!v) return null;
  const exact = options.find((o) => normalizeName(o) === v);
  if (exact) return exact;
  const partial = options.find((o) => {
    const n = normalizeName(o);
    return n && (n.includes(v) || v.includes(n));
  });
  return partial ?? null;
}

/**
 * Remplissage natif : chaque valeur est écrite dans le champ AcroForm portant
 * le nom mappé. 100% déterministe, sans placement manuel.
 */
export async function fillAcroFormTemplate({
  templateBytes,
  annexeBytes,
  champs,
  values,
  valuesById,
  signatureDataUrl,
  flatten = true,
}: FillOptions & { flatten?: boolean }): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let signatureImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (signatureDataUrl?.startsWith('data:image')) {
    try {
      signatureImage = await pdfDoc.embedPng(signatureDataUrl);
    } catch {
      signatureImage = null;
    }
  }

  for (const champ of champs) {
    const name = champ.nom_champ_pdf;
    if (!name || !champ.cle_champ) continue;
    const rawValue = String(valuesById?.[champ.id] ?? values[champ.cle_champ] ?? '');
    const value = isKeyLikeValue(rawValue) ? '' : sanitizePdfText(rawValue);

    try {
      if (champ.cle_champ === SIGNATURE_KEY) {
        if (!signatureImage) continue;
        const field = form.getField(name);
        const widgets = (field as any).acroField?.getWidgets?.() ?? [];
        for (const widget of widgets) {
          const rect = widget.getRectangle();
          const page = pdfDoc.getPages().find((p) => {
            const ref = (widget.P?.() ?? null);
            return ref ? p.ref === ref : false;
          }) ?? pdfDoc.getPages()[0];
          const ratio = signatureImage.width / signatureImage.height;
          let w = rect.width;
          let h = w / ratio;
          if (h > rect.height) { h = rect.height; w = h * ratio; }
          page.drawImage(signatureImage, { x: rect.x, y: rect.y, width: w, height: h });
        }
        continue;
      }

      const type = champ.type_champ ?? 'text';
      if (type === 'checkbox') {
        const cb = form.getCheckBox(name);
        const shouldCheck = champ.option_valeur
          ? normalizeName(champ.option_valeur) === normalizeName(value)
          : TRUTHY.includes(normalizeName(value));
        if (shouldCheck) cb.check();
        else cb.uncheck();
      } else if (type === 'radio') {
        const rg = form.getRadioGroup(name);
        const opt = pickOption(rg.getOptions(), value, champ.option_valeur);
        if (opt) rg.select(opt);
      } else if (type === 'dropdown') {
        const dd = form.getDropdown(name);
        const opt = pickOption(dd.getOptions(), value, champ.option_valeur);
        if (opt) dd.select(opt);
        else if (value) dd.setOptions([...dd.getOptions(), value]), dd.select(value);
      } else if (type === 'optionlist') {
        const ol = form.getOptionList(name);
        const opt = pickOption(ol.getOptions(), value, champ.option_valeur);
        if (opt) ol.select(opt);
      } else {
        if (!value) continue;
        const tf = form.getTextField(name);
        tf.setText(value);
      }
    } catch {
      // champ absent ou de type inattendu : on ignore
    }
  }

  try {
    form.updateFieldAppearances(font);
  } catch { /* noop */ }

  if (flatten) {
    try { form.flatten(); } catch { /* noop */ }
  }

  await appendAnnexe(pdfDoc, annexeBytes);

  return pdfDoc.save();
}

/* -------------------------------------------------------------------------- */
/*            Remplissage AcroForm par NOM DE CHAMP (valeurs IA)               */
/* -------------------------------------------------------------------------- */

export interface FillByNameOptions {
  templateBytes: ArrayBuffer | Uint8Array;
  annexeBytes?: ArrayBuffer | Uint8Array | null;
  /** { nomDuChampPdf: valeur } tel que renvoyé par le moteur IA */
  valuesByName: Record<string, string>;
  /** champs mappés — utilisés uniquement pour placer la signature */
  champs?: FormulaireChamp[];
  signatureDataUrl?: string | null;
  flatten?: boolean;
}

/**
 * Remplit un PDF interactif directement par nom de champ (sortie du moteur IA).
 * Le type réel du champ est détecté dans le PDF, aucune configuration requise.
 */
export async function fillAcroFormByName({
  templateBytes,
  annexeBytes,
  valuesByName,
  champs = [],
  signatureDataUrl,
  flatten = true,
}: FillByNameOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const field of form.getFields()) {
    const name = field.getName();
    const raw = valuesByName[name];
    if (raw === undefined) continue;
    const valueRaw = sanitizePdfText(String(raw ?? '')).trim();
    const value = isKeyLikeValue(valueRaw) ? '' : valueRaw;
    const ctor = field.constructor?.name ?? '';
    try {
      if (ctor.includes('CheckBox')) {
        if (TRUTHY.includes(normalizeName(value))) (field as any).check();
        else (field as any).uncheck();
      } else if (ctor.includes('RadioGroup') || ctor.includes('Dropdown') || ctor.includes('OptionList')) {
        const options: string[] = (field as any).getOptions?.() ?? [];
        const opt = pickOption(options, value);
        if (opt) (field as any).select(opt);
      } else if (ctor.includes('TextField')) {
        if (value) (field as any).setText(value);
      }
    } catch {
      // champ non remplissable : on ignore
    }
  }

  // Signature : placée sur les widgets mappés au champ "signature"
  let signatureImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (signatureDataUrl?.startsWith('data:image')) {
    try { signatureImage = await pdfDoc.embedPng(signatureDataUrl); } catch { signatureImage = null; }
  }
  if (signatureImage) {
    for (const champ of champs.filter((c) => c.cle_champ === SIGNATURE_KEY && c.nom_champ_pdf)) {
      try {
        const field = form.getField(champ.nom_champ_pdf as string);
        const widgets = (field as any).acroField?.getWidgets?.() ?? [];
        for (const widget of widgets) {
          const rect = widget.getRectangle();
          const page = pdfDoc.getPages()[0];
          const ratio = signatureImage.width / signatureImage.height;
          let w = rect.width;
          let h = w / ratio;
          if (h > rect.height) { h = rect.height; w = h * ratio; }
          page.drawImage(signatureImage, { x: rect.x, y: rect.y, width: w, height: h });
        }
      } catch { /* noop */ }
    }
  }

  try { form.updateFieldAppearances(font); } catch { /* noop */ }
  if (flatten) { try { form.flatten(); } catch { /* noop */ } }

  await appendAnnexe(pdfDoc, annexeBytes);
  return pdfDoc.save();
}
