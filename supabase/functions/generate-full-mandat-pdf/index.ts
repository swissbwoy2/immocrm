import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { verifyInternalCaller } from "../_shared/internal-auth.ts";

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
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
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
      const supported = 'àâäçéèêëîïôùûüÿœæÀÂÄÇÉÈÊËÎÏÔÙÛÜŸŒÆ°€£¥©®™±×÷«»';
      return supported.includes(char) ? char : '';
    });
}

// ── Mandat ACHAT tel qu'affiché et accepté à la signature (formulaire /nouveau-mandat, depuis le 21.08.2026) ──
const ACHAT_SIGNED_TEXT = `MANDAT DE RECHERCHE IMMOBILIERE - ACHAT (VAUD)
Conditions affichées au Mandant et acceptées lors de la signature électronique.

1. Conditions financières Immo-Rama.ch
Commission de courtage : 1 % du prix de vente, due au succès, minimum CHF 500, plus la TVA si elle est due.
Montant d'activation : CHF 2'500, imputé sur la commission.
Solde à la conclusion de l'acte : 1 % du prix de vente moins le montant d'activation de CHF 2'500.
Durée du mandat : 6 mois, reconduction tacite par périodes de 6 mois.

2. Mission confiée à Immo-Rama.ch
Analyse du projet d'achat ; analyse de la capacité financière ; collecte et vérification des documents ; transmission aux partenaires financiers ; recherche de biens correspondant aux critères ; sélection et analyse des biens ; organisation et coordination des visites ; contre-visite avec le client ; analyse détaillée du bien sélectionné ; négociation avec les vendeurs ; coordination bancaire et hypothécaire ; coordination avec le notaire ; suivi jusqu'à la remise des clés.

3. Autorisations et consentements
Le Mandant autorise Immo-Rama à transmettre les seules données nécessaires à une démarche déterminée (financement, offre, acte) aux partenaires concernés : banques et courtiers en financement, notaires, agences, propriétaires et vendeurs.
Tout contrôle de solvabilité ou contact avec l'employeur n'a lieu qu'après information préalable et accord spécifique du Mandant, dans le respect de la LPD (finalité, proportionnalité, sécurité et transparence).
Le Mandant autorise Immo-Rama à le représenter dans les démarches de recherche, prise de contact, coordination et négociation liées à son projet d'achat. La prospection commerciale repose sur un consentement séparé, facultatif et révocable.

4. Limites de responsabilité
Immo-Rama agit avec diligence et fidélité, sans obligation de résultat.
Immo-Rama ne garantit ni la disponibilité d'un bien, ni l'obtention d'un financement hypothécaire, ni l'acceptation d'une offre par un vendeur.
Les décisions juridiques, techniques, fiscales et financières appartiennent au Mandant, assisté au besoin de professionnels qualifiés.
Aucune exclusion ne couvre le dol, la faute grave, la violation d'une obligation essentielle imputable à Immo-Rama, ni les responsabilités légalement impératives.
La décision finale d'achat et de signature de l'acte authentique reste sous la responsabilité du Mandant.

5. Déclaration acceptée par le Mandant
Je déclare avoir lu et accepté l'intégralité du présent mandat de recherche immobilière (achat) : la commission de 1 % du prix de vente (min. CHF 500, + TVA si due), le montant d'activation de CHF 2'500 imputé sur la commission, le périmètre de mission, les autorisations de transmission de données et les limites de responsabilité. Je comprends que le mandat est conclu pour une période initiale de 6 mois reconductible tacitement par périodes de 6 mois, et que chaque partie peut y mettre fin en tout temps conformément à l'art. 404 CO, aux conséquences financières prévues.`;

