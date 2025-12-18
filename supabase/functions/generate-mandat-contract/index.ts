import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractData {
  clientId: string;
  demandeId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  date_naissance: string;
  nationalite: string;
  type_permis: string;
  etat_civil: string;
  profession: string;
  employeur: string;
  revenus_mensuels: number;
  type_recherche: string;
  type_bien: string;
  pieces_recherche: string;
  region_recherche: string;
  budget_max: number;
  signature_data: string;
  cgv_acceptees_at: string;
  candidats?: any[];
  gerance_actuelle?: string;
  loyer_actuel?: number;
  depuis_le?: string;
  motif_changement?: string;
  nombre_occupants?: number;
  souhaits_particuliers?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contractData: ContractData = await req.json();
    console.log('Generating contract PDF for client:', contractData.clientId);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 50;
    const lineHeight = 18;
    
    // Colors
    const primaryColor = rgb(0.2, 0.4, 0.6);
    const textColor = rgb(0.1, 0.1, 0.1);
    const grayColor = rgb(0.4, 0.4, 0.4);

    // Helper function to add a new page
    const addPage = () => {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      return page;
    };

    // Helper to draw text
    const drawText = (page: any, text: string, x: number, y: number, options: any = {}) => {
      page.drawText(text || '-', {
        x,
        y,
        size: options.size || 10,
        font: options.bold ? helveticaBold : helvetica,
        color: options.color || textColor,
      });
    };

    // Helper to draw a section title
    const drawSectionTitle = (page: any, title: string, y: number) => {
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: pageWidth - 2 * margin,
        height: 22,
        color: rgb(0.95, 0.95, 0.98),
      });
      drawText(page, title.toUpperCase(), margin + 10, y, { size: 11, bold: true, color: primaryColor });
      return y - 30;
    };

    // Helper to draw a field
    const drawField = (page: any, label: string, value: string, x: number, y: number, width: number = 200) => {
      drawText(page, label, x, y, { size: 8, color: grayColor });
      drawText(page, value || '-', x, y - 12, { size: 10 });
      return y - 30;
    };

    // ==================== PAGE 1: Title & Personal Info ====================
    let page = addPage();
    let y = pageHeight - margin;

    // Header with logo area
    page.drawRectangle({
      x: 0,
      y: pageHeight - 100,
      width: pageWidth,
      height: 100,
      color: primaryColor,
    });

    drawText(page, 'IMMO-RAMA', pageWidth / 2 - 60, pageHeight - 45, { size: 24, bold: true, color: rgb(1, 1, 1) });
    drawText(page, 'Recherche Immobilière', pageWidth / 2 - 55, pageHeight - 65, { size: 12, color: rgb(0.9, 0.9, 0.9) });

    y = pageHeight - 140;

    // Contract title
    drawText(page, 'MANDAT DE RECHERCHE EXCLUSIF', pageWidth / 2 - 120, y, { size: 18, bold: true, color: primaryColor });
    y -= 20;
    drawText(page, `N° ${contractData.demandeId?.slice(0, 8).toUpperCase() || 'N/A'}`, pageWidth / 2 - 35, y, { size: 10, color: grayColor });
    y -= 40;

    // Contract date
    const contractDate = contractData.cgv_acceptees_at 
      ? new Date(contractData.cgv_acceptees_at).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' });
    drawText(page, `Établi le ${contractDate}`, margin, y, { size: 10 });
    y -= 40;

    // Section 1: Personal Information
    y = drawSectionTitle(page, '1. Informations personnelles', y);
    
    const col1 = margin + 10;
    const col2 = pageWidth / 2;
    
    y = drawField(page, 'Prénom', contractData.prenom, col1, y);
    drawField(page, 'Nom', contractData.nom, col2, y + 30);
    
    y = drawField(page, 'Date de naissance', contractData.date_naissance, col1, y);
    drawField(page, 'Nationalité', contractData.nationalite, col2, y + 30);
    
    y = drawField(page, 'Type de permis', contractData.type_permis, col1, y);
    drawField(page, 'État civil', contractData.etat_civil, col2, y + 30);
    
    y = drawField(page, 'Adresse actuelle', contractData.adresse, col1, y, 400);
    
    y = drawField(page, 'Téléphone', contractData.telephone, col1, y);
    drawField(page, 'Email', contractData.email, col2, y + 30);
    y -= 10;

    // Section 2: Current Situation
    y = drawSectionTitle(page, '2. Situation actuelle', y);
    
    y = drawField(page, 'Gérance actuelle', contractData.gerance_actuelle || '-', col1, y);
    drawField(page, 'Loyer actuel', contractData.loyer_actuel ? `CHF ${contractData.loyer_actuel}.-` : '-', col2, y + 30);
    
    y = drawField(page, 'Locataire depuis', contractData.depuis_le || '-', col1, y);
    drawField(page, 'Nombre d\'occupants', String(contractData.nombre_occupants || '-'), col2, y + 30);
    
    y = drawField(page, 'Motif du changement', contractData.motif_changement || '-', col1, y, 400);
    y -= 10;

    // Section 3: Professional Situation
    y = drawSectionTitle(page, '3. Situation professionnelle', y);
    
    y = drawField(page, 'Profession', contractData.profession, col1, y);
    drawField(page, 'Employeur', contractData.employeur, col2, y + 30);
    
    y = drawField(page, 'Revenus mensuels', `CHF ${contractData.revenus_mensuels?.toLocaleString('fr-CH')}.-`, col1, y);
    y -= 10;

    // Section 4: Search Criteria
    y = drawSectionTitle(page, '4. Critères de recherche', y);
    
    y = drawField(page, 'Type de recherche', contractData.type_recherche, col1, y);
    drawField(page, 'Type de bien', contractData.type_bien, col2, y + 30);
    
    y = drawField(page, 'Nombre de pièces', contractData.pieces_recherche, col1, y);
    drawField(page, 'Région', contractData.region_recherche, col2, y + 30);
    
    y = drawField(page, 'Budget maximum', `CHF ${contractData.budget_max?.toLocaleString('fr-CH')}.-`, col1, y);
    
    if (contractData.souhaits_particuliers) {
      y = drawField(page, 'Souhaits particuliers', contractData.souhaits_particuliers, col1, y, 400);
    }

    // ==================== PAGE 2: Candidates & CGV ====================
    page = addPage();
    y = pageHeight - margin - 20;

    // Section 5: Associated Candidates
    if (contractData.candidats && contractData.candidats.length > 0) {
      y = drawSectionTitle(page, '5. Candidats associés', y);
      
      for (const candidat of contractData.candidats) {
        drawText(page, `• ${candidat.prenom} ${candidat.nom}`, col1, y, { size: 10 });
        drawText(page, `(${candidat.lienAvecClient || candidat.type || 'Candidat'})`, col1 + 150, y, { size: 9, color: grayColor });
        y -= lineHeight;
      }
      y -= 20;
    }

    // Section 6: General Conditions Summary
    y = drawSectionTitle(page, '6. Conditions générales du mandat', y);
    
    const conditions = [
      'Le présent mandat est conclu pour une durée de 6 mois à compter de sa signature.',
      'Le mandant confie au mandataire la recherche exclusive d\'un bien immobilier correspondant aux critères définis.',
      'Le mandataire s\'engage à effectuer des recherches actives et à transmettre toutes les offres correspondantes.',
      'En cas de conclusion d\'un bail ou d\'achat, une commission sera due selon les tarifs en vigueur.',
      'Le mandant s\'engage à ne pas traiter directement avec les propriétaires ou agences contactés par le mandataire.',
      'Les deux parties peuvent résilier le mandat moyennant un préavis de 15 jours.',
    ];

    for (const condition of conditions) {
      // Word wrap for long conditions
      const words = condition.split(' ');
      let line = '';
      const maxWidth = pageWidth - 2 * margin - 20;
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const textWidth = helvetica.widthOfTextAtSize(testLine, 9);
        
        if (textWidth > maxWidth) {
          drawText(page, '• ' + line.trim(), col1, y, { size: 9 });
          y -= lineHeight - 4;
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        drawText(page, line.startsWith('•') ? line.trim() : '• ' + line.trim(), col1, y, { size: 9 });
        y -= lineHeight;
      }
      y -= 5;
    }

    // ==================== PAGE 3: Signature ====================
    page = addPage();
    y = pageHeight - margin - 20;

    y = drawSectionTitle(page, '7. Signature électronique', y);
    y -= 10;

    drawText(page, 'Le mandant déclare avoir pris connaissance des conditions générales et les accepter.', col1, y, { size: 10 });
    y -= 30;

    drawText(page, 'Date de signature:', col1, y, { size: 10, color: grayColor });
    drawText(page, contractDate, col1 + 120, y, { size: 10 });
    y -= 30;

    drawText(page, 'Signature du mandant:', col1, y, { size: 10, color: grayColor });
    y -= 20;

    // Embed signature image if available
    if (contractData.signature_data && contractData.signature_data.startsWith('data:image')) {
      try {
        const signatureBase64 = contractData.signature_data.split(',')[1];
        const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
        
        let signatureImage;
        if (contractData.signature_data.includes('image/png')) {
          signatureImage = await pdfDoc.embedPng(signatureBytes);
        } else if (contractData.signature_data.includes('image/jpeg') || contractData.signature_data.includes('image/jpg')) {
          signatureImage = await pdfDoc.embedJpg(signatureBytes);
        }

        if (signatureImage) {
          const sigWidth = 200;
          const sigHeight = (signatureImage.height / signatureImage.width) * sigWidth;
          
          // Draw signature box
          page.drawRectangle({
            x: col1,
            y: y - sigHeight - 10,
            width: sigWidth + 20,
            height: sigHeight + 20,
            borderColor: grayColor,
            borderWidth: 1,
          });
          
          page.drawImage(signatureImage, {
            x: col1 + 10,
            y: y - sigHeight,
            width: sigWidth,
            height: sigHeight,
          });
          
          y -= sigHeight + 40;
        }
      } catch (sigError) {
        console.error('Error embedding signature:', sigError);
        drawText(page, '[Signature électronique enregistrée]', col1, y - 30, { size: 10, color: grayColor });
        y -= 60;
      }
    } else {
      drawText(page, '[Signature non disponible]', col1, y - 30, { size: 10, color: grayColor });
      y -= 60;
    }

    // Footer
    y -= 40;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: grayColor,
    });
    y -= 20;
    
    drawText(page, 'IMMO-RAMA Sàrl - Recherche Immobilière', col1, y, { size: 8, color: grayColor });
    y -= 12;
    drawText(page, 'Document généré électroniquement - Ce document fait foi de contrat', col1, y, { size: 8, color: grayColor });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    console.log('PDF generated, size:', pdfBytes.length, 'bytes');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `mandat_${contractData.nom}_${contractData.prenom}_${timestamp}.pdf`;
    const filePath = `${contractData.clientId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mandat-contracts')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    console.log('PDF uploaded successfully:', uploadData.path);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('mandat-contracts')
      .getPublicUrl(filePath);

    // Update client record with PDF URL
    const { error: updateError } = await supabase
      .from('clients')
      .update({ 
        mandat_pdf_url: publicUrl,
        mandat_date_signature: contractData.cgv_acceptees_at || new Date().toISOString()
      })
      .eq('id', contractData.clientId);

    if (updateError) {
      console.error('Error updating client:', updateError);
      // Don't throw, PDF is still generated and uploaded
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: publicUrl,
        filePath: filePath 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating contract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
