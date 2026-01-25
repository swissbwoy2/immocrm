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

    console.log('Generating market analysis PDF for immeuble:', immeuble_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch immeuble data
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
    page.drawText('Analyse de marche', {
      x: margin,
      y: y,
      size: 12,
      font: helvetica,
      color: mutedColor,
    });
    y -= 60;

    // Document title
    page.drawText('ANALYSE DE MARCHE', {
      x: margin,
      y: y,
      size: 28,
      font: helveticaBold,
      color: textColor,
    });
    y -= 40;

    // Property info
    page.drawText(sanitizeText(immeuble.nom || 'Propriete'), {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 30;

    const location = `${immeuble.ville || ''}, ${immeuble.canton || ''}`;
    page.drawText(sanitizeText(location), {
      x: margin,
      y: y,
      size: 14,
      font: helvetica,
      color: mutedColor,
    });
    y -= 80;

    // Key market metrics
    page.drawRectangle({
      x: margin,
      y: y - 100,
      width: contentWidth,
      height: 100,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: primaryColor,
      borderWidth: 1,
    });

    const marketMetrics = [
      { label: 'Prix/m2 secteur', value: immeuble.prix_m2_secteur ? `${formatCurrency(immeuble.prix_m2_secteur)}/m2` : 'N/A' },
      { label: 'Duree moyenne', value: immeuble.duree_publication_moyenne ? `${immeuble.duree_publication_moyenne} jours` : 'N/A' },
      { label: 'Tendance', value: immeuble.tendance_marche || 'N/A' },
    ];

    const metricWidth = contentWidth / 3;
    marketMetrics.forEach((metric, index) => {
      const metricX = margin + index * metricWidth + 15;
      page.drawText(sanitizeText(metric.label), {
        x: metricX,
        y: y - 30,
        size: 10,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(metric.value), {
        x: metricX,
        y: y - 55,
        size: 16,
        font: helveticaBold,
        color: textColor,
      });
    });

    y -= 140;

    // Date
    page.drawText(sanitizeText(`Analyse effectuee le ${new Date().toLocaleDateString('fr-CH')}`), {
      x: margin,
      y: y,
      size: 11,
      font: helvetica,
      color: mutedColor,
    });

    // ============ PAGE 2: MARKET POSITIONING ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('POSITIONNEMENT MARCHE', {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 50;

    // Property price vs sector price
    page.drawText('Comparaison avec le secteur', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: textColor,
    });
    y -= 30;

    const propertyPriceM2 = immeuble.estimation_prix_m2 || (immeuble.prix_vente_demande && immeuble.surface_totale ? immeuble.prix_vente_demande / immeuble.surface_totale : null);
    const sectorPriceM2 = immeuble.prix_m2_secteur;

    if (propertyPriceM2 && sectorPriceM2) {
      const difference = ((propertyPriceM2 - sectorPriceM2) / sectorPriceM2 * 100).toFixed(1);
      const isAbove = parseFloat(difference) > 0;

      page.drawText('Prix du bien:', {
        x: margin,
        y: y,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(`${formatCurrency(propertyPriceM2)}/m2`), {
        x: margin + 150,
        y: y,
        size: 12,
        font: helveticaBold,
        color: textColor,
      });
      y -= 25;

      page.drawText('Prix du secteur:', {
        x: margin,
        y: y,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(`${formatCurrency(sectorPriceM2)}/m2`), {
        x: margin + 150,
        y: y,
        size: 12,
        font: helveticaBold,
        color: textColor,
      });
      y -= 25;

      page.drawText('Ecart:', {
        x: margin,
        y: y,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(`${isAbove ? '+' : ''}${difference}%`), {
        x: margin + 150,
        y: y,
        size: 14,
        font: helveticaBold,
        color: isAbove ? warningColor : accentColor,
      });
      y -= 40;

      // Visual bar representation
      const barY = y - 30;
      const barHeight = 20;
      const barMaxWidth = contentWidth;

      // Background bar
      page.drawRectangle({
        x: margin,
        y: barY,
        width: barMaxWidth,
        height: barHeight,
        color: rgb(0.9, 0.9, 0.9),
      });

      // Position indicator
      const normalizedPosition = Math.min(Math.max((propertyPriceM2 / sectorPriceM2) * 0.5, 0.1), 0.9);
      const indicatorX = margin + barMaxWidth * normalizedPosition;

      page.drawRectangle({
        x: indicatorX - 5,
        y: barY - 5,
        width: 10,
        height: barHeight + 10,
        color: primaryColor,
      });

      // Labels
      page.drawText('Moins cher', {
        x: margin,
        y: barY - 20,
        size: 9,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText('Plus cher', {
        x: margin + barMaxWidth - 50,
        y: barY - 20,
        size: 9,
        font: helvetica,
        color: mutedColor,
      });

      y = barY - 60;
    } else {
      page.drawText('Donnees insuffisantes pour la comparaison', {
        x: margin,
        y: y,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      y -= 40;
    }

    // Market trend section
    y -= 20;
    page.drawText('Tendance du marche', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: textColor,
    });
    y -= 30;

    const trendDescriptions: Record<string, string> = {
      'hausse': 'Le marche immobilier local est actuellement en hausse. Les prix augmentent et la demande depasse l\'offre. C\'est un moment favorable pour vendre.',
      'stable': 'Le marche immobilier local est stable. Les prix se maintiennent et l\'equilibre entre offre et demande est atteint. Les delais de vente sont previsibles.',
      'baisse': 'Le marche immobilier local est en baisse. Les prix diminuent et l\'offre depasse la demande. Une strategie de prix agressive peut etre necessaire.',
    };

    const trend = immeuble.tendance_marche?.toLowerCase() || 'stable';
    const trendDescription = trendDescriptions[trend] || trendDescriptions['stable'];
    
    y = drawWrappedText(page, trendDescription, margin, y, contentWidth, helvetica, 11, textColor);

    // ============ PAGE 3: TIMING ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('DELAIS ET TIMING', {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 50;

    page.drawText('Duree moyenne de publication', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: textColor,
    });
    y -= 30;

    if (immeuble.duree_publication_moyenne) {
      page.drawText(sanitizeText(`${immeuble.duree_publication_moyenne} jours`), {
        x: margin,
        y: y,
        size: 24,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 40;

      let timingAnalysis = '';
      if (immeuble.duree_publication_moyenne < 30) {
        timingAnalysis = 'Le marche local est tres dynamique avec des ventes rapides. Un prix competitif peut generer une vente en quelques semaines.';
      } else if (immeuble.duree_publication_moyenne < 90) {
        timingAnalysis = 'Le marche presente une liquidite normale. Prevoyez un delai de 1 a 3 mois pour la vente.';
      } else {
        timingAnalysis = 'Le marche local presente une liquidite plus faible. Les ventes peuvent prendre plusieurs mois. Une strategie de prix attractive est recommandee.';
      }
      
      y = drawWrappedText(page, timingAnalysis, margin, y, contentWidth, helvetica, 11, textColor);
    } else {
      page.drawText('Donnees non disponibles', {
        x: margin,
        y: y,
        size: 14,
        font: helvetica,
        color: mutedColor,
      });
    }

    y -= 60;

    // Recommendations
    page.drawText('RECOMMANDATIONS', {
      x: margin,
      y: y,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 30;

    const recommendations = [
      'Preparez un dossier de vente complet avec tous les documents techniques.',
      'Investissez dans des photos professionnelles de qualite.',
      'Fixez un prix conforme au marche pour eviter les delais prolonges.',
      'Restez flexible sur les visites et les negociations.',
    ];

    recommendations.forEach((rec, index) => {
      page.drawText(sanitizeText(`${index + 1}. ${rec}`), {
        x: margin,
        y: y,
        size: 11,
        font: helvetica,
        color: textColor,
      });
      y -= 20;
    });

    // ============ PAGE 4: DISCLAIMER ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('METHODOLOGIE ET SOURCES', {
      x: margin,
      y: y,
      size: 20,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 40;

    const methodology = `Cette analyse de marche a ete realisee par Immo-Rama en utilisant les donnees suivantes:

- Prix de transactions recentes dans le secteur
- Annonces immobilieres actives sur les principaux portails
- Statistiques officielles (OFS, offices cantonaux)
- Base de donnees interne Immo-Rama

Les chiffres presentes sont des moyennes et peuvent varier selon les caracteristiques specifiques de chaque bien. Cette analyse est fournie a titre indicatif et ne constitue pas une garantie.

Les conditions du marche peuvent evoluer rapidement. Il est recommande de reactualiser cette analyse en cas de changement significatif de la conjoncture economique ou du marche immobilier local.`;

    y = drawWrappedText(page, methodology, margin, y, contentWidth, helvetica, 11, mutedColor, 18);

    // Footer on all pages
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      p.drawText(`Immo-Rama - Analyse de marche - ${sanitizeText(immeuble.ville || 'Bien')}`, {
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

    const filename = `analyse-marche-${sanitizeText(immeuble.ville || 'bien').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

    console.log('Market analysis PDF generated successfully:', filename);

    return new Response(
      JSON.stringify({ pdf_base64: pdfBase64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating market analysis PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