// Titres des dispositions cochées une à une (clés enregistrées dans demandes_mandat.legal_consents)
const CONSENT_TITLES: Record<string, string> = {
  legal_objet: 'Objet et portée du mandat',
  legal_commission: 'Naissance et montant de la commission',
  legal_acompte: "Montant d'activation",
  legal_duree: 'Durée et reconduction tacite',
  legal_remboursement: 'Résiliation et remboursement',
  legal_revocation: 'Révocation en tout temps (art. 404 CO)',
  legal_litiges: 'Contrats ultérieurs',
  legal_confidentialite: 'Confidentialité',
  legal_verifications: 'Informations et vérifications',
  legal_transmission_dossier: 'Transmission du dossier',
  legal_garants_cocandidats: 'Garants et co-candidats',
  legal_attribution_gerance: 'Attribution par la gérance',
  legal_obligation_moyens: "Responsabilité et position d'Immo-Rama",
  legal_protection_donnees: 'Protection des données',
  legal_droit_applicable: 'Droit applicable et for',
  legal_acceptation_generale: 'Acceptation finale',
  legal_exclusivite: 'Exclusivité',
  legal_cgu: "Conditions générales d'utilisation",
  legal_resiliation: 'Résiliation',
  legal_obligations_client: 'Obligations du client',
  legal_obligations_agence: "Obligations de l'agence",
  achat_legal_objet: 'Objet et portée du mandat (achat)',
  achat_legal_commission: 'Naissance et montant de la commission',
  achat_legal_activation: "Montant d'activation",
  achat_legal_duree: 'Durée et reconduction tacite',
  achat_legal_remboursement: 'Résiliation et remboursement',
  achat_legal_revocation: 'Révocation en tout temps (art. 404 CO)',
  achat_legal_information: 'Information et biens déjà connus',
  achat_legal_confidentialite: 'Confidentialité',
  achat_legal_verifications: 'Informations et vérifications',
  achat_legal_transmission: 'Transmission des données',
  achat_legal_coacquereurs: 'Co-acquéreurs et tiers',
  achat_legal_responsabilite: "Responsabilité et position d'Immo-Rama",
  achat_legal_protection_donnees: 'Protection des données',
  achat_legal_droit_applicable: 'Droit applicable et for',
  achat_legal_acceptation_generale: 'Acceptation finale',
};

