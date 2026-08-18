import { PDFDocument } from 'pdf-lib';

export type PdfFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionlist';

export interface DetectedPdfField {
  name: string;
  type: PdfFieldType;
  options?: string[];
}

/** minuscules, sans accents, ponctuation -> espace, espaces réduits */
export function normalizeName(input: string): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/* ------------------------- Détection des champs PDF ------------------------ */

export async function detectAcroFields(bytes: Uint8Array | ArrayBuffer): Promise<DetectedPdfField[]> {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdf.getForm();
    return form.getFields().map((f) => {
      const ctor = f.constructor.name;
      const name = f.getName();
      if (ctor === 'PDFCheckBox') return { name, type: 'checkbox' as PdfFieldType };
      if (ctor === 'PDFRadioGroup') {
        const opts = (f as any).getOptions?.() ?? [];
        return { name, type: 'radio' as PdfFieldType, options: opts };
      }
      if (ctor === 'PDFDropdown') return { name, type: 'dropdown' as PdfFieldType, options: (f as any).getOptions?.() ?? [] };
      if (ctor === 'PDFOptionList') return { name, type: 'optionlist' as PdfFieldType, options: (f as any).getOptions?.() ?? [] };
      return { name, type: 'text' as PdfFieldType };
    });
  } catch {
    return [];
  }
}

/** Un nom générique n'apporte aucune information sémantique. */
export function isGenericName(name: string): boolean {
  const n = normalizeName(name);
  if (!n) return true;
  return /^(champ(\s(de\s)?texte)?|text|texte|field|zone(\sde\stexte)?|untitled|case\sa\scocher|checkbox|radio|button|bouton)\s*\d*$/.test(n);
}

/** Le PDF est-il exploitable en mode « champs natifs » ? */
export function shouldUseAcroform(fields: DetectedPdfField[]): boolean {
  if (fields.length === 0) return false;
  const meaningful = fields.filter((f) => !isGenericName(f.name));
  return meaningful.length >= Math.max(3, Math.ceil(fields.length * 0.4));
}

/* ------------------------------- Auto-mappeur ------------------------------ */

interface SynonymRule {
  key: string;
  /** correspondances exactes (normalisées) */
  exact?: string[];
  /** expressions régulières appliquées au nom normalisé */
  match?: RegExp[];
}

/** Ordre = priorité : les règles les plus spécifiques d'abord. */
const RULES: SynonymRule[] = [
  // ---- Signature / lieu / dates de signature
  { key: 'signature', exact: ['signature', 'signatures'], match: [/\bsignature/] },
  { key: 'lieu_et_date', exact: ['lieu et date', 'lieu date'] },
  { key: 'date_visite', exact: ['date de la visite', 'date de visite de l objet', 'date de visite', 'visite', 'si oui date de la visite'], match: [/date.*visite/] },
  { key: 'date_naissance', exact: ['date de naissance', 'naissance', 'date naissance'], match: [/date.*naissance/, /^ne e le$/] },
  { key: 'date_entree_souhaitee', exact: ['date d entree', 'date dentree', 'date d entree souhaitee', 'des le', 'entree', 'date d entree souhaitee'], match: [/date.*entree/, /^des le$/] },
  { key: 'date_du_jour', exact: ['date', 'date 2', 'date signature', 'date du jour'] },
  { key: 'lieu', exact: ['lieu', 'lausanne le', 'geneve le'] },

  // ---- Identité
  { key: 'prenom', exact: ['prenom', 'prenom titulaire', 'locataire 1 prenom', 'prenoms'], match: [/\bprenom/] },
  { key: 'etat_civil', exact: ['etat civil', 'etatcivil'], match: [/etat civil/] },
  { key: 'nationalite', exact: ['nationalite', 'lieu d origine', 'lieu dorigine', 'lieu de naissance', 'origine', 'locataire 1 lieu d origne nationalite'], match: [/nationalite/, /lieu d ?origine/, /origine/] },
  { key: 'permis', exact: ['permis', 'permis de sejour', 'permis autre', 'locataire 1 permis'], match: [/permis/] },

  // ---- Contact (TOUJOURS agent)
  { key: 'email_contact', exact: ['e mail', 'email', 'adresse email', 'mail', 'e mail titulaire', 'locataire 1 email', 'courriel'], match: [/\be ?mail\b/, /courriel/] },
  { key: 'tel_contact', exact: ['telephone', 'tel', 'telephone pro', 'tel prive', 'tel portable', 'tel prive titulaire', 'tel portable titulaire', 'locataire 1 tel prive', 'locataire 1 tel pro', 'natel', 'mobile'], match: [/telephone/, /\btel\b/, /natel/, /portable/] },

  // ---- Objet (bien) — prioritaire sur les clés candidat homonymes
  { key: 'bien_loyer_brut', exact: ['loyer brut', 'total', 'loyer total'], match: [/loyer brut/] },
  { key: 'bien_charges', exact: ['charges', 'charges mensuelles', 'chargesmois chf', 'charges mois chf', 'acompte de charges'], match: [/^charges/] },
  { key: 'bien_loyer', exact: ['loyer', 'loyer net', 'loyer mens net', 'loyer mensuel net', 'loyer sans les charges', 'loyer mois chf'], match: [/loyer/] },
  { key: 'bien_pieces', exact: ['nombre de pieces', 'nbre de pieces', 'pieces', 'piece s', 'nb pieces', 'nombre de piece'], match: [/piece/] },
  { key: 'bien_etage', exact: ['etage'], match: [/etage/] },
  { key: 'bien_adresse', exact: ['adresse rue numero localite', 'adresse de l objet', 'objet adresse', 'adresse du bien'], match: [/adresse.*objet/, /objet.*adresse/] },
  { key: 'bien_ville', exact: ['ville', 'localite objet'] },

  // ---- Logement actuel
  { key: 'npa_ville_actuelle', exact: ['npa localite actuels', 'cp et lieu', 'locataire 1 cp et lieu', 'npa', 'code postal titulaire', 'localite titulaire', 'adresse 2', 'npa localite', 'npa lieu', 'code postal localite'], match: [/^npa/, /cp et lieu/, /code postal/] },
  { key: 'adresse_actuelle', exact: ['adresse actuelle', 'adresse 1', 'adresse actuelle titulaire', 'rue ou n', 'rue', 'locataire 1 rue et no', 'adresse 2', 'adresse', 'rue et no', 'rue et numero'], match: [/^adresse/, /^rue/] },
  { key: 'regie_actuelle', exact: ['gerance actuelle', 'regie actuelle', 'bailleur actuel', 'regie actuelle titulaire', 'gerance'], match: [/gerance/, /regie/, /bailleur/] },
  { key: 'motif', exact: ['motif', 'motif du demenagement', 'motif changement'], match: [/motif/] },

  // ---- Emploi / revenus
  { key: 'lieu_travail', exact: ['lieu de travail', 'lieutravail', 'locataire 1 lieu de travail'], match: [/lieu de travail/] },
  { key: 'employeur', exact: ['employeur', 'employeur titulaire', 'locataire 1 employeur'], match: [/employeur/] },
  { key: 'profession', exact: ['profession', 'profession titulaire', 'situation professionnelle', 'locataire 1 profession', 'metier'], match: [/profession/, /metier/] },
  { key: 'revenus_annuels', exact: ['revenu annuel brut', 'revenu annuel brut titulaire', 'revenu annuel', 'salaire annuel'], match: [/revenu.*annuel/, /salaire annuel/] },
  { key: 'revenus_mensuels', exact: ['revenu', 'revenu mensuel', 'revenus', 'locataire 1 revenu mensuel', 'salaire', 'salaire mensuel'], match: [/revenu/, /salaire/] },

  // ---- Ménage
  { key: 'nb_personnes', exact: ['nombre de personnes', 'nb pers', 'nbpers', 'nombre doccupants dans le futur logement', 'nombre d occupants dans le futur logement', 'nombre d occupant s', 'nombre d occupants'], match: [/nombre.*(personne|occupant)/, /nb ?pers/] },
  { key: 'animaux', exact: ['animaux', 'animal', 'animaux domestiques'], match: [/animau/] },
  { key: 'fumeur', exact: ['fumeur', 'fumeurs', 'non fumeur'], match: [/fumeur/] },

  // ---- Nom (en dernier : « nom » est trop générique)
  { key: 'nom', exact: ['nom', 'nom titulaire', 'locataire 1 nom', 'locataire', 'raison sociale titulaire', 'nom de famille', 'raison sociale'], match: [/^nom\b/, /raison sociale/] },
];

