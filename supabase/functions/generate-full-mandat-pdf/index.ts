import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Native base64 encoder for Uint8Array - avoids stack overflow
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  let i = 0;
  
  while (i < len) {
    const a = bytes[i++];
    const b = i < len ? bytes[i++] : 0;
    const c = i < len ? bytes[i++] : 0;
    
    const triplet = (a << 16) | (b << 8) | c;
    
    result += base64chars[(triplet >> 18) & 0x3F];
    result += base64chars[(triplet >> 12) & 0x3F];
    result += i > len + 1 ? '=' : base64chars[(triplet >> 6) & 0x3F];
    result += i > len ? '=' : base64chars[triplet & 0x3F];
  }
  
  return result;
}

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

// Extract storage path from URL (handle both full URLs and paths)
function extractStoragePath(url: string): string {
  if (!url) return url;
  
  // If it's already just a path, return it
  if (!url.startsWith('http')) return url;
  
  // Extract path from Supabase storage URL
  const patterns = [
    /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/,
    /\/storage\/v1\/object\/sign\/[^/]+\/(.+)\?/,
    /\/storage\/v1\/object\/authenticated\/[^/]+\/(.+)$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  // Try to get just the filename/path after the bucket
  const parts = url.split('/client-documents/');
  if (parts.length > 1) return parts[1].split('?')[0];
  
  return url;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, demande_id, core_only } = await req.json();
    
    if (!client_id && !demande_id) {
      throw new Error('client_id ou demande_id requis');
    }
    
    // core_only = true means generate PDF without embedding identity documents (for client-side assembly)
    const skipIdentityDocs = core_only === true;
    
    console.log(`Generating ${skipIdentityDocs ? 'CORE' : 'full'} mandat PDF for client_id: ${client_id}, demande_id: ${demande_id}`);
    
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
    
    // Helper function to draw multi-line text with wrapping
    const addWrappedText = (text: string, x: number, maxWidth: number, fontSize: number, font = helveticaFont): number => {
      const safeText = sanitizeText(text);
      const words = safeText.split(' ');
      let currentLine = '';
      let linesDrawn = 0;
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth > maxWidth && currentLine) {
          page.drawText(currentLine, { x, y: yPosition, size: fontSize, font, color: rgb(0, 0, 0) });
          yPosition -= lineHeight;
          linesDrawn++;
          currentLine = word;
          checkNewPage();
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        page.drawText(currentLine, { x, y: yPosition, size: fontSize, font, color: rgb(0, 0, 0) });
        yPosition -= lineHeight;
        linesDrawn++;
      }
      
      return linesDrawn;
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
    
    // ===== 6. DISPOSITIONS OFFICIELLES DU MANDAT =====
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
    drawSectionTitle('6. DISPOSITIONS DU MANDAT');
    
    const maxTextWidth = pageWidth - 2 * margin - 20;
    
    if (isPurchase) {
      // ACHAT - 5 articles officiels
      addText('MANDAT DE RECHERCHE DE BIEN FONCIER', margin, yPosition, 11, helveticaBold);
      yPosition -= 20;
      
      // Article 1
      addText('1. MANDAT', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "Le mandant charge le mandataire de lui presenter le bien ci-apres designe et d'intervenir en tant qu'intermediaire dans le suivi, la negociation et la conclusion dudit mandat.",
        margin, maxTextWidth, 9
      );
      yPosition -= 10;
      
      // Article 2
      checkNewPage();
      addText('2. DUREE', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "Le present contrat est conclu pour une duree de 6 mois a compter de sa date de signature. En l'absence de resiliation, par lettre recommandee, au moins 30 jours avant son echeance, le present contrat est repute renouvele par reconduction tacite, a chaque fois pour 3 mois supplementaires.",
        margin, maxTextWidth, 9
      );
      yPosition -= 10;
      
      // Article 3
      checkNewPage();
      addText('3. HONORAIRES', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "Le mandant s'engage a payer au mandataire, a la conclusion de l'acte de vente chez un notaire, le montant correspondant a 1% du prix de vente defini entre les parties.",
        margin, maxTextWidth, 9
      );
      yPosition -= 5;
      addWrappedText(
        "Un acompte de CHF 2'500.- est du pour activer vos recherches, et sera deduit de la commission en cas de reussite ou rembourse totalement en cas d'echec.",
        margin, maxTextWidth, 9
      );
      yPosition -= 5;
      addWrappedText(
        "En toute confidentialite le mandataire s'engage egalement a communiquer au mandant toutes les informations necessaires pour au bon deroulement de cette mission.",
        margin, maxTextWidth, 9
      );
      yPosition -= 5;
      addWrappedText(
        "Si le mandant se porte acquereur, par ses propres moyens ou par tout autre moyen, d'un bien presente par le mandataire, la commission est integralement due au mandataire.",
        margin, maxTextWidth, 9
      );
      yPosition -= 10;
      
      // Article 4
      checkNewPage();
      addText('4. MODIFICATION DU CONTRAT', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "Le present contrat constitue l'integralite de l'accord passe par le Mandant et le Mandataire. Il ne pourra etre modifie si ce n'est par un accord ecrit subsequent entre les parties.",
        margin, maxTextWidth, 9
      );
      yPosition -= 10;
      
      // Article 5
      checkNewPage();
      addText('5. ELECTION DE FOR ET DE DROIT', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "En cas de litige relatif a l'interpretation ou a l'execution du present contrat, les parties acceptent la competence exclusive des tribunaux genevois, sous reserve d'un recours au Tribunal Federal. Le droit suisse est applicable, sous reserve des dispositions prevues dans le present contrat.",
        margin, maxTextWidth, 9
      );
      yPosition -= 15;
      
    } else {
      // LOCATION - 11 articles officiels
      addText('DISPOSITIONS DU MANDAT DE RECHERCHE - LOCATION', margin, yPosition, 11, helveticaBold);
      yPosition -= 20;
      
      // Article 1
      addText('1.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Les chercheurs de logement (chercheurs) chargent Immo-Rama de leur entremettre des offres de logement ou locaux commerciaux pour la location. A ce propos, Immo-Rama transmet aux chercheurs les informations necessaires pour qu'ils puissent prendre contact, ou alors c'est Immo-Rama qui contacte les offreurs. Si le chercheur a d'ailleurs rempli des criteres de recherche, Immo-Rama lui transmet de nouvelles offres qui correspondent aux criteres de recherche.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 2
      checkNewPage();
      addText('2.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Au cas ou un contrat de bail serait conclu avec un objet ou un offreur propose par Immo-Rama, une commission d'agence est due. Les chercheurs doivent egalement payer une commission lorsqu'un contrat a ete conclu avec l'offreur fourni concernant un autre objet que celui indique par Immo-Rama. La commission depend du prix du loyer brut.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 2.1 (highlighted)
      checkNewPage();
      page.drawRectangle({
        x: margin,
        y: yPosition - 35,
        width: pageWidth - 2 * margin,
        height: 45,
        color: rgb(0.95, 0.95, 1),
      });
      addText('2.1', margin + 5, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "La commission est de 1 mois de loyer brut (loyer avec les charges) a la signature du contrat de bail. Une caution a hauteur de CHF 300.- doit etre versee pour l'activation de votre dossier. Elle sera comptabilisee en cas de reussite et deductible. Le mandat de recherche est valable 3 mois, passe ce delai, le mandat est renouvelable ou prend fin.",
        margin + 25, maxTextWidth - 30, 9
      );
      yPosition -= 10;
      
      // Article 2.2
      checkNewPage();
      addText('2.2', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "La commission minimale est de CHF 500.-. La commission ne comprend pas la TVA.",
        margin + 25, maxTextWidth - 25, 9
      );
      yPosition -= 8;
      
      // Article 2.3
      checkNewPage();
      addText('2.3', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "En cas de resiliation du mandat avant terme, l'acompte ne sera pas remboursee, ni entierement, ni partiellement.",
        margin + 25, maxTextWidth - 25, 9
      );
      yPosition -= 8;
      
      // Article 3
      checkNewPage();
      addText('3.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Les chercheurs s'engagent a declarer immediatement a Immo-Rama toute conclusion de contrat par oral ou par ecrit ainsi que des prolongations ou renouvellements de contrat et des modifications apportees a leur mandat de recherche.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 4
      checkNewPage();
      addText('4.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Lorsque les chercheurs connaissent les adresses proposees par Immo-Rama d'une autre source, ils doivent le faire savoir a Immo-Rama dans un delai de 24 heures.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 5
      checkNewPage();
      addText('5.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Immo-Rama se reserve le droit de demander des securites, des references ou des preuves de la part des chercheurs ou de refuser des chercheurs potentiels sans donner de raisons.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 6
      checkNewPage();
      addText('6.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Les informations donnees par Immo-Rama aux chercheurs ne peuvent etre remises a des tierces personnes.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 7
      checkNewPage();
      addText('7.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Lorsqu'Immo-Rama est informee de la conclusion d'un contrat de location, il annule le mandat de recherche.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 8
      checkNewPage();
      addText('8.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Si un client sous contrat confirme par ecrit ou verbalement que son dossier de candidature pour un logement peut etre transmis a la gerance en charge, Immo-Rama aura droit a une commission.",
        margin + 20, maxTextWidth - 20, 9
      );
      yPosition -= 8;
      
      // Article 9 (highlighted)
      checkNewPage();
      page.drawRectangle({
        x: margin,
        y: yPosition - 35,
        width: pageWidth - 2 * margin,
        height: 45,
        color: rgb(0.97, 0.97, 0.97),
      });
      addText('9. Position de Immo-Rama', margin + 5, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "Immo-Rama ne peut assurer aucune garantie de succes quant a la conclusion d'un contrat. Les contrats sont passes directement entre les chercheurs et les offreurs.",
        margin + 25, maxTextWidth - 30, 9
      );
      yPosition -= 10;
      
      // Article 10
      checkNewPage();
      addText('10.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "Les chercheurs autorisent Immo-Rama a transmettre les donnees indiquees ainsi que les resultats des demandes concernant la solvabilite et la reference a des offreurs potentiels.",
        margin + 25, maxTextWidth - 25, 9
      );
      yPosition -= 8;
      
      // Article 11
      checkNewPage();
      addText('11.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      addWrappedText(
        "La juridiction competente est Berne (Suisse). Le Code des obligations suisse (CO) fait foi.",
        margin + 25, maxTextWidth - 25, 9
      );
      yPosition -= 15;
    }
    
    // ===== INFORMATIONS BANCAIRES =====
    checkNewPage();
    yPosition -= 10;
    page.drawRectangle({
      x: margin - 5,
      y: yPosition - 85,
      width: pageWidth - 2 * margin + 10,
      height: 95,
      color: rgb(0.95, 0.97, 1),
    });
    
    addText('INFORMATIONS BANCAIRES POUR L\'ACTIVATION DE VOS RECHERCHES', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    yPosition -= 5;
    addText('Votre dossier sera active des reception du paiement ou de la preuve de paiement.', margin, yPosition, 8, helveticaFont, rgb(0.4, 0.4, 0.4));
    yPosition -= 18;
    
    addText('BANQUE RAIFFEISEN DU GROS DE VAUD', margin, yPosition, 10, helveticaBold);
    yPosition -= lineHeight;
    addText('Agence Immo-Rama', margin, yPosition, 9);
    yPosition -= lineHeight;
    addText('Chemin de l\'Esparcette 5, 1023 Crissier', margin, yPosition, 9);
    yPosition -= lineHeight + 5;
    
    addText('IBAN: CH87 8080 8004 9815 5643 7', margin, yPosition, 10, helveticaBold);
    addText('SWIFT-BIC: RAIFCH22', margin + 250, yPosition, 10);
    yPosition -= lineHeight + 5;
    
    const acompte = isPurchase ? "2'500 CHF" : "300 CHF";
    addText(`Acompte pour l'activation de vos recherches: ${acompte}`, margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    yPosition -= 30;
    
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
    
    // ===== 8. PIECES D'IDENTITE (if available and NOT core_only mode) =====
    // In core_only mode, skip embedding identity documents to save memory
    // The client-side will assemble these documents separately
    if (!skipIdentityDocs && documentsData && documentsData.length > 0) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
      
      drawSectionTitle('8. COPIES DES PIECES D\'IDENTITE');
      
      for (const doc of documentsData) {
        if (!doc.url) continue;
        
        const storagePath = extractStoragePath(doc.url);
        console.log(`Processing document: ${doc.nom}, path: ${storagePath}, type: ${doc.type}`);
        
        addText(`Document: ${doc.nom || doc.type_document}`, margin, yPosition, 10);
        yPosition -= lineHeight;
        
        // Try to embed based on file type
        const mimeType = doc.type?.toLowerCase() || '';
        const isImage = mimeType.includes('image/png') || mimeType.includes('image/jpeg') || mimeType.includes('image/jpg');
        const isPdf = mimeType.includes('application/pdf') || doc.nom?.toLowerCase().endsWith('.pdf');
        
        if (isImage) {
          try {
            // Fetch the image from storage
            const { data: fileData, error: fetchError } = await supabaseAdmin.storage
              .from('client-documents')
              .download(storagePath);
            
            if (!fetchError && fileData) {
              const imageBytes = new Uint8Array(await fileData.arrayBuffer());
              let embeddedImage;
              
              if (mimeType.includes('png')) {
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
              console.log(`Successfully embedded image: ${doc.nom}`);
            } else {
              console.error(`Failed to download image: ${fetchError?.message}`);
              addText(`[Image non disponible: ${doc.nom}]`, margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
              yPosition -= lineHeight;
            }
          } catch (imgError) {
            console.error('Error embedding document image:', imgError);
            addText(`[Erreur image: ${doc.nom}]`, margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
            yPosition -= lineHeight;
          }
        } else if (isPdf) {
          try {
            // Fetch the PDF from storage
            const { data: fileData, error: fetchError } = await supabaseAdmin.storage
              .from('client-documents')
              .download(storagePath);
            
            if (!fetchError && fileData) {
              const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
              const externalPdf = await PDFDocument.load(pdfBytes);
              
              // ALL PAGES: Copy all pages from identity document (up to 30 max per document)
              const MAX_PAGES = 30;
              const totalPages = externalPdf.getPageCount();
              const pagesToCopy = Math.min(totalPages, MAX_PAGES);
              const pageIndicesToCopy = externalPdf.getPageIndices().slice(0, pagesToCopy);
              const copiedPages = await pdfDoc.copyPages(externalPdf, pageIndicesToCopy);
              
              for (const copiedPage of copiedPages) {
                pdfDoc.addPage(copiedPage);
              }
              
              const truncatedMessage = totalPages > MAX_PAGES 
                ? ` (${pagesToCopy}/${totalPages} pages integrees - limite atteinte)`
                : '';
              
              addText(`[Document PDF integre: ${copiedPages.length} page(s)${truncatedMessage}]`, margin, yPosition, 9, helveticaFont, rgb(0.2, 0.5, 0.2));
              yPosition -= lineHeight;
              console.log(`Successfully embedded PDF: ${doc.nom} with ${copiedPages.length}/${totalPages} pages`);
            } else {
              console.error(`Failed to download PDF: ${fetchError?.message}`);
              addText(`[PDF non disponible: ${doc.nom}]`, margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
              yPosition -= lineHeight;
            }
          } catch (pdfError) {
            console.error('Error embedding document PDF:', pdfError);
            addText(`[Erreur PDF: ${doc.nom}]`, margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
            yPosition -= lineHeight;
          }
        } else {
          addText(`[Format non supporte: ${doc.type || 'inconnu'}]`, margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
          yPosition -= lineHeight;
        }
        yPosition -= 10;
      }
    } else if (skipIdentityDocs && documentsData && documentsData.length > 0) {
      // In core_only mode, just add a placeholder page indicating documents will be added
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
      
      drawSectionTitle('8. PIECES D\'IDENTITE');
      addText(`${documentsData.length} document(s) d'identite a integrer`, margin, yPosition, 10);
      yPosition -= lineHeight;
      addText('(Documents integres dans le mandat complet)', margin, yPosition, 9, helveticaFont, rgb(0.5, 0.5, 0.5));
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
    
    // Convert to base64 using native encoder (no stack overflow)
    const pdfBase64 = uint8ArrayToBase64(pdfBytes);
    
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