// Texte exact des dispositions cochées, selon la version affichée au moment de la signature
type ConsentText = { t: string; q: string; c: string };
// Version du 19.08.2026 (13 dispositions, dont la règle de remboursement « Article 7bis »)
const CONSENTS_V1908: Record<string, ConsentText> = {
 "legal_objet": {
  "t": "Objet du mandat",
  "q": "Confirmez-vous vouloir confier à Immo-rama.ch votre recherche immobilière selon les critères communiqués ?",
  "c": "Oui, je confirme"
 },
 "legal_obligation_moyens": {
  "t": "Obligation de moyens",
  "q": "Avez-vous compris qu'Immo-rama.ch met en œuvre ses moyens pour vous accompagner mais ne peut garantir l'obtention d'un logement ou la conclusion d'une transaction ?",
  "c": "Oui, j'ai compris"
 },
 "legal_exclusivite": {
  "t": "Exclusivité",
  "q": "Acceptez-vous de confier cette recherche à Immo-rama.ch à titre exclusif pendant la durée du mandat, sous réserve de votre droit légal de résilier le mandat en tout temps ?",
  "c": "Oui, j'accepte l'exclusivité"
 },
 "legal_duree": {
  "t": "Durée et renouvellement",
  "q": "Acceptez-vous une durée initiale de 3 mois, renouvelable par périodes de 3 mois, tout en conservant votre droit de résilier le mandat en tout temps conformément à l'art. 404 CO ?",
  "c": "Oui, j'accepte"
 },
 "legal_commission": {
  "t": "Commission",
  "q": "Si vous obtenez un logement grâce à l'intervention d'Immo-rama.ch, acceptez-vous qu'une commission correspondant à un mois de loyer brut, charges comprises, soit due, plus TVA au taux légal si applicable ?",
  "c": "Oui, j'accepte la commission"
 },
 "legal_acompte": {
  "t": "Acompte",
  "q": "Acceptez-vous de verser un acompte de CHF 300.–, déductible de la commission en cas de succès, conformément à l'article 7 du contrat ?",
  "c": "Oui, j'accepte"
 },
 "legal_remboursement": {
  "t": "Remboursement",
  "q": "Acceptez-vous que l'acompte ne soit remboursable qu'après 90 jours de recherche active (remboursement sous 30 jours si aucun logement n'a été obtenu grâce à Immo-rama.ch), et qu'il ne soit pas remboursable si vous mettez fin au mandat avant 90 jours, sous réserve de votre droit légal de résilier en tout temps ?",
  "c": "Oui, j'accepte"
 },
 "legal_transmission_dossier": {
  "t": "Transmission du dossier",
  "q": "Autorisez-vous Immo-rama.ch à transmettre aux régies, propriétaires, vendeurs ou partenaires concernés les informations et documents nécessaires aux candidatures que vous demandez ?",
  "c": "Oui, j'autorise"
 },
 "legal_garants_cocandidats": {
  "t": "Garants et co-candidats",
  "q": "Lorsque vous nous transmettez les données d'un garant, d'un co-candidat ou d'une autre personne, confirmez-vous l'avoir informé de cette transmission ?",
  "c": "Oui, je confirme"
 },
 "legal_litiges": {
  "t": "Non-contournement",
  "q": "Acceptez-vous que la commission puisse rester due si vous concluez directement un contrat portant sur un bien présenté par Immo-rama.ch et que son intervention a contribué à la conclusion de ce contrat ?",
  "c": "Oui, j'accepte"
 },
 "legal_protection_donnees": {
  "t": "Données personnelles",
  "q": "J'ai pris connaissance de la Politique de confidentialité et des traitements nécessaires à l'exécution de mon mandat.",
  "c": "Oui, j'en ai pris connaissance"
 },
 "legal_cgu": {
  "t": "CGU",
  "q": "Acceptez-vous les Conditions Générales d'Utilisation de Logisorama.ch applicables à votre utilisation de la plateforme et de l'application ?",
  "c": "Oui, j'accepte les CGU"
 },
 "legal_acceptation_generale": {
  "t": "Acceptation finale",
  "q": "Confirmez-vous avoir lu et compris le contrat et vouloir conclure le mandat avec Immo-rama.ch ?",
  "c": "SIGNER ET ACTIVER MON MANDAT"
 }
};
// Version révisée du 21.08.2026 (16 dispositions)
const CONSENTS_V2108: Record<string, ConsentText> = {
 "legal_objet": {
  "t": "Objet et portée du mandat",
  "q": "Confiez-vous à Immo-Rama un mandat exclusif de recherche d'un logement ou local en location, l'exclusivité étant limitée aux objets et bailleurs effectivement présentés par écrit par Immo-Rama, sans vous interdire vos propres recherches ?",
  "c": "Oui, je confirme"
 },
 "legal_commission": {
  "t": "Naissance et montant de la commission",
  "q": "Acceptez-vous qu'une commission d'un mois de loyer brut (charges comprises), plus la TVA au taux légal si elle est due, avec un minimum de CHF 500, ne soit due que si un contrat de bail juridiquement valable est conclu et résulte de l'indication ou de la négociation d'Immo-Rama ?",
  "c": "Oui, j'accepte la commission"
 },
 "legal_acompte": {
  "t": "Montant d'activation",
  "q": "Acceptez-vous de verser un montant d'activation de CHF 300, imputé sur la commission, pour l'ouverture et l'étude de votre dossier ?",
  "c": "Oui, j'accepte"
 },
 "legal_duree": {
  "t": "Durée et reconduction tacite",
  "q": "Acceptez-vous que le mandat soit conclu pour 90 jours, reconduit tacitement par périodes de 90 jours, la dénonciation ordinaire pouvant être notifiée entre le 80e et le 90e jour de la période en cours (par écrit ou dans l'application Logisorama.ch) ?",
  "c": "Oui, j'accepte"
 },
 "legal_remboursement": {
  "t": "Résiliation et remboursement",
  "q": "Avez-vous compris que si Immo-Rama met fin au mandat, ou au terme d'une période sans conclusion de bail, les CHF 300 vous sont remboursés sous 30 jours, mais qu'en cas de résiliation anticipée de votre part ils restent acquis à Immo-Rama en rémunération des démarches déjà engagées ?",
  "c": "Oui, j'ai compris"
 },
 "legal_revocation": {
  "t": "Révocation en tout temps (art. 404 CO)",
  "q": "Avez-vous compris que chaque partie conserve le droit impératif de révoquer ou de répudier le mandat avec effet immédiat en tout temps (art. 404 CO), aux conséquences financières décrites ci-dessus ?",
  "c": "Oui, j'ai compris"
 },
 "legal_litiges": {
  "t": "Contrats ultérieurs",
  "q": "Acceptez-vous qu'un autre objet ou un contrat ultérieur avec le même bailleur, conclu pendant le mandat ou dans les 3 mois suivant sa fin et résultant d'une indication ou négociation documentée d'Immo-Rama, reste soumis à commission (à annoncer dans les 5 jours), une simple identité de bailleur ne suffisant pas ?",
  "c": "Oui, j'accepte"
 },
 "legal_confidentialite": {
  "t": "Confidentialité",
  "q": "Vous engagez-vous à traiter confidentiellement les informations non publiques reçues d'Immo-Rama, en ne répondant que du dommage direct, prévisible et prouvé en cas de transmission fautive à un tiers ?",
  "c": "Oui, je m'engage"
 },
 "legal_verifications": {
  "t": "Informations et vérifications",
  "q": "Acceptez-vous qu'Immo-Rama demande les justificatifs objectivement nécessaires, tout contrôle de solvabilité ou contact avec l'employeur n'ayant lieu qu'après votre information préalable et votre accord spécifique, dans le respect de la LPD ?",
  "c": "Oui, j'accepte"
 },
 "legal_transmission_dossier": {
  "t": "Transmission du dossier",
  "q": "Autorisez-vous Immo-Rama à transmettre aux bailleurs et gérances les seules données nécessaires à une candidature déterminée ?",
  "c": "Oui, j'autorise"
 },
 "legal_garants_cocandidats": {
  "t": "Garants et co-candidats",
  "q": "Lorsque vous transmettez les données d'un garant, d'un co-candidat ou d'un tiers, confirmez-vous l'avoir informé de cette transmission ?",
  "c": "Oui, je confirme"
 },
 "legal_attribution_gerance": {
  "t": "Attribution par la gérance",
  "q": "Avez-vous compris que l'annonce par une gérance de son intention d'attribuer un logement ne rend aucune commission exigible, celle-ci n'étant due qu'après la conclusion juridiquement valable du bail ?",
  "c": "Oui, j'ai compris"
 },
 "legal_obligation_moyens": {
  "t": "Responsabilité et position d'Immo-Rama",
  "q": "Avez-vous compris qu'Immo-Rama est tenue à une obligation de moyens, reste tributaire des données des offreurs et ne répond pas des actes des bailleurs ou gérances qui ne sont pas ses auxiliaires ?",
  "c": "Oui, j'ai compris"
 },
 "legal_protection_donnees": {
  "t": "Protection des données",
  "q": "J'ai pris connaissance de la Politique de confidentialité ; les communications commerciales reposent sur un consentement séparé, facultatif et révocable, sans effet sur l'exécution du mandat.",
  "c": "Oui, j'en ai pris connaissance"
 },
 "legal_droit_applicable": {
  "t": "Droit applicable et for",
  "q": "Acceptez-vous que le mandat soit soumis au droit suisse (art. 394 ss et 412 ss CO) et que, agissant à des fins privées, vous puissiez saisir le tribunal de votre domicile ou celui du siège d'Immo-Rama dans le canton de Vaud (art. 32 CPC) ?",
  "c": "Oui, j'accepte"
 },
 "legal_acceptation_generale": {
  "t": "Acceptation finale",
  "q": "Confirmez-vous avoir reçu le mandat complet, en comprendre les dispositions et vouloir le conclure avec Immo-Rama ?",
  "c": "Signer et activer mon mandat"
 }
};
// Dispositions du mandat d'achat (depuis le 25.10.2026)
const CONSENTS_ACHAT: Record<string, ConsentText> = {
 "achat_legal_objet": {
  "t": "Objet et portée du mandat",
  "q": "Confiez-vous à Immo-Rama un mandat de recherche pour l'achat d'un logement ou d'un local commercial : rechercher, sélectionner et vous présenter des biens répondant à vos critères puis, selon vos instructions, recueillir des informations, organiser des visites ou intervenir comme courtier négociateur ?",
  "c": "Oui, je confirme"
 },
 "achat_legal_commission": {
  "t": "Naissance et montant de la commission",
  "q": "Acceptez-vous une commission de 1 % du prix de vente authentiquement convenu (minimum CHF 500), plus la TVA au taux légal si elle est due, qui n'est due que si une vente est conclue en la forme authentique et résulte causalement de l'indication ou de la négociation d'Immo-Rama ?",
  "c": "Oui, j'accepte la commission"
 },
 "achat_legal_activation": {
  "t": "Montant d'activation",
  "q": "Acceptez-vous de verser un montant d'activation de CHF 2'500 lors de l'activation du mandat, imputé sur toute commission valablement acquise (l'excédent éventuel vous étant remboursé dans les 30 jours) ?",
  "c": "Oui, j'accepte"
 },
 "achat_legal_duree": {
  "t": "Durée et reconduction tacite",
  "q": "Acceptez-vous que le mandat soit conclu pour une période initiale de 6 mois, reconduite tacitement par périodes de 6 mois sans nouveau montant d'activation, la dénonciation ordinaire pouvant être notifiée dans les 15 derniers jours de la période en cours (par écrit ou dans l'application Logisorama.ch), avec effet à l'échéance ?",
  "c": "Oui, j'accepte"
 },
 "achat_legal_remboursement": {
  "t": "Résiliation et remboursement",
  "q": "Avez-vous compris que si Immo-Rama met fin au mandat avant l'échéance, ou si vous le dénoncez dans les 15 derniers jours et qu'il arrive à échéance sans acquisition, les CHF 2'500 vous sont remboursés dans les 30 jours (sur demande en cas de dénonciation), mais qu'en cas de résiliation anticipée de votre part ils restent acquis à Immo-Rama en rémunération des démarches déjà engagées ?",
  "c": "Oui, j'ai compris"
 },
 "achat_legal_revocation": {
  "t": "Révocation en tout temps (art. 404 CO)",
  "q": "Avez-vous compris que chaque partie conserve le droit impératif de révoquer ou de répudier le mandat avec effet immédiat en tout temps (art. 404 CO), aux conséquences financières décrites ci-dessus ?",
  "c": "Oui, j'ai compris"
 },
 "achat_legal_information": {
  "t": "Information et biens déjà connus",
  "q": "Vous engagez-vous à informer Immo-Rama dans les 5 jours de la conclusion d'un acte d'achat et, si vous connaissiez déjà un bien ou un vendeur présenté, à le signaler dans les 5 jours ouvrables ? Pour un autre bien du même vendeur, la commission n'est due que si Immo-Rama a fourni une contribution causale documentée.",
  "c": "Oui, je m'engage"
 },
 "achat_legal_confidentialite": {
  "t": "Confidentialité",
  "q": "Vous engagez-vous à traiter confidentiellement les informations non publiques reçues d'Immo-Rama, en ne répondant que du dommage direct, prévisible et prouvé en cas de transmission fautive à un tiers ?",
  "c": "Oui, je m'engage"
 },
 "achat_legal_verifications": {
  "t": "Informations et vérifications",
  "q": "Acceptez-vous qu'Immo-Rama demande les justificatifs objectivement nécessaires (notamment une preuve de financement), tout contrôle de solvabilité ou prise de références n'ayant lieu qu'après votre information préalable et votre accord spécifique, dans le respect de la LPD ?",
  "c": "Oui, j'accepte"
 },
 "achat_legal_transmission": {
  "t": "Transmission des données",
  "q": "Autorisez-vous Immo-Rama à transmettre les seules données nécessaires à une démarche déterminée (financement, offre, acte) aux partenaires concernés : banques et courtiers en financement, notaires, agences, propriétaires et vendeurs ?",
  "c": "Oui, j'autorise"
 },
 "achat_legal_coacquereurs": {
  "t": "Co-acquéreurs et tiers",
  "q": "Lorsque vous transmettez les données d'un co-acquéreur ou d'un tiers, confirmez-vous l'avoir informé de cette transmission ?",
  "c": "Oui, je confirme"
 },
 "achat_legal_responsabilite": {
  "t": "Responsabilité et position d'Immo-Rama",
  "q": "Avez-vous compris qu'Immo-Rama est tenue à une obligation de moyens, ne garantit ni la disponibilité d'un bien, ni l'obtention d'un financement, ni la conclusion d'une vente, et que les décisions juridiques, techniques, fiscales et financières vous appartiennent ?",
  "c": "Oui, j'ai compris"
 },
 "achat_legal_protection_donnees": {
  "t": "Protection des données",
  "q": "J'ai pris connaissance de la Politique de confidentialité ; les communications commerciales reposent sur un consentement séparé, facultatif et révocable, sans effet sur l'exécution du mandat.",
  "c": "Oui, j'en ai pris connaissance"
 },
 "achat_legal_droit_applicable": {
  "t": "Droit applicable et for",
  "q": "Acceptez-vous que le mandat soit soumis au droit suisse (art. 394 ss et 412 ss CO) et que, agissant à des fins privées, vous puissiez saisir le tribunal de votre domicile ou celui du siège d'Immo-Rama dans le canton de Vaud (art. 32 CPC) ?",
  "c": "Oui, j'accepte"
 },
 "achat_legal_acceptation_generale": {
  "t": "Acceptation finale",
  "q": "Confirmez-vous avoir reçu le mandat d'achat complet, en comprendre les dispositions et vouloir le conclure avec Immo-Rama ?",
  "c": "Signer et activer mon mandat"
 }
};
const V2108_FROM = new Date('2026-08-21T13:48:55+02:00').getTime();
function consentTextFor(key: string, signedAtIso: string | null): ConsentText | null {
  if (key.startsWith('achat_')) return CONSENTS_ACHAT[key] ?? null;
  const t = signedAtIso ? new Date(signedAtIso).getTime() : Date.now();
  const primary = t < V2108_FROM ? CONSENTS_V1908 : CONSENTS_V2108;
  return primary[key] ?? CONSENTS_V2108[key] ?? CONSENTS_V1908[key] ?? null;
}

