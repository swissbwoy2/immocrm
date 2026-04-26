import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============ UTILITY FUNCTIONS ============

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x00-\x7F]/g, (char) => {
      const r: Record<string, string> = {
        'é':'e','è':'e','ê':'e','ë':'e','à':'a','â':'a','ä':'a',
        'ù':'u','û':'u','ü':'u','ô':'o','ö':'o','î':'i','ï':'i','ç':'c',
        'É':'E','È':'E','Ê':'E','Ë':'E','À':'A','Â':'A','Ä':'A',
        'Ù':'U','Û':'U','Ü':'U','Ô':'O','Ö':'O','Î':'I','Ï':'I','Ç':'C',
        '°':'o','²':'2','³':'3','€':'EUR','£':'GBP','«':'"','»':'"','•':'-','·':'-',
      };
      return r[char] || '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A';
  return `CHF ${new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}`;
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return new Intl.NumberFormat('fr-CH').format(n);
}

// ============ PDF DRAWING HELPERS ============

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const COLOR_PRIMARY = rgb(0.12, 0.25, 0.45); // Dark navy
const COLOR_ACCENT = rgb(0.18, 0.55, 0.34);  // Green accent
const COLOR_TEXT = rgb(0.15, 0.15, 0.15);
const COLOR_MUTED = rgb(0.45, 0.45, 0.45);
const COLOR_LIGHT_BG = rgb(0.95, 0.96, 0.98);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_HEADER_BG = rgb(0.12, 0.25, 0.45);
const COLOR_WARNING = rgb(0.8, 0.35, 0.1);
const COLOR_LIGHT_GREEN = rgb(0.9, 0.96, 0.92);
const COLOR_BORDER = rgb(0.82, 0.84, 0.88);

interface Fonts {
  regular: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>;
  bold: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>;
}

function drawWrappedText(
  page: any, text: string, x: number, startY: number,
  maxWidth: number, font: any, fontSize: number,
  color: any, lineHeight: number = 16
): number {
  const words = sanitizeText(text).split(' ');
  let line = '';
  let y = startY;
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && line) {
      page.drawText(line, { x, y, size: fontSize, font, color });
      y -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y, size: fontSize, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawSectionTitle(page: any, title: string, y: number, fonts: Fonts): number {
  // Draw colored bar
  page.drawRectangle({
    x: MARGIN, y: y - 2, width: CONTENT_W, height: 28,
    color: COLOR_HEADER_BG,
  });
  page.drawText(sanitizeText(title), {
    x: MARGIN + 12, y: y + 5, size: 13, font: fonts.bold, color: COLOR_WHITE,
  });
  return y - 40;
}

function drawKeyValue(page: any, label: string, value: string, x: number, y: number, fonts: Fonts, labelWidth = 180): void {
  page.drawText(sanitizeText(label), { x, y, size: 9, font: fonts.regular, color: COLOR_MUTED });
  page.drawText(sanitizeText(value), { x: x + labelWidth, y, size: 10, font: fonts.bold, color: COLOR_TEXT });
}

function drawTableRow(page: any, cells: string[], x: number, y: number, colWidths: number[], fonts: Fonts, isHeader = false, bgColor?: any): void {
  const rowH = 20;
  if (bgColor) {
    page.drawRectangle({ x, y: y - rowH + 5, width: colWidths.reduce((a, b) => a + b, 0), height: rowH, color: bgColor });
  }
  let cx = x;
  cells.forEach((cell, i) => {
    page.drawText(sanitizeText(cell), {
      x: cx + 4, y: y - 10, size: isHeader ? 8 : 9,
      font: isHeader ? fonts.bold : fonts.regular,
      color: isHeader ? COLOR_WHITE : COLOR_TEXT,
    });
    cx += colWidths[i];
  });
}

function addPageHeader(page: any, fonts: Fonts, title: string): void {
  // Top bar
  page.drawRectangle({ x: 0, y: PAGE_H - 40, width: PAGE_W, height: 40, color: COLOR_HEADER_BG });
  page.drawText('IMMO-RAMA', { x: MARGIN, y: PAGE_H - 28, size: 14, font: fonts.bold, color: COLOR_WHITE });
  page.drawText(sanitizeText(title), { x: PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(sanitizeText(title), 9) - 10, y: PAGE_H - 26, size: 9, font: fonts.regular, color: rgb(0.7, 0.8, 0.9) });
}

function addPageFooter(page: any, fonts: Fonts, pageNum: number, totalPages: number, address: string): void {
  // Footer line
  page.drawRectangle({ x: MARGIN, y: 42, width: CONTENT_W, height: 0.5, color: COLOR_BORDER });
  page.drawText(sanitizeText(`Immo-Rama - Rapport d'estimation - ${address}`), {
    x: MARGIN, y: 28, size: 7, font: fonts.regular, color: COLOR_MUTED,
  });
  page.drawText(`${pageNum} / ${totalPages}`, {
    x: PAGE_W - MARGIN - 30, y: 28, size: 7, font: fonts.regular, color: COLOR_MUTED,
  });
}

async function embedImageFromUrl(pdfDoc: any, url: string): Promise<any | null> {
  try {
    console.log('Fetching image:', url.substring(0, 80) + '...');
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status);
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('png') || url.toLowerCase().endsWith('.png')) {
      return await pdfDoc.embedPng(bytes);
    } else {
      return await pdfDoc.embedJpg(bytes);
    }
  } catch (err) {
    console.error('Error embedding image:', err);
    return null;
  }
}

