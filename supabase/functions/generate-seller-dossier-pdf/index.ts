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
    });
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

    console.log('Generating seller dossier PDF for immeuble:', immeuble_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch immeuble data with owner
    const { data: immeuble, error: immeubleError } = await supabase
      .from('immeubles')
      .select(`
        *,
        proprietaire:proprietaires(
          id,
          user_id,
          profiles:profiles(prenom, nom, email, telephone)
        )
      `)
      .eq('id', immeuble_id)
      .single();

    if (immeubleError || !immeuble) {
      console.error('Error fetching immeuble:', immeubleError);
      return new Response(
        JSON.stringify({ error: 'Immeuble not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch co-owners
    const { data: coProprietaires } = await supabase
      .from('co_proprietaires')
      .select('*')
      .eq('immeuble_id', immeuble_id);

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

    // ============ PAGE 1: COVER ============
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Logo
    page.drawText('IMMO-RAMA', {
      x: margin,
      y: y,
      size: 36,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 25;
    page.drawText('Votre partenaire immobilier', {
      x: margin,
      y: y,
      size: 12,
      font: helvetica,
      color: mutedColor,
    });
    y -= 80;

    // Title
    page.drawText('DOSSIER DE VENTE', {
      x: margin,
      y: y,
      size: 32,
      font: helveticaBold,
      color: textColor,
    });
    y -= 50;

    // Property name
    page.drawText(sanitizeText(immeuble.nom || 'Votre Propriete'), {
      x: margin,
      y: y,
      size: 22,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 35;

    // Address
    const fullAddress = `${immeuble.adresse || ''}, ${immeuble.code_postal || ''} ${immeuble.ville || ''}`;
    page.drawText(sanitizeText(fullAddress), {
      x: margin,
      y: y,
      size: 14,
      font: helvetica,
      color: mutedColor,
    });
    y -= 80;

    // Owner info box
    const ownerProfile = immeuble.proprietaire?.profiles;
    if (ownerProfile) {
      page.drawRectangle({
        x: margin,
        y: y - 80,
        width: contentWidth,
        height: 80,
        color: rgb(0.95, 0.97, 0.99),
        borderColor: primaryColor,
        borderWidth: 1,
      });

      page.drawText('PROPRIETAIRE', {
        x: margin + 15,
        y: y - 25,
        size: 10,
        font: helvetica,
        color: mutedColor,
      });

      const ownerName = `${ownerProfile.prenom || ''} ${ownerProfile.nom || ''}`;
      page.drawText(sanitizeText(ownerName), {
        x: margin + 15,
        y: y - 45,
        size: 16,
        font: helveticaBold,
        color: textColor,
      });

      if (ownerProfile.email) {
        page.drawText(sanitizeText(ownerProfile.email), {
          x: margin + 15,
          y: y - 65,
          size: 11,
          font: helvetica,
          color: mutedColor,
        });
      }
    }

    y -= 120;

    // Date
    page.drawText(sanitizeText(`Document genere le ${new Date().toLocaleDateString('fr-CH')}`), {
      x: margin,
      y: y,
      size: 11,
      font: helvetica,
      color: mutedColor,
    });

    // ============ PAGE 2: EXECUTIVE SUMMARY ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('RESUME EXECUTIF', {
      x: margin,
      y: y,
      size: 22,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 50;

    // Key figures
    const keyFigures = [
      { label: 'Prix demande', value: formatCurrency(immeuble.prix_vente_demande), highlight: true },
      { label: 'Estimation basse', value: formatCurrency(immeuble.estimation_valeur_basse), highlight: false },
      { label: 'Estimation haute', value: formatCurrency(immeuble.estimation_valeur_haute), highlight: false },
      { label: 'Valeur recommandee', value: formatCurrency(immeuble.estimation_valeur_recommandee), highlight: true },
    ];

    keyFigures.forEach((figure) => {
      page.drawText(sanitizeText(figure.label + ':'), {
        x: margin,
        y: y,
        size: 12,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(figure.value), {
        x: margin + 180,
        y: y,
        size: figure.highlight ? 16 : 14,
        font: figure.highlight ? helveticaBold : helvetica,
        color: figure.highlight ? primaryColor : textColor,
      });
      y -= 30;
    });

    y -= 30;

    // Property summary
    page.drawText('Caracteristiques principales', {
      x: margin,
      y: y,
      size: 16,
      font: helveticaBold,
      color: textColor,
    });
    y -= 30;

    const characteristics = [
      { label: 'Type de bien', value: immeuble.type_bien || 'N/A' },
      { label: 'Surface', value: immeuble.surface_totale ? `${immeuble.surface_totale} m2` : 'N/A' },
      { label: 'Pieces', value: immeuble.nombre_pieces?.toString() || 'N/A' },
      { label: 'Chambres', value: immeuble.nb_chambres?.toString() || 'N/A' },
      { label: 'Construction', value: immeuble.annee_construction?.toString() || 'N/A' },
      { label: 'Canton', value: immeuble.canton || 'N/A' },
    ];

    characteristics.forEach((char, index) => {
      const colX = index % 2 === 0 ? margin : margin + contentWidth / 2;
      const rowY = y - Math.floor(index / 2) * 25;

      page.drawText(sanitizeText(char.label + ':'), {
        x: colX,
        y: rowY,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(char.value), {
        x: colX + 100,
        y: rowY,
        size: 12,
        font: helveticaBold,
        color: textColor,
      });
    });

    y -= Math.ceil(characteristics.length / 2) * 25 + 50;

    // Market positioning
    page.drawText('Positionnement marche', {
      x: margin,
      y: y,
      size: 16,
      font: helveticaBold,
      color: textColor,
    });
    y -= 30;

    const marketData = [
      { label: 'Prix/m2 du secteur', value: immeuble.prix_m2_secteur ? `${formatCurrency(immeuble.prix_m2_secteur)}/m2` : 'N/A' },
      { label: 'Duree moyenne publication', value: immeuble.duree_publication_moyenne ? `${immeuble.duree_publication_moyenne} jours` : 'N/A' },
      { label: 'Tendance du marche', value: immeuble.tendance_marche || 'Stable' },
    ];

    marketData.forEach((data) => {
      page.drawText(sanitizeText(data.label + ':'), {
        x: margin,
        y: y,
        size: 11,
        font: helvetica,
        color: mutedColor,
      });
      page.drawText(sanitizeText(data.value), {
        x: margin + 180,
        y: y,
        size: 12,
        font: helveticaBold,
        color: textColor,
      });
      y -= 25;
    });

    // ============ PAGE 3: PROPERTY DETAILS ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('FICHE TECHNIQUE DETAILLEE', {
      x: margin,
      y: y,
      size: 22,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 50;

    // All property details
    const allDetails = [
      { section: 'LOCALISATION', items: [
        { label: 'Adresse', value: immeuble.adresse || 'N/A' },
        { label: 'Code postal', value: immeuble.code_postal || 'N/A' },
        { label: 'Ville', value: immeuble.ville || 'N/A' },
        { label: 'Canton', value: immeuble.canton || 'N/A' },
      ]},
      { section: 'DIMENSIONS', items: [
        { label: 'Surface totale', value: immeuble.surface_totale ? `${immeuble.surface_totale} m2` : 'N/A' },
        { label: 'Nombre de pieces', value: immeuble.nombre_pieces?.toString() || 'N/A' },
        { label: 'Chambres', value: immeuble.nb_chambres?.toString() || 'N/A' },
        { label: 'Salles d\'eau', value: immeuble.nb_salles_eau?.toString() || 'N/A' },
        { label: 'WC', value: immeuble.nb_wc?.toString() || 'N/A' },
      ]},
      { section: 'TECHNIQUE', items: [
        { label: 'Annee construction', value: immeuble.annee_construction?.toString() || 'N/A' },
        { label: 'Annee renovation', value: immeuble.annee_renovation?.toString() || 'N/A' },
        { label: 'Type chauffage', value: immeuble.type_chauffage || 'N/A' },
        { label: 'Combustible', value: immeuble.combustible || 'N/A' },
        { label: 'Classe energetique', value: immeuble.classe_energetique || 'N/A' },
      ]},
    ];

    allDetails.forEach((section) => {
      page.drawText(section.section, {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: accentColor,
      });
      y -= 25;

      section.items.forEach((item) => {
        page.drawText(sanitizeText(item.label + ':'), {
          x: margin + 10,
          y: y,
          size: 10,
          font: helvetica,
          color: mutedColor,
        });
        page.drawText(sanitizeText(item.value), {
          x: margin + 150,
          y: y,
          size: 11,
          font: helvetica,
          color: textColor,
        });
        y -= 18;
      });
      y -= 15;

      if (y < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    });

    // ============ PAGE 4: CO-OWNERS ============
    if (coProprietaires && coProprietaires.length > 0) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;

      page.drawText('CO-PROPRIETAIRES', {
        x: margin,
        y: y,
        size: 22,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 50;

      coProprietaires.forEach((coProp, index) => {
        page.drawRectangle({
          x: margin,
          y: y - 80,
          width: contentWidth,
          height: 80,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        const coName = `${coProp.prenom || ''} ${coProp.nom || ''}`;
        page.drawText(sanitizeText(coName), {
          x: margin + 15,
          y: y - 25,
          size: 14,
          font: helveticaBold,
          color: textColor,
        });

        page.drawText(sanitizeText(`Lien: ${coProp.type_lien || 'N/A'}`), {
          x: margin + 15,
          y: y - 45,
          size: 11,
          font: helvetica,
          color: mutedColor,
        });

        page.drawText(sanitizeText(`Quote-part: ${coProp.quote_part || 'N/A'}%`), {
          x: margin + 200,
          y: y - 45,
          size: 11,
          font: helvetica,
          color: mutedColor,
        });

        const signatureStatus = coProp.signature_obtenue ? 'Signature obtenue' : 'Signature requise';
        page.drawText(sanitizeText(signatureStatus), {
          x: margin + 15,
          y: y - 65,
          size: 10,
          font: helvetica,
          color: coProp.signature_obtenue ? accentColor : rgb(0.8, 0.4, 0.1),
        });

        y -= 100;

        if (y < margin + 100) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
      });
    }

    // ============ PAGE 5: STRATEGY ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('STRATEGIE DE COMMERCIALISATION', {
      x: margin,
      y: y,
      size: 22,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 50;

    if (immeuble.recommandation_commercialisation) {
      page.drawText('Recommandation', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: textColor,
      });
      y -= 25;
      y = drawWrappedText(page, immeuble.recommandation_commercialisation, margin, y, contentWidth, helvetica, 11, textColor);
      y -= 30;
    }

    if (immeuble.strategie_vente) {
      page.drawText('Strategie proposee', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: textColor,
      });
      y -= 25;
      y = drawWrappedText(page, immeuble.strategie_vente, margin, y, contentWidth, helvetica, 11, textColor);
      y -= 30;
    }

    // Positive/Negative factors
    const positiveFactors = Array.isArray(immeuble.facteurs_positifs) ? immeuble.facteurs_positifs : [];
    const negativeFactors = Array.isArray(immeuble.facteurs_negatifs) ? immeuble.facteurs_negatifs : [];

    if (positiveFactors.length > 0) {
      page.drawText('Points forts', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: accentColor,
      });
      y -= 25;

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
      y -= 20;
    }

    if (negativeFactors.length > 0) {
      page.drawText('Points d\'attention', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: rgb(0.8, 0.4, 0.1),
      });
      y -= 25;

      negativeFactors.forEach((factor: string) => {
        page.drawText(sanitizeText(`- ${factor}`), {
          x: margin + 10,
          y: y,
          size: 11,
          font: helvetica,
          color: rgb(0.8, 0.4, 0.1),
        });
        y -= 18;
      });
    }

    // ============ PAGE 6: TERMS ============
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;

    page.drawText('CONDITIONS ET HONORAIRES', {
      x: margin,
      y: y,
      size: 22,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 50;

    const terms = `HONORAIRES DE COURTAGE

Immo-Rama applique une commission de 1% du prix de vente final, avec un minimum de CHF 10'000.-.

Cette commission comprend:
- Estimation professionnelle du bien
- Creation du dossier de vente complet
- Photos professionnelles
- Publication sur les principaux portails immobiliers
- Gestion des visites et des acheteurs potentiels
- Negociation et accompagnement jusqu'a la signature de l'acte
- Suivi administratif complet

ENGAGEMENT

Le mandat de vente est conclu pour une duree de 6 mois renouvelable. Le proprietaire s'engage a accorder l'exclusivite de la vente a Immo-Rama pendant cette periode.

GARANTIE QUALITE

Immo-Rama s'engage a fournir un service de qualite professionnelle et a defendre au mieux les interets du vendeur tout au long du processus de vente.`;

    y = drawWrappedText(page, terms, margin, y, contentWidth, helvetica, 11, textColor, 16);

    // Footer on all pages
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      p.drawText(`Immo-Rama - Dossier de vente confidentiel`, {
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

    const filename = `dossier-vendeur-${sanitizeText(immeuble.nom || 'bien').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

    console.log('Seller dossier PDF generated successfully:', filename);

    return new Response(
      JSON.stringify({ pdf_base64: pdfBase64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating seller dossier PDF:', error);
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
