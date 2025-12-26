import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize text to remove Unicode characters that can't be encoded in WinAnsi
function sanitizeText(text: string | null | undefined): string {
  if (!text) return '-';
  return String(text)
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\u2000-\u200B]/g, ' ')
    .replace(/[^\x00-\x7F]/g, (char) => {
      const supported = 'àâäçéèêëîïôùûüÿœæÀÂÄÇÉÈÊËÎÏÔÙÛÜŸŒÆ°€£¥©®™±×÷';
      return supported.includes(char) ? char : '';
    });
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return sanitizeText(`${day} ${month} ${year}`);
  } catch {
    return sanitizeText(dateString);
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '-';
  const formatted = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${formatted} CHF`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, demande_id } = await req.json();
    
    if (!client_id && !demande_id) {
      throw new Error('client_id ou demande_id requis');
    }
    
    console.log(`Generating full mandat PDF for client_id: ${client_id}, demande_id: ${demande_id}`);
    
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Fetch client data
    let clientData: any = null;
    let profileData: any = null;
    let demandeData: any = null;
    let candidatesData: any[] = [];
    let documentsData: any[] = [];
    
    if (client_id) {
      // Fetch client
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', client_id)
        .single();
      
      if (clientError) throw new Error(`Client non trouvé: ${clientError.message}`);
      clientData = client;
      
      // Fetch profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', clientData.user_id)
        .single();
      profileData = profile;
      
      // Fetch candidates
      const { data: candidates } = await supabaseAdmin
        .from('client_candidates')
        .select('*')
        .eq('client_id', client_id);
      candidatesData = candidates || [];
      
      // Fetch documents (identity documents)
      const { data: docs } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('client_id', client_id)
        .in('type_document', ['piece_identite', 'identite', 'passeport', 'permis_sejour']);
      documentsData = docs || [];
      
      // Fetch demande if linked
      if (clientData.demande_mandat_id) {
        const { data: demande } = await supabaseAdmin
          .from('demandes_mandat')
          .select('*')
          .eq('id', clientData.demande_mandat_id)
          .single();
        demandeData = demande;
      }
    } else if (demande_id) {
      // Fetch demande directly
      const { data: demande, error: demandeError } = await supabaseAdmin
        .from('demandes_mandat')
        .select('*')
        .eq('id', demande_id)
        .single();
      
      if (demandeError) throw new Error(`Demande non trouvée: ${demandeError.message}`);
      demandeData = demande;
      
      // Build profile-like data from demande
      profileData = {
        prenom: demandeData.prenom,
        nom: demandeData.nom,
        email: demandeData.email,
        telephone: demandeData.telephone
      };
      
      // Build client-like data from demande
      clientData = {
        adresse: demandeData.adresse,
        date_naissance: demandeData.date_naissance,
        nationalite: demandeData.nationalite,
        type_permis: demandeData.type_permis,
        etat_civil: demandeData.etat_civil,
        gerance_actuelle: demandeData.gerance_actuelle,
        contact_gerance: demandeData.contact_gerance,
        loyer_actuel: demandeData.loyer_actuel,
        depuis_le: demandeData.depuis_le,
        pieces_actuel: demandeData.pieces_actuel,
        charges_extraordinaires: demandeData.charges_extraordinaires,
        montant_charges_extra: demandeData.montant_charges_extra,
        poursuites: demandeData.poursuites,
        curatelle: demandeData.curatelle,
        motif_changement: demandeData.motif_changement,
        profession: demandeData.profession,
        employeur: demandeData.employeur,
        revenus_mensuels: demandeData.revenus_mensuels,
        date_engagement: demandeData.date_engagement,
        utilisation_logement: demandeData.utilisation_logement,
        animaux: demandeData.animaux,
        instrument_musique: demandeData.instrument_musique,
        vehicules: demandeData.vehicules,
        numero_plaques: demandeData.numero_plaques,
        decouverte_agence: demandeData.decouverte_agence,
        type_recherche: demandeData.type_recherche,
        type_bien: demandeData.type_bien,
        pieces: demandeData.pieces_recherche,
        region_recherche: demandeData.region_recherche,
        budget_max: demandeData.budget_max,
        apport_personnel: demandeData.apport_personnel,
        souhaits_particuliers: demandeData.souhaits_particuliers,
        nombre_occupants: demandeData.nombre_occupants,
        mandat_signature_data: demandeData.signature_data,
        mandat_date_signature: demandeData.cgv_acceptees_at
      };
      
      // Get candidates from demande JSON
      candidatesData = demandeData.candidats || [];
    }
    
    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 50;
    const lineHeight = 14;
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;
    
    const isPurchase = clientData.type_recherche === 'Acheter';
    
    const addText = (text: string, x: number, y: number, size: number, font = helveticaFont, color = rgb(0, 0, 0)) => {
      const safeText = sanitizeText(text);
      page.drawText(safeText, { x, y, size, font, color });
    };
    
    const checkNewPage = () => {
      if (yPosition < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }
    };
    
    const drawSectionTitle = (title: string) => {
      checkNewPage();
      page.drawRectangle({
        x: margin - 5,
        y: yPosition - 5,
        width: pageWidth - 2 * margin + 10,
        height: 22,
        color: rgb(0.1, 0.2, 0.4),
      });
      addText(title, margin, yPosition, 11, helveticaBold, rgb(1, 1, 1));
      yPosition -= 30;
    };
    
    // ===== HEADER =====
    addText('IMMO-RAMA SA', margin, yPosition, 20, helveticaBold, rgb(0.1, 0.2, 0.4));
    yPosition -= 25;
    addText('MANDAT DE RECHERCHE EXCLUSIF', margin, yPosition, 14, helveticaBold);
    yPosition -= 18;
    addText(isPurchase ? 'Pour un bien immobilier a acheter' : 'Pour un logement a louer', margin, yPosition, 11);
    yPosition -= 30;
    
    // ===== 1. INFORMATIONS PERSONNELLES DU MANDANT =====
    drawSectionTitle('1. INFORMATIONS PERSONNELLES DU MANDANT');
    
    const personalRows = [
      [`Nom: ${profileData?.nom || '-'}`, `Prenom: ${profileData?.prenom || '-'}`],
      [`Email: ${profileData?.email || '-'}`, `Telephone: ${profileData?.telephone || '-'}`],
      [`Adresse: ${clientData.adresse || '-'}`, ''],
      [`Date de naissance: ${formatDate(clientData.date_naissance)}`, `Nationalite: ${clientData.nationalite || '-'}`],
      [`Type de permis: ${clientData.type_permis || '-'}`, `Etat civil: ${clientData.etat_civil || '-'}`],
    ];
    
    for (const row of personalRows) {
      addText(row[0], margin, yPosition, 10);
      if (row[1]) addText(row[1], margin + 270, yPosition, 10);
      yPosition -= lineHeight;
    }
    yPosition -= 15;
    
    // ===== 2. SITUATION ACTUELLE =====
    drawSectionTitle('2. SITUATION ACTUELLE');
    
    const situationRows = [
      [`Gerance actuelle: ${clientData.gerance_actuelle || '-'}`, `Contact: ${clientData.contact_gerance || '-'}`],
      [`Loyer actuel: ${formatCurrency(clientData.loyer_actuel)}`, `Pieces: ${clientData.pieces_actuel || '-'}`],
      [`Locataire depuis: ${formatDate(clientData.depuis_le)}`, `Motif changement: ${clientData.motif_changement || '-'}`],
    ];
    
    for (const row of situationRows) {
      addText(row[0], margin, yPosition, 10);
      if (row[1]) addText(row[1], margin + 270, yPosition, 10);
      yPosition -= lineHeight;
    }
    yPosition -= 15;
    
    // ===== 3. SITUATION PROFESSIONNELLE ET FINANCIERE =====
    drawSectionTitle('3. SITUATION PROFESSIONNELLE ET FINANCIERE');
    
    const financialRows = [
      [`Profession: ${clientData.profession || '-'}`, `Employeur: ${clientData.employeur || '-'}`],
      [`Revenus mensuels: ${formatCurrency(clientData.revenus_mensuels)}`, `Utilisation: ${clientData.utilisation_logement || '-'}`],
      [`Charges extraordinaires: ${clientData.charges_extraordinaires ? 'Oui' : 'Non'}`, clientData.charges_extraordinaires ? `Montant: ${formatCurrency(clientData.montant_charges_extra)}` : ''],
      [`Poursuites: ${clientData.poursuites ? 'Oui' : 'Non'}`, `Curatelle: ${clientData.curatelle ? 'Oui' : 'Non'}`],
    ];
    
    for (const row of financialRows) {
      addText(row[0], margin, yPosition, 10);
      if (row[1]) addText(row[1], margin + 270, yPosition, 10);
      yPosition -= lineHeight;
    }
    yPosition -= 15;
    
    // ===== 4. CRITERES DE RECHERCHE =====
    drawSectionTitle('4. CRITERES DE RECHERCHE');
    
    const searchRows = [
      [`Type de recherche: ${clientData.type_recherche || '-'}`, `Type de bien: ${clientData.type_bien || '-'}`],
      [`Pieces: ${clientData.pieces || '-'}`, `Region: ${clientData.region_recherche || '-'}`],
      [`Budget max: ${formatCurrency(clientData.budget_max)}`, `Occupants: ${clientData.nombre_occupants || '-'}`],
    ];
    
    if (isPurchase && clientData.apport_personnel) {
      searchRows.push([`Apport personnel: ${formatCurrency(clientData.apport_personnel)}`, '']);
    }
    
    for (const row of searchRows) {
      addText(row[0], margin, yPosition, 10);
      if (row[1]) addText(row[1], margin + 270, yPosition, 10);
      yPosition -= lineHeight;
    }
    
    if (clientData.souhaits_particuliers) {
      yPosition -= 5;
      addText(`Souhaits particuliers: ${clientData.souhaits_particuliers}`, margin, yPosition, 10);
      yPosition -= lineHeight;
    }
    
    // Informations complémentaires
    yPosition -= 10;
    const vehiculeInfo = clientData.vehicules ? `Oui${clientData.numero_plaques ? ` (${clientData.numero_plaques})` : ''}` : 'Non';
    addText(`Animaux: ${clientData.animaux ? 'Oui' : 'Non'}`, margin, yPosition, 9);
    addText(`Instrument: ${clientData.instrument_musique ? 'Oui' : 'Non'}`, margin + 150, yPosition, 9);
    addText(`Vehicule: ${vehiculeInfo}`, margin + 300, yPosition, 9);
    yPosition -= 20;
    
    // ===== 5. CANDIDATS ASSOCIES (GARANTS / CODEBITEURS) =====
    if (candidatesData && candidatesData.length > 0) {
      drawSectionTitle(`5. CANDIDATS ASSOCIES (${candidatesData.length})`);
      
      for (let i = 0; i < candidatesData.length; i++) {
        const candidat = candidatesData[i];
        
        if (yPosition < margin + 180) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
          addText(`5. CANDIDATS ASSOCIES (suite)`, margin, yPosition, 12, helveticaBold);
          yPosition -= 25;
        }
        
        // Header
        const typeLabel = candidat.type === 'garant' ? 'GARANT' : 
                          candidat.type === 'co_debiteur' ? 'CO-DEBITEUR' : 
                          candidat.type === 'colocataire' ? 'COLOCATAIRE' : 'CANDIDAT';
        addText(`${typeLabel}: ${candidat.prenom || ''} ${candidat.nom || ''}`, margin, yPosition, 11, helveticaBold);
        if (candidat.lien_avec_client) {
          addText(`(${candidat.lien_avec_client})`, margin + 250, yPosition, 9, helveticaFont, rgb(0.4, 0.4, 0.4));
        }
        yPosition -= lineHeight + 5;
        
        // Separator
        page.drawLine({
          start: { x: margin, y: yPosition + 5 },
          end: { x: pageWidth - margin, y: yPosition + 5 },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });
        yPosition -= 10;
        
        // Personal info
        addText('Informations personnelles', margin, yPosition, 9, helveticaBold, rgb(0.3, 0.3, 0.3));
        yPosition -= lineHeight;
        addText(`Date naissance: ${formatDate(candidat.date_naissance)}`, margin, yPosition, 9);
        addText(`Nationalite: ${candidat.nationalite || '-'}`, margin + 270, yPosition, 9);
        yPosition -= lineHeight;
        addText(`Type permis: ${candidat.type_permis || '-'}`, margin, yPosition, 9);
        addText(`Situation familiale: ${candidat.situation_familiale || '-'}`, margin + 270, yPosition, 9);
        yPosition -= lineHeight;
        
        if (candidat.email || candidat.telephone) {
          addText(`Email: ${candidat.email || '-'}   |   Tel: ${candidat.telephone || '-'}`, margin, yPosition, 9);
          yPosition -= lineHeight;
        }
        yPosition -= 5;
        
        // Professional
        addText('Situation professionnelle', margin, yPosition, 9, helveticaBold, rgb(0.3, 0.3, 0.3));
        yPosition -= lineHeight;
        addText(`Profession: ${candidat.profession || '-'}`, margin, yPosition, 9);
        addText(`Employeur: ${candidat.employeur || '-'}`, margin + 270, yPosition, 9);
        yPosition -= lineHeight;
        
        // Financial
        addText('Situation financiere', margin, yPosition, 9, helveticaBold, rgb(0.3, 0.3, 0.3));
        yPosition -= lineHeight;
        addText(`Revenus mensuels: ${formatCurrency(candidat.revenus_mensuels)}`, margin, yPosition, 9);
        yPosition -= lineHeight;
        
        const indicators = [];
        indicators.push(`Poursuites: ${candidat.poursuites ? 'Oui' : 'Non'}`);
        indicators.push(`Curatelle: ${candidat.curatelle ? 'Oui' : 'Non'}`);
        indicators.push(`Autres credits: ${candidat.autres_credits ? 'Oui' : 'Non'}`);
        addText(indicators.join('   |   '), margin, yPosition, 9);
        yPosition -= 25;
      }
    }
    
    // ===== 6. DISPOSITIONS DU MANDAT =====
    checkNewPage();
    drawSectionTitle('6. DISPOSITIONS DU MANDAT');
    
    const acompte = isPurchase ? 2500 : 300;
    
    const dispositions = [
      `- Acompte: ${acompte} CHF pour l'activation des recherches`,
      '- Commission: 1 mois de loyer brut a la signature du bail',
      '- Commission minimale: CHF 500.- (hors TVA)',
      '- Validite du mandat: 3 mois, renouvelable',
      '- En cas de non-renouvellement, l\'acompte est restitue sous 30 jours',
      '- Resiliation: par lettre recommandee au moins 30 jours avant echeance',
    ];
    
    for (const disp of dispositions) {
      addText(disp, margin, yPosition, 9);
      yPosition -= lineHeight;
    }
    yPosition -= 10;
    
    addText('Coordonnees bancaires:', margin, yPosition, 10, helveticaBold);
    yPosition -= lineHeight;
    addText('Beneficiaire: Immo-Rama, Chemin de l\'Esparcette 5, 1023 Crissier', margin, yPosition, 9);
    yPosition -= lineHeight;
    addText('IBAN: CH87 8080 8004 9815 5643 7', margin, yPosition, 9);
    yPosition -= lineHeight;
    addText('SWIFT-BIC: RAIFCH22 | BANQUE RAIFFEISEN DU GROS DE VAUD', margin, yPosition, 9);
    yPosition -= 25;
    
    // ===== 7. SIGNATURE ET VALIDATION =====
    checkNewPage();
    drawSectionTitle('7. SIGNATURE ET VALIDATION');
    
    const signatureDate = clientData.mandat_date_signature || demandeData?.cgv_acceptees_at;
    addText(`Fait a Lausanne, le ${formatDate(signatureDate || new Date().toISOString())}`, margin, yPosition, 10);
    yPosition -= 25;
    
    // Embed signature
    const signatureData = clientData.mandat_signature_data || demandeData?.signature_data;
    if (signatureData && signatureData.startsWith('data:image')) {
      try {
        const base64Data = signatureData.split(',')[1];
        const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const signatureImage = await pdfDoc.embedPng(signatureBytes);
        
        const signatureWidth = 200;
        const signatureHeight = (signatureImage.height / signatureImage.width) * signatureWidth;
        
        page.drawImage(signatureImage, {
          x: margin,
          y: yPosition - signatureHeight,
          width: signatureWidth,
          height: signatureHeight,
        });
        
        yPosition -= signatureHeight + 10;
      } catch (error) {
        console.error('Error embedding signature:', error);
        addText('[Signature electronique]', margin, yPosition, 10);
        yPosition -= 20;
      }
    } else {
      addText('[Signature non disponible]', margin, yPosition, 10, helveticaFont, rgb(0.5, 0.5, 0.5));
      yPosition -= 20;
    }
    
    addText(`${profileData?.prenom || ''} ${profileData?.nom || ''}`, margin, yPosition, 10, helveticaBold);
    yPosition -= lineHeight;
    addText('Mandant', margin, yPosition, 9, helveticaFont, rgb(0.4, 0.4, 0.4));
    
    // ===== 8. PIECES D'IDENTITE (if available) =====
    if (documentsData && documentsData.length > 0) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
      
      drawSectionTitle('8. COPIES DES PIECES D\'IDENTITE');
      
      for (const doc of documentsData) {
        if (!doc.url) continue;
        
        addText(`Document: ${doc.nom || doc.type_document}`, margin, yPosition, 10);
        yPosition -= lineHeight;
        
        // Try to embed image if it's an image
        if (doc.type && (doc.type.includes('image/png') || doc.type.includes('image/jpeg'))) {
          try {
            // Fetch the image from storage
            const { data: fileData, error: fetchError } = await supabaseAdmin.storage
              .from('client-documents')
              .download(doc.url);
            
            if (!fetchError && fileData) {
              const imageBytes = new Uint8Array(await fileData.arrayBuffer());
              let embeddedImage;
              
              if (doc.type.includes('png')) {
                embeddedImage = await pdfDoc.embedPng(imageBytes);
              } else {
                embeddedImage = await pdfDoc.embedJpg(imageBytes);
              }
              
              const maxWidth = pageWidth - 2 * margin;
              const maxHeight = 300;
              let imgWidth = embeddedImage.width;
              let imgHeight = embeddedImage.height;
              
              if (imgWidth > maxWidth) {
                imgHeight = (maxWidth / imgWidth) * imgHeight;
                imgWidth = maxWidth;
              }
              if (imgHeight > maxHeight) {
                imgWidth = (maxHeight / imgHeight) * imgWidth;
                imgHeight = maxHeight;
              }
              
              if (yPosition - imgHeight < margin) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                yPosition = pageHeight - margin;
              }
              
              page.drawImage(embeddedImage, {
                x: margin,
                y: yPosition - imgHeight,
                width: imgWidth,
                height: imgHeight,
              });
              
              yPosition -= imgHeight + 20;
            }
          } catch (imgError) {
            console.error('Error embedding document image:', imgError);
            addText(`[Image non disponible: ${doc.nom}]`, margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
            yPosition -= lineHeight;
          }
        } else {
          addText(`[Document PDF - voir piece jointe: ${doc.nom}]`, margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
          yPosition -= lineHeight;
        }
        yPosition -= 10;
      }
    }
    
    // Footer on each page
    const pages = pdfDoc.getPages();
    pages.forEach((p, index) => {
      p.drawText(sanitizeText(`IMMO-RAMA SA - Mandat de recherche complet - Page ${index + 1}/${pages.length}`), {
        x: margin,
        y: 30,
        size: 8,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    });
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Convert to base64 in chunks to avoid stack overflow
    const chunkSize = 8192;
    let pdfBase64 = '';
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.slice(i, i + chunkSize);
      pdfBase64 += String.fromCharCode(...chunk);
    }
    pdfBase64 = btoa(pdfBase64);
    
    console.log(`Full mandat PDF generated, size: ${pdfBytes.length} bytes`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf_base64: pdfBase64,
        filename: `Mandat_Complet_${sanitizeText(profileData?.nom || 'client')}_${sanitizeText(profileData?.prenom || '')}.pdf`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-full-mandat-pdf function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
