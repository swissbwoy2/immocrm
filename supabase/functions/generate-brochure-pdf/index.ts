import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function e(s: string): string { return escapeXml(s); }

function generateDocumentXml(d: Record<string, string>): string {
  // Gold color: C5A572
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
<w:body>

<!-- PAGE 1: COVER -->
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="600" w:after="200"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="56"/><w:color w:val="C5A572"/><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/></w:rPr>
<w:t>IMMO-RAMA</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr>
<w:r><w:rPr><w:sz w:val="20"/><w:color w:val="C5A572"/></w:rPr>
<w:t>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="100"/></w:pPr>
<w:r><w:rPr><w:sz w:val="28"/><w:color w:val="333333"/><w:spacing w:val="60"/></w:rPr>
<w:t>DOSSIER OFF-MARKET</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="600" w:after="200"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="1A1A1A"/></w:rPr>
<w:t>${e(d.LOCALISATION)}</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr>
<w:r><w:rPr><w:i/><w:sz w:val="24"/><w:color w:val="666666"/></w:rPr>
<w:t>${e(d.DESCRIPTION_COURTE)}</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="400" w:after="400"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="C5A572"/></w:rPr>
<w:t>${e(d.PRIX)}</w:t></w:r></w:p>

<!-- KPI TABLE -->
<w:tbl>
<w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:jc w:val="center"/>
<w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="C5A572"/>
<w:left w:val="single" w:sz="4" w:color="C5A572"/>
<w:bottom w:val="single" w:sz="4" w:color="C5A572"/>
<w:right w:val="single" w:sz="4" w:color="C5A572"/>
<w:insideH w:val="single" w:sz="4" w:color="E8DCC8"/>
<w:insideV w:val="single" w:sz="4" w:color="E8DCC8"/>
</w:tblBorders>
</w:tblPr>
<w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>
<w:tr>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="F5F0E8"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>LOGEMENTS</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1A1A1A"/></w:rPr><w:t>${e(d.NB_LOGEMENTS)}</w:t></w:r></w:p></w:tc>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="F5F0E8"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>SURFACE HAB.</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1A1A1A"/></w:rPr><w:t>${e(d.SURFACE_HABITABLE)}</w:t></w:r></w:p></w:tc>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="F5F0E8"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>VOLUME ECA</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1A1A1A"/></w:rPr><w:t>${e(d.VOLUME_ECA)}</w:t></w:r></w:p></w:tc>
</w:tr>
<w:tr>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="FFFFFF"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>STATUT</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1A1A1A"/></w:rPr><w:t>${e(d.STATUT)}</w:t></w:r></w:p></w:tc>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="FFFFFF"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>CECB</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1A1A1A"/></w:rPr><w:t>${e(d.CECB)}</w:t></w:r></w:p></w:tc>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="FFFFFF"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>POTENTIEL</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1A1A1A"/></w:rPr><w:t>${e(d.POTENTIEL)}</w:t></w:r></w:p></w:tc>
</w:tr>
</w:tbl>

<!-- PAGE BREAK -->
<w:p><w:r><w:br w:type="page"/></w:r></w:p>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<w:p><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
<w:r><w:rPr><w:sz w:val="20"/><w:color w:val="C5A572"/></w:rPr>
<w:t>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:after="300"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="C5A572"/></w:rPr>
<w:t>EXECUTIVE SUMMARY</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:after="200"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="333333"/></w:rPr>
<w:t>${e(d.TITRE_SUMMARY)}</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
<w:t>${e(d.EXECUTIVE_SUMMARY_1)}</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
<w:t>${e(d.EXECUTIVE_SUMMARY_2)}</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:after="300"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
<w:t>${e(d.EXECUTIVE_SUMMARY_3)}</w:t></w:r></w:p>

<!-- Stats mini table -->
<w:tbl>
<w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:jc w:val="center"/>
<w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="E8DCC8"/>
<w:bottom w:val="single" w:sz="4" w:color="E8DCC8"/>
<w:insideH w:val="single" w:sz="4" w:color="E8DCC8"/>
<w:insideV w:val="single" w:sz="4" w:color="E8DCC8"/>
</w:tblBorders>
</w:tblPr>
<w:tblGrid><w:gridCol w:w="2250"/><w:gridCol w:w="2250"/><w:gridCol w:w="2250"/><w:gridCol w:w="2250"/></w:tblGrid>
<w:tr>
<w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>Surface hab.</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${e(d.SURFACE_HABITABLE)}</w:t></w:r></w:p></w:tc>
<w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>Parcelle</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${e(d.SURFACE_PARCELLE)}</w:t></w:r></w:p></w:tc>
<w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>Chauffage</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${e(d.CHAUFFAGE)}</w:t></w:r></w:p></w:tc>
<w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>CECB</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${e(d.CECB)}</w:t></w:r></w:p></w:tc>
</w:tr>
</w:tbl>

<!-- PAGE BREAK -->
<w:p><w:r><w:br w:type="page"/></w:r></w:p>

<!-- PAGE 3: LECTURE INVESTISSEMENT -->
<w:p><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
<w:r><w:rPr><w:sz w:val="20"/><w:color w:val="C5A572"/></w:rPr>
<w:t>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:after="300"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="C5A572"/></w:rPr>
<w:t>LECTURE INVESTISSEMENT</w:t></w:r></w:p>

<w:tbl>
<w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:jc w:val="center"/>
<w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="C5A572"/>
<w:left w:val="single" w:sz="4" w:color="C5A572"/>
<w:bottom w:val="single" w:sz="4" w:color="C5A572"/>
<w:right w:val="single" w:sz="4" w:color="C5A572"/>
<w:insideH w:val="single" w:sz="4" w:color="E8DCC8"/>
<w:insideV w:val="single" w:sz="4" w:color="E8DCC8"/>
</w:tblBorders>
</w:tblPr>
<w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>
<w:tr>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="F5F0E8"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>PRIX / M²</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="C5A572"/></w:rPr><w:t>${e(d.PRIX_M2)}</w:t></w:r></w:p></w:tc>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="F5F0E8"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>PRIX / M³</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="C5A572"/></w:rPr><w:t>${e(d.PRIX_M3)}</w:t></w:r></w:p></w:tc>
<w:tc><w:tcPr><w:shd w:val="clear" w:fill="F5F0E8"/></w:tcPr>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>STATUT</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="C5A572"/></w:rPr><w:t>${e(d.STATUT)}</w:t></w:r></w:p></w:tc>
</w:tr>
<w:tr>
<w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>TYPOLOGIE</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${e(d.TYPOLOGIE)}</w:t></w:r></w:p></w:tc>
<w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>LEVIERS</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${e(d.NB_LEVIERS)}</w:t></w:r></w:p></w:tc>
<w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr><w:t>PRIX TOTAL</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${e(d.PRIX)}</w:t></w:r></w:p></w:tc>
</w:tr>
</w:tbl>

<!-- Potentiel section -->
<w:p><w:pPr><w:spacing w:before="400" w:after="200"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="333333"/></w:rPr>
<w:t>Potentiel de création de valeur</w:t></w:r></w:p>

${d.POTENTIEL_1 ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
<w:t>▸ ${e(d.POTENTIEL_1)}</w:t></w:r></w:p>` : ''}

${d.POTENTIEL_2 ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
<w:t>▸ ${e(d.POTENTIEL_2)}</w:t></w:r></w:p>` : ''}

${d.POTENTIEL_3 ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
<w:t>▸ ${e(d.POTENTIEL_3)}</w:t></w:r></w:p>` : ''}

${d.POTENTIEL_4 ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr>
<w:t>▸ ${e(d.POTENTIEL_4)}</w:t></w:r></w:p>` : ''}

<!-- PAGE BREAK -->
<w:p><w:r><w:br w:type="page"/></w:r></w:p>

<!-- PAGE 4: CONTACT -->
<w:p><w:pPr><w:spacing w:before="600" w:after="100"/><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:sz w:val="20"/><w:color w:val="C5A572"/></w:rPr>
<w:t>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="400"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="C5A572"/><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/></w:rPr>
<w:t>IMMO-RAMA</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="333333"/></w:rPr>
<w:t>Pour toute information complémentaire,</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="300"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="333333"/></w:rPr>
<w:t>n'hésitez pas à nous contacter.</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="C5A572"/></w:rPr>
<w:t>info@immo-rama.ch</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="333333"/></w:rPr>
<w:t>+41 76 483 91 99</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
<w:r><w:rPr><w:sz w:val="22"/><w:color w:val="333333"/></w:rPr>
<w:t>www.immo-rama.ch</w:t></w:r></w:p>

<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="200"/></w:pPr>
<w:r><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="999999"/></w:rPr>
<w:t>Document confidentiel — Diffusion restreinte</w:t></w:r></w:p>

<w:sectPr>
<w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
</w:sectPr>
</w:body>
</w:document>`;
}

function generateContentTypes(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
}

function generateRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function generateWordRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
}

// Minimal ZIP builder - no external deps needed
function createMinimalZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const entries: { name: Uint8Array; data: Uint8Array; offset: number }[] = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    
    // Local file header
    const header = new Uint8Array(30 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true); // signature
    hv.setUint16(4, 20, true); // version needed
    hv.setUint16(6, 0, true); // flags
    hv.setUint16(8, 0, true); // compression: stored
    hv.setUint16(10, 0, true); // mod time
    hv.setUint16(12, 0, true); // mod date
    
    // CRC32
    const crc = crc32(dataBytes);
    hv.setUint32(14, crc, true);
    hv.setUint32(18, dataBytes.length, true); // compressed size
    hv.setUint32(22, dataBytes.length, true); // uncompressed size
    hv.setUint16(26, nameBytes.length, true); // name length
    hv.setUint16(28, 0, true); // extra length
    header.set(nameBytes, 30);
    
    entries.push({ name: nameBytes, data: dataBytes, offset });
    parts.push(header, dataBytes);
    offset += header.length + dataBytes.length;
  }

  // Central directory
  const cdStart = offset;
  for (const entry of entries) {
    const cd = new Uint8Array(46 + entry.name.length);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    const crc = crc32(entry.data);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, entry.data.length, true);
    cdv.setUint32(24, entry.data.length, true);
    cdv.setUint16(28, entry.name.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, entry.offset, true);
    cd.set(entry.name, 46);
    parts.push(cd);
    offset += cd.length;
  }
  const cdSize = offset - cdStart;

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdStart, true);
  ev.setUint16(20, 0, true);
  parts.push(eocd);

  // Concatenate
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }
  return result;
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunk = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { immeuble_id } = await req.json();
    if (!immeuble_id) {
      return new Response(JSON.stringify({ error: 'immeuble_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Generating brochure DOCX for immeuble:', immeuble_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: immeuble, error: immeubleError } = await supabase
      .from('immeubles')
      .select('*')
      .eq('id', immeuble_id)
      .single();

    if (immeubleError || !immeuble) {
      return new Response(JSON.stringify({ error: 'Immeuble not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prepare data
    const localisation = [immeuble.ville, immeuble.canton].filter(Boolean).join(' — ').toUpperCase() || 'LOCALISATION';
    const desc = immeuble.description_commerciale || '';
    const sentences = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
    const pointsForts = immeuble.points_forts || [];

    const leviers: string[] = [];
    if (immeuble.potentiel_developpement) leviers.push('développement');
    if (immeuble.classe_energetique && ['E','F','G'].includes(immeuble.classe_energetique.toUpperCase())) leviers.push('énergie');
    if (immeuble.est_loue === false) leviers.push('libre');

    const d: Record<string, string> = {
      LOCALISATION: localisation,
      DESCRIPTION_COURTE: immeuble.description_commerciale?.substring(0, 80) || immeuble.type_bien || 'Bien immobilier avec potentiel',
      PRIX: formatCHF(immeuble.prix_vente_demande),
      NB_LOGEMENTS: immeuble.nb_logements?.toString() || immeuble.nb_unites?.toString() || '—',
      SURFACE_HABITABLE: immeuble.surface_totale ? `env. ${formatNumber(immeuble.surface_totale)} m²` : 'N/A',
      VOLUME_ECA: immeuble.volume_eca ? `${formatNumber(immeuble.volume_eca)} m³` : 'N/A',
      STATUT: immeuble.est_loue ? 'Loué' : 'Libre',
      CECB: immeuble.classe_energetique || 'N/A',
      POTENTIEL: immeuble.potentiel_developpement || 'À étudier',
      TITRE_SUMMARY: `Actif ${(immeuble.type_bien || 'immobilier').toLowerCase()} à ${immeuble.ville || 'localisation premium'}`,
      EXECUTIVE_SUMMARY_1: sentences.slice(0, 2).join(' ') || `Bien situé à ${immeuble.ville || 'emplacement de choix'}.`,
      EXECUTIVE_SUMMARY_2: sentences.slice(2, 5).join(' ') || 'Description détaillée disponible sur demande.',
      EXECUTIVE_SUMMARY_3: sentences.slice(5, 8).join(' ') || '',
      SURFACE_PARCELLE: immeuble.surface_parcelle ? `${formatNumber(immeuble.surface_parcelle)} m²` : 'N/A',
      CHAUFFAGE: immeuble.type_chauffage || immeuble.combustible || 'N/A',
      PRIX_M2: (immeuble.prix_vente_demande && immeuble.surface_totale) ? `${formatNumber(Math.round(immeuble.prix_vente_demande / immeuble.surface_totale))} CHF` : 'N/A',
      PRIX_M3: (immeuble.prix_vente_demande && immeuble.volume_eca) ? `${formatNumber(Math.round(immeuble.prix_vente_demande / immeuble.volume_eca))} CHF` : 'N/A',
      TYPOLOGIE: immeuble.nb_logements ? `${immeuble.nb_logements} logements` : (immeuble.nombre_pieces ? `${immeuble.nombre_pieces} pièces` : 'N/A'),
      NB_LEVIERS: leviers.length > 0 ? `${leviers.length} leviers` : '—',
      POTENTIEL_1: pointsForts[0] || `Bien situé à ${immeuble.ville || 'un emplacement stratégique'}.`,
      POTENTIEL_2: pointsForts[1] || 'Potentiel de valorisation à étudier.',
      POTENTIEL_3: pointsForts[2] || '',
      POTENTIEL_4: pointsForts[3] || '',
    };

    // Generate DOCX files
    const files: Record<string, string> = {
      '[Content_Types].xml': generateContentTypes(),
      '_rels/.rels': generateRels(),
      'word/_rels/document.xml.rels': generateWordRels(),
      'word/document.xml': generateDocumentXml(d),
    };

    const zipBytes = createMinimalZip(files);
    const base64 = uint8ArrayToBase64(zipBytes);
    const filename = `brochure-${(immeuble.nom || 'bien').replace(/[^a-zA-Z0-9]/g, '-')}.docx`;

    console.log('Brochure DOCX generated, size:', zipBytes.length);

    return new Response(
      JSON.stringify({ docx_base64: base64, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating brochure:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
