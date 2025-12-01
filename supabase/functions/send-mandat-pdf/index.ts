import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MandatData {
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  date_naissance: string;
  nationalite: string;
  type_permis: string;
  etat_civil: string;
  gerance_actuelle: string;
  contact_gerance: string;
  loyer_actuel: number;
  depuis_le: string;
  pieces_actuel: number;
  charges_extraordinaires: boolean;
  montant_charges_extra: number;
  poursuites: boolean;
  curatelle: boolean;
  motif_changement: string;
  profession: string;
  employeur: string;
  revenus_mensuels: number;
  date_engagement: string;
  utilisation_logement: string;
  animaux: boolean;
  instrument_musique: boolean;
  vehicules: boolean;
  numero_plaques: string;
  decouverte_agence: string;
  type_recherche: string;
  nombre_occupants: number;
  type_bien: string;
  pieces_recherche: string;
  region_recherche: string;
  budget_max: number;
  apport_personnel: number;
  souhaits_particuliers: string;
  candidats: any[];
  signature_data: string;
  code_promo: string;
}

// Sanitize text to remove Unicode characters that can't be encoded in WinAnsi
function sanitizeText(text: string | null | undefined): string {
  if (!text) return '-';
  return String(text)
    .replace(/\u202f/g, ' ')  // Narrow no-break space → normal space
    .replace(/\u00a0/g, ' ')  // No-break space → normal space
    .replace(/'/g, "'")       // Right single quotation mark → apostrophe
    .replace(/'/g, "'")       // Left single quotation mark → apostrophe
    .replace(/"/g, '"')       // Left double quotation mark → quote
    .replace(/"/g, '"')       // Right double quotation mark → quote
    .replace(/[–—]/g, '-')    // En/Em dash → hyphen
    .replace(/…/g, '...')     // Ellipsis → three dots
    .replace(/[\u2000-\u200B]/g, ' ')  // Various Unicode spaces → normal space
    .replace(/[^\x00-\x7F]/g, (char) => {
      // Keep accented characters that WinAnsi supports
      const supported = 'àâäçéèêëîïôùûüÿœæÀÂÄÇÉÈÊËÎÏÔÙÛÜŸŒÆ°€£¥©®™±×÷';
      return supported.includes(char) ? char : '';
    });
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return sanitizeText(`${day} ${month} ${year}`);
  } catch {
    return sanitizeText(dateString);
  }
}

function formatCurrency(value: number): string {
  if (!value) return '-';
  // Format without toLocaleString to avoid Unicode issues
  const formatted = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${formatted} CHF`;
}

async function generateMandatPDF(data: MandatData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 14;
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;
  
  const isPurchase = data.type_recherche === 'Acheter';
  const acompte = isPurchase ? 2500 : 300;
  
  // Helper function to add text with sanitization
  const addText = (text: string, x: number, y: number, size: number, font = helveticaFont, color = rgb(0, 0, 0)) => {
    const safeText = sanitizeText(text);
    page.drawText(safeText, { x, y, size, font, color });
  };
  
  // Helper function to check and add new page if needed
  const checkNewPage = () => {
    if (yPosition < margin + 100) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  };
  
  // Title
  addText('MANDAT DE RECHERCHE', margin, yPosition, 18, helveticaBold);
  yPosition -= 25;
  addText(isPurchase ? 'Pour un bien immobilier a acheter' : 'Pour un logement a louer', margin, yPosition, 12);
  yPosition -= 10;
  addText(`Date: ${formatDate(new Date().toISOString())}`, margin, yPosition, 10, helveticaFont, rgb(0.4, 0.4, 0.4));
  yPosition -= 30;
  
  // Section 1: Informations personnelles
  addText('1. INFORMATIONS PERSONNELLES', margin, yPosition, 12, helveticaBold);
  yPosition -= 20;
  
  const personalInfo = [
    [`Nom complet: ${data.prenom} ${data.nom}`, `Email: ${data.email}`],
    [`Telephone: ${data.telephone}`, `Adresse: ${data.adresse}`],
    [`Date de naissance: ${formatDate(data.date_naissance)}`, `Nationalite: ${data.nationalite}`],
    [`Type de permis: ${data.type_permis}`, `Etat civil: ${data.etat_civil}`],
  ];
  
  for (const row of personalInfo) {
    addText(row[0], margin, yPosition, 10);
    addText(row[1], margin + 270, yPosition, 10);
    yPosition -= lineHeight;
  }
  yPosition -= 15;
  
  // Section 2: Situation actuelle
  checkNewPage();
  addText('2. SITUATION ACTUELLE', margin, yPosition, 12, helveticaBold);
  yPosition -= 20;
  
  const currentSituation = [
    [`Gerance actuelle: ${data.gerance_actuelle}`, `Contact: ${data.contact_gerance}`],
    [`Loyer actuel: ${formatCurrency(data.loyer_actuel)}`, `Pieces: ${data.pieces_actuel}`],
    [`Locataire depuis: ${formatDate(data.depuis_le)}`, `Motif: ${data.motif_changement}`],
  ];
  
  for (const row of currentSituation) {
    addText(row[0], margin, yPosition, 10);
    addText(row[1], margin + 270, yPosition, 10);
    yPosition -= lineHeight;
  }
  yPosition -= 15;
  
  // Section 3: Situation financière
  checkNewPage();
  addText('3. SITUATION PROFESSIONNELLE ET FINANCIERE', margin, yPosition, 12, helveticaBold);
  yPosition -= 20;
  
  const financialInfo = [
    [`Profession: ${data.profession}`, `Employeur: ${data.employeur}`],
    [`Revenus mensuels: ${formatCurrency(data.revenus_mensuels)}`, `Utilisation: ${data.utilisation_logement}`],
    [`Charges extraordinaires: ${data.charges_extraordinaires ? 'Oui' : 'Non'}`, data.charges_extraordinaires ? `Montant: ${formatCurrency(data.montant_charges_extra)}` : ''],
    [`Poursuites: ${data.poursuites ? 'Oui' : 'Non'}`, `Curatelle: ${data.curatelle ? 'Oui' : 'Non'}`],
  ];
  
  for (const row of financialInfo) {
    addText(row[0], margin, yPosition, 10);
    if (row[1]) addText(row[1], margin + 270, yPosition, 10);
    yPosition -= lineHeight;
  }
  yPosition -= 15;
  
  // Section 4: Critères de recherche
  checkNewPage();
  addText('4. CRITERES DE RECHERCHE', margin, yPosition, 12, helveticaBold);
  yPosition -= 20;
  
  const searchCriteria = [
    [`Type de recherche: ${data.type_recherche}`, `Type de bien: ${data.type_bien}`],
    [`Pieces: ${data.pieces_recherche}`, `Region: ${data.region_recherche}`],
    [`Budget max: ${formatCurrency(data.budget_max)}`, `Occupants: ${data.nombre_occupants}`],
  ];
  
  if (isPurchase) {
    searchCriteria.push([`Apport personnel: ${formatCurrency(data.apport_personnel)}`, '']);
  }
  
  for (const row of searchCriteria) {
    addText(row[0], margin, yPosition, 10);
    if (row[1]) addText(row[1], margin + 270, yPosition, 10);
    yPosition -= lineHeight;
  }
  
  if (data.souhaits_particuliers) {
    yPosition -= 5;
    addText(`Souhaits particuliers: ${data.souhaits_particuliers}`, margin, yPosition, 10);
    yPosition -= lineHeight;
  }
  yPosition -= 15;
  
  // Section 5: Informations complémentaires
  checkNewPage();
  addText('5. INFORMATIONS COMPLEMENTAIRES', margin, yPosition, 12, helveticaBold);
  yPosition -= 20;
  
  const vehiculeInfo = data.vehicules ? `Oui${data.numero_plaques ? ` (${data.numero_plaques})` : ''}` : 'Non';
  addText(`Animaux: ${data.animaux ? 'Oui' : 'Non'}`, margin, yPosition, 10);
  addText(`Instrument: ${data.instrument_musique ? 'Oui' : 'Non'}`, margin + 150, yPosition, 10);
  addText(`Vehicule: ${vehiculeInfo}`, margin + 300, yPosition, 10);
  yPosition -= 20;
  
  // Section 6: Candidats
  if (data.candidats && data.candidats.length > 0) {
    checkNewPage();
    addText(`6. CANDIDATS ASSOCIES (${data.candidats.length})`, margin, yPosition, 12, helveticaBold);
    yPosition -= 20;
    
    for (const candidat of data.candidats) {
      addText(`- ${candidat.prenom} ${candidat.nom} (${candidat.lien_avec_client})`, margin, yPosition, 10);
      yPosition -= lineHeight;
      addText(`  Profession: ${candidat.profession} | Revenus: ${formatCurrency(candidat.revenus_mensuels)}`, margin + 10, yPosition, 9, helveticaFont, rgb(0.4, 0.4, 0.4));
      yPosition -= lineHeight + 5;
    }
    yPosition -= 10;
  }
  
  // Section 7: Acompte
  checkNewPage();
  addText('ACOMPTE ET CONDITIONS', margin, yPosition, 12, helveticaBold);
  yPosition -= 20;
  
  addText(`Montant de l'acompte: ${acompte} CHF`, margin, yPosition, 11, helveticaBold);
  yPosition -= lineHeight;
  addText('Pour l\'activation de vos recherches de logement', margin, yPosition, 10);
  yPosition -= 20;
  
  addText('Coordonnees bancaires:', margin, yPosition, 10, helveticaBold);
  yPosition -= lineHeight;
  addText('Beneficiaire: IMMO-RAMA SA', margin, yPosition, 10);
  yPosition -= lineHeight;
  addText('IBAN: CH93 0076 7000 E525 8472 5', margin, yPosition, 10);
  yPosition -= lineHeight;
  addText('BIC: BCVLCH2LXXX | Banque Cantonale Vaudoise', margin, yPosition, 10);
  yPosition -= 30;
  
  // Dispositions du mandat (résumé)
  checkNewPage();
  addText('DISPOSITIONS DU MANDAT', margin, yPosition, 12, helveticaBold);
  yPosition -= 20;
  
  const dispositions = [
    '- Commission: 1 mois de loyer brut a la signature du bail',
    '- Commission minimale: CHF 500.- (hors TVA)',
    '- Validite du mandat: 3 mois, renouvelable',
    '- En cas de non-renouvellement, la caution est restituee sous 30 jours',
    '- Resiliation: par lettre recommandee au moins 30 jours avant echeance',
  ];
  
  for (const disp of dispositions) {
    addText(disp, margin, yPosition, 9);
    yPosition -= lineHeight;
  }
  yPosition -= 20;
  
  // Code promo
  if (data.code_promo) {
    addText(`Code promo: ${data.code_promo}`, margin, yPosition, 10);
    yPosition -= 20;
  }
  
  // Signature section
  checkNewPage();
  yPosition = Math.min(yPosition, 200);
  
  addText('SIGNATURE', margin, yPosition, 12, helveticaBold);
  yPosition -= 15;
  addText(`Fait a Lausanne, le ${formatDate(new Date().toISOString())}`, margin, yPosition, 10);
  yPosition -= 25;
  
  // Add signature image if available
  if (data.signature_data && data.signature_data.startsWith('data:image')) {
    try {
      const base64Data = data.signature_data.split(',')[1];
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
  }
  
  addText(`${data.prenom} ${data.nom}`, margin, yPosition, 10, helveticaBold);
  yPosition -= lineHeight;
  addText('Mandant', margin, yPosition, 9, helveticaFont, rgb(0.4, 0.4, 0.4));
  
  // Footer on each page
  const pages = pdfDoc.getPages();
  pages.forEach((p, index) => {
    p.drawText(sanitizeText(`IMMO-RAMA SA - Mandat de recherche - Page ${index + 1}/${pages.length}`), {
      x: margin,
      y: 30,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  });
  
  return pdfDoc.save();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: MandatData = await req.json();
    
    console.log(`Generating PDF for ${data.prenom} ${data.nom}...`);
    
    // Generate PDF
    const pdfBytes = await generateMandatPDF(data);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    
    console.log(`PDF generated, size: ${pdfBytes.length} bytes`);
    
    // Send email with PDF attachment
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@immo-rama.ch";
    const isPurchase = data.type_recherche === 'Acheter';
    const acompte = isPurchase ? 2500 : 300;
    
    // Format budget without Unicode issues
    const budgetFormatted = data.budget_max.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    
    const emailResponse = await resend.emails.send({
      from: `IMMO-RAMA <${fromEmail}>`,
      to: [data.email],
      subject: `Votre mandat de recherche signe - IMMO-RAMA`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #1a365d; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
            .highlight { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2d5a87; }
            .bank-info { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #1a365d; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>IMMO-RAMA</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Mandat de recherche signe</p>
            </div>
            <div class="content">
              <h2>Bonjour ${sanitizeText(data.prenom)},</h2>
              
              <p>Nous vous confirmons la reception de votre mandat de recherche pour ${isPurchase ? "l'achat d'un bien immobilier" : "la location d'un logement"}.</p>
              
              <p>Vous trouverez en piece jointe votre mandat signe au format PDF.</p>
              
              <div class="highlight">
                <strong>Recapitulatif de votre recherche:</strong>
                <ul style="margin: 10px 0;">
                  <li>Type: ${sanitizeText(data.type_recherche)}</li>
                  <li>Bien recherche: ${sanitizeText(data.type_bien)} - ${sanitizeText(data.pieces_recherche)} pieces</li>
                  <li>Region: ${sanitizeText(data.region_recherche)}</li>
                  <li>Budget: ${budgetFormatted} CHF</li>
                </ul>
              </div>
              
              <div class="bank-info">
                <strong>Pour activer votre dossier</strong>
                <p>Veuillez effectuer le virement de l'acompte de <strong>${acompte} CHF</strong>:</p>
                <ul style="list-style: none; padding: 0; margin: 10px 0;">
                  <li><strong>Beneficiaire:</strong> IMMO-RAMA SA</li>
                  <li><strong>IBAN:</strong> CH93 0076 7000 E525 8472 5</li>
                  <li><strong>BIC:</strong> BCVLCH2LXXX</li>
                  <li><strong>Banque:</strong> Banque Cantonale Vaudoise</li>
                </ul>
              </div>
              
              <p>Votre dossier sera active des reception du paiement.</p>
              
              <p>Cordialement,<br><strong>L'equipe IMMO-RAMA</strong></p>
            </div>
            <div class="footer">
              <p>IMMO-RAMA SA | Lausanne, Suisse</p>
              <p>${new Date().getFullYear()} Tous droits reserves</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Mandat_IMMO-RAMA_${sanitizeText(data.nom)}_${sanitizeText(data.prenom)}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-mandat-pdf function:", error);
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
