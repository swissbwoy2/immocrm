import { supabase } from '@/integrations/supabase/client';

export interface CandidatureDoc {
  id: string;
  candidature_id: string;
  template_code: string;
  titre: string;
  contenu_html: string;
  pdf_path: string | null;
  statut: string;
  signature_data: string | null;
  signature_lieu: string | null;
  signe_at: string | null;
}

export const SIGNABLE = ['bail_loyer', 'notification_loyer'];
export const DOC_ORDER = ['bail_loyer', 'notification_loyer', 'lettre_attribution', 'convocation_edl'];

export const A4_CSS = `
.doc{font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.45;color:#111;background:#fff;width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box;margin:0 auto}
.doc h1,.doc h2,.doc h3{font-weight:bold;margin:0.8em 0 0.4em}
.doc table{border-collapse:collapse;width:100%}
.doc td,.doc th{padding:2px 6px;vertical-align:top}
.doc .parties{margin:1em 0}
.doc .montants td{text-align:right}
.doc .montants td:first-child{text-align:left}
.doc .reference{font-size:9pt;color:#444}
.doc .signatures{margin-top:2em;page-break-inside:avoid}
.doc .page-break{page-break-before:always;break-before:page}
.doc .sig-applied{margin-top:8px}
.doc .sig-applied img{max-height:60px;display:block}
`;

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' });

/** Contenu du document avec signature apposée (sans modifier le texte en base). */
export function renderDocBody(doc: Pick<CandidatureDoc, 'contenu_html' | 'signature_data' | 'signature_lieu' | 'signe_at'>) {
  if (!doc.signature_data) return doc.contenu_html;
  const block = `<div class="sig-applied"><img src="${doc.signature_data}" alt="Signature"/><div>${doc.signature_lieu ? `${doc.signature_lieu}, ` : ''}le ${doc.signe_at ? fmtDate(doc.signe_at) : fmtDate(new Date().toISOString())}</div></div>`;
  const tmp = document.createElement('div');
  tmp.innerHTML = doc.contenu_html;
  const sig = tmp.querySelector('.signatures');
  if (sig) { sig.insertAdjacentHTML('beforeend', block); return tmp.innerHTML; }
  return doc.contenu_html + block;
}

export const wrapDoc = (body: string) => `<div class="doc">${body}</div>`;
export const fullHtml = (bodies: string[]) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#f4f4f4}${A4_CSS}@media print{body{background:#fff}.doc{margin:0}}</style></head><body>${bodies.map(wrapDoc).join('<div class="page-break"></div>')}</body></html>`;

let rulvCache: string | null = null;
export async function getRulvHtml() {
  if (rulvCache != null) return rulvCache;
  const { data } = await (supabase as any).from('document_templates').select('contenu_html').eq('code', 'rulv').maybeSingle();
  rulvCache = data?.contenu_html ?? '';
  return rulvCache;
}

/** Pages du PDF : bail = bail + notification + RULV ; autres = individuel. */
export async function pdfBodies(doc: CandidatureDoc, all: CandidatureDoc[]) {
  if (doc.template_code !== 'bail_loyer') return [renderDocBody(doc)];
  const notif = all.find((d) => d.template_code === 'notification_loyer');
  const rulv = await getRulvHtml();
  return [renderDocBody(doc), ...(notif ? [renderDocBody(notif)] : []), ...(rulv ? [rulv] : [])];
}

export async function buildPdfBlob(bodies: string[]): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default as any;
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.innerHTML = `<style>${A4_CSS}</style>${bodies.map(wrapDoc).join('')}`;
  document.body.appendChild(host);
  try {
    return await html2pdf().set({
      margin: 0, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'] },
    }).from(host).outputPdf('blob');
  } finally {
    host.remove();
  }
}

/** Génère, téléverse et renseigne pdf_path (best-effort pour la mise à jour). */
export async function generateAndStorePdf(doc: CandidatureDoc, all: CandidatureDoc[]) {
  const blob = await buildPdfBlob(await pdfBodies(doc, all));
  const path = `${doc.candidature_id}/${doc.template_code}.pdf`;
  const { error } = await supabase.storage.from('candidature-documents').upload(path, blob, { upsert: true, contentType: 'application/pdf' });
  if (!error) await (supabase as any).from('candidature_documents').update({ pdf_path: path }).eq('id', doc.id);
  return { blob, path, uploaded: !error };
}

export function downloadBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
