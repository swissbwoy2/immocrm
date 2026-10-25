/**
 * Gabarit UNIQUE du message d'offre envoyé au client.
 * Utilisé par les envois manuels (agent/admin) ET par les routines automatiques.
 * Règle: une ligne n'est affichée QUE si le champ est réellement renseigné.
 */

import { formatCHF, formatDateTimeFR, humanizeISODates } from "./date-fr.ts";

export interface OffreMessageData {
  adresse?: string | null;
  prix?: number | string | null;
  surface?: number | string | null;
  pieces?: number | string | null;
  etage?: string | null;
  disponibilite?: string | null;
  description?: string | null;
  lien_annonce?: string | null;
  type_bien?: string | null;
  contact_gerance?: string | null;
  contact_annonceur?: string | null;
  contact_visite?: string | null;
  /** Dates de visite déjà formatées (texte lisible) */
  datesVisite?: string[] | null;
  /** Nombre de pièces jointes éventuelles */
  attachmentsCount?: number | null;
}

/** Retourne la valeur nettoyée, ou null si vide / "null" / "undefined". */
export function cleanValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === 'null' || low === 'undefined' || low === 'nan') return null;
  return s;
}

export function formatDateVisite(dateStr: string): string {
  // Europe/Zurich ; date seule -> pas d'heure fictive ; texte libre renvoyé tel quel
  return formatDateTimeFR(dateStr, { fallback: dateStr });
}

function formatPrix(v: unknown): string | null {
  const s = cleanValue(v);
  if (!s) return null;
  const n = Number(String(s).replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (isNaN(n)) return s;
  return formatCHF(n); // « CHF 2'400 »
}

/**
 * Construit le message d'offre au format officiel Immo-rama.
 */
export function buildOffreMessage(
  offre: OffreMessageData,
  client?: { prenom?: string | null; nom?: string | null } | null,
): string {
  const lines: string[] = [];

  const prenom = cleanValue(client?.prenom);
  const nom = cleanValue(client?.nom);
  const salutation = [prenom, nom].filter(Boolean).join(' ');

  lines.push("Nouvelle Offre pour Votre Recherche d'Appartement");
  lines.push('');
  lines.push(`Bonjour${salutation ? ` ${salutation}` : ''} 👋,`);
  lines.push('');
  lines.push(
    "Nous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :",
  );
  lines.push('');

  const adresse = cleanValue(offre.adresse);
  const prix = formatPrix(offre.prix);
  const surface = cleanValue(offre.surface);
  const pieces = cleanValue(offre.pieces);
  const etage = cleanValue(offre.etage);
  const dispo = cleanValue(offre.disponibilite);
  const typeBien = cleanValue(offre.type_bien);

  if (adresse) lines.push(`📍 Localisation : ${adresse}`);
  if (prix) lines.push(`💰 Prix : ${prix}`);
  if (surface) lines.push(`📐 Surface : ${surface} m²`);
  if (pieces) lines.push(`🏠 Nombre de pièces : ${pieces}`);
  if (typeBien) lines.push(`🏘️ Type de bien : ${typeBien}`);
  if (etage) lines.push(`🏢 Étage : ${etage}`);
  if (dispo) lines.push(`📅 Disponibilité : ${dispo}`);

  const description = cleanValue(offre.description);
  if (description) {
    lines.push('');
    lines.push('Description :');
    lines.push(description);
  }

  const contacts: string[] = [];
  const cg = cleanValue(offre.contact_gerance);
  const ca = cleanValue(offre.contact_annonceur);
  const cv = cleanValue(offre.contact_visite);
  if (cg) contacts.push(`• Gérance : ${cg}`);
  if (ca) contacts.push(`• Annonceur : ${ca}`);
  if (cv) contacts.push(`• Visite : ${cv}`);
  if (contacts.length) {
    lines.push('');
    lines.push('Contacts :');
    lines.push(...contacts);
  }

  const dates = (offre.datesVisite ?? []).map(cleanValue).filter(Boolean) as string[];
  if (dates.length) {
    lines.push('');
    lines.push('Dates de visite proposées :');
    dates.forEach((d) => lines.push(`• ${humanizeISODates(d)}`));
  }

  const lien = cleanValue(offre.lien_annonce);
  if (lien) {
    lines.push('');
    lines.push(`🔗 Voir l'annonce complète : ${lien}`);
  }

  if (offre.attachmentsCount && offre.attachmentsCount > 0) {
    lines.push('');
    lines.push(`📎 ${offre.attachmentsCount} pièce(s) jointe(s)`);
  }

  lines.push('');
  lines.push(
    "Pour toute question, n'hésitez pas à nous appeler au +41 21 634 31 61 ou à répondre directement à cet email.",
  );
  lines.push('');
  lines.push('Cordialement,');
  lines.push("L'équipe Immo-rama.ch");

  return lines.join('\n');
}
