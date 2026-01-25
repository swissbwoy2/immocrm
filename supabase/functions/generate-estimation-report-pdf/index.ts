import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Remove newlines and carriage returns first (WinAnsi cannot encode these)
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/[^\x00-\x7F]/g, (char) => {
      const replacements: Record<string, string> = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'ô': 'o', 'ö': 'o',
        'î': 'i', 'ï': 'i',
        'ç': 'c',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'À': 'A', 'Â': 'A', 'Ä': 'A',
        'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ô': 'O', 'Ö': 'O',
        'Î': 'I', 'Ï': 'I',
        'Ç': 'C',
        '°': 'o', '²': '2', '³': '3',
        '€': 'EUR', '£': 'GBP', '¥': 'JPY',
        '«': '"', '»': '"',
        '•': '-', '·': '-',
      };
      return replacements[char] || '';
    })
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function drawWrappedText(
  page: ReturnType<typeof PDFDocument.prototype.addPage>,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  lineHeight: number = 16
): number {
  const words = sanitizeText(text).split(' ');
  let line = '';
  let y = startY;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (textWidth > maxWidth && line) {
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Fetch immeuble data with all estimation fields
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

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    const primaryColor = rgb(0.2, 0.4, 0.6);
    const textColor = rgb(0.1, 0.1, 0.1);
    const mutedColor = rgb(0.5, 0.5, 0.5);
    const accentColor = rgb(0.1, 0.6, 0.3);
    const warningColor = rgb(0.8, 0.4, 0.1);

    // ============ PAGE 1: COVER ============
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Logo/Header
    page.drawText('IMMO-RAMA', {
      x: margin,
      y: y,
      size: 32,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 20;
    page.drawText('Expert immobilier', {
      x: margin,
      y: y,
      size: 12,
      font: helvetica,
      color: mutedColor,
    });
    y -= 60;

    // Document title
    page.drawText('RAPPORT D\'ESTIMATION', {
      x: margin,
      y: y,
      size: 28,
      font: helveticaBold,
      color: textColor,
    });
    y -= 40;

    // Property name
    page.drawText(sanitizeText(immeuble.nom || 'Propriete'), {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 30;

    // Location
    const fullAddress = `${immeuble.adresse || ''}, ${immeuble.code_postal || ''} ${immeuble.ville || ''}`;
    page.drawText(sanitizeText(fullAddress), {
      x: margin,
      y: y,
      size: 14,
      font: helvetica,
      color: mutedColor,
    });
    y -= 80;

    // Main estimation box
    page.drawRectangle({
      x: margin,
      y: y - 120,
      width: contentWidth,
      height: 120,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: primaryColor,
      borderWidth: 2,
    });

    page.drawText('VALEUR VENALE ESTIMEE', {
      x: margin + 20,
      y: y - 30,
      size: 12,
      font: helvetica,
      color: mutedColor,
    });

    const mainValue = formatCurrency(immeuble.estimation_valeur_recommandee);
    page.drawText(sanitizeText(mainValue), {
      x: margin + 20,
      y: y - 70,
      size: 36,
      font: helveticaBold,
      color: primaryColor,
    });

    // Range
    const lowValue = formatCurrency(immeuble.estimation_valeur_basse);
    const highValue = formatCurrency(immeuble.estimation_valeur_haute);
    page.drawText(sanitizeText(`Fourchette: ${lowValue} - ${highValue}`), {
      x: margin + 20,
      y: y - 100,
      size: 12,
      font: helvetica,
      color: mutedColor,
    });

    y -= 160;

    // Key metrics
    const metrics = [
      { label: 'Prix / m2', value: immeuble.estimation_prix_m2 ? `${formatCurrency(immeuble.estimation_prix_m2)}/m2` : 'N/A' },
      { label: 'Surface', value: immeuble.surface_totale ? `${immeuble.surface_totale} m2` : 'N/A' },
      { label: 'Methode', value: immeuble.estimation_methode || 'Comparative' },
    ];

    const metricWidth = contentWidth / 3;
    metrics.forEach((metric, index) => {
      const metricX = margin + index * metricWidth;
      page.drawText(sanitizeText(metric.label), {
        x: metricX,
        y: y,
        size: 10,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(metric.value), {
        x: metricX,
        y: y - 18,
        size: 14,
        font: helveticaBold,
        color: textColor,
      });
    });

    y -= 80;

    // Estimation date
    const estDate = immeuble.estimation_date 
      ? new Date(immeuble.estimation_date).toLocaleDateString('fr-CH')
      : new Date().toLocaleDateString('fr-CH');
    page.drawText(sanitizeText(`Date d'estimation: ${estDate}`), {
      x: margin,
      y: y,
      size: 11,
      font: helvetica,
      color: mutedColor,
    });

    // ============ PAGE 2: PROPERTY DETAILS ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('DETAILS DU BIEN', {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 40;

    const propertyDetails = [
      { label: 'Type de bien', value: immeuble.type_bien || 'N/A' },
      { label: 'Surface habitable', value: immeuble.surface_totale ? `${immeuble.surface_totale} m2` : 'N/A' },
      { label: 'Nombre de pieces', value: immeuble.nombre_pieces?.toString() || 'N/A' },
      { label: 'Chambres', value: immeuble.nb_chambres?.toString() || 'N/A' },
      { label: 'Salles d\'eau', value: immeuble.nb_salles_eau?.toString() || 'N/A' },
      { label: 'Annee de construction', value: immeuble.annee_construction?.toString() || 'N/A' },
      { label: 'Annee de renovation', value: immeuble.annee_renovation?.toString() || 'N/A' },
      { label: 'Etage', value: immeuble.etage?.toString() || 'N/A' },
      { label: 'Chauffage', value: immeuble.type_chauffage || 'N/A' },
      { label: 'Classe energetique', value: immeuble.classe_energetique || 'N/A' },
    ];

    propertyDetails.forEach((detail, index) => {
      const isEven = index % 2 === 0;
      const detailX = isEven ? margin : margin + contentWidth / 2;
      const detailY = y - Math.floor(index / 2) * 25;

      page.drawText(sanitizeText(detail.label + ':'), {
        x: detailX,
        y: detailY,
        size: 10,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(detail.value), {
        x: detailX + 120,
        y: detailY,
        size: 11,
        font: helveticaBold,
        color: textColor,
      });
    });

    y -= Math.ceil(propertyDetails.length / 2) * 25 + 40;

    // Parking info
    page.drawText('STATIONNEMENT', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 25;

    const parkingInfo = [
      { label: 'Garages', value: immeuble.nb_garages?.toString() || '0' },
      { label: 'Places interieures', value: immeuble.nb_places_int?.toString() || '0' },
      { label: 'Places exterieures', value: immeuble.nb_places_ext?.toString() || '0' },
    ];

    parkingInfo.forEach((info, index) => {
      const infoX = margin + index * (contentWidth / 3);
      page.drawText(sanitizeText(info.label), {
        x: infoX,
        y: y,
        size: 10,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(info.value), {
        x: infoX,
        y: y - 18,
        size: 14,
        font: helveticaBold,
        color: textColor,
      });
    });

    // ============ PAGE 3: FACTORS ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('FACTEURS D\'EVALUATION', {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 40;

    // Positive factors
    page.drawText('Facteurs positifs', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: accentColor,
    });
    y -= 25;

    const positiveFactors = Array.isArray(immeuble.facteurs_positifs) 
      ? immeuble.facteurs_positifs 
      : [];

    if (positiveFactors.length > 0) {
      positiveFactors.forEach((factor: string) => {
        page.drawText(sanitizeText(`+ ${factor}`), {
          x: margin + 10,
          y: y,
          size: 11,
          font: helvetica,
          color: accentColor,
        });
        y -= 18;
      });
    } else {
      page.drawText('Aucun facteur positif renseigne', {
        x: margin + 10,
        y: y,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      y -= 18;
    }

    y -= 30;

    // Negative factors
    page.drawText('Facteurs negatifs', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: warningColor,
    });
    y -= 25;

    const negativeFactors = Array.isArray(immeuble.facteurs_negatifs) 
      ? immeuble.facteurs_negatifs 
      : [];

    if (negativeFactors.length > 0) {
      negativeFactors.forEach((factor: string) => {
        page.drawText(sanitizeText(`- ${factor}`), {
          x: margin + 10,
          y: y,
          size: 11,
          font: helvetica,
          color: warningColor,
        });
        y -= 18;
      });
    } else {
      page.drawText('Aucun facteur negatif renseigne', {
        x: margin + 10,
        y: y,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      y -= 18;
    }

    y -= 40;

    // Development potential
    if (immeuble.potentiel_developpement) {
      page.drawText('Potentiel de developpement', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 25;
      y = drawWrappedText(page, immeuble.potentiel_developpement, margin + 10, y, contentWidth - 20, helvetica, 11, textColor);
      y -= 20;
    }

    // Score sous-exploitation
    if (immeuble.score_sous_exploitation !== null && immeuble.score_sous_exploitation !== undefined) {
      page.drawText('Score de sous-exploitation', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 25;
      page.drawText(sanitizeText(`${immeuble.score_sous_exploitation}/10`), {
        x: margin + 10,
        y: y,
        size: 18,
        font: helveticaBold,
        color: immeuble.score_sous_exploitation > 5 ? accentColor : textColor,
      });
    }

    // ============ PAGE 4: STRATEGY ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('STRATEGIE DE COMMERCIALISATION', {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 40;

    if (immeuble.recommandation_commercialisation) {
      page.drawText('Recommandation', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 25;
      y = drawWrappedText(page, immeuble.recommandation_commercialisation, margin, y, contentWidth, helvetica, 11, textColor);
      y -= 30;
    }

    if (immeuble.strategie_vente) {
      page.drawText('Strategie de vente', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 25;
      y = drawWrappedText(page, immeuble.strategie_vente, margin, y, contentWidth, helvetica, 11, textColor);
      y -= 30;
    }

    if (immeuble.estimation_notes) {
      page.drawText('Notes d\'estimation', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 25;
      y = drawWrappedText(page, immeuble.estimation_notes, margin, y, contentWidth, helvetica, 11, textColor);
    }

    // ============ PAGE 5: DISCLAIMER ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('MENTIONS LEGALES', {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 40;

    const disclaimer = `Ce rapport d'estimation a ete etabli par Immo-Rama sur la base des informations fournies par le proprietaire et des donnees du marche disponibles a la date d'etablissement du present document.

Cette estimation est donnee a titre indicatif et ne constitue en aucun cas une garantie de prix de vente. La valeur finale d'un bien immobilier depend de nombreux facteurs, notamment l'etat du marche au moment de la transaction, les conditions de vente, et la negociation entre les parties.

Immo-Rama decline toute responsabilite quant aux decisions prises sur la base de ce rapport. Il est recommande de consulter d'autres professionnels et de realiser les verifications necessaires avant toute transaction.

Ce document est confidentiel et destine exclusivement au proprietaire du bien. Toute reproduction ou diffusion est interdite sans autorisation prealable.`;

    y = drawWrappedText(page, disclaimer, margin, y, contentWidth, helvetica, 11, mutedColor, 18);

    // Footer on all pages
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      p.drawText(`Immo-Rama - Rapport d'estimation - ${sanitizeText(immeuble.nom || 'Bien')}`, {
        x: margin,
        y: 30,
        size: 8,
        font: helvetica,
        color: mutedColor,
      });
      p.drawText(`Page ${index + 1} / ${pages.length}`, {
        x: pageWidth - margin - 50,
        y: 30,
        size: 8,
        font: helvetica,
        color: mutedColor,
      });
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = uint8ArrayToBase64(pdfBytes);

    const filename = `rapport-estimation-${sanitizeText(immeuble.nom || 'bien').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

    console.log('Estimation report PDF generated successfully:', filename);

    return new Response(
      JSON.stringify({ pdf_base64: pdfBase64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating estimation report PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
