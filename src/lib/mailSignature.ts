/**
 * Signatures e-mail de l'agence (une par adresse partagée).
 * HTML « e-mail safe » : tableaux, styles en ligne, logo hébergé à une adresse fixe.
 * Le tableau racine porte data-immo-signature pour pouvoir la retirer d'un brouillon.
 */

const GREEN = '#2C9273';
const INK = '#1f2937';
const MUTED = '#6a6a6a';
const FONT = "Arial,Helvetica,sans-serif";

const SITE = 'https://logisorama.ch';
const LOGO_IMMO = `${SITE}/email/signature-immo-rama.png`;
const LOGO_LOGISORAMA = `${SITE}/email/logo-logisorama.png`;

export const AGENCE = {
  nom: 'L’agence Immo-rama.ch',
  metiers: 'Vente &amp; location · Service relogement et courtage',
  succursale: 'Immo-Rama Crissier',
  rue: 'Chemin de l’Esparcette 5',
  ville: '1023 Crissier',
  tel: '021 634 31 61',
  telIntl: '+41216343161',
  mobile: '077 909 48 94',
  mobileIntl: '+41779094894',
  site: 'immo-rama.ch',
  siteUrl: 'https://immo-rama.ch',
  plan: 'https://maps.google.com/?q=Chemin%20de%20l%27Esparcette%205%2C%201023%20Crissier',
};

const DISCLAIMER_FR =
  "Le contenu de ce message est confidentiel et destiné exclusivement au destinataire indiqué. Toute transmission, même partielle, à un tiers sans l’accord écrit de l’expéditeur est strictement interdite. Si vous avez reçu ce message par erreur, merci d’y répondre puis de le supprimer, afin que nous puissions éviter que cela se reproduise.";
const DISCLAIMER_EN =
  "The content of this email is confidential and intended for the recipient specified in message only. It is strictly forbidden to share any part of this message with any third party, without a written consent of the sender. If you received this message by mistake, please reply to this message and follow with its deletion, so that we can ensure such a mistake does not occur in the future.";

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Profile {
  titre: string;
  sousTitre: string;
  ligne3: string;
  logo: string;
  logoAlt: string;
  logoLien: string;
  site: string;
  siteUrl: string;
}

/** Titre et marque selon l'adresse (et le nom d'expéditeur enregistré). */
function profileFor(address: string, displayName?: string | null): Profile {
  const a = address.toLowerCase();
  const base: Profile = {
    titre: AGENCE.nom,
    sousTitre: AGENCE.metiers,
    ligne3: '',
    logo: LOGO_IMMO,
    logoAlt: 'Immo-Rama.ch',
    logoLien: AGENCE.siteUrl,
    site: AGENCE.site,
    siteUrl: AGENCE.siteUrl,
  };
  if (a.endsWith('@logisorama.ch')) {
    return {
      ...base,
      titre: esc(displayName?.trim() || 'Support Logisorama'),
      sousTitre: 'Plateforme de relocation de l’agence Immo-rama.ch',
      logo: LOGO_LOGISORAMA,
      logoAlt: 'Logisorama',
      logoLien: SITE,
      site: 'logisorama.ch',
      siteUrl: SITE,
    };
  }
  const name = displayName?.trim() || '';
  const generic = !name || /^immo-?rama(\.ch)?$/i.test(name);
  if (generic) return base;
  return { ...base, titre: esc(name.replace(/\s+-\s+/g, ' – ')), sousTitre: AGENCE.nom, ligne3: AGENCE.metiers };
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:1px 10px 1px 0;font-family:${FONT};font-size:11px;font-weight:bold;color:${GREEN};vertical-align:top;white-space:nowrap">${label}</td><td style="padding:1px 0;font-family:${FONT};font-size:12px;color:${INK};vertical-align:top">${value}</td></tr>`;
}

function link(href: string, text: string): string {
  return `<a href="${href}" style="color:${INK};text-decoration:none">${text}</a>`;
}

/** Signature HTML complète d'une adresse de l'agence. */
export function buildAgencySignature(address: string, displayName?: string | null): string {
  const p = profileFor(address, displayName);
  const email = esc(address.toLowerCase());
  const contacts = [
    row('T', `${link(`tel:${AGENCE.telIntl}`, AGENCE.tel)}&nbsp;&nbsp;<span style="color:${GREEN};font-weight:bold;font-size:11px">M</span>&nbsp;&nbsp;${link(`tel:${AGENCE.mobileIntl}`, AGENCE.mobile)}`),
    row('E', link(`mailto:${email}`, email)),
    row('W', `<a href="${p.siteUrl}" style="color:${GREEN};text-decoration:none;font-weight:bold">${p.site}</a>`),
    row('A', link(AGENCE.plan, `${AGENCE.succursale} · ${AGENCE.rue} · ${AGENCE.ville}`)),
  ].join('');
  return [
    `<table data-immo-signature="1" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:${FONT};color:${INK};max-width:520px">`,
    `<tr><td style="padding:0 0 12px 0"><a href="${p.logoLien}" style="text-decoration:none"><img src="${p.logo}" width="170" alt="${p.logoAlt}" style="display:block;border:0;outline:none;width:170px;max-width:170px;height:auto"></a></td></tr>`,
    `<tr><td style="border-left:3px solid ${GREEN};padding:2px 0 2px 12px">`,
    `<div style="font-family:${FONT};font-size:15px;line-height:20px;font-weight:bold;color:${INK}">${p.titre}</div>`,
    `<div style="font-family:${FONT};font-size:13px;line-height:18px;font-weight:bold;color:${GREEN}">${p.sousTitre}</div>`,
    p.ligne3 ? `<div style="font-family:${FONT};font-size:12px;line-height:17px;color:${MUTED}">${p.ligne3}</div>` : '',
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;margin-top:8px">${contacts}</table>`,
    `</td></tr>`,
    `<tr><td style="padding:14px 0 0 0"><div style="border-top:1px solid #e5e7eb;padding-top:8px;font-family:${FONT};font-size:10px;line-height:14px;color:#9ca3af">${DISCLAIMER_FR}<br><br><span style="font-style:italic">${DISCLAIMER_EN}</span></div></td></tr>`,
    `</table>`,
  ].join('');
}

/** Retire la signature de l'agence d'un HTML (brouillon rouvert pour modification). */
export function stripAgencySignature(html: string): string {
  if (typeof DOMParser === 'undefined' || !/data-immo-signature/.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('[data-immo-signature]').forEach((el) => el.remove());
  return doc.body.innerHTML;
}