function drawImageFit(page: any, image: any, x: number, y: number, maxW: number, maxH: number): void {
  if (!image) return;
  const imgW = image.width;
  const imgH = image.height;
  const scale = Math.min(maxW / imgW, maxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  // Center horizontally
  const offsetX = (maxW - w) / 2;
  page.drawImage(image, { x: x + offsetX, y: y - h, width: w, height: h });
}

// ============ MAIN HANDLER ============

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { immeuble_id } = await req.json();

    if (!immeuble_id) {
      return new Response(
        JSON.stringify({ error: 'immeuble_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating estimation report PDF for immeuble:', immeuble_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch immeuble with all fields
    const { data: immeuble, error: immeubleError } = await supabase
      .from('immeubles')
      .select('*')
      .eq('id', immeuble_id)
      .single();

    if (immeubleError || !immeuble) {
      console.error('Error fetching immeuble:', immeubleError);
      return new Response(
        JSON.stringify({ error: 'Immeuble not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch agent profile if available
    let agentProfile: any = null;
    if (immeuble.agent_responsable_id) {
      const { data: agent } = await supabase
        .from('agents')
        .select('user_id')
        .eq('id', immeuble.agent_responsable_id)
        .single();
      if (agent?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', agent.user_id)
          .single();
        agentProfile = profile;
      }
    }

    // Pre-load images from rapport_estimation_images
    const images: Record<string, any> = {};
    const imgMap = (immeuble.rapport_estimation_images || {}) as Record<string, string>;
    
    const imageKeys = Object.keys(imgMap);
    console.log(`Loading ${imageKeys.length} images...`);
    
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fonts: Fonts = { regular: helvetica, bold: helveticaBold };

    // Load images in parallel (limit to prevent memory issues)
    for (const key of imageKeys) {
      if (imgMap[key]) {
        const img = await embedImageFromUrl(pdfDoc, imgMap[key]);
        if (img) images[key] = img;
      }
    }
    console.log(`Loaded ${Object.keys(images).length} images successfully`);

    const fullAddress = `${immeuble.adresse || ''}, ${immeuble.code_postal || ''} ${immeuble.ville || ''}`;
    const shortAddress = sanitizeText(fullAddress);

    // Track pages for footer numbering
    const allPages: any[] = [];
    
    function newPage(): any {
      const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
      allPages.push(p);
      return p;
    }

    // ========================
    // PAGE 1: COUVERTURE
    // ========================
    let page = newPage();
    let y = PAGE_H;

    // Full-page cover background
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: COLOR_HEADER_BG });

    // Cover image if available
    if (images['cover']) {
      // Draw image as background, slightly transparent effect via overlay
      drawImageFit(page, images['cover'], 0, PAGE_H, PAGE_W, PAGE_H);
      // Dark overlay for text readability
      page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.05, 0.1, 0.2), opacity: 0.6 });
    }

    // Logo area
    y = PAGE_H - 60;
    page.drawText('IMMO-RAMA', { x: MARGIN, y, size: 28, font: helveticaBold, color: COLOR_WHITE });
    y -= 18;
    page.drawText('Expert immobilier', { x: MARGIN, y, size: 11, font: helvetica, color: rgb(0.7, 0.8, 0.9) });

    // Title block
    y = PAGE_H / 2 + 60;
    page.drawText("RAPPORT D'ESTIMATION", { x: MARGIN, y, size: 32, font: helveticaBold, color: COLOR_WHITE });
    y -= 45;

    // Property info
    page.drawText(sanitizeText(immeuble.type_bien || 'Bien immobilier'), { x: MARGIN, y, size: 16, font: helvetica, color: rgb(0.7, 0.8, 0.9) });
    y -= 28;
    page.drawText(shortAddress, { x: MARGIN, y, size: 18, font: helveticaBold, color: COLOR_WHITE });
    y -= 25;

    // Date
    const estDate = immeuble.estimation_date
      ? new Date(immeuble.estimation_date).toLocaleDateString('fr-CH')
      : new Date().toLocaleDateString('fr-CH');
    page.drawText(sanitizeText(`Date: ${estDate}`), { x: MARGIN, y, size: 11, font: helvetica, color: rgb(0.7, 0.8, 0.9) });

    // Agent info at bottom
    y = 120;
    if (agentProfile) {
      page.drawText(sanitizeText(`${agentProfile.prenom || ''} ${agentProfile.nom || ''}`), { x: MARGIN, y, size: 12, font: helveticaBold, color: COLOR_WHITE });
      y -= 16;
      if (agentProfile.telephone) {
        page.drawText(sanitizeText(agentProfile.telephone), { x: MARGIN, y, size: 10, font: helvetica, color: rgb(0.7, 0.8, 0.9) });
        y -= 14;
      }
      if (agentProfile.email) {
        page.drawText(sanitizeText(agentProfile.email), { x: MARGIN, y, size: 10, font: helvetica, color: rgb(0.7, 0.8, 0.9) });
      }
    }

    // ========================
    // PAGE 2: CARTE DE LOCALISATION
    // ========================
    if (images['map_localisation']) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'LOCALISATION', y, fonts);
      y -= 10;
      
      page.drawText(shortAddress, { x: MARGIN, y, size: 12, font: helveticaBold, color: COLOR_TEXT });
      y -= 30;
      
      drawImageFit(page, images['map_localisation'], MARGIN, y, CONTENT_W, 500);
    }

    // ========================
    // PAGE 3: RESUME
    // ========================
    page = newPage();
    addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
    y = PAGE_H - 70;
    y = drawSectionTitle(page, 'RESUME', y, fonts);
    y -= 10;

    // Main estimation box
    page.drawRectangle({ x: MARGIN, y: y - 90, width: CONTENT_W, height: 90, color: COLOR_LIGHT_BG, borderColor: COLOR_PRIMARY, borderWidth: 1.5 });
    
    page.drawText('VALEUR VENALE ESTIMEE', { x: MARGIN + 15, y: y - 20, size: 10, font: helvetica, color: COLOR_MUTED });
    const mainVal = formatCurrency(immeuble.estimation_valeur_recommandee);
    page.drawText(sanitizeText(mainVal), { x: MARGIN + 15, y: y - 50, size: 30, font: helveticaBold, color: COLOR_PRIMARY });
    
    const lowVal = formatCurrency(immeuble.estimation_valeur_basse);
    const highVal = formatCurrency(immeuble.estimation_valeur_haute);
    page.drawText(sanitizeText(`Fourchette: ${lowVal} - ${highVal}`), { x: MARGIN + 15, y: y - 75, size: 10, font: helvetica, color: COLOR_MUTED });
    
    // Price per m2 on right side
    if (immeuble.estimation_prix_m2) {
      const pxm2 = sanitizeText(`${formatNumber(immeuble.estimation_prix_m2)} CHF/m2`);
      const w = helveticaBold.widthOfTextAtSize(pxm2, 14);
      page.drawText(pxm2, { x: PAGE_W - MARGIN - w - 15, y: y - 50, size: 14, font: helveticaBold, color: COLOR_ACCENT });
    }

    y -= 110;

    // Property details grid
    y = drawSectionTitle(page, 'DETAILS DU BIEN', y, fonts);
    y -= 5;

    const detailPairs = [
      ['Type de bien', immeuble.type_bien || '-'],
      ['Nombre de pieces', immeuble.nombre_pieces?.toString() || '-'],
      ['Surface habitable', immeuble.surface_totale ? `${immeuble.surface_totale} m2` : '-'],
      ['Salles de bain', immeuble.nb_salles_eau?.toString() || '-'],
      ['Balcon', immeuble.surface_balcon ? `${immeuble.surface_balcon} m2` : '-'],
      ['Volume', immeuble.volume_batiment ? `${immeuble.volume_batiment} m3` : '-'],
      ['Parking', `${(immeuble.nb_garages || 0) + (immeuble.nb_places_int || 0) + (immeuble.nb_places_ext || 0)} place(s)` ],
      ['Terrasse', immeuble.surface_terrasse ? `${immeuble.surface_terrasse} m2` : '-'],
      ['Construction', immeuble.annee_construction?.toString() || '-'],
      ['Renovation', immeuble.annee_renovation?.toString() || '-'],
    ];

    const colW = CONTENT_W / 2;
    detailPairs.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const dx = MARGIN + col * colW;
      const dy = y - row * 22;
      
      if (row % 2 === 0) {
        page.drawRectangle({ x: MARGIN, y: dy - 8, width: CONTENT_W, height: 22, color: COLOR_LIGHT_BG });
      }
      
      page.drawText(sanitizeText(label), { x: dx + 5, y: dy - 2, size: 9, font: helvetica, color: COLOR_MUTED });
      page.drawText(sanitizeText(value), { x: dx + 130, y: dy - 2, size: 10, font: helveticaBold, color: COLOR_TEXT });
    });

    y -= Math.ceil(detailPairs.length / 2) * 22 + 20;

    // Etat du bien
    if (immeuble.etat_bien) {
      const etatData = typeof immeuble.etat_bien === 'string' ? {} : (immeuble.etat_bien as Record<string, any>);
      const etatEntries = Object.entries(etatData);
      if (etatEntries.length > 0) {
        y = drawSectionTitle(page, 'ETAT DU BIEN', y, fonts);
        y -= 5;
        etatEntries.forEach(([key, val], i) => {
          if (y < 80) return; // Page overflow protection
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          drawKeyValue(page, label, String(val || '-'), MARGIN + 5, y, fonts, 160);
          y -= 18;
        });
        y -= 10;
      }
    }

    // ========================
    // PAGES 4-6: MARCHE
    // ========================
    const hasMarket = immeuble.prix_median_secteur || immeuble.evolution_prix_median_1an || 
                      immeuble.nb_biens_comparables || immeuble.prix_m2_secteur || images['map_marche'];
    
    if (hasMarket) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'ANALYSE DU MARCHE', y, fonts);
      y -= 10;

      // Key market metrics in boxes
      const marketMetrics = [
        { label: 'Prix median du secteur', value: formatCurrency(immeuble.prix_median_secteur) },
        { label: 'Prix au m2 secteur', value: immeuble.prix_m2_secteur ? `${formatNumber(immeuble.prix_m2_secteur)} CHF/m2` : '-' },
        { label: 'Evolution 1 an', value: immeuble.evolution_prix_median_1an ? `${immeuble.evolution_prix_median_1an > 0 ? '+' : ''}${immeuble.evolution_prix_median_1an}%` : '-' },
        { label: 'Biens comparables', value: immeuble.nb_biens_comparables?.toString() || '-' },
      ];

      const boxW = (CONTENT_W - 30) / 2;
      const boxH = 55;
      marketMetrics.forEach((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = MARGIN + col * (boxW + 10);
        const by = y - row * (boxH + 10);
        
        page.drawRectangle({ x: bx, y: by - boxH, width: boxW, height: boxH, color: COLOR_LIGHT_BG, borderColor: COLOR_BORDER, borderWidth: 0.5 });
        page.drawText(sanitizeText(m.label), { x: bx + 10, y: by - 18, size: 9, font: helvetica, color: COLOR_MUTED });
        page.drawText(sanitizeText(m.value), { x: bx + 10, y: by - 38, size: 16, font: helveticaBold, color: COLOR_PRIMARY });
      });

      y -= 2 * (boxH + 10) + 20;

      // Additional market info
      if (immeuble.nb_nouvelles_annonces) {
        drawKeyValue(page, 'Nouvelles annonces', immeuble.nb_nouvelles_annonces.toString(), MARGIN + 5, y, fonts);
        y -= 20;
      }
      if (immeuble.tendance_marche) {
        drawKeyValue(page, 'Tendance du marche', immeuble.tendance_marche, MARGIN + 5, y, fonts);
        y -= 20;
      }
      if (immeuble.duree_publication_moyenne) {
        drawKeyValue(page, 'Duree publication moyenne', `${immeuble.duree_publication_moyenne} jours`, MARGIN + 5, y, fonts);
        y -= 20;
      }

      // Market heat map
      if (images['map_marche']) {
        y -= 10;
        page.drawText('Carte de chaleur des prix', { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
        y -= 10;
        const imgMaxH = Math.min(y - 60, 280);
        drawImageFit(page, images['map_marche'], MARGIN, y, CONTENT_W, imgMaxH);
        y -= imgMaxH + 10;
      }

      // Distribution graph on new page if available
      if (images['graph_distribution'] || immeuble.donnees_distribution_prix) {
        page = newPage();
        addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
        y = PAGE_H - 70;
        y = drawSectionTitle(page, 'DISTRIBUTION DES PRIX', y, fonts);
        y -= 15;

        if (images['graph_distribution']) {
          drawImageFit(page, images['graph_distribution'], MARGIN, y, CONTENT_W, 350);
          y -= 360;
        }

        // Distribution data table if available
        if (immeuble.donnees_distribution_prix && Array.isArray(immeuble.donnees_distribution_prix)) {
          y -= 10;
          page.drawText('Repartition par tranche de prix', { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
          y -= 25;
          
          const distColW = [CONTENT_W * 0.5, CONTENT_W * 0.25, CONTENT_W * 0.25];
          drawTableRow(page, ['Tranche de prix', 'Nombre', 'Part'], MARGIN, y, distColW, fonts, true, COLOR_HEADER_BG);
          y -= 22;

          (immeuble.donnees_distribution_prix as any[]).forEach((item: any, i: number) => {
            if (y < 80) return;
            const bg = i % 2 === 0 ? COLOR_LIGHT_BG : undefined;
            drawTableRow(page, [
              item.tranche || item.label || '-',
              (item.nombre || item.count || 0).toString(),
              item.pourcentage ? `${item.pourcentage}%` : '-',
            ], MARGIN, y, distColW, fonts, false, bg);
            y -= 20;
          });
        }
      }
    }

    // ========================
    // PAGES 7-8: BATIMENT
    // ========================
    const hasBuilding = immeuble.egid || immeuble.categorie_ofs || immeuble.classification_ofs || 
                        immeuble.logements_details || images['map_batiment'];
    
    if (hasBuilding) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'BATIMENT', y, fonts);
      y -= 10;

      const buildingInfo = [
        ['EGID', immeuble.egid || '-'],
        ['EGAID', immeuble.egaid || '-'],
        ['Numero officiel', immeuble.numero_officiel_batiment || '-'],
        ['Categorie OFS', immeuble.categorie_ofs || '-'],
        ['Classification OFS', immeuble.classification_ofs || '-'],
        ['Classification', immeuble.classification_batiment || '-'],
        ['Nb etages', immeuble.nb_etages_batiment?.toString() || '-'],
        ['Nb logements', immeuble.nb_logements?.toString() || '-'],
        ['Emprise au sol', immeuble.emprise_sol_m2 ? `${immeuble.emprise_sol_m2} m2` : '-'],
        ['Surface logement totale', immeuble.surface_logement_totale ? `${immeuble.surface_logement_totale} m2` : '-'],
      ];

      buildingInfo.forEach(([label, value], i) => {
        if (i % 2 === 0) {
          page.drawRectangle({ x: MARGIN, y: y - 8, width: CONTENT_W, height: 20, color: COLOR_LIGHT_BG });
        }
        drawKeyValue(page, label, value, MARGIN + 5, y, fonts, 170);
        y -= 20;
      });
      y -= 10;

      // Building map
      if (images['map_batiment']) {
        page.drawText('Carte du batiment', { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
        y -= 10;
        const imgH = Math.min(y - 60, 280);
        drawImageFit(page, images['map_batiment'], MARGIN, y, CONTENT_W, imgH);
        y -= imgH + 10;
      }

      // Logements details table
      if (immeuble.logements_details && Array.isArray(immeuble.logements_details) && (immeuble.logements_details as any[]).length > 0) {
        // New page for logements table if needed
        if (y < 300) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }

        y = drawSectionTitle(page, 'DETAILS DES LOGEMENTS', y, fonts);
        y -= 10;

        const logColW = [60, 60, 70, 80, 60, 60, CONTENT_W - 390];
        drawTableRow(page, ['ID', 'Etage', 'Type', 'Surface', 'Pieces', 'SDB', 'Construction'], MARGIN, y, logColW, fonts, true, COLOR_HEADER_BG);
        y -= 22;

        (immeuble.logements_details as any[]).forEach((log: any, i: number) => {
          if (y < 80) return;
          const bg = i % 2 === 0 ? COLOR_LIGHT_BG : undefined;
          drawTableRow(page, [
            log.id || '-',
            log.etage || '-',
            log.type || '-',
            log.surface ? `${log.surface} m2` : '-',
            log.pieces?.toString() || '-',
            log.sdb?.toString() || '-',
            log.annee_construction || '-',
          ], MARGIN, y, logColW, fonts, false, bg);
          y -= 20;
        });
      }
    }

    // ========================
    // PAGES 9-10: PARCELLE
    // ========================
    const hasParcelle = immeuble.numero_parcelle || immeuble.surface_parcelle || immeuble.egrid || images['map_parcelle'];
    
    if (hasParcelle) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'PARCELLE', y, fonts);
      y -= 10;

      const parcelleInfo = [
        ['Numero de parcelle', immeuble.numero_parcelle || '-'],
        ['EGRID', immeuble.egrid || '-'],
        ['Surface parcelle', immeuble.surface_parcelle ? `${formatNumber(immeuble.surface_parcelle)} m2` : '-'],
        ['Type de parcelle', immeuble.type_parcelle || '-'],
        ['Zone d\'affectation', immeuble.zone_affectation || '-'],
        ['Plan d\'affectation', immeuble.plan_affectation_type || '-'],
        ['Nom du plan', immeuble.plan_affectation_nom || '-'],
        ['Zone de construction', immeuble.zone_construction || '-'],
        ['Commune RF', immeuble.commune_rf || '-'],
        ['No RF', immeuble.no_rf_base || '-'],
      ];

      parcelleInfo.forEach(([label, value], i) => {
        if (i % 2 === 0) {
          page.drawRectangle({ x: MARGIN, y: y - 8, width: CONTENT_W, height: 20, color: COLOR_LIGHT_BG });
        }
        drawKeyValue(page, label, value, MARGIN + 5, y, fonts, 170);
        y -= 20;
      });
      y -= 10;

      // Restrictions
      if (immeuble.restrictions_parcelle) {
        const restrictions = immeuble.restrictions_parcelle as any;
        if (restrictions.affectant && Array.isArray(restrictions.affectant) && restrictions.affectant.length > 0) {
          page.drawText('Restrictions affectantes:', { x: MARGIN + 5, y, size: 10, font: helveticaBold, color: COLOR_WARNING });
          y -= 16;
          restrictions.affectant.forEach((r: string) => {
            if (y < 80) return;
            page.drawText(sanitizeText(`  - ${r}`), { x: MARGIN + 10, y, size: 9, font: helvetica, color: COLOR_TEXT });
            y -= 14;
          });
          y -= 8;
        }
        if (restrictions.non_affectant && Array.isArray(restrictions.non_affectant) && restrictions.non_affectant.length > 0) {
          page.drawText('Restrictions non affectantes:', { x: MARGIN + 5, y, size: 10, font: helveticaBold, color: COLOR_MUTED });
          y -= 16;
          restrictions.non_affectant.forEach((r: string) => {
            if (y < 80) return;
            page.drawText(sanitizeText(`  - ${r}`), { x: MARGIN + 10, y, size: 9, font: helvetica, color: COLOR_TEXT });
            y -= 14;
          });
          y -= 8;
        }
      }

      // Parcelle map
      if (images['map_parcelle']) {
        if (y < 300) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }
        page.drawText('Carte de la parcelle', { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
        y -= 10;
        const imgH = Math.min(y - 60, 350);
        drawImageFit(page, images['map_parcelle'], MARGIN, y, CONTENT_W, imgH);
      }
    }

    // ========================
    // PAGES 11-12: ENERGIE
    // ========================
    const hasEnergie = immeuble.source_energie_chauffage || immeuble.systeme_chauffage_principal || 
                       immeuble.potentiel_solaire || images['map_energie'];
    
    if (hasEnergie) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'ENERGIE', y, fonts);
      y -= 10;

      // Basic energy info
      const energyBasic = [
        ['Source energie chauffage', immeuble.source_energie_chauffage || '-'],
        ['Classe energetique', immeuble.classe_energetique || '-'],
        ['Indice energetique', immeuble.indice_energetique ? `${immeuble.indice_energetique} kWh/m2` : '-'],
        ['Installation solaire', immeuble.installation_solaire_actuelle || '-'],
      ];

      energyBasic.forEach(([label, value], i) => {
        if (i % 2 === 0) {
          page.drawRectangle({ x: MARGIN, y: y - 8, width: CONTENT_W, height: 20, color: COLOR_LIGHT_BG });
        }
        drawKeyValue(page, label, value, MARGIN + 5, y, fonts, 180);
        y -= 20;
      });
      y -= 15;

      // Heating systems
      const systems = [
        { label: 'Chauffage principal', data: immeuble.systeme_chauffage_principal },
        { label: 'Eau chaude', data: immeuble.systeme_eau_chaude },
        { label: 'Chauffage supplementaire', data: immeuble.systeme_chauffage_supplementaire },
        { label: 'Eau chaude supplementaire', data: immeuble.systeme_eau_chaude_supplementaire },
      ];

      systems.forEach(({ label, data }) => {
        if (!data) return;
        const sys = data as any;
        if (y < 120) return;
        
        page.drawText(sanitizeText(label), { x: MARGIN + 5, y, size: 10, font: helveticaBold, color: COLOR_PRIMARY });
        y -= 16;
        if (sys.generateur) { drawKeyValue(page, 'Generateur', sys.generateur, MARGIN + 15, y, fonts, 120); y -= 16; }
        if (sys.source) { drawKeyValue(page, 'Source', sys.source, MARGIN + 15, y, fonts, 120); y -= 16; }
        if (sys.date_info) { drawKeyValue(page, 'Date info', sys.date_info, MARGIN + 15, y, fonts, 120); y -= 16; }
        y -= 8;
      });

      // Solar potential
      if (immeuble.potentiel_solaire) {
        const solar = immeuble.potentiel_solaire as any;
        if (y < 200) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }

        y = drawSectionTitle(page, 'POTENTIEL SOLAIRE', y, fonts);
        y -= 10;

        const solarInfo = [
          ['Aptitude', solar.aptitude || '-'],
          ['Exposition', solar.exposition_kwh_m2 ? `${formatNumber(solar.exposition_kwh_m2)} kWh/m2` : '-'],
          ['Surface de toits', solar.surface_toits_m2 ? `${formatNumber(solar.surface_toits_m2)} m2` : '-'],
          ['Exposition globale', solar.exposition_globale_kwh ? `${formatNumber(solar.exposition_globale_kwh)} kWh` : '-'],
          ['Rendement electrique', solar.rendement_electrique_kwh ? `${formatNumber(solar.rendement_electrique_kwh)} kWh` : '-'],
          ['Rendement thermique', solar.rendement_thermique_kwh ? `${formatNumber(solar.rendement_thermique_kwh)} kWh` : '-'],
        ];

        solarInfo.forEach(([label, value], i) => {
          if (i % 2 === 0) {
            page.drawRectangle({ x: MARGIN, y: y - 8, width: CONTENT_W, height: 20, color: COLOR_LIGHT_BG });
          }
          drawKeyValue(page, label, value, MARGIN + 5, y, fonts, 170);
          y -= 20;
        });
      }

      // Energy map
      if (images['map_energie']) {
        if (y < 300) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }
        page.drawText('Carte energetique', { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
        y -= 10;
        const imgH = Math.min(y - 60, 350);
        drawImageFit(page, images['map_energie'], MARGIN, y, CONTENT_W, imgH);
      }
    }

    // ========================
    // PAGES 13-14: COMMODITES
    // ========================
    const hasCommodites = immeuble.commodites_scores || immeuble.commodites_details || images['map_commodites'];
    
    if (hasCommodites) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'COMMODITES', y, fonts);
      y -= 10;

      // Scores grid
      if (immeuble.commodites_scores) {
        const scores = immeuble.commodites_scores as any;
        const scoreItems = [
          { label: 'Shopping', score: scores.shopping },
          { label: 'Alimentation', score: scores.alimentation },
          { label: 'Culture & Loisirs', score: scores.culture_loisirs },
          { label: 'Restaurants & Bars', score: scores.restaurants_bars },
          { label: 'Education', score: scores.education },
          { label: 'Bien-etre', score: scores.bien_etre },
          { label: 'Sante', score: scores.sante },
          { label: 'Transport', score: scores.transport },
          { label: 'Commodites de base', score: scores.commodites_base },
        ].filter(s => s.score != null);

        const scoreBoxW = (CONTENT_W - 20) / 3;
        const scoreBoxH = 50;
        scoreItems.forEach((s, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const bx = MARGIN + col * (scoreBoxW + 5);
          const by = y - row * (scoreBoxH + 8);

          page.drawRectangle({ x: bx, y: by - scoreBoxH, width: scoreBoxW, height: scoreBoxH, color: COLOR_LIGHT_BG, borderColor: COLOR_BORDER, borderWidth: 0.5 });
          page.drawText(sanitizeText(s.label), { x: bx + 8, y: by - 16, size: 8, font: helvetica, color: COLOR_MUTED });
          
          // Score with color coding
          const scoreColor = s.score >= 80 ? COLOR_ACCENT : s.score >= 50 ? COLOR_PRIMARY : COLOR_WARNING;
          page.drawText(`${s.score}/100`, { x: bx + 8, y: by - 36, size: 18, font: helveticaBold, color: scoreColor });

          // Simple progress bar
          const barW = scoreBoxW - 16;
          const barH = 4;
          const barY = by - scoreBoxH + 6;
          page.drawRectangle({ x: bx + 8, y: barY, width: barW, height: barH, color: COLOR_BORDER });
          page.drawRectangle({ x: bx + 8, y: barY, width: barW * (s.score / 100), height: barH, color: scoreColor });
        });

        y -= Math.ceil(scoreItems.length / 3) * (scoreBoxH + 8) + 15;
      }

      // Commodities map
      if (images['map_commodites']) {
        if (y < 300) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }
        page.drawText('Carte des commodites', { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
        y -= 10;
        const imgH = Math.min(y - 60, 320);
        drawImageFit(page, images['map_commodites'], MARGIN, y, CONTENT_W, imgH);
        y -= imgH + 10;
      }

      // Commodities details table
      if (immeuble.commodites_details && Array.isArray(immeuble.commodites_details) && (immeuble.commodites_details as any[]).length > 0) {
        if (y < 200) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }
        y = drawSectionTitle(page, 'DETAILS DES COMMODITES', y, fonts);
        y -= 10;

        const comColW = [CONTENT_W * 0.3, CONTENT_W * 0.45, CONTENT_W * 0.25];
        drawTableRow(page, ['Categorie', 'Nom', 'Distance'], MARGIN, y, comColW, fonts, true, COLOR_HEADER_BG);
        y -= 22;

        (immeuble.commodites_details as any[]).forEach((item: any, i: number) => {
          if (y < 80) return;
          const bg = i % 2 === 0 ? COLOR_LIGHT_BG : undefined;
          drawTableRow(page, [
            item.categorie || '-',
            item.nom || '-',
            item.distance_m ? `${item.distance_m} m` : '-',
          ], MARGIN, y, comColW, fonts, false, bg);
          y -= 20;
        });
      }
    }

    // ========================
    // PAGE 15: ACCESSIBILITE
    // ========================
    const hasAccess = immeuble.accessibilite_data || images['map_accessibilite_marche'] || 
                      images['map_accessibilite_velo'] || images['map_accessibilite_voiture'];
    
    if (hasAccess) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'ACCESSIBILITE', y, fonts);
      y -= 10;

      // Accessibility data table
      if (immeuble.accessibilite_data) {
        const accData = immeuble.accessibilite_data as any;
        
        const accColW = [CONTENT_W * 0.25, CONTENT_W * 0.25, CONTENT_W * 0.25, CONTENT_W * 0.25];
        
        if (accData.marche) {
          page.drawText('A pied', { x: MARGIN + 5, y, size: 11, font: helveticaBold, color: COLOR_PRIMARY });
          y -= 20;
          drawTableRow(page, ['15 min', '30 min', '45 min', ''], MARGIN, y, accColW, fonts, true, COLOR_HEADER_BG);
          y -= 22;
          drawTableRow(page, [accData.marche.temps_15min || '-', accData.marche.temps_30min || '-', accData.marche.temps_45min || '-', ''], MARGIN, y, accColW, fonts, false, COLOR_LIGHT_BG);
          y -= 28;
        }
        if (accData.velo) {
          page.drawText('A velo', { x: MARGIN + 5, y, size: 11, font: helveticaBold, color: COLOR_PRIMARY });
          y -= 20;
          drawTableRow(page, ['15 min', '30 min', '45 min', ''], MARGIN, y, accColW, fonts, true, COLOR_HEADER_BG);
          y -= 22;
          drawTableRow(page, [accData.velo.temps_15min || '-', accData.velo.temps_30min || '-', accData.velo.temps_45min || '-', ''], MARGIN, y, accColW, fonts, false, COLOR_LIGHT_BG);
          y -= 28;
        }
        if (accData.voiture) {
          page.drawText('En voiture', { x: MARGIN + 5, y, size: 11, font: helveticaBold, color: COLOR_PRIMARY });
          y -= 20;
          drawTableRow(page, ['5 min', '15 min', '30 min', ''], MARGIN, y, accColW, fonts, true, COLOR_HEADER_BG);
          y -= 22;
          drawTableRow(page, [accData.voiture.temps_5min || '-', accData.voiture.temps_15min || '-', accData.voiture.temps_30min || '-', ''], MARGIN, y, accColW, fonts, false, COLOR_LIGHT_BG);
          y -= 28;
        }
      }

      // Isochrone maps (3 maps side by side or stacked)
      const accImages = [
        { key: 'map_accessibilite_marche', label: 'Isochrone a pied' },
        { key: 'map_accessibilite_velo', label: 'Isochrone velo' },
        { key: 'map_accessibilite_voiture', label: 'Isochrone voiture' },
      ].filter(img => images[img.key]);

      if (accImages.length > 0) {
        if (y < 300) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }

        const imgW = (CONTENT_W - 20) / Math.min(accImages.length, 3);
        const imgH = 200;
        accImages.forEach((img, i) => {
          const ix = MARGIN + i * (imgW + 10);
          page.drawText(sanitizeText(img.label), { x: ix, y: y, size: 8, font: helveticaBold, color: COLOR_TEXT });
          drawImageFit(page, images[img.key], ix, y - 10, imgW - 5, imgH);
        });
      }
    }

    // ========================
    // PAGE 16: BRUIT
    // ========================
    const hasBruit = immeuble.bruit_routier_jour || immeuble.bruit_routier_nuit || 
                     immeuble.bruit_ferroviaire_jour || images['map_bruit_routier_jour'];
    
    if (hasBruit) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'BRUIT', y, fonts);
      y -= 10;

      // Noise levels table
      const bruitColW = [CONTENT_W * 0.4, CONTENT_W * 0.3, CONTENT_W * 0.3];
      drawTableRow(page, ['Type', 'Jour (dB)', 'Nuit (dB)'], MARGIN, y, bruitColW, fonts, true, COLOR_HEADER_BG);
      y -= 22;
      
      drawTableRow(page, ['Bruit routier', immeuble.bruit_routier_jour?.toString() || '-', immeuble.bruit_routier_nuit?.toString() || '-'], MARGIN, y, bruitColW, fonts, false, COLOR_LIGHT_BG);
      y -= 20;
      drawTableRow(page, ['Bruit ferroviaire', immeuble.bruit_ferroviaire_jour?.toString() || '-', immeuble.bruit_ferroviaire_nuit?.toString() || '-'], MARGIN, y, bruitColW, fonts);
      y -= 30;

      // Noise maps - 2x2 grid
      const noiseImages = [
        { key: 'map_bruit_routier_jour', label: 'Routier jour' },
        { key: 'map_bruit_routier_nuit', label: 'Routier nuit' },
        { key: 'map_bruit_ferroviaire_jour', label: 'Ferroviaire jour' },
        { key: 'map_bruit_ferroviaire_nuit', label: 'Ferroviaire nuit' },
      ].filter(n => images[n.key]);

      if (noiseImages.length > 0) {
        const nImgW = (CONTENT_W - 10) / 2;
        const nImgH = 200;
        noiseImages.forEach((n, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const nx = MARGIN + col * (nImgW + 10);
          const ny = y - row * (nImgH + 25);

          if (ny - nImgH < 60) return; // overflow protection
          page.drawText(sanitizeText(n.label), { x: nx, y: ny, size: 9, font: helveticaBold, color: COLOR_TEXT });
          drawImageFit(page, images[n.key], nx, ny - 10, nImgW, nImgH);
        });
      }
    }

    // ========================
    // PAGE 17: ENSOLEILLEMENT
    // ========================
    const hasEnsoleillement = immeuble.ensoleillement_data || images['map_ensoleillement_1'];
    
    if (hasEnsoleillement) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'ENSOLEILLEMENT', y, fonts);
      y -= 10;

      if (immeuble.ensoleillement_data) {
        const ensData = immeuble.ensoleillement_data as any;
        
        const ensColW = [CONTENT_W * 0.25, CONTENT_W * 0.25, CONTENT_W * 0.25, CONTENT_W * 0.25];
        drawTableRow(page, ['Periode', 'Lever', 'Duree', 'Coucher'], MARGIN, y, ensColW, fonts, true, COLOR_HEADER_BG);
        y -= 22;
        
        const periods = [
          { label: "Aujourd'hui", data: ensData.aujourd_hui },
          { label: 'Hiver (solstice)', data: ensData.hiver },
          { label: 'Ete (solstice)', data: ensData.ete },
        ];

        periods.forEach((p, i) => {
          if (!p.data) return;
          const bg = i % 2 === 0 ? COLOR_LIGHT_BG : undefined;
          drawTableRow(page, [
            p.label,
            p.data.lever || '-',
            p.data.duree || '-',
            p.data.coucher || '-',
          ], MARGIN, y, ensColW, fonts, false, bg);
          y -= 20;
        });
        y -= 15;
      }

      // Sunshine maps - 3 across
      const sunImages = [
        { key: 'map_ensoleillement_1', label: "Aujourd'hui" },
        { key: 'map_ensoleillement_2', label: 'Hiver' },
        { key: 'map_ensoleillement_3', label: 'Ete' },
      ].filter(s => images[s.key]);

      if (sunImages.length > 0) {
        const sImgW = (CONTENT_W - 20) / Math.min(sunImages.length, 3);
        const sImgH = Math.min(y - 80, 250);
        sunImages.forEach((s, i) => {
          const sx = MARGIN + i * (sImgW + 10);
          page.drawText(sanitizeText(s.label), { x: sx, y, size: 9, font: helveticaBold, color: COLOR_TEXT });
          drawImageFit(page, images[s.key], sx, y - 12, sImgW - 5, sImgH);
        });
      }
    }

    // ========================
    // PAGES 18-23: PERMIS DE CONSTRUIRE
    // ========================
    const hasPermis = (immeuble.permis_construire && Array.isArray(immeuble.permis_construire) && (immeuble.permis_construire as any[]).length > 0) || images['map_permis'];
    
    if (hasPermis) {
      page = newPage();
      addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
      y = PAGE_H - 70;
      y = drawSectionTitle(page, 'PERMIS DE CONSTRUIRE', y, fonts);
      y -= 10;

      // Permits map
      if (images['map_permis']) {
        page.drawText('Carte des permis de construire', { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
        y -= 10;
        const imgH = Math.min(280, y - 200);
        drawImageFit(page, images['map_permis'], MARGIN, y, CONTENT_W, imgH);
        y -= imgH + 20;
      }

      // Permits table
      if (immeuble.permis_construire && Array.isArray(immeuble.permis_construire)) {
        const permits = immeuble.permis_construire as any[];
        
        if (y < 200) {
          page = newPage();
          addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
          y = PAGE_H - 70;
        }

        page.drawText(sanitizeText(`${permits.length} permis de construire trouves`), { x: MARGIN, y, size: 11, font: helveticaBold, color: COLOR_TEXT });
        y -= 25;

        permits.forEach((permit: any, i: number) => {
          // Check if we need a new page
          if (y < 160) {
            page = newPage();
            addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
            y = PAGE_H - 70;
            y = drawSectionTitle(page, `PERMIS DE CONSTRUIRE (suite)`, y, fonts);
            y -= 10;
          }

          // Permit card
          page.drawRectangle({ x: MARGIN, y: y - 95, width: CONTENT_W, height: 95, color: COLOR_LIGHT_BG, borderColor: COLOR_BORDER, borderWidth: 0.5 });
          
          // Reference
          page.drawText(sanitizeText(permit.reference || `Permis #${i + 1}`), { x: MARGIN + 10, y: y - 14, size: 10, font: helveticaBold, color: COLOR_PRIMARY });
          
          // Status badge
          const statut = sanitizeText(permit.statut || '-');
          const statusW = fonts.regular.widthOfTextAtSize(statut, 8) + 12;
          page.drawRectangle({ x: PAGE_W - MARGIN - statusW - 10, y: y - 20, width: statusW, height: 16, color: COLOR_ACCENT });
          page.drawText(statut, { x: PAGE_W - MARGIN - statusW - 4, y: y - 14, size: 8, font: fonts.bold, color: COLOR_WHITE });

          // Details
          if (permit.description) {
            drawWrappedText(page, permit.description, MARGIN + 10, y - 30, CONTENT_W - 20, helvetica, 8, COLOR_TEXT, 12);
          }
          
          drawKeyValue(page, 'Nature des travaux', permit.nature_travaux || '-', MARGIN + 10, y - 55, fonts, 130);
          drawKeyValue(page, 'Architecte', permit.architecte || '-', MARGIN + 10, y - 70, fonts, 130);
          drawKeyValue(page, 'Date', permit.date || '-', MARGIN + 10, y - 85, fonts, 130);

          y -= 110;
        });
      }
    }

    // ========================
    // PROJECTION FINANCIERE
    // ========================
    page = newPage();
    addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
    y = PAGE_H - 70;
    y = drawSectionTitle(page, 'PROJECTION FINANCIERE', y, fonts);
    y -= 10;

    const salePrice = immeuble.estimation_valeur_recommandee || immeuble.prix_vente_demande || 0;
    const notaryFees = Math.round(salePrice * 0.05);
    const commissionModel = immeuble.commission_mode || 'classique';
    let agencyCommission = 0;
    let commissionLabel = '';
    if (commissionModel === 'net_vendeur' && immeuble.prix_vendeur) {
      agencyCommission = salePrice - immeuble.prix_vendeur;
      commissionLabel = 'Commission agence (Net Vendeur)';
    } else {
      agencyCommission = Math.round(salePrice * 0.03);
      commissionLabel = 'Commission agence (3%)';
    }
    const acquisitionPrice = immeuble.prix_acquisition || 0;
    const capitalGain = salePrice - acquisitionPrice - (immeuble.travaux_plus_value || 0);
    const estimatedTax = capitalGain > 0 ? Math.round(capitalGain * 0.10) : 0;
    const netRevenue = salePrice - notaryFees - agencyCommission - estimatedTax;

    // Financial table
    const finColW = [CONTENT_W * 0.65, CONTENT_W * 0.35];
    drawTableRow(page, ['Description', 'Montant CHF'], MARGIN, y, finColW, fonts, true, COLOR_HEADER_BG);
    y -= 22;

    const financialLines = [
      { label: 'Prix de vente estime', value: `+${formatNumber(salePrice)}`, positive: true },
      { label: 'Frais de notaire (5%)', value: `-${formatNumber(notaryFees)}`, positive: false },
      { label: commissionLabel, value: `-${formatNumber(agencyCommission)}`, positive: false },
      { label: 'Impot sur le gain estime*', value: `-${formatNumber(estimatedTax)}`, positive: false },
    ];

    financialLines.forEach((line, i) => {
      const bg = i % 2 === 0 ? COLOR_LIGHT_BG : undefined;
      drawTableRow(page, [line.label, line.value], MARGIN, y, finColW, fonts, false, bg);
      y -= 22;
    });

    // Net result box
    y -= 5;
    page.drawRectangle({ x: MARGIN, y: y - 30, width: CONTENT_W, height: 35, color: COLOR_LIGHT_GREEN, borderColor: COLOR_ACCENT, borderWidth: 1.5 });
    page.drawText('REVENU NET ESTIME', { x: MARGIN + 12, y: y - 20, size: 12, font: helveticaBold, color: COLOR_TEXT });
    const netText = sanitizeText(formatCurrency(netRevenue));
    const netTextW = helveticaBold.widthOfTextAtSize(netText, 16);
    page.drawText(netText, { x: PAGE_W - MARGIN - netTextW - 12, y: y - 22, size: 16, font: helveticaBold, color: COLOR_ACCENT });

    y -= 55;
    page.drawText("* L'impot sur le gain immobilier est une estimation basee sur un taux moyen.", { x: MARGIN, y, size: 8, font: helvetica, color: COLOR_MUTED });
    y -= 12;
    page.drawText("  Le montant reel depend du canton, de la duree de possession et d'autres facteurs.", { x: MARGIN, y, size: 8, font: helvetica, color: COLOR_MUTED });

    // ========================
    // DERNIERE PAGE: MENTIONS LEGALES
    // ========================
    page = newPage();
    addPageHeader(page, fonts, "RAPPORT D'ESTIMATION");
    y = PAGE_H - 70;
    y = drawSectionTitle(page, 'MENTIONS LEGALES', y, fonts);
    y -= 15;

    const disclaimer = `Ce rapport d'estimation a ete etabli par Immo-Rama sur la base des informations fournies par le proprietaire et des donnees du marche disponibles a la date d'etablissement du present document.

Cette estimation est donnee a titre indicatif et ne constitue en aucun cas une garantie de prix de vente. La valeur finale d'un bien immobilier depend de nombreux facteurs, notamment l'etat du marche au moment de la transaction, les conditions de vente, et la negociation entre les parties.

Immo-Rama decline toute responsabilite quant aux decisions prises sur la base de ce rapport. Il est recommande de consulter d'autres professionnels et de realiser les verifications necessaires avant toute transaction.

Ce document est confidentiel et destine exclusivement au proprietaire du bien. Toute reproduction ou diffusion est interdite sans autorisation prealable.`;

    y = drawWrappedText(page, disclaimer, MARGIN, y, CONTENT_W, helvetica, 10, COLOR_MUTED, 16);

    y -= 40;
    page.drawText('Immo-Rama SA', { x: MARGIN, y, size: 12, font: helveticaBold, color: COLOR_PRIMARY });
    y -= 16;
    page.drawText('www.immo-rama.ch', { x: MARGIN, y, size: 10, font: helvetica, color: COLOR_MUTED });

    // ========================
    // ADD FOOTERS TO ALL PAGES
    // ========================
    const totalPages = allPages.length;
    allPages.forEach((p, i) => {
      // Skip cover page footer
      if (i === 0) return;
      addPageFooter(p, fonts, i + 1, totalPages, shortAddress);
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = uint8ArrayToBase64(pdfBytes);
    const filename = `rapport-estimation-${sanitizeText(immeuble.nom || 'bien').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

    console.log(`Estimation report PDF generated: ${filename}, ${allPages.length} pages, ${pdfBytes.byteLength} bytes`);

    return new Response(
      JSON.stringify({ pdf_base64: pdfBase64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating estimation report PDF:', error);
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