const CO_KEY_OVERRIDES: Record<string, string> = {
  revenus_annuels: 'co_revenus',
  revenus_mensuels: 'co_revenus',
};

const CO_CAPABLE = new Set([
  'prenom', 'nom', 'date_naissance', 'etat_civil', 'nationalite', 'permis',
  'adresse_actuelle', 'npa_ville_actuelle', 'profession', 'employeur',
  'lieu_travail', 'revenus_mensuels', 'revenus_annuels', 'email_contact', 'tel_contact',
]);

/** Détecte si le nom du champ concerne le CO-candidat. */
export function isCoCandidateName(name: string): boolean {
  const n = normalizeName(name);
  if (/\b(co titulaire|cotitulaire|conjoint|colocataire|co locataire|co candidat|cocandidat)\b/.test(n)) return true;
  if (/\blocataire 2\b/.test(n) || /\b(titulaire|candidat|personne) 2\b/.test(n)) return true;
  if (/\bco\b/.test(n)) return true;
  if (/\b2$/.test(n) && !/\badresse 2\b/.test(n) && !/\bdate 2\b/.test(n)) return true;
  return false;
}

/** Retire les marqueurs de co-candidat / de titulaire pour obtenir le libellé de base. */
function baseName(name: string): string {
  return normalizeName(name)
    .replace(/\b(co titulaire|cotitulaire|co locataire|colocataire|co candidat|cocandidat|conjoint)\b/g, ' ')
    .replace(/\b(locataire|titulaire|candidat|personne)\s*[12]\b/g, ' ')
    .replace(/\bco\b/g, ' ')
    .replace(/\s+[12]$/, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export interface AutoMapResult {
  cle_champ: string | null;
  /** true si la correspondance est incertaine (ex. « adresse » seule) */
  incertain: boolean;
}

const AMBIGUOUS = new Set(['adresse', 'ville', 'date', 'nom', 'total', 'lieu']);

/** Mappe automatiquement un nom de champ PDF vers une clé standard. */
export function autoMapFieldName(name: string): AutoMapResult {
  const base = baseName(name);
  if (!base || isGenericName(name)) return { cle_champ: null, incertain: true };

  let found: string | null = null;
  for (const rule of RULES) {
    if (rule.exact?.includes(base)) { found = rule.key; break; }
  }
  if (!found) {
    for (const rule of RULES) {
      if (rule.match?.some((re) => re.test(base))) { found = rule.key; break; }
    }
  }
  if (!found) return { cle_champ: null, incertain: true };

  if (isCoCandidateName(name)) {
    if (CO_KEY_OVERRIDES[found]) found = CO_KEY_OVERRIDES[found];
    else if (CO_CAPABLE.has(found)) found = `co_${found}`;
  }

  return { cle_champ: found, incertain: AMBIGUOUS.has(base) };
}
