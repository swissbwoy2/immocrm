import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BailData {
  bail_id: string;
  include_notification: boolean;
  include_rulv: boolean;
  canton: string;
}

const CANTONS_COMMISSIONS: Record<string, { nom: string; adresse: string; telephone: string }[]> = {
  'VD': [
    { nom: 'Commission de conciliation en matière de baux à loyer du district de Lausanne', adresse: 'Rue Caroline 11, 1014 Lausanne', telephone: '021 316 65 65' },
    { nom: 'Commission de conciliation en matière de baux à loyer du district de Morges', adresse: 'Rue de la Gare 13, 1110 Morges', telephone: '021 557 96 96' },
    { nom: 'Commission de conciliation en matière de baux à loyer du district de Nyon', adresse: 'Rue Juste-Olivier 2, 1260 Nyon', telephone: '022 557 56 56' },
  ],
  'GE': [
    { nom: 'Commission de conciliation en matière de baux et loyers', adresse: 'Rue du Stand 46, 1204 Genève', telephone: '022 327 93 93' },
  ],
  'VS': [
    { nom: 'Commission de conciliation en matière de baux à loyer du Valais romand', adresse: 'Place du Midi 40, 1950 Sion', telephone: '027 606 55 00' },
  ],
  'FR': [
    { nom: 'Commission de conciliation en matière de bail à loyer', adresse: 'Route des Arsenaux 41, 1700 Fribourg', telephone: '026 305 15 50' },
  ],
  'NE': [
    { nom: 'Tribunal régional du Littoral et du Val-de-Travers', adresse: 'Rue du Coq-d\'Inde 24, 2000 Neuchâtel', telephone: '032 889 62 62' },
  ],
};

