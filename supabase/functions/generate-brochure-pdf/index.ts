import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatCHF(amount: number | null): string {
  if (!amount) return 'Prix sur demande';
  return `CHF ${amount.toLocaleString('fr-CH')}`;
}

function formatNumber(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return 'N/A';
  return `${n.toLocaleString('fr-CH')}${suffix}`;
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

    console.log('Generating brochure DOCX for immeuble:', immeuble_id);

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

    // Download the DOCX template from storage
    const { data: templateData, error: templateError } = await supabase.storage
      .from('brochure-templates')
      .download('brochure-vente-template.docx');

    if (templateError || !templateData) {
      console.error('Error downloading template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Template downloaded, size:', templateData.size);

    // Load the DOCX (ZIP) file
    const zip = await JSZip.loadAsync(await templateData.arrayBuffer());

    // Read document.xml
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('document.xml not found in template');
    }
    let docXml = await docXmlFile.async('string');

    // Prepare replacement values
    const localisation = [immeuble.ville, immeuble.canton].filter(Boolean).join(' - ').toUpperCase() || 'LOCALISATION';
    const prix = formatCHF(immeuble.prix_vente_demande);
    const surfaceHab = immeuble.surface_totale ? `env. ${formatNumber(immeuble.surface_totale)} m²` : 'N/A';
    const volumeEca = immeuble.volume_eca ? `${formatNumber(immeuble.volume_eca)} m³` : 'N/A';
    const surfaceParcelle = immeuble.surface_parcelle ? `${formatNumber(immeuble.surface_parcelle)} m²` : 'N/A';
    const chauffage = immeuble.type_chauffage || immeuble.combustible || 'N/A';
    const cecb = immeuble.classe_energetique || 'N/A';
    const statut = immeuble.est_loue ? 'Loué' : 'Libre';
    const nbLogements = immeuble.nb_logements?.toString() || immeuble.nb_unites?.toString() || '—';
    const typologie = immeuble.nb_logements ? `${immeuble.nb_logements} logements` : (immeuble.nombre_pieces ? `${immeuble.nombre_pieces} pièces` : 'N/A');
    const potentiel = immeuble.potentiel_developpement || 'À étudier';
    const descCourte = immeuble.description_commerciale?.substring(0, 80) || immeuble.type_bien || 'Bien immobilier avec potentiel';

    // Calculate KPIs
    const prixM2 = (immeuble.prix_vente_demande && immeuble.surface_totale)
      ? `${formatNumber(Math.round(immeuble.prix_vente_demande / immeuble.surface_totale))} CHF`
      : 'N/A';
    const prixM3 = (immeuble.prix_vente_demande && immeuble.volume_eca)
      ? `${formatNumber(Math.round(immeuble.prix_vente_demande / immeuble.volume_eca))} CHF`
      : 'N/A';

    // Executive summary paragraphs
    const desc = immeuble.description_commerciale || '';
    const sentences = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary1 = sentences.slice(0, 2).join(' ') || `Bien situé à ${immeuble.ville || 'emplacement de choix'}.`;
    const summary2 = sentences.slice(2, 5).join(' ') || 'Description détaillée disponible sur demande.';
    const summary3 = sentences.slice(5, 8).join(' ') || '';

    const titreSummary = `Actif ${immeuble.type_bien ? immeuble.type_bien.toLowerCase() : 'immobilier'} à ${immeuble.ville || 'localisation premium'}`;

    // Points forts as potentiel items
    const pointsForts = immeuble.points_forts || [];
    const potentiel1 = pointsForts[0] || `Bien situé à ${immeuble.ville || 'un emplacement stratégique'}.`;
    const potentiel2 = pointsForts[1] || 'Potentiel de valorisation à étudier.';
    const potentiel3 = pointsForts[2] || '';
    const potentiel4 = pointsForts[3] || '';

    // Nb leviers
    const leviers = [];
    if (immeuble.potentiel_developpement) leviers.push('développement');
    if (immeuble.classe_energetique && ['E', 'F', 'G'].includes(immeuble.classe_energetique.toUpperCase())) leviers.push('énergie');
    if (immeuble.est_loue === false) leviers.push('libre');
    const nbLeviers = leviers.length > 0 ? `${leviers.length} leviers` : '—';

    // Replace all placeholders
    const replacements: Record<string, string> = {
      '{{LOCALISATION}}': localisation,
      '{{DESCRIPTION_COURTE}}': descCourte,
      '{{PRIX}}': prix,
      '{{NB_LOGEMENTS}}': nbLogements,
      '{{SURFACE_HABITABLE}}': surfaceHab,
      '{{VOLUME_ECA}}': volumeEca,
      '{{STATUT}}': statut,
      '{{CECB}}': cecb,
      '{{POTENTIEL}}': potentiel,
      '{{TITRE_SUMMARY}}': titreSummary,
      '{{EXECUTIVE_SUMMARY_1}}': summary1,
      '{{EXECUTIVE_SUMMARY_2}}': summary2,
      '{{EXECUTIVE_SUMMARY_3}}': summary3,
      '{{SURFACE_PARCELLE}}': surfaceParcelle,
      '{{CHAUFFAGE}}': chauffage,
      '{{PRIX_M2}}': prixM2,
      '{{PRIX_M3}}': prixM3,
      '{{TYPOLOGIE}}': typologie,
      '{{NB_LEVIERS}}': nbLeviers,
      '{{POTENTIEL_1}}': potentiel1,
      '{{POTENTIEL_2}}': potentiel2,
      '{{POTENTIEL_3}}': potentiel3,
      '{{POTENTIEL_4}}': potentiel4,
      '{{ETUDE_TITRE}}': 'Points clés du bien :',
      '{{ETUDE_1}}': pointsForts[0] ? `• ${pointsForts[0]}` : '',
      '{{ETUDE_2}}': pointsForts[1] ? `• ${pointsForts[1]}` : '',
      '{{ETUDE_3}}': pointsForts[2] ? `• ${pointsForts[2]}` : '',
      '{{ETUDE_4}}': pointsForts[3] ? `• ${pointsForts[3]}` : '',
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      docXml = docXml.replaceAll(placeholder, escapeXml(value));
    }

    // Write back document.xml
    zip.file('word/document.xml', docXml);

    // Generate the final DOCX
    const docxBuffer = await zip.generateAsync({ type: 'uint8array' });

    // Convert to base64
    const base64 = uint8ArrayToBase64(docxBuffer);

    const filename = `brochure-${(immeuble.nom || 'bien').replace(/[^a-zA-Z0-9]/g, '-')}.docx`;

    console.log('Brochure DOCX generated successfully, size:', docxBuffer.length);

    return new Response(
      JSON.stringify({ docx_base64: base64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating brochure:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(handler);
