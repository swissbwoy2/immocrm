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

function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('fr-CH');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or agent
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles?.map(r => r.role) || [];
    const isAuthorized = userRoles.includes('admin') || userRoles.includes('agent');

    if (!isAuthorized) {
      console.error('User not authorized:', user.id);
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin or agent role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { immeuble_id } = await req.json();

    if (!immeuble_id) {
      return new Response(
        JSON.stringify({ error: 'immeuble_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating complete dossier PDF for immeuble:', immeuble_id, 'by user:', user.id);

    // Fetch all immeuble data
    const { data: immeuble, error: immeubleError } = await supabase
      .from('immeubles')
      .select(`
        *,
        proprietaire:proprietaires(
          *,
          profiles:profiles(prenom, nom, email, telephone),
          agents:agents(
            id,
            user_id,
            profiles:profiles(prenom, nom, email, telephone)
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

    // Fetch co-proprietaires
    const { data: coProprietaires } = await supabase
      .from('co_proprietaires')
      .select('*')
      .eq('immeuble_id', immeuble_id)
      .order('created_at', { ascending: true });

    // Fetch all photos (including confidential)
    const { data: photos } = await supabase
      .from('photos_immeuble')
      .select('*')
      .eq('immeuble_id', immeuble_id)
      .order('ordre', { ascending: true });

    // Fetch all documents
    const { data: documents } = await supabase
      .from('documents_immeuble')
      .select('*')
      .eq('immeuble_id', immeuble_id)
      .order('created_at', { ascending: true });

    // Fetch buyer interests
    const { data: interets } = await supabase
      .from('interets_acheteurs')
      .select(`
        *,
        client:clients(
          id,
          user_id,
          profiles:profiles(prenom, nom, email, telephone)
        )
      `)
      .eq('immeuble_id', immeuble_id)
      .order('created_at', { ascending: false });

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;

    // Helper to add new page
    const addNewPage = () => {
      const p = pdfDoc.addPage([pageWidth, pageHeight]);
      return { page: p, y: pageHeight - margin };
    };

    // Helper to draw section title
    const drawSectionTitle = (page: any, y: number, title: string): number => {
      page.drawText(sanitizeText(title), {
        x: margin,
        y: y,
        size: 16,
        font: helveticaBold,
        color: rgb(0.2, 0.4, 0.6),
      });
      return y - 30;
    };

    // Helper to draw info line
    const drawInfoLine = (page: any, y: number, label: string, value: string): number => {
      page.drawText(sanitizeText(label + ':'), {
        x: margin,
        y: y,
        size: 10,
        font: helveticaBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(sanitizeText(value), {
        x: margin + 150,
        y: y,
        size: 10,
        font: helvetica,
        color: rgb(0.1, 0.1, 0.1),
      });
      return y - 16;
    };

    // PAGE 1: Cover page
    let { page, y } = addNewPage();

    page.drawText('DOSSIER COMPLET', {
      x: margin,
      y: y,
      size: 28,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 20;

    page.drawText('DOCUMENT CONFIDENTIEL', {
      x: margin,
      y: y,
      size: 12,
      font: helvetica,
      color: rgb(0.8, 0.2, 0.2),
    });
    y -= 60;

    page.drawText(sanitizeText(immeuble.nom || 'Bien immobilier'), {
      x: margin,
      y: y,
      size: 24,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 30;

    page.drawText(sanitizeText(immeuble.adresse || ''), {
      x: margin,
      y: y,
      size: 14,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 20;

    page.drawText(sanitizeText(`${immeuble.code_postal || ''} ${immeuble.ville || ''}, ${immeuble.canton || ''}`), {
      x: margin,
      y: y,
      size: 14,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 60;

    page.drawText(sanitizeText(formatCurrency(immeuble.prix_vente_demande)), {
      x: margin,
      y: y,
      size: 32,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 80;

    // Table of contents
    y = drawSectionTitle(page, y, 'TABLE DES MATIERES');
    const toc = [
      '1. Informations generales',
      '2. Caracteristiques techniques',
      '3. Co-proprietaires',
      '4. Documents',
      '5. Photos',
      '6. Interets acheteurs',
      '7. Informations proprietaire',
    ];
    for (const item of toc) {
      page.drawText(sanitizeText(item), {
        x: margin + 20,
        y: y,
        size: 11,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 18;
    }

    // PAGE 2: General information
    ({ page, y } = addNewPage());
    y = drawSectionTitle(page, y, '1. INFORMATIONS GENERALES');

    y = drawInfoLine(page, y, 'Nom du bien', immeuble.nom || 'N/A');
    y = drawInfoLine(page, y, 'Type de bien', immeuble.type_bien || 'N/A');
    y = drawInfoLine(page, y, 'Adresse complete', immeuble.adresse || 'N/A');
    y = drawInfoLine(page, y, 'Code postal', immeuble.code_postal || 'N/A');
    y = drawInfoLine(page, y, 'Ville', immeuble.ville || 'N/A');
    y = drawInfoLine(page, y, 'Canton', immeuble.canton || 'N/A');
    y = drawInfoLine(page, y, 'Prix demande', formatCurrency(immeuble.prix_vente_demande));
    y = drawInfoLine(page, y, 'Statut vente', immeuble.statut_vente || 'N/A');
    y = drawInfoLine(page, y, 'Mode exploitation', immeuble.mode_exploitation || 'N/A');
    y -= 20;

    // Description
    if (immeuble.description) {
      y = drawSectionTitle(page, y, 'Description');
      const desc = sanitizeText(immeuble.description);
      const words = desc.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        if (helvetica.widthOfTextAtSize(testLine, 10) > pageWidth - 2 * margin) {
          if (y < margin + 50) {
            ({ page, y } = addNewPage());
          }
          page.drawText(line, { x: margin, y: y, size: 10, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
          y -= 14;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: margin, y: y, size: 10, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
        y -= 30;
      }
    }

    // PAGE 3: Technical characteristics
    ({ page, y } = addNewPage());
    y = drawSectionTitle(page, y, '2. CARACTERISTIQUES TECHNIQUES');

    y = drawInfoLine(page, y, 'Surface totale', immeuble.surface_totale ? `${immeuble.surface_totale} m2` : 'N/A');
    y = drawInfoLine(page, y, 'Surface habitable', immeuble.surface_habitable ? `${immeuble.surface_habitable} m2` : 'N/A');
    y = drawInfoLine(page, y, 'Surface terrain', immeuble.surface_terrain ? `${immeuble.surface_terrain} m2` : 'N/A');
    y = drawInfoLine(page, y, 'Nombre de pieces', immeuble.nombre_pieces?.toString() || 'N/A');
    y = drawInfoLine(page, y, 'Nombre d\'etages', immeuble.nombre_etages?.toString() || 'N/A');
    y = drawInfoLine(page, y, 'Annee construction', immeuble.annee_construction?.toString() || 'N/A');
    y = drawInfoLine(page, y, 'Derniere renovation', immeuble.derniere_renovation?.toString() || 'N/A');
    y = drawInfoLine(page, y, 'Etat general', immeuble.etat_general || 'N/A');
    y = drawInfoLine(page, y, 'Chauffage', immeuble.type_chauffage || 'N/A');
    y = drawInfoLine(page, y, 'Places parking', immeuble.places_parking?.toString() || 'N/A');
    y = drawInfoLine(page, y, 'Numero parcelle', immeuble.numero_parcelle || 'N/A');
    y = drawInfoLine(page, y, 'Zone', immeuble.zone || 'N/A');
    y -= 20;

    // Points forts
    if (immeuble.points_forts?.length) {
      y = drawSectionTitle(page, y, 'Points forts');
      for (const point of immeuble.points_forts) {
        if (y < margin + 30) {
          ({ page, y } = addNewPage());
        }
        page.drawText(`- ${sanitizeText(point)}`, { x: margin + 10, y: y, size: 10, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
        y -= 14;
      }
    }

    // PAGE 4: Co-proprietaires
    ({ page, y } = addNewPage());
    y = drawSectionTitle(page, y, '3. CO-PROPRIETAIRES');

    if (coProprietaires && coProprietaires.length > 0) {
      for (const coProp of coProprietaires) {
        if (y < margin + 100) {
          ({ page, y } = addNewPage());
        }
        page.drawText(sanitizeText(`${coProp.prenom} ${coProp.nom}`), {
          x: margin,
          y: y,
          size: 12,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 18;
        y = drawInfoLine(page, y, 'Type de lien', coProp.type_lien || 'N/A');
        y = drawInfoLine(page, y, 'Quote-part', coProp.quote_part ? `${coProp.quote_part}%` : 'N/A');
        y = drawInfoLine(page, y, 'Email', coProp.email || 'N/A');
        y = drawInfoLine(page, y, 'Telephone', coProp.telephone || 'N/A');
        y = drawInfoLine(page, y, 'Signature requise', coProp.signature_requise ? 'Oui' : 'Non');
        y = drawInfoLine(page, y, 'Signature obtenue', coProp.signature_obtenue ? 'Oui' : 'Non');
        if (coProp.date_signature) {
          y = drawInfoLine(page, y, 'Date signature', formatDate(coProp.date_signature));
        }
        y -= 20;
      }
    } else {
      page.drawText('Aucun co-proprietaire enregistre', { x: margin, y: y, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
      y -= 20;
    }

    // PAGE 5: Documents
    ({ page, y } = addNewPage());
    y = drawSectionTitle(page, y, '4. DOCUMENTS');

    if (documents && documents.length > 0) {
      for (const doc of documents) {
        if (y < margin + 50) {
          ({ page, y } = addNewPage());
        }
        page.drawText(sanitizeText(doc.nom || 'Document sans nom'), {
          x: margin,
          y: y,
          size: 11,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 16;
        y = drawInfoLine(page, y, 'Type', doc.type_document || 'N/A');
        y = drawInfoLine(page, y, 'Confidentialite', doc.niveau_confidentialite || 'N/A');
        y = drawInfoLine(page, y, 'Date ajout', formatDate(doc.created_at));
        y -= 10;
      }
    } else {
      page.drawText('Aucun document enregistre', { x: margin, y: y, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
      y -= 20;
    }

    // PAGE 6: Photos summary
    ({ page, y } = addNewPage());
    y = drawSectionTitle(page, y, '5. PHOTOS');

    const publicPhotos = photos?.filter(p => p.niveau_confidentialite === 'public') || [];
    const confidentielPhotos = photos?.filter(p => p.niveau_confidentialite !== 'public') || [];

    page.drawText(`Photos publiques: ${publicPhotos.length}`, { x: margin, y: y, size: 11, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
    page.drawText(`Photos confidentielles: ${confidentielPhotos.length}`, { x: margin, y: y, size: 11, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
    y -= 30;

    if (photos && photos.length > 0) {
      for (const photo of photos) {
        if (y < margin + 40) {
          ({ page, y } = addNewPage());
        }
        page.drawText(`- ${sanitizeText(photo.titre || 'Photo sans titre')} (${photo.niveau_confidentialite || 'public'})`, {
          x: margin + 10,
          y: y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 14;
      }
    }

    // PAGE 7: Buyer interests
    ({ page, y } = addNewPage());
    y = drawSectionTitle(page, y, '6. INTERETS ACHETEURS');

    if (interets && interets.length > 0) {
      for (const interet of interets) {
        if (y < margin + 80) {
          ({ page, y } = addNewPage());
        }
        const clientProfile = interet.client?.profiles;
        const clientName = clientProfile ? `${clientProfile.prenom || ''} ${clientProfile.nom || ''}` : 'Client inconnu';
        
        page.drawText(sanitizeText(clientName), {
          x: margin,
          y: y,
          size: 12,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 18;
        y = drawInfoLine(page, y, 'Type interet', interet.type_interet || 'N/A');
        y = drawInfoLine(page, y, 'Statut', interet.statut || 'N/A');
        y = drawInfoLine(page, y, 'Date', formatDate(interet.created_at));
        if (interet.notes) {
          y = drawInfoLine(page, y, 'Notes', interet.notes.substring(0, 80) + (interet.notes.length > 80 ? '...' : ''));
        }
        y -= 15;
      }
    } else {
      page.drawText('Aucun interet acheteur enregistre', { x: margin, y: y, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
    }

    // PAGE 8: Owner information
    ({ page, y } = addNewPage());
    y = drawSectionTitle(page, y, '7. INFORMATIONS PROPRIETAIRE');

    const proprietaire = immeuble.proprietaire;
    if (proprietaire) {
      const propProfile = proprietaire.profiles;
      y = drawInfoLine(page, y, 'Nom', propProfile ? `${propProfile.prenom || ''} ${propProfile.nom || ''}` : 'N/A');
      y = drawInfoLine(page, y, 'Email', propProfile?.email || 'N/A');
      y = drawInfoLine(page, y, 'Telephone', propProfile?.telephone || proprietaire.telephone || 'N/A');
      y = drawInfoLine(page, y, 'Adresse', proprietaire.adresse || 'N/A');
      y = drawInfoLine(page, y, 'Ville', `${proprietaire.code_postal || ''} ${proprietaire.ville || ''}` || 'N/A');
      
      const agent = proprietaire.agents;
      if (agent) {
        y -= 20;
        y = drawSectionTitle(page, y, 'Agent assigne');
        const agentProfile = agent.profiles;
        y = drawInfoLine(page, y, 'Nom', agentProfile ? `${agentProfile.prenom || ''} ${agentProfile.nom || ''}` : 'N/A');
        y = drawInfoLine(page, y, 'Email', agentProfile?.email || 'N/A');
        y = drawInfoLine(page, y, 'Telephone', agentProfile?.telephone || 'N/A');
      }
    } else {
      page.drawText('Informations proprietaire non disponibles', { x: margin, y: y, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
    }

    // Footer on each page
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      p.drawText(`CONFIDENTIEL - Dossier genere le ${new Date().toLocaleDateString('fr-CH')}`, {
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

    const filename = `dossier-complet-${sanitizeText(immeuble.nom || 'bien').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

    console.log('Complete dossier PDF generated successfully:', filename);

    return new Response(
      JSON.stringify({ pdf_base64: pdfBase64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating dossier PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