function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\x00-\x1F\x7F]/g, '');
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value: number | null): string {
  if (!value) return 'CHF 0.00';
  return `CHF ${value.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyNoDecimals(value: number | null): string {
  if (!value) return 'CHF 0';
  return `CHF ${value.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

async function generateBailPDF(data: any, options: { include_notification: boolean; include_rulv: boolean; canton: string }): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const lineHeight = 14;
  const smallLineHeight = 12;
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;
  
  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
  };
  
  const checkNewPage = (requiredSpace: number = 100) => {
    if (yPosition < margin + requiredSpace) {
      addNewPage();
    }
  };
  
  const drawTitle = (text: string, size: number = 16) => {
    checkNewPage(40);
    currentPage.drawText(sanitizeText(text), {
      x: margin,
      y: yPosition,
      size,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= size + 10;
  };
  
  const drawSubtitle = (text: string) => {
    checkNewPage(30);
    currentPage.drawText(sanitizeText(text), {
      x: margin,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 16;
  };
  
  const drawText = (text: string, indent: number = 0) => {
    checkNewPage(20);
    currentPage.drawText(sanitizeText(text), {
      x: margin + indent,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    yPosition -= smallLineHeight;
  };
  
  const drawLabelValue = (label: string, value: string, indent: number = 0) => {
    checkNewPage(20);
    currentPage.drawText(sanitizeText(label), {
      x: margin + indent,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentPage.drawText(sanitizeText(value), {
      x: margin + 200 + indent,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  };
  
  const addWrappedText = (text: string, maxWidth: number, indent: number = 0): void => {
    const words = text.split(' ');
    let line = '';
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const width = helvetica.widthOfTextAtSize(testLine, 10);
      
      if (width > maxWidth && line) {
        checkNewPage(20);
        currentPage.drawText(sanitizeText(line), {
          x: margin + indent,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
        yPosition -= smallLineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      checkNewPage(20);
      currentPage.drawText(sanitizeText(line), {
        x: margin + indent,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      yPosition -= smallLineHeight;
    }
  };

  // ==================== PAGE 1: CONTRAT DE BAIL ====================
  drawTitle('BAIL A LOYER', 18);
  yPosition -= 5;
  drawText('Pour logement');
  yPosition -= 10;
  
  // Reference
  drawLabelValue('Référence:', data.lot?.reference || '-');
  drawLabelValue('N° EGID:', data.egid || '-');
  drawLabelValue('N° EWID:', data.ewid || '-');
  yPosition -= 10;
  
  // 1. BAILLEUR
  drawSubtitle('1. Bailleur');
  drawText(data.proprietaire?.nom_entreprise || `${data.proprietaire?.prenom || ''} ${data.proprietaire?.nom || ''}`.trim());
  if (data.proprietaire?.adresse) drawText(data.proprietaire.adresse);
  if (data.proprietaire?.code_postal && data.proprietaire?.ville) {
    drawText(`${data.proprietaire.code_postal} ${data.proprietaire.ville}`);
  }
  yPosition -= 10;
  
  // 2. REPRESENTANT
  if (data.gerant) {
    drawSubtitle('2. Représenté par');
    drawText(data.gerant.nom_entreprise || `${data.gerant.prenom || ''} ${data.gerant.nom || ''}`.trim());
    if (data.gerant.adresse) drawText(data.gerant.adresse);
    if (data.gerant.code_postal && data.gerant.ville) {
      drawText(`${data.gerant.code_postal} ${data.gerant.ville}`);
    }
    yPosition -= 10;
  }
  
  // 3. LOCATAIRE
  drawSubtitle('3. Locataire');
  if (data.locataire) {
    const civilite = data.locataire.civilite || '';
    drawText(`${civilite} ${data.locataire.prenom || ''} ${data.locataire.nom || ''}`.trim());
    if (data.locataire.adresse) drawText(data.locataire.adresse);
  } else {
    drawText('À compléter');
  }
  drawText('Conjointement et solidairement responsables', 10);
  yPosition -= 10;
  
  // 4. ANCIEN LOCATAIRE
  drawSubtitle('4. Ancien locataire');
  drawText(data.ancien_locataire_nom || '-');
  yPosition -= 10;
  
  // 5. IMMEUBLE
  drawSubtitle('5. Immeuble');
  drawText(`${data.immeuble?.adresse || '-'}, ${data.immeuble?.code_postal || ''} ${data.immeuble?.ville || ''}`);
  yPosition -= 10;
  
  // 6. OBJET LOUE
  drawSubtitle('6. Objet loué / Loyer / Frais accessoires');
  yPosition -= 5;
  
  // Table header
  const colWidths = [100, 50, 50, 60, 90, 90];
  const startX = margin;
  let xPos = startX;
  
  const headers = ['Genre', 'Pièces', 'Étage', 'Surface', 'CHF/annuel', 'CHF/mensuel'];
  for (let i = 0; i < headers.length; i++) {
    currentPage.drawText(headers[i], {
      x: xPos,
      y: yPosition,
      size: 8,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    xPos += colWidths[i];
  }
  yPosition -= 15;
  
  // Table row
  xPos = startX;
  const lotType = data.lot?.type_lot || 'Appartement';
  const pieces = data.nombre_pieces || data.lot?.nombre_pieces || '-';
  const etage = data.etage || data.lot?.etage || '-';
  const surface = data.surface_objet || data.lot?.surface || '-';
  const loyerAnnuel = (data.loyer_actuel || 0) * 12;
  const loyerMensuel = data.loyer_actuel || 0;
  
  const rowData = [lotType, String(pieces), String(etage), `${surface} m²`, formatCurrencyNoDecimals(loyerAnnuel), formatCurrencyNoDecimals(loyerMensuel)];
  for (let i = 0; i < rowData.length; i++) {
    currentPage.drawText(rowData[i], {
      x: xPos,
      y: yPosition,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    xPos += colWidths[i];
  }
  yPosition -= 20;
  
  // Loyer details
  drawLabelValue('Total loyer net:', `${formatCurrencyNoDecimals(loyerAnnuel)} / ${formatCurrencyNoDecimals(loyerMensuel)}`);
  
  const chargesTotal = (data.provisions_chauffage || 0) + (data.provisions_eau || 0) + (data.autres_charges || 0);
  drawLabelValue('Acompte chauffage, eau et frais:', `${formatCurrencyNoDecimals(chargesTotal * 12)} / ${formatCurrencyNoDecimals(chargesTotal)}`);
  
  const totalBrut = (data.loyer_actuel || 0) + chargesTotal;
  drawLabelValue('Total loyer brut:', `${formatCurrencyNoDecimals(totalBrut * 12)} / ${formatCurrencyNoDecimals(totalBrut)}`);
  yPosition -= 10;
  
  // Destination
  drawSubtitle('6.1. Destination principale');
  drawText(`Nombre d'occupant(s) adulte(s): ${data.nombre_occupants || '-'}`);
  drawText(`L'objet loué ne doit être utilisé qu'à des fins de: ${data.destination_locaux || 'Habitation'}`);
  yPosition -= 10;
  
  // Paiement
  drawSubtitle('6.2. Paiement du loyer');
  addWrappedText(`Le loyer est payable par ${data.periodicite_paiement || 'mois'} d'avance, soit le 1er jour du mois au plus tard.`, pageWidth - 2 * margin);
  yPosition -= 10;
  
  // Bases du loyer
  drawSubtitle('6.3. Bases du loyer');
  drawLabelValue('Taux hypothécaire de référence:', `${data.taux_hypothecaire_reference || 1.25}%`);
  drawLabelValue('ISPC (base ' + (data.ispc_base || '2020') + '):', `${data.ispc_valeur || '-'} points`);
  yPosition -= 10;
  
  // ==================== PAGE 2: DUREE ET RESILIATION ====================
  checkNewPage(200);
  
  drawSubtitle('7. Durée du bail');
  drawText(`Le bail débute le ${formatDate(data.date_debut)}.`);
  if (data.date_fin) {
    drawText(`La première échéance est fixée au ${formatDate(data.date_fin)}.`);
  }
  drawText(`Il est établi pour une durée ${data.duree_initiale || 'indéterminée'} et se reconduira tacitement.`);
  yPosition -= 10;
  
  drawSubtitle('8. Résiliation');
  drawText(`Pour le bailleur: ${data.preavis_mois || 3} mois à l'avance pour la prochaine échéance`);
  drawText(`Pour le locataire: ${data.preavis_mois || 3} mois à l'avance pour la prochaine échéance`);
  yPosition -= 5;
  addWrappedText('Dans les deux cas, elle doit être communiquée par lettre recommandée.', pageWidth - 2 * margin);
  yPosition -= 10;
  
  // Garantie
  drawSubtitle('9. Garantie de loyer');
  drawLabelValue('Montant:', formatCurrency(data.montant_garantie));
  drawLabelValue('Type:', data.type_garantie?.replace('_', ' ') || 'Dépôt bancaire');
  yPosition -= 10;
  
  // Clauses particulières
  if (data.clauses_particulieres) {
    drawSubtitle('10. Dispositions et conventions particulières');
    addWrappedText(data.clauses_particulieres, pageWidth - 2 * margin);
    yPosition -= 10;
  }
  
  // ==================== DISPOSITIONS COMPLEMENTAIRES ====================
  addNewPage();
  drawTitle('DISPOSITIONS COMPLÉMENTAIRES', 14);
  yPosition -= 10;
  
  const dispositions = [
    { title: 'Article 1: État des lieux d\'entrée', content: 'À l\'entrée du locataire, un état des lieux comprenant l\'inventaire est dressé en deux exemplaires, signé sur place par les deux parties.' },
    { title: 'Article 2: Sûretés', content: 'Si une garantie est exigée, elle ne doit pas dépasser trois mois de loyer net. Elle doit être déposée sur un compte bloqué.' },
    { title: 'Article 3: Paiement du loyer', content: 'Le premier terme de loyer doit être payé avant l\'entrée dans les locaux.' },
    { title: 'Article 4: Assurances', content: 'Le locataire est tenu de contracter une assurance responsabilité civile et une assurance mobilière.' },
    { title: 'Article 5: Entretien', content: 'Le locataire est responsable du nettoyage et des menus travaux d\'entretien.' },
    { title: 'Article 6: Modifications', content: 'Toute modification des locaux nécessite l\'autorisation écrite préalable du bailleur.' },
    { title: 'Article 7: Sous-location', content: 'La sous-location est soumise à l\'autorisation écrite du bailleur.' },
    { title: 'Article 8: Restitution', content: 'À la fin du bail, le locataire restitue les locaux nettoyés et libres de tout objet.' },
    { title: 'Article 9: For juridique', content: 'Pour tout litige, les parties font élection de domicile au lieu de situation de l\'immeuble.' },
  ];
  
  for (const disp of dispositions) {
    checkNewPage(60);
    drawSubtitle(disp.title);
    addWrappedText(disp.content, pageWidth - 2 * margin);
    yPosition -= 8;
  }
  
  // ==================== SIGNATURES ====================
  checkNewPage(150);
  yPosition -= 20;
  drawSubtitle('Signatures');
  yPosition -= 10;
  
  drawText('Par sa signature, le locataire confirme avoir lu et compris le présent bail.');
  yPosition -= 30;
  
  // Signature boxes
  const sigBoxWidth = (pageWidth - 2 * margin - 40) / 2;
  
  currentPage.drawRectangle({
    x: margin,
    y: yPosition - 60,
    width: sigBoxWidth,
    height: 60,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });
  currentPage.drawText('Bailleur / Représentant', {
    x: margin + 10,
    y: yPosition - 20,
    size: 9,
    font: helveticaBold,
  });
  currentPage.drawText('Lieu, date:', {
    x: margin + 10,
    y: yPosition - 50,
    size: 8,
    font: helvetica,
  });
  
  currentPage.drawRectangle({
    x: margin + sigBoxWidth + 40,
    y: yPosition - 60,
    width: sigBoxWidth,
    height: 60,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });
  currentPage.drawText('Locataire', {
    x: margin + sigBoxWidth + 50,
    y: yPosition - 20,
    size: 9,
    font: helveticaBold,
  });
  currentPage.drawText('Lieu, date:', {
    x: margin + sigBoxWidth + 50,
    y: yPosition - 50,
    size: 8,
    font: helvetica,
  });
  
  // ==================== NOTIFICATION DE LOYER (Art. 270 CO) ====================
  if (options.include_notification) {
    addNewPage();
    drawTitle('NOTIFICATION DE LOYER', 16);
    drawText('Lors de la conclusion d\'un nouveau bail (Art. 270 al. 2 CO)');
    yPosition -= 20;
    
    // Parties
    drawLabelValue('Bailleur:', data.proprietaire?.nom_entreprise || `${data.proprietaire?.prenom || ''} ${data.proprietaire?.nom || ''}`.trim());
    if (data.gerant) {
      drawLabelValue('Représentant:', data.gerant.nom_entreprise || `${data.gerant.prenom || ''} ${data.gerant.nom || ''}`.trim());
    }
    drawLabelValue('Locataire:', data.locataire ? `${data.locataire.civilite || ''} ${data.locataire.prenom || ''} ${data.locataire.nom || ''}`.trim() : '-');
    yPosition -= 10;
    
    // Objet
    drawLabelValue('Commune, rue, étage, pièces:', `${data.immeuble?.ville || '-'}, ${data.immeuble?.adresse || '-'}, ${data.nombre_pieces || '-'} pièces`);
    yPosition -= 20;
    
    // Ancien loyer
    drawSubtitle('LOYER DÛ PAR LE PRÉCÉDENT LOCATAIRE');
    if (data.ancien_locataire_depuis) {
      drawText(`Depuis le: ${formatDate(data.ancien_locataire_depuis)}`);
    }
    yPosition -= 10;
    
    // Table ancien loyer
    drawLabelValue('Loyer net:', formatCurrency(data.ancien_locataire_loyer_net));
    drawLabelValue('Frais accessoires:', formatCurrency(data.ancien_locataire_charges));
    const ancienTotal = (data.ancien_locataire_loyer_net || 0) + (data.ancien_locataire_charges || 0);
    drawLabelValue('Total:', formatCurrency(ancienTotal));
    yPosition -= 10;
    
    drawLabelValue('Taux hypothécaire de référence:', `${data.taux_hypothecaire_reference || 1.25}%`);
    drawLabelValue('ISPC (base ' + (data.ispc_base || '2020') + '):', `${data.ispc_valeur || '-'} points`);
    yPosition -= 20;
    
    // Nouveau loyer
    drawSubtitle('NOUVEAU LOYER DÈS L\'ENTRÉE EN VIGUEUR DU BAIL');
    yPosition -= 10;
    
    drawLabelValue('Loyer net mensuel:', formatCurrency(data.loyer_actuel));
    drawLabelValue('Frais accessoires:', formatCurrency(chargesTotal));
    drawLabelValue('Total mensuel:', formatCurrency(totalBrut));
    yPosition -= 10;
    
    // Motifs
    if (data.motif_hausse) {
      drawSubtitle('Motifs de la hausse éventuelle:');
      addWrappedText(data.motif_hausse, pageWidth - 2 * margin);
      yPosition -= 10;
    }
    
    // Avertissement contestation
    yPosition -= 10;
    checkNewPage(80);
    currentPage.drawRectangle({
      x: margin,
      y: yPosition - 50,
      width: pageWidth - 2 * margin,
      height: 50,
      color: rgb(0.95, 0.95, 0.95),
    });
    yPosition -= 15;
    addWrappedText('Ce nouveau loyer peut, dans les trente jours qui suivent la réception de la chose (entrée dans l\'appartement), être contesté comme abusif devant la commission de conciliation compétente; si tel n\'est pas le cas, il est tenu pour accepté.', pageWidth - 2 * margin - 20, 10);
    yPosition -= 30;
    
    // Date et signature
    drawText(`Lieu et date: ${data.immeuble?.ville || '-'}, ${formatDate(new Date().toISOString())}`);
    yPosition -= 20;
    drawText('Signature du bailleur/représentant: _______________________________');
  }
  
  // ==================== COMMISSIONS DE CONCILIATION ====================
  if (options.include_notification && options.canton) {
    addNewPage();
    drawTitle('COMMISSIONS DE CONCILIATION', 14);
    drawText(`Canton: ${options.canton}`);
    yPosition -= 20;
    
    const commissions = CANTONS_COMMISSIONS[options.canton] || [];
    for (const comm of commissions) {
      checkNewPage(60);
      drawSubtitle(comm.nom);
      drawText(`Adresse: ${comm.adresse}`);
      drawText(`Téléphone: ${comm.telephone}`);
      yPosition -= 10;
    }
    
    yPosition -= 20;
    drawSubtitle('Extraits des dispositions légales');
    yPosition -= 5;
    
    const extraits = [
      'Art. 269 CO - Sont abusifs les loyers qui permettent au bailleur d\'obtenir un rendement excessif.',
      'Art. 269a CO - Ne sont pas abusifs les loyers qui se situent dans les limites des loyers usuels dans la localité.',
      'Art. 270 CO - Le locataire peut contester le loyer initial et en demander la diminution dans les 30 jours.',
    ];
    
    for (const extrait of extraits) {
      checkNewPage(40);
      addWrappedText(extrait, pageWidth - 2 * margin);
      yPosition -= 8;
    }
  }
  
  // ==================== RULV (optionnel) ====================
  if (options.include_rulv) {
    addNewPage();
    drawTitle('RÈGLES ET USAGES LOCATIFS VAUDOIS (RULV)', 14);
    drawText('Édition 2019 - Extraits');
    yPosition -= 20;
    
    const rulvSections = [
      { title: 'A. ENTRÉE DU LOCATAIRE', items: [
        'L\'état des lieux est établi en présence des deux parties.',
        'La garantie de loyer doit être déposée dans les 30 jours.',
        'Le locataire doit souscrire une assurance RC avant l\'entrée.',
      ]},
      { title: 'B. EN COURS DE BAIL', items: [
        'Le locataire est responsable de l\'entretien courant.',
        'Les modifications nécessitent l\'accord écrit du bailleur.',
        'Le locataire doit permettre les visites pour relocation.',
      ]},
      { title: 'C. SORTIE DU LOCATAIRE', items: [
        'Les locaux doivent être restitués propres et en bon état.',
        'L\'état des lieux de sortie est établi contradictoirement.',
        'La garantie est libérée après règlement de tout différend.',
      ]},
    ];
    
    for (const section of rulvSections) {
      checkNewPage(100);
      drawSubtitle(section.title);
      for (const item of section.items) {
        drawText(`• ${item}`, 10);
      }
      yPosition -= 10;
    }
  }
  
  return pdfDoc.save();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bail_id, include_notification = true, include_rulv = false, canton = 'VD' }: BailData = await req.json();
    
    if (!bail_id) {
      return new Response(
        JSON.stringify({ error: 'bail_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch bail data with all related information
    const { data: bail, error: bailError } = await supabase
      .from('baux')
      .select(`
        *,
        lot:lots(
          id, reference, designation, type_lot, surface, etage, nombre_pieces,
          immeuble:immeubles(
            id, nom, adresse, code_postal, ville, egid,
            proprietaire:proprietaires(id, nom, prenom, nom_entreprise, adresse, code_postal, ville)
          )
        ),
        locataire:locataires_immeuble(id, nom, prenom, civilite, adresse, email, telephone)
      `)
      .eq('id', bail_id)
      .single();

    if (bailError || !bail) {
      console.error('Error fetching bail:', bailError);
      return new Response(
        JSON.stringify({ error: 'Bail not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform data for PDF generation
    const pdfData = {
      ...bail,
      immeuble: bail.lot?.immeuble,
      proprietaire: bail.lot?.immeuble?.proprietaire,
      egid: bail.egid || bail.lot?.immeuble?.egid,
    };

    console.log('Generating PDF for bail:', bail_id);
    
    const pdfBytes = await generateBailPDF(pdfData, { include_notification, include_rulv, canton });
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf_base64: base64,
        filename: `Bail_${bail.lot?.reference || bail_id}_${new Date().toISOString().split('T')[0]}.pdf`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating bail PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
