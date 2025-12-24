import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface ClientData {
  id: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  date_naissance?: string;
  nationalite?: string;
  type_permis?: string;
  adresse?: string;
  etat_civil?: string;
  situation_familiale?: string;
  nombre_occupants?: number;
  gerance_actuelle?: string;
  contact_gerance?: string;
  loyer_actuel?: number;
  pieces_actuel?: number;
  depuis_le?: string;
  motif_changement?: string;
  profession?: string;
  employeur?: string;
  secteur_activite?: string;
  type_contrat?: string;
  date_engagement?: string;
  anciennete_mois?: number;
  revenus_mensuels?: number;
  charges_mensuelles?: number;
  apport_personnel?: number;
  garanties?: string;
  poursuites?: boolean;
  curatelle?: boolean;
  autres_credits?: boolean;
  charges_extraordinaires?: boolean;
  montant_charges_extra?: number;
  type_recherche?: string;
  type_bien?: string;
  pieces?: number;
  budget_max?: number;
  region_recherche?: string;
  souhaits_particuliers?: string;
  animaux?: boolean;
  instrument_musique?: boolean;
  vehicules?: boolean;
  numero_plaques?: string;
  utilisation_logement?: string;
  decouverte_agence?: string;
  note_agent?: string;
  statut?: string;
  priorite?: string;
  created_at?: string;
}

interface CandidateData {
  id: string;
  prenom: string;
  nom: string;
  type: string;
  lien_avec_client?: string;
  date_naissance?: string;
  nationalite?: string;
  type_permis?: string;
  profession?: string;
  employeur?: string;
  revenus_mensuels?: number;
  type_contrat?: string;
}

interface CandidatureData {
  id: string;
  statut?: string;
  date_depot?: string;
  offre?: {
    adresse?: string;
    loyer?: number;
    pieces?: number;
  };
}

interface DocumentData {
  id: string;
  nom: string;
  type_document?: string;
  date_upload?: string;
}

interface AgentData {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
}

interface ProfileData {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
}

interface PDFGeneratorInput {
  client: ClientData;
  profile?: ProfileData;
  candidates?: CandidateData[];
  candidatures?: CandidatureData[];
  documents?: DocumentData[];
  agents?: AgentData[];
}

