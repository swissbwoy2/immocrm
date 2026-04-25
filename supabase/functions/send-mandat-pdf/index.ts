import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
  payment_method?: 'twint' | 'qr_invoice';
  demande_id?: string;
  client_id?: string;
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
  
  // Section 6: Candidats associés (avec informations complètes)
  if (data.candidats && data.candidats.length > 0) {
    checkNewPage();
    addText(`6. CANDIDATS ASSOCIES (${data.candidats.length})`, margin, yPosition, 12, helveticaBold);
    yPosition -= 25;
    
    for (let i = 0; i < data.candidats.length; i++) {
      const candidat = data.candidats[i];
      
      // Check if we need a new page for this candidate (need at least 200px)
      if (yPosition < margin + 200) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
        addText(`6. CANDIDATS ASSOCIES (suite)`, margin, yPosition, 12, helveticaBold);
        yPosition -= 25;
      }
      
      // Header du candidat avec type et lien
      const typeLabel = candidat.type === 'garant' ? 'GARANT' : candidat.type === 'colocataire' ? 'COLOCATAIRE' : 'CANDIDAT';
      addText(`${typeLabel}: ${candidat.prenom || ''} ${candidat.nom || ''}`, margin, yPosition, 11, helveticaBold);
      if (candidat.lien_avec_client) {
        addText(`(${candidat.lien_avec_client})`, margin + 250, yPosition, 10, helveticaFont, rgb(0.4, 0.4, 0.4));
      }
      yPosition -= lineHeight + 5;
      
      // Ligne de séparation
      page.drawLine({
        start: { x: margin, y: yPosition + 5 },
        end: { x: pageWidth - margin, y: yPosition + 5 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      yPosition -= 10;
      
      // Informations personnelles
      addText('Informations personnelles', margin, yPosition, 9, helveticaBold, rgb(0.3, 0.3, 0.3));
      yPosition -= lineHeight;
      
      const personalRow1Left = `Date naissance: ${candidat.date_naissance ? formatDate(candidat.date_naissance) : '-'}`;
      const personalRow1Right = `Nationalite: ${candidat.nationalite || '-'}`;
      addText(personalRow1Left, margin, yPosition, 9);
      addText(personalRow1Right, margin + 270, yPosition, 9);
      yPosition -= lineHeight;
      
      const personalRow2Left = `Type permis: ${candidat.type_permis || '-'}`;
      const personalRow2Right = `Situation familiale: ${candidat.situation_familiale || '-'}`;
      addText(personalRow2Left, margin, yPosition, 9);
      addText(personalRow2Right, margin + 270, yPosition, 9);
      yPosition -= lineHeight;
      
      if (candidat.email || candidat.telephone) {
        const contactRow = `Email: ${candidat.email || '-'}   |   Tel: ${candidat.telephone || '-'}`;
        addText(contactRow, margin, yPosition, 9);
        yPosition -= lineHeight;
      }
      
      if (candidat.adresse) {
        addText(`Adresse: ${candidat.adresse}`, margin, yPosition, 9);
        yPosition -= lineHeight;
      }
      yPosition -= 5;
      
      // Situation actuelle (si disponible)
      if (candidat.gerance_actuelle || candidat.loyer_actuel || candidat.depuis_le) {
        addText('Situation actuelle', margin, yPosition, 9, helveticaBold, rgb(0.3, 0.3, 0.3));
        yPosition -= lineHeight;
        
        const situationRow1Left = `Gerance: ${candidat.gerance_actuelle || '-'}`;
        const situationRow1Right = `Loyer actuel: ${candidat.loyer_actuel ? formatCurrency(candidat.loyer_actuel) : '-'}`;
        addText(situationRow1Left, margin, yPosition, 9);
        addText(situationRow1Right, margin + 270, yPosition, 9);
        yPosition -= lineHeight;
        
        const situationRow2Left = `Depuis le: ${candidat.depuis_le ? formatDate(candidat.depuis_le) : '-'}`;
        const situationRow2Right = `Pieces: ${candidat.pieces_actuel || '-'}`;
        addText(situationRow2Left, margin, yPosition, 9);
        addText(situationRow2Right, margin + 270, yPosition, 9);
        yPosition -= lineHeight;
        
        if (candidat.motif_changement) {
          addText(`Motif changement: ${candidat.motif_changement}`, margin, yPosition, 9);
          yPosition -= lineHeight;
        }
        yPosition -= 5;
      }
      
      // Situation professionnelle
      addText('Situation professionnelle', margin, yPosition, 9, helveticaBold, rgb(0.3, 0.3, 0.3));
      yPosition -= lineHeight;
      
      const proRow1Left = `Profession: ${candidat.profession || '-'}`;
      const proRow1Right = `Employeur: ${candidat.employeur || '-'}`;
      addText(proRow1Left, margin, yPosition, 9);
      addText(proRow1Right, margin + 270, yPosition, 9);
      yPosition -= lineHeight;
      
      const proRow2Left = `Secteur: ${candidat.secteur_activite || '-'}`;
      const proRow2Right = `Type contrat: ${candidat.type_contrat || '-'}`;
      addText(proRow2Left, margin, yPosition, 9);
      addText(proRow2Right, margin + 270, yPosition, 9);
      yPosition -= lineHeight;
      
      if (candidat.anciennete_mois || candidat.date_engagement) {
        const proRow3Left = `Anciennete: ${candidat.anciennete_mois ? candidat.anciennete_mois + ' mois' : '-'}`;
        const proRow3Right = `Engage le: ${candidat.date_engagement ? formatDate(candidat.date_engagement) : '-'}`;
        addText(proRow3Left, margin, yPosition, 9);
        addText(proRow3Right, margin + 270, yPosition, 9);
        yPosition -= lineHeight;
      }
      yPosition -= 5;
      
      // Situation financière
      addText('Situation financiere', margin, yPosition, 9, helveticaBold, rgb(0.3, 0.3, 0.3));
      yPosition -= lineHeight;
      
      const finRow1Left = `Revenus mensuels: ${candidat.revenus_mensuels ? formatCurrency(candidat.revenus_mensuels) : '-'}`;
      const finRow1Right = `Source: ${candidat.source_revenus || '-'}`;
      addText(finRow1Left, margin, yPosition, 9);
      addText(finRow1Right, margin + 270, yPosition, 9);
      yPosition -= lineHeight;
      
      const finRow2Left = `Charges mensuelles: ${candidat.charges_mensuelles ? formatCurrency(candidat.charges_mensuelles) : '-'}`;
      const finRow2Right = `Apport personnel: ${candidat.apport_personnel ? formatCurrency(candidat.apport_personnel) : '-'}`;
      addText(finRow2Left, margin, yPosition, 9);
      addText(finRow2Right, margin + 270, yPosition, 9);
      yPosition -= lineHeight;
      
      // Ligne pour les indicateurs booléens
      const indicators = [];
      indicators.push(`Poursuites: ${candidat.poursuites ? 'Oui' : 'Non'}`);
      indicators.push(`Curatelle: ${candidat.curatelle ? 'Oui' : 'Non'}`);
      indicators.push(`Autres credits: ${candidat.autres_credits ? 'Oui' : 'Non'}`);
      addText(indicators.join('   |   '), margin, yPosition, 9);
      yPosition -= lineHeight;
      
      if (candidat.charges_extraordinaires && candidat.montant_charges_extra) {
        addText(`Charges extraordinaires: ${formatCurrency(candidat.montant_charges_extra)}`, margin, yPosition, 9);
        yPosition -= lineHeight;
      }
      
      // Espacement entre candidats
      yPosition -= 20;
    }
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
  addText('Beneficiaire: Immo-Rama, Chemin de l\'Esparcette 5, 1023 Crissier', margin, yPosition, 10);
  yPosition -= lineHeight;
  addText('IBAN: CH87 8080 8004 9815 5643 7', margin, yPosition, 10);
  yPosition -= lineHeight;
  addText('SWIFT-BIC: RAIFCH22 | BANQUE RAIFFEISEN DU GROS DE VAUD', margin, yPosition, 10);
  yPosition -= 30;
  
  // Dispositions complètes du mandat selon le type
  checkNewPage();
  
  // Helper function for wrapped text
  const addWrappedText = (text: string, x: number, maxWidth: number, fontSize: number): number => {
    const safeText = sanitizeText(text);
    const words = safeText.split(' ');
    let currentLine = '';
    let linesDrawn = 0;
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth > maxWidth && currentLine) {
        page.drawText(currentLine, { x, y: yPosition, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });
        yPosition -= lineHeight;
        linesDrawn++;
        currentLine = word;
        checkNewPage();
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, { x, y: yPosition, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });
      yPosition -= lineHeight;
      linesDrawn++;
    }
    
    return linesDrawn;
  };
  
  const maxTextWidth = pageWidth - 2 * margin;
  
  if (isPurchase) {
    // ACHAT - 5 articles officiels
    addText('DISPOSITIONS DU MANDAT DE RECHERCHE - ACHAT', margin, yPosition, 12, helveticaBold);
    yPosition -= 25;
    
    // Article 1
    addText('1. MANDAT', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    yPosition -= lineHeight;
    addWrappedText(
      "Le mandant charge le mandataire de lui presenter le bien immobilier correspondant a ses criteres de recherche, a savoir: tout bien immobilier a acheter.",
      margin, maxTextWidth, 9
    );
    yPosition -= 5;
    addWrappedText(
      "Le present mandat est un mandat exclusif. En consequence, le mandant s'engage a ne pas conclure d'autre mandat de meme objet pendant la duree du present mandat.",
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
    addText('DISPOSITIONS DU MANDAT DE RECHERCHE - LOCATION', margin, yPosition, 12, helveticaBold);
    yPosition -= 25;
    
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
    
    // Article 2.1
    checkNewPage();
    addText('2.1', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "La commission est de 1 mois de loyer brut (loyer avec les charges) a la signature du contrat de bail. Une caution a hauteur de CHF 300.- doit etre versee pour l'activation de votre dossier. Elle sera comptabilisee en cas de reussite et deductible. Le mandat de recherche est valable 3 mois, passe ce delai, le mandat est renouvelable ou prend fin. En l'absence de resiliation, par lettre recommandee, au moins 30 jours avant son echeance, le present contrat est repute renouvele par reconduction tacite, a chaque fois pour 3 mois supplementaires. En cas de non-renouvellement, la caution vous est restituee sous un delai de 30 jours.",
      margin + 25, maxTextWidth - 25, 9
    );
    yPosition -= 8;
    
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
      "Le prolongement de contrat ou la conclusion de contrats ulterieurs sont possibles. Ils doivent toutefois etre communiques dans les 5 jours apres conclusion de contrat a Immo-Rama et sont soumis a la commission d'agence. Des prolongements de contrat ou des contrats ulterieurs sont des contrats qui sont conclus entre le meme chercheur ou la meme entreprise pendant ou durant les trois mois qui suivent la fin du premier contrat pour le meme objet ou un autre avec le meme bailleur.",
      margin + 25, maxTextWidth - 25, 9
    );
    yPosition -= 8;
    
    // Article 2.4
    checkNewPage();
    addText('2.4', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "En cas de resiliation de contrat avant terme ou de renoncement au contrat de (sous)-location, la commission ne sera pas remboursee, ni entierement, ni partiellement.",
      margin + 25, maxTextWidth - 25, 9
    );
    yPosition -= 8;
    
    // Article 3
    checkNewPage();
    addText('3.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "Les chercheurs s'engagent a declarer immediatement a Immo-Rama toute conclusion de contrat par oral ou par ecrit ainsi que des prolongations ou renouvellements de contrat et des modifications apportees a leur mandat de recherche. Apres conclusion d'un contrat, les chercheurs sont tenus de communiquer a Immo-Rama l'adresse de leur future demeure ainsi que le nom et l'adresse du futur bailleur.",
      margin + 20, maxTextWidth - 20, 9
    );
    yPosition -= 8;
    
    // Article 4
    checkNewPage();
    addText('4.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "Lorsque les chercheurs connaissent les adresses proposees par Immo-Rama d'une autre source, ils doivent le faire savoir a Immo-Rama dans un delai de 24 heures, en indiquant cette autre source. Au cas contraire, l'adresse sera estimee etre fournie par Immo-Rama.",
      margin + 20, maxTextWidth - 20, 9
    );
    yPosition -= 8;
    
    // Article 5
    checkNewPage();
    addText('5.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "Immo-Rama se reserve le droit de demander des securites, des references ou des preuves de la part des chercheurs ou de refuser des chercheurs potentiels sans donner de raisons. Les chercheurs autorisent explicitement Immo-Rama a demander des renseignements sur leur personne aupres de services de renseignements sur la solvabilite ainsi que de demander des references aupres de son employeur.",
      margin + 20, maxTextWidth - 20, 9
    );
    yPosition -= 8;
    
    // Article 6
    checkNewPage();
    addText('6.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "Les informations donnees par Immo-Rama aux chercheurs ne peuvent etre remises a des tierces personnes. En cas ou des informations seraient tout de meme transmises a des tierces personnes, la personne responsable est tenue de supporter tout dommage qui pourrait en resulter, en particulier la commission qu'Immo-Rama aurait perdue par ce fait.",
      margin + 20, maxTextWidth - 20, 9
    );
    yPosition -= 8;
    
    // Article 7
    checkNewPage();
    addText('7.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "Lorsqu'Immo-Rama est informee de la conclusion d'un contrat de location, il annule le mandat de recherche. Un mandat de recherche peut etre retire a tout moment par les chercheurs ou annule par Immo-Rama.",
      margin + 20, maxTextWidth - 20, 9
    );
    yPosition -= 8;
    
    // Article 8
    checkNewPage();
    addText('8.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "Si un client sous contrat confirme par ecrit ou verbalement que son dossier de candidature pour un logement peut etre transmis a la gerance en charge et que la gerance informe Immo-Rama de sa decision d'attribuer le logement a ce client, Immo-Rama aura droit a une commission equivalente a un mois de loyer du bien en location concerne.",
      margin + 20, maxTextWidth - 20, 9
    );
    yPosition -= 8;
    
    // Article 9
    checkNewPage();
    addText('9. Position de Immo-Rama', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    yPosition -= lineHeight;
    addWrappedText(
      "Immo-Rama ne peut assurer aucune garantie de succes quant a la conclusion d'un contrat. Les contrats sont passes directement entre les chercheurs et les offreurs. Immo-Rama ne peut assumer aucune responsabilite quant a l'exactitude des donnees concernant les offreurs et leurs offres de logement. Immo-Rama peut assister les parties contractantes lors de la signature de contrat et repondre aux questions relatives a la conclusion de contrat. Toutefois, Immo-Rama n'assume aucune responsabilite pour les consequences resultant de contrats defectueux ou de comportements fautifs de la part des parties contractantes. Ceci vaut egalement lorsque Immo-Rama a ete directement implique dans les negociations de contrat.",
      margin + 20, maxTextWidth - 20, 9
    );
    yPosition -= 8;
    
    // Article 10
    checkNewPage();
    addText('10.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "Les chercheurs autorisent Immo-Rama a transmettre les donnees indiquees ainsi que les resultats des demandes concernant la solvabilite et la reference a des offreurs potentiels. En outre, Immo-Rama a le droit d'utiliser les donnees de contact pour des envois d'informations propres a la Societe.",
      margin + 25, maxTextWidth - 25, 9
    );
    yPosition -= 8;
    
    // Article 11
    checkNewPage();
    addText('11.', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    addWrappedText(
      "La juridiction competente est Berne (Suisse). Sauf indication contraire contenue dans le present contrat, c'est le Code des obligations suisse (CO) qui fait foi.",
      margin + 25, maxTextWidth - 25, 9
    );
    yPosition -= 15;
  }
  
  yPosition -= 10;
  
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
  addText(`Fait à Crissier, le ${formatDate(new Date().toISOString())}`, margin, yPosition, 10);
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
    p.drawText(sanitizeText(`Immo-rama.ch - Mandat de recherche - Page ${index + 1}/${pages.length}`), {
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
    
    // Initialize Supabase client for storage
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
    
    // Generate PDF
    const pdfBytes = await generateMandatPDF(data);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    
    console.log(`PDF generated, size: ${pdfBytes.length} bytes`);
    
    // Upload PDF to storage
    let storedPdfPath: string | null = null;
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = sanitizeText(`${data.nom}_${data.prenom}`).replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `mandat_${safeName}_${timestamp}.pdf`;
    
    // Use demande_id or client_id if available, otherwise use email hash
    const folderId = data.demande_id || data.client_id || btoa(data.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const storagePath = `${folderId}/${fileName}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('mandat-contracts')
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading PDF to storage:', uploadError);
      } else {
        storedPdfPath = storagePath;
        console.log('PDF uploaded to storage:', storedPdfPath);
        
        // If demande_id provided, update demandes_mandat with PDF path
        if (data.demande_id) {
          const { error: updateError } = await supabaseAdmin
            .from('demandes_mandat')
            .update({ mandat_pdf_url: storedPdfPath })
            .eq('id', data.demande_id);
          
          if (updateError) {
            console.error('Error updating demande with PDF URL:', updateError);
          }
        }
        
        // If client_id provided, update clients with PDF path
        if (data.client_id) {
          const { error: updateError } = await supabaseAdmin
            .from('clients')
            .update({ mandat_pdf_url: storedPdfPath })
            .eq('id', data.client_id);
          
          if (updateError) {
            console.error('Error updating client with PDF URL:', updateError);
          }
        }
      }
    } catch (storageError) {
      console.error('Storage error:', storageError);
    }
    
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
                  <li><strong>Beneficiaire:</strong> Immo-Rama, Chemin de l'Esparcette 5, 1023 Crissier</li>
                  <li><strong>IBAN:</strong> CH87 8080 8004 9815 5643 7</li>
                  <li><strong>SWIFT-BIC:</strong> RAIFCH22</li>
                  <li><strong>Banque:</strong> BANQUE RAIFFEISEN DU GROS DE VAUD</li>
                </ul>
              </div>
              
              <p>Votre dossier sera active des reception du paiement.</p>
              
              <p>Cordialement,<br><strong>L'equipe IMMO-RAMA</strong></p>
            </div>
            <div class="footer">
              <p>Immo-rama.ch | Crissier, Suisse</p>
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
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        pdfPath: storedPdfPath
      }),
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
