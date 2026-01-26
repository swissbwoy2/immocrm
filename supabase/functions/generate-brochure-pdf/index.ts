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
  if (amount === null || amount === undefined) return 'Prix sur demande';
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

    console.log('Generating brochure PDF for immeuble:', immeuble_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch immeuble data with proprietaire and agent
    const { data: immeuble, error: immeubleError } = await supabase
      .from('immeubles')
      .select(`
        *,
        proprietaire:proprietaires(
          id,
          user_id,
          agent_id,
          profiles:user_id(prenom, nom, email, telephone),
          agents:agent_id(
            id,
            user_id,
            profiles:user_id(prenom, nom, email, telephone)
          )
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

    // Fetch public photos only
    const { data: photos } = await supabase
      .from('photos_immeuble')
      .select('*')
      .eq('immeuble_id', immeuble_id)
      .eq('niveau_confidentialite', 'public')
      .order('ordre', { ascending: true })
      .limit(6);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 50;

    // Page 1: Cover page
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Header
    page.drawText('Immo-rama.ch', {
      x: margin,
      y: y,
      size: 28,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 50;

    // Property type and title
    const typeBien = sanitizeText(immeuble.type_bien || 'Bien immobilier');
    page.drawText(typeBien.toUpperCase(), {
      x: margin,
      y: y,
      size: 14,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 30;

    // Property name
    const propertyName = sanitizeText(immeuble.nom || 'Propriete a vendre');
    page.drawText(propertyName, {
      x: margin,
      y: y,
      size: 24,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 40;

    // Location (city/canton only - no exact address for public brochure)
    const location = sanitizeText(`${immeuble.ville || ''}, ${immeuble.canton || 'Suisse'}`);
    page.drawText(location, {
      x: margin,
      y: y,
      size: 16,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 60;

    // Price
    const price = formatCurrency(immeuble.prix_vente_demande);
    page.drawText(sanitizeText(price), {
      x: margin,
      y: y,
      size: 32,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 80;

    // Key features box
    page.drawRectangle({
      x: margin,
      y: y - 100,
      width: pageWidth - 2 * margin,
      height: 100,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    // Calculate price per m2
    const prixM2 = immeuble.surface_totale && immeuble.prix_vente_demande 
      ? Math.round(immeuble.prix_vente_demande / immeuble.surface_totale)
      : null;

    const features = [
      { label: 'Surface', value: immeuble.surface_totale ? `${immeuble.surface_totale} m2` : 'N/A' },
      { label: 'Pieces', value: immeuble.nombre_pieces ? `${immeuble.nombre_pieces} pieces` : 'N/A' },
      { label: 'Prix / m2', value: prixM2 ? `CHF ${prixM2.toLocaleString('fr-CH')}/m2` : 'N/A' },
      { label: 'Annee', value: immeuble.annee_construction ? `${immeuble.annee_construction}` : 'N/A' },
    ];

    const featureWidth = (pageWidth - 2 * margin) / features.length;
    features.forEach((feature, index) => {
      const featureX = margin + index * featureWidth + 20;
      page.drawText(sanitizeText(feature.label), {
        x: featureX,
        y: y - 30,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(sanitizeText(feature.value), {
        x: featureX,
        y: y - 50,
        size: 14,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    y -= 140;

    // Energy class indicator
    if (immeuble.classe_energetique) {
      page.drawText('CLASSE ENERGETIQUE', {
        x: margin,
        y: y,
        size: 12,
        font: helveticaBold,
        color: rgb(0.2, 0.4, 0.6),
      });
      
      const energyColors: Record<string, [number, number, number]> = {
        'A': [0.2, 0.7, 0.3],
        'B': [0.4, 0.8, 0.3],
        'C': [0.6, 0.8, 0.2],
        'D': [0.9, 0.8, 0.2],
        'E': [0.9, 0.6, 0.2],
        'F': [0.9, 0.4, 0.2],
        'G': [0.8, 0.2, 0.2],
      };
      const energyColor = energyColors[immeuble.classe_energetique.toUpperCase()] || [0.5, 0.5, 0.5];
      
      page.drawRectangle({
        x: margin + 150,
        y: y - 8,
        width: 30,
        height: 25,
        color: rgb(energyColor[0], energyColor[1], energyColor[2]),
      });
      
      page.drawText(sanitizeText(immeuble.classe_energetique.toUpperCase()), {
        x: margin + 158,
        y: y - 2,
        size: 16,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      
      if (immeuble.indice_energetique) {
        page.drawText(sanitizeText(`${immeuble.indice_energetique} kWh/m2/an`), {
          x: margin + 190,
          y: y - 2,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      
      y -= 50;
    }

    // Technical details section
    page.drawText('DETAILS TECHNIQUES', {
      x: margin,
      y: y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 25;

    const technicalDetails = [
      { label: 'Chambres', value: immeuble.nb_chambres?.toString() || 'N/A' },
      { label: 'Salles de bain', value: immeuble.nb_salles_eau?.toString() || 'N/A' },
      { label: 'WC', value: immeuble.nb_wc?.toString() || 'N/A' },
      { label: 'Etage', value: immeuble.etage !== null ? immeuble.etage.toString() : 'N/A' },
      { label: 'Etages batiment', value: immeuble.nb_etages_batiment?.toString() || 'N/A' },
      { label: 'Chauffage', value: immeuble.type_chauffage || 'N/A' },
      { label: 'Garages', value: immeuble.nb_garages?.toString() || '0' },
      { label: 'Places int.', value: immeuble.nb_places_int?.toString() || '0' },
      { label: 'Places ext.', value: immeuble.nb_places_ext?.toString() || '0' },
    ];

    const colWidth = (pageWidth - 2 * margin) / 3;
    technicalDetails.forEach((detail, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const detailX = margin + col * colWidth;
      const detailY = y - row * 22;

      page.drawText(sanitizeText(detail.label + ':'), {
        x: detailX,
        y: detailY,
        size: 9,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(sanitizeText(detail.value), {
        x: detailX + 70,
        y: detailY,
        size: 10,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    y -= Math.ceil(technicalDetails.length / 3) * 22 + 20;

    // Description
    if (immeuble.description_commerciale || immeuble.description) {
      page.drawText('DESCRIPTION', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: rgb(0.2, 0.4, 0.6),
      });
      y -= 25;

      const description = sanitizeText(immeuble.description_commerciale || immeuble.description || '');
      const words = description.split(' ');
      let line = '';
      const maxWidth = pageWidth - 2 * margin;
      
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const textWidth = helvetica.widthOfTextAtSize(testLine, 11);
        
        if (textWidth > maxWidth) {
          if (y < margin + 50) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(line, {
            x: margin,
            y: y,
            size: 11,
            font: helvetica,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= 16;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, {
          x: margin,
          y: y,
          size: 11,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 40;
      }
    }

    // Points forts
    if (immeuble.points_forts && Array.isArray(immeuble.points_forts) && immeuble.points_forts.length > 0) {
      if (y < margin + 150) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      page.drawText('POINTS FORTS', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: rgb(0.2, 0.4, 0.6),
      });
      y -= 25;

      for (const point of immeuble.points_forts) {
        if (y < margin + 30) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(`- ${sanitizeText(point)}`, {
          x: margin + 10,
          y: y,
          size: 11,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 18;
      }
      y -= 20;
    }

    // Rental information (if rented)
    if (immeuble.est_loue) {
      if (y < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      page.drawRectangle({
        x: margin,
        y: y - 80,
        width: pageWidth - 2 * margin,
        height: 80,
        color: rgb(0.95, 0.95, 0.98),
        borderColor: rgb(0.7, 0.7, 0.8),
        borderWidth: 1,
      });

      page.drawText('BIEN ACTUELLEMENT LOUE', {
        x: margin + 15,
        y: y - 20,
        size: 12,
        font: helveticaBold,
        color: rgb(0.2, 0.4, 0.6),
      });

      if (immeuble.loyer_actuel) {
        page.drawText(sanitizeText(`Loyer actuel: CHF ${immeuble.loyer_actuel.toLocaleString('fr-CH')}/mois`), {
          x: margin + 15,
          y: y - 45,
          size: 11,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      if (immeuble.locataire_actuel) {
        page.drawText(sanitizeText(`Locataire: ${immeuble.locataire_actuel}`), {
          x: margin + 15,
          y: y - 65,
          size: 10,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      y -= 100;
    }

    // Agent contact section
    const agent = immeuble.proprietaire?.agents;
    const agentProfile = agent?.profiles;
    
    if (agentProfile) {
      if (y < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      page.drawText('VOTRE CONTACT', {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: rgb(0.2, 0.4, 0.6),
      });
      y -= 30;

      const agentName = sanitizeText(`${agentProfile.prenom || ''} ${agentProfile.nom || ''}`);
      page.drawText(agentName, {
        x: margin,
        y: y,
        size: 14,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 20;

      if (agentProfile.telephone) {
        page.drawText(sanitizeText(`Tel: ${agentProfile.telephone}`), {
          x: margin,
          y: y,
          size: 11,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 16;
      }

      if (agentProfile.email) {
        page.drawText(sanitizeText(`Email: ${agentProfile.email}`), {
          x: margin,
          y: y,
          size: 11,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
    }

    // Footer on each page
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      p.drawText(`Immo-Rama - Brochure generee le ${new Date().toLocaleDateString('fr-CH')}`, {
        x: margin,
        y: 30,
        size: 8,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      });
      p.drawText(`Page ${index + 1} / ${pages.length}`, {
        x: pageWidth - margin - 50,
        y: 30,
        size: 8,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      });
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = uint8ArrayToBase64(pdfBytes);

    const filename = `brochure-${sanitizeText(immeuble.nom || 'bien').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

    console.log('Brochure PDF generated successfully:', filename);

    return new Response(
      JSON.stringify({ pdf_base64: pdfBase64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating brochure PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