const COLORS = {
  primary: rgb(0.102, 0.212, 0.365), // #1a365d
  secondary: rgb(0.4, 0.4, 0.4),
  text: rgb(0.1, 0.1, 0.1),
  lightGray: rgb(0.9, 0.9, 0.9),
  success: rgb(0.133, 0.545, 0.133),
  danger: rgb(0.8, 0.2, 0.2),
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const SECTION_SPACING = 20;

export async function generateClientPDF(input: PDFGeneratorInput): Promise<Uint8Array> {
  const { client, profile, candidates = [], candidatures = [], documents = [], agents = [] } = input;
  
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  
  const addPage = () => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    drawFooter();
  };
  
  const checkNewPage = (neededHeight: number) => {
    if (y - neededHeight < MARGIN + 30) {
      addPage();
    }
  };
  
  const drawFooter = () => {
    const pageCount = pdfDoc.getPageCount();
    const footerY = 25;
    page.drawText(`Page ${pageCount}`, {
      x: PAGE_WIDTH / 2 - 20,
      y: footerY,
      size: 8,
      font: helvetica,
      color: COLORS.secondary,
    });
    page.drawText('CONFIDENTIEL - IMMO-RAMA', {
      x: MARGIN,
      y: footerY,
      size: 8,
      font: helvetica,
      color: COLORS.secondary,
    });
    const date = new Date().toLocaleDateString('fr-CH');
    page.drawText(`Généré le ${date}`, {
      x: PAGE_WIDTH - MARGIN - 80,
      y: footerY,
      size: 8,
      font: helvetica,
      color: COLORS.secondary,
    });
  };
  
  const drawSectionTitle = (title: string) => {
    checkNewPage(40);
    y -= SECTION_SPACING;
    page.drawRectangle({
      x: MARGIN,
      y: y - 5,
      width: PAGE_WIDTH - 2 * MARGIN,
      height: 20,
      color: COLORS.lightGray,
    });
    page.drawText(title.toUpperCase(), {
      x: MARGIN + 5,
      y: y,
      size: 11,
      font: helveticaBold,
      color: COLORS.primary,
    });
    y -= 25;
  };
  
  const drawField = (label: string, value: string | number | boolean | null | undefined, isBoolean = false) => {
    checkNewPage(LINE_HEIGHT + 5);
    const labelWidth = 180;
    page.drawText(label + ' :', {
      x: MARGIN,
      y: y,
      size: 9,
      font: helveticaBold,
      color: COLORS.secondary,
    });
    
    let displayValue = '-';
    let valueColor = COLORS.text;
    
    if (isBoolean) {
      displayValue = value === true ? '✓ Oui' : '✗ Non';
      valueColor = value === true ? COLORS.danger : COLORS.success;
    } else if (value !== null && value !== undefined && value !== '') {
      displayValue = String(value);
    }
    
    page.drawText(displayValue, {
      x: MARGIN + labelWidth,
      y: y,
      size: 9,
      font: helvetica,
      color: valueColor,
    });
    y -= LINE_HEIGHT;
  };
  
  const drawTwoColumns = (fields: Array<{ label: string; value: string | number | boolean | null | undefined; isBoolean?: boolean }>) => {
    const colWidth = (PAGE_WIDTH - 2 * MARGIN) / 2;
    for (let i = 0; i < fields.length; i += 2) {
      checkNewPage(LINE_HEIGHT + 5);
      
      // Left column
      const left = fields[i];
      if (left) {
        page.drawText(left.label + ' :', {
          x: MARGIN,
          y: y,
          size: 9,
          font: helveticaBold,
          color: COLORS.secondary,
        });
        let displayValue = '-';
        let valueColor = COLORS.text;
        if (left.isBoolean) {
          displayValue = left.value === true ? '✓ Oui' : '✗ Non';
          valueColor = left.value === true ? COLORS.danger : COLORS.success;
        } else if (left.value !== null && left.value !== undefined && left.value !== '') {
          displayValue = String(left.value);
        }
        page.drawText(displayValue, {
          x: MARGIN + 100,
          y: y,
          size: 9,
          font: helvetica,
          color: valueColor,
        });
      }
      
      // Right column
      const right = fields[i + 1];
      if (right) {
        page.drawText(right.label + ' :', {
          x: MARGIN + colWidth,
          y: y,
          size: 9,
          font: helveticaBold,
          color: COLORS.secondary,
        });
        let displayValue = '-';
        let valueColor = COLORS.text;
        if (right.isBoolean) {
          displayValue = right.value === true ? '✓ Oui' : '✗ Non';
          valueColor = right.value === true ? COLORS.danger : COLORS.success;
        } else if (right.value !== null && right.value !== undefined && right.value !== '') {
          displayValue = String(right.value);
        }
        page.drawText(displayValue, {
          x: MARGIN + colWidth + 100,
          y: y,
          size: 9,
          font: helvetica,
          color: valueColor,
        });
      }
      
      y -= LINE_HEIGHT;
    }
  };
  
  // Header
  page.drawText('IMMO-RAMA', {
    x: MARGIN,
    y: y,
    size: 24,
    font: helveticaBold,
    color: COLORS.primary,
  });
  
  const dateGen = new Date().toLocaleDateString('fr-CH', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  page.drawText(dateGen, {
    x: PAGE_WIDTH - MARGIN - 150,
    y: y,
    size: 10,
    font: helvetica,
    color: COLORS.secondary,
  });
  
  y -= 35;
  
  // Title
  const clientName = `${profile?.prenom || client.prenom || ''} ${profile?.nom || client.nom || ''}`.trim() || 'Client';
  page.drawText(`FICHE CLIENT : ${clientName.toUpperCase()}`, {
    x: MARGIN,
    y: y,
    size: 16,
    font: helveticaBold,
    color: COLORS.primary,
  });
  y -= 10;
  
  // Statut badge
  if (client.statut) {
    page.drawText(`Statut: ${client.statut}`, {
      x: MARGIN,
      y: y,
      size: 10,
      font: helvetica,
      color: COLORS.secondary,
    });
  }
  if (client.priorite) {
    page.drawText(`Priorité: ${client.priorite}`, {
      x: MARGIN + 120,
      y: y,
      size: 10,
      font: helvetica,
      color: COLORS.secondary,
    });
  }
  y -= 10;
  
  // Section 1: Informations personnelles
  drawSectionTitle('Informations personnelles');
  drawTwoColumns([
    { label: 'Prénom', value: profile?.prenom || client.prenom },
    { label: 'Nom', value: profile?.nom || client.nom },
    { label: 'Email', value: profile?.email || client.email },
    { label: 'Téléphone', value: profile?.telephone || client.telephone },
    { label: 'Date de naissance', value: client.date_naissance ? new Date(client.date_naissance).toLocaleDateString('fr-CH') : null },
    { label: 'Nationalité', value: client.nationalite },
    { label: 'Type de permis', value: client.type_permis },
    { label: 'État civil', value: client.etat_civil },
    { label: 'Situation familiale', value: client.situation_familiale },
    { label: 'Nombre d\'occupants', value: client.nombre_occupants },
  ]);
  drawField('Adresse', client.adresse);
  
  // Section 2: Situation actuelle
  drawSectionTitle('Situation actuelle');
  drawTwoColumns([
    { label: 'Gérance actuelle', value: client.gerance_actuelle },
    { label: 'Contact gérance', value: client.contact_gerance },
    { label: 'Loyer actuel', value: client.loyer_actuel ? `CHF ${client.loyer_actuel.toLocaleString('fr-CH')}` : null },
    { label: 'Pièces actuelles', value: client.pieces_actuel },
    { label: 'Depuis le', value: client.depuis_le ? new Date(client.depuis_le).toLocaleDateString('fr-CH') : null },
    { label: 'Utilisation', value: client.utilisation_logement },
  ]);
  drawField('Motif de changement', client.motif_changement);
  
  // Section 3: Situation professionnelle
  drawSectionTitle('Situation professionnelle');
  const anciennete = client.anciennete_mois 
    ? `${Math.floor(client.anciennete_mois / 12)} ans ${client.anciennete_mois % 12} mois`
    : null;
  drawTwoColumns([
    { label: 'Profession', value: client.profession },
    { label: 'Employeur', value: client.employeur },
    { label: 'Secteur d\'activité', value: client.secteur_activite },
    { label: 'Type de contrat', value: client.type_contrat },
    { label: 'Date d\'engagement', value: client.date_engagement ? new Date(client.date_engagement).toLocaleDateString('fr-CH') : null },
    { label: 'Ancienneté', value: anciennete },
  ]);
  
  // Section 4: Situation financière
  drawSectionTitle('Situation financière');
  drawTwoColumns([
    { label: 'Revenus mensuels', value: client.revenus_mensuels ? `CHF ${client.revenus_mensuels.toLocaleString('fr-CH')}` : null },
    { label: 'Charges mensuelles', value: client.charges_mensuelles ? `CHF ${client.charges_mensuelles.toLocaleString('fr-CH')}` : null },
    { label: 'Apport personnel', value: client.apport_personnel ? `CHF ${client.apport_personnel.toLocaleString('fr-CH')}` : null },
    { label: 'Garanties', value: client.garanties },
  ]);
  y -= 5;
  drawTwoColumns([
    { label: 'Poursuites', value: client.poursuites, isBoolean: true },
    { label: 'Curatelle', value: client.curatelle, isBoolean: true },
    { label: 'Autres crédits', value: client.autres_credits, isBoolean: true },
    { label: 'Charges extra.', value: client.charges_extraordinaires, isBoolean: true },
  ]);
  if (client.charges_extraordinaires && client.montant_charges_extra) {
    drawField('Montant charges extra.', `CHF ${client.montant_charges_extra.toLocaleString('fr-CH')}`);
  }
  
  // Calcul ratio solvabilité
  if (client.revenus_mensuels && client.budget_max) {
    const ratio = ((client.budget_max / client.revenus_mensuels) * 100).toFixed(1);
    const budgetRecommande = Math.floor(client.revenus_mensuels / 3);
    y -= 5;
    drawField('Ratio loyer/revenus', `${ratio}%`);
    drawField('Budget recommandé (33%)', `CHF ${budgetRecommande.toLocaleString('fr-CH')}`);
  }
  
  // Section 5: Critères de recherche
  drawSectionTitle('Critères de recherche');
  drawTwoColumns([
    { label: 'Type de recherche', value: client.type_recherche },
    { label: 'Type de bien', value: client.type_bien },
    { label: 'Pièces souhaitées', value: client.pieces },
    { label: 'Budget max', value: client.budget_max ? `CHF ${client.budget_max.toLocaleString('fr-CH')}` : null },
    { label: 'Région', value: client.region_recherche },
    { label: 'Découverte agence', value: client.decouverte_agence },
  ]);
  drawTwoColumns([
    { label: 'Animaux', value: client.animaux, isBoolean: true },
    { label: 'Instrument musique', value: client.instrument_musique, isBoolean: true },
    { label: 'Véhicules', value: client.vehicules, isBoolean: true },
    { label: 'N° plaques', value: client.numero_plaques },
  ]);
  if (client.souhaits_particuliers) {
    y -= 5;
    drawField('Souhaits particuliers', client.souhaits_particuliers);
  }
  
  // Section 6: Candidats associés
  if (candidates.length > 0) {
    drawSectionTitle(`Candidats associés (${candidates.length})`);
    for (const candidate of candidates) {
      checkNewPage(60);
      page.drawText(`• ${candidate.prenom} ${candidate.nom} - ${candidate.type}`, {
        x: MARGIN,
        y: y,
        size: 10,
        font: helveticaBold,
        color: COLORS.text,
      });
      y -= LINE_HEIGHT;
      
      const candidateInfo = [
        candidate.lien_avec_client ? `Lien: ${candidate.lien_avec_client}` : null,
        candidate.profession ? `Profession: ${candidate.profession}` : null,
        candidate.revenus_mensuels ? `Revenus: CHF ${candidate.revenus_mensuels.toLocaleString('fr-CH')}` : null,
      ].filter(Boolean).join(' | ');
      
      if (candidateInfo) {
        page.drawText(candidateInfo, {
          x: MARGIN + 10,
          y: y,
          size: 9,
          font: helvetica,
          color: COLORS.secondary,
        });
        y -= LINE_HEIGHT;
      }
      y -= 5;
    }
  }
  
  // Section 7: Candidatures en cours
  if (candidatures.length > 0) {
    drawSectionTitle(`Candidatures (${candidatures.length})`);
    for (const cand of candidatures) {
      checkNewPage(30);
      const adresse = cand.offre?.adresse || 'Adresse non spécifiée';
      const statut = cand.statut || 'En attente';
      const date = cand.date_depot ? new Date(cand.date_depot).toLocaleDateString('fr-CH') : '-';
      
      page.drawText(`• ${adresse}`, {
        x: MARGIN,
        y: y,
        size: 10,
        font: helveticaBold,
        color: COLORS.text,
      });
      y -= LINE_HEIGHT;
      
      page.drawText(`Statut: ${statut} | Déposée le: ${date}`, {
        x: MARGIN + 10,
        y: y,
        size: 9,
        font: helvetica,
        color: COLORS.secondary,
      });
      y -= LINE_HEIGHT + 5;
    }
  }
  
  // Section 8: Documents
  if (documents.length > 0) {
    drawSectionTitle(`Documents uploadés (${documents.length})`);
    for (const doc of documents) {
      checkNewPage(LINE_HEIGHT + 5);
      const typeDoc = doc.type_document || 'Autre';
      page.drawText(`• ${doc.nom} (${typeDoc})`, {
        x: MARGIN,
        y: y,
        size: 9,
        font: helvetica,
        color: COLORS.text,
      });
      y -= LINE_HEIGHT;
    }
  }
  
  // Section 9: Agents assignés
  if (agents.length > 0) {
    drawSectionTitle('Agent(s) assigné(s)');
    for (const agent of agents) {
      checkNewPage(30);
      const agentName = `${agent.prenom || ''} ${agent.nom || ''}`.trim() || 'Agent';
      page.drawText(`• ${agentName}`, {
        x: MARGIN,
        y: y,
        size: 10,
        font: helveticaBold,
        color: COLORS.text,
      });
      y -= LINE_HEIGHT;
      
      const contactInfo = [agent.email, agent.telephone].filter(Boolean).join(' | ');
      if (contactInfo) {
        page.drawText(contactInfo, {
          x: MARGIN + 10,
          y: y,
          size: 9,
          font: helvetica,
          color: COLORS.secondary,
        });
        y -= LINE_HEIGHT;
      }
    }
  }
  
  // Note agent
  if (client.note_agent) {
    drawSectionTitle('Notes de l\'agent');
    checkNewPage(50);
    const noteLines = client.note_agent.split('\n');
    for (const line of noteLines) {
      checkNewPage(LINE_HEIGHT + 2);
      page.drawText(line.substring(0, 80), {
        x: MARGIN,
        y: y,
        size: 9,
        font: helvetica,
        color: COLORS.text,
      });
      y -= LINE_HEIGHT;
    }
  }
  
  // Draw footer on all pages
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(`Page ${i + 1} / ${pages.length}`, {
      x: PAGE_WIDTH / 2 - 25,
      y: 25,
      size: 8,
      font: helvetica,
      color: COLORS.secondary,
    });
    p.drawText('CONFIDENTIEL - IMMO-RAMA', {
      x: MARGIN,
      y: 25,
      size: 8,
      font: helvetica,
      color: COLORS.secondary,
    });
    p.drawText(`Généré le ${new Date().toLocaleDateString('fr-CH')}`, {
      x: PAGE_WIDTH - MARGIN - 80,
      y: 25,
      size: 8,
      font: helvetica,
      color: COLORS.secondary,
    });
  }
  
  return pdfDoc.save();
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