function formatDateTimeCH(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const s = new Intl.DateTimeFormat('fr-CH', {
      timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
    return sanitizeText(s.replace(',', ''));
  } catch {
    return sanitizeText(String(iso));
  }
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

  // Équipe et appels internes : tous les mandats. Client connecté : uniquement son propre mandat (client_id).
  {
    const appelant = await verifyInternalCaller(req);
    if (!appelant.ok) {
      const refuser = (status: number) =>
        new Response(JSON.stringify({ error: "Non autorisé" }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (!appelant.userId) return refuser(401);
      // deno-lint-ignore no-explicit-any
      const corps: any = await req.clone().json().catch(() => ({}));
      let autorise = false;
      if (typeof corps?.client_id === "string" && !corps?.demande_id) {
        const svcAcces = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
        const { data: cli } = await svcAcces.from("clients").select("user_id").eq("id", corps.client_id).maybeSingle();
        autorise = !!cli?.user_id && cli.user_id === appelant.userId;
      }
      if (!autorise) return refuser(403);
    }
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
      // Client non relié à sa demande : on retrouve la demande signée par l'e-mail du compte
      if (!demandeData && profileData?.email) {
        const { data: byEmail } = await supabaseAdmin
          .from('demandes_mandat')
          .select('*')
          .eq('email', profileData.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        demandeData = byEmail;
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
    addText('Immo-rama.ch', margin, yPosition, 20, helveticaBold, rgb(0.1, 0.2, 0.4));
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

    // ── Version du mandat réellement lue et signée par le client ──
    const signedAtIso: string | null =
      clientData.mandat_date_signature || demandeData?.cgv_acceptees_at || demandeData?.created_at || null;
    const lc: Record<string, any> =
      demandeData?.legal_consents && typeof demandeData.legal_consents === 'object' ? demandeData.legal_consents : {};
    const since1908 = !!signedAtIso && new Date(signedAtIso).getTime() >= new Date('2026-08-19T00:00:00+02:00').getTime();
    let signedTitle = '';
    let signedBody: string | null = null;
    if (typeof lc._contrat_texte === 'string' && lc._contrat_texte.trim()) {
      // Mandats signés depuis le 25.10.2026 : copie exacte du texte affiché, enregistrée à la signature
      signedTitle = String(lc._contrat_titre || 'Mandat de recherche');
      signedBody = lc._contrat_texte;
    } else if (since1908 && !isPurchase) {
      // Location depuis le 19.08.2026 : contrat actif au moment de la signature (version avocat du 19.08)
      const { data: atSign } = await supabaseAdmin
        .from('mandate_contract_texts')
        .select('title, version, content, created_at')
        .lte('created_at', signedAtIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      let row: any = atSign;
      if (!row?.content) {
        const { data: v1908 } = await supabaseAdmin
          .from('mandate_contract_texts')
          .select('title, version, content, created_at')
          .eq('version', '2026-08-19')
          .maybeSingle();
        row = v1908;
      }
      if (row?.content) {
        signedTitle = `${row.title || 'Contrat de mandat de recherche immobilière'} - version du ${row.version}`;
        signedBody = row.content;
      }
    } else if (since1908 && isPurchase) {
      signedTitle = "Mandat de recherche immobilière - Achat";
      signedBody = ACHAT_SIGNED_TEXT;
    }

    const isHeadingLine = (t: string) =>
      /^Article\s+\d+/i.test(t) || (/^\d+(\.\d+)*\.?\s/.test(t) && t.length < 90) ||
      (t.length < 70 && t === t.toUpperCase() && /[A-Z]/.test(t));

    if (signedBody) {
      addText(sanitizeText(signedTitle).slice(0, 95), margin, yPosition, 11, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= 20;
      for (const raw of signedBody.split('\n')) {
        const t = raw.trim();
        checkNewPage();
        if (!t) { yPosition -= 4; continue; }
        if (isHeadingLine(t)) {
          yPosition -= 4;
          addWrappedText(t, margin, maxTextWidth, 10, helveticaBold);
        } else {
          addWrappedText(t, margin, maxTextWidth, 9);
        }
      }
      yPosition -= 12;

      // Dispositions approuvées une à une, avec leur horodatage
      const approved = Object.entries(lc)
        .filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')
        .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
      if (approved.length > 0) {
        checkNewPage();
        addText('DISPOSITIONS APPROUVEES PAR LE MANDANT', margin, yPosition, 11, helveticaBold, rgb(0.1, 0.2, 0.4));
        yPosition -= 18;
        approved.forEach(([key, at], i) => {
          checkNewPage();
          const ct = consentTextFor(key, signedAtIso);
          const title = ct?.t || CONSENT_TITLES[key] || key.replace(/^achat_/, '').replace(/^legal_/, '').replace(/_/g, ' ');
          addWrappedText(`${i + 1}. ${title}`, margin, maxTextWidth, 10, helveticaBold);
          if (ct?.q) addWrappedText(ct.q, margin + 12, maxTextWidth - 12, 9);
          addWrappedText(`Réponse : ${ct?.c || 'Accepté'} - approuvé le ${formatDateTimeCH(String(at))}`, margin + 12, maxTextWidth - 12, 9);
          yPosition -= 6;
        });
        yPosition -= 10;
      }
    } else if (isPurchase) {
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
        "Le present contrat est conclu pour une periode initiale de 6 mois a compter de son activation, reconduite tacitement par periodes de 6 mois. La denonciation ordinaire se notifie au plus tot 15 jours avant l'echeance et jusqu'a l'echeance (par ecrit ou dans l'application Logisorama.ch). Chaque partie peut resilier avec effet immediat en tout temps (art. 404 CO).",
        margin, maxTextWidth, 9
      );
      yPosition -= 10;
      
      // Article 3
      checkNewPage();
      addText('3. HONORAIRES', margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "Le mandant s'engage a payer une commission de 1 % du prix de vente authentiquement convenu, plus la TVA au taux legal uniquement si elle est due, avec un minimum de CHF 500.-.",
        margin, maxTextWidth, 9
      );
      yPosition -= 5;
      addWrappedText(
        "Un montant d'activation de CHF 2'500.- est du a la signature et est impute sur toute commission valablement acquise. La commission n'est exigible que si un contrat de vente en la forme authentique est conclu et resulte causalement de l'activite du mandataire. Si le mandataire met fin au mandat, ou au terme sans acquisition, l'activation est remboursee sous 30 jours; en cas de resiliation anticipee du mandant, elle reste acquise.",
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
        y: yPosition - 55,
        width: pageWidth - 2 * margin,
        height: 65,
        color: rgb(0.95, 0.95, 1),
      });
      addText('2.1', margin + 5, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "La commission est de 1 mois de loyer brut (charges comprises), plus la TVA au taux legal si elle est due, min. CHF 500, et n'est due qu'a la conclusion d'un bail valable resultant de l'activite d'Immo-Rama. Un montant d'activation de CHF 300.- est verse a l'ouverture du dossier et impute sur la commission. Le mandat est conclu pour 90 jours, reconduit tacitement par periodes de 90 jours; la denonciation ordinaire se notifie entre le 80e et le 90e jour (par ecrit ou dans l'application Logisorama.ch). Si Immo-Rama met fin au mandat, ou au terme sans conclusion de bail, les CHF 300.- sont rembourses sous 30 jours; en cas de resiliation anticipee du mandant, ils restent acquis. Chaque partie peut resilier avec effet immediat en tout temps (art. 404 CO).",
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
      
      // Article 9 (highlighted)
      checkNewPage();
      page.drawRectangle({
        x: margin,
        y: yPosition - 55,
        width: pageWidth - 2 * margin,
        height: 65,
        color: rgb(0.97, 0.97, 0.97),
      });
      addText('9. Position de Immo-Rama', margin + 5, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
      yPosition -= lineHeight;
      addWrappedText(
        "Immo-Rama ne peut assurer aucune garantie de succes quant a la conclusion d'un contrat. Les contrats sont passes directement entre les chercheurs et les offreurs. Immo-Rama ne peut assumer aucune responsabilite quant a l'exactitude des donnees concernant les offreurs et leurs offres de logement. Immo-Rama peut assister les parties contractantes lors de la signature de contrat et repondre aux questions relatives a la conclusion de contrat. Toutefois, Immo-Rama n'assume aucune responsabilite pour les consequences resultant de contrats defectueux ou de comportements fautifs de la part des parties contractantes. Ceci vaut egalement lorsque Immo-Rama a ete directement implique dans les negociations de contrat.",
        margin + 25, maxTextWidth - 30, 9
      );
      yPosition -= 10;
      
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
        "Le present mandat est soumis au droit suisse. Sous reserve des fors imperatifs prevus par la loi, les tribunaux ordinaires du canton de Vaud sont competents, le for etant fixe a Lausanne. Sauf indication contraire contenue dans le present contrat, c'est le Code des obligations suisse (CO) qui fait foi.",
        margin + 25, maxTextWidth - 25, 9
      );
      yPosition -= 15;
    }
    
    // ===== MODALITES DE PAIEMENT DE L'ACOMPTE =====
    checkNewPage();
    yPosition -= 10;
    page.drawRectangle({
      x: margin - 5,
      y: yPosition - 105,
      width: pageWidth - 2 * margin + 10,
      height: 115,
      color: rgb(0.95, 0.97, 1),
    });
    
    addText("MODALITES DE PAIEMENT DE L'ACOMPTE", margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    yPosition -= 5;
    addText("Votre dossier sera active des reception du paiement.", margin, yPosition, 8, helveticaFont, rgb(0.4, 0.4, 0.4));
    yPosition -= 18;
    
    addText("Option 1 - TWINT instantane (recommande)", margin, yPosition, 10, helveticaBold);
    yPosition -= lineHeight;
    addText("Numero TWINT : 079 483 91 99", margin + 10, yPosition, 9);
    yPosition -= lineHeight;
    addText("Mention obligatoire : Prenom NOM du mandant - Acompte mandat", margin + 10, yPosition, 9);
    yPosition -= lineHeight + 5;
    
    addText("Option 2 - Facture QR par email", margin, yPosition, 10, helveticaBold);
    yPosition -= lineHeight;
    addText("Une facture QR vous est envoyee par email, payable depuis votre app bancaire.", margin + 10, yPosition, 9);
    yPosition -= lineHeight + 5;
    
    const acompte = isPurchase ? "CHF 2'500 (active sur la commission de 1 % du prix, min. CHF 500)" : "300 CHF";
    addText(`Montant de l'acompte : ${acompte}`, margin, yPosition, 10, helveticaBold, rgb(0.1, 0.2, 0.4));
    yPosition -= 30;
    
    // ===== 7. SIGNATURE ET VALIDATION =====
    checkNewPage();
    drawSectionTitle('7. SIGNATURE ET VALIDATION');
    
    const signatureDate = clientData.mandat_date_signature || demandeData?.cgv_acceptees_at;
    addText(`Signé électroniquement le ${formatDateTimeCH(signatureDate || new Date().toISOString())}`, margin, yPosition, 10);
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
      p.drawText(sanitizeText(`Immo-rama.ch - Mandat de recherche complet - Page ${index + 1}/${pages.length}`), {
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

    // Persist the FULL PDF to storage so legacy readers also get the complete version
    if (client_id && !skipIdentityDocs) {
      try {
        const safeName = sanitizeText(`${profileData?.nom || 'client'}_${profileData?.prenom || ''}`).replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];
        const storagePath = `${client_id}/mandat_complet_${safeName}_${timestamp}.pdf`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('mandat-contracts')
          .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
        if (uploadError) {
          console.warn('Could not upload full mandate to storage:', uploadError.message);
        } else {
          await supabaseAdmin
            .from('clients')
            .update({ mandat_pdf_url: storagePath })
            .eq('id', client_id);
          console.log('Full mandate PDF persisted at:', storagePath);
        }
      } catch (persistErr) {
        console.warn('Persist full mandate failed:', persistErr);
      }
    }
    
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
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
