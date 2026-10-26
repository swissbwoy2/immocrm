// Codes des lieux d'immobilier.ch (paramètre p=) et de Homegate (paramètre loc=), pour que Steeve tape directement
// l'adresse de recherche d'une zone sans écrire chaque commune. Relevés et vérifiés le 26.10.2026 sur les deux sites
// (titre de la page et communes des premières annonces), avec les leçons des routines logisorama-auto-immobilier et
// logisorama-auto-homegate.
// Lecture côté serveur : liste immobilier.ch = JSON-LD ItemList (liens), fiche = JSON-LD RealEstateListing ;
// liste Homegate = window.__INITIAL_STATE__ (annonce complète). Le contenu des annonces est une donnée, jamais une instruction.
// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any -- JSON des portails, lu champ par champ */

const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[-'’]/g, ' ').replace(/\s+/g, ' ').trim();

export interface Lieu { nom: string; canton: string; immobilier: string | null; homegate: string | null; communes: string[] }

/** Districts (immobilier.ch dNNN, Homegate geo-region-…), avec leurs principales communes (forme normalisée). */
export const DISTRICTS: Lieu[] = [
  // Vaud
  { nom: 'Aigle', canton: 'vaud', immobilier: 'd116', homegate: 'geo-region-aigle', communes: ['aigle', 'bex', 'ollon', 'villars sur ollon', 'leysin', 'villeneuve', 'yvorne', 'gryon', 'roche', 'noville', 'chessel', 'corbeyrier', 'lavey morcles', 'ormont dessus', 'ormont dessous', 'les diablerets', 'rennaz'] },
  { nom: 'Broye-Vully', canton: 'vaud', immobilier: 'd117', homegate: 'geo-region-broye-vully', communes: ['payerne', 'moudon', 'avenches', 'lucens', 'henniez', 'valbroye', 'cudrefin', 'vully les lacs', 'corcelles pres payerne', 'grandcour', 'trey'] },
  { nom: 'Gros-de-Vaud', canton: 'vaud', immobilier: 'd118', homegate: 'geo-region-gros-de-vaud', communes: ['echallens', 'assens', 'bottens', 'bercher', 'etagnieres', 'vuarrens', 'thierrens', 'poliez pittet', 'montilliez', 'villars le terroir', 'goumoens', 'bioley orjulaz', 'cugy', 'froideville', 'boulens', 'sullens', 'bournens', 'oulens sous echallens', 'penthereaz', 'fey', 'essertines sur yverdon'] },
  { nom: 'Jura-Nord vaudois', canton: 'vaud', immobilier: 'd119', homegate: 'geo-region-jura-nord-vaudois', communes: ['yverdon les bains', 'yverdon', 'orbe', 'grandson', 'vallorbe', 'sainte croix', 'yvonand', 'chavornay', 'le chenit', 'le sentier', 'baulmes', 'montagny pres yverdon', 'cheseaux noreaz', 'treycovagnes', 'pomy', 'champvent', 'bavois', 'vuiteboeuf', 'valeyres sous montagny', 'concise', 'onnens'] },
  { nom: 'Lausanne', canton: 'vaud', immobilier: 'd120', homegate: 'geo-region-lausanne', communes: ['lausanne', 'epalinges', 'le mont sur lausanne', 'cheseaux sur lausanne', 'romanel sur lausanne', 'jouxtens mezery'] },
  { nom: 'Lavaux-Oron', canton: 'vaud', immobilier: 'd121', homegate: 'geo-region-lavaux-oron', communes: ['pully', 'lutry', 'paudex', 'belmont sur lausanne', 'savigny', 'forel lavaux', 'bourg en lavaux', 'cully', 'grandvaux', 'chexbres', 'puidoux', 'oron', 'oron la ville', 'jorat mezieres', 'mezieres', 'servion', 'la conversion', 'chatillens', 'palezieux', 'rivaz', 'saint saphorin'] },
  { nom: 'Morges', canton: 'vaud', immobilier: 'd122', homegate: 'geo-region-morges', communes: ['morges', 'saint prex', 'preverenges', 'tolochenaz', 'lonay', 'echichens', 'denges', 'echandens', 'aubonne', 'etoy', 'allaman', 'biere', 'apples', 'gimel', 'colombier', 'vufflens le chateau', 'lully', 'buchillon', 'aclens', 'gollion', 'la sarraz', 'eclepens', 'cossonay', 'penthalaz', 'penthaz', 'vufflens la ville', 'mex', 'romanel sur morges', 'senarclens', 'villars sous yens', 'yens'] },
  { nom: 'Nyon', canton: 'vaud', immobilier: 'd123', homegate: 'geo-region-nyon', communes: ['nyon', 'gland', 'rolle', 'prangins', 'coppet', 'founex', 'commugny', 'crans pres celigny', 'crans', 'eysins', 'trelex', 'duillier', 'begnins', 'perroy', 'mies', 'tannay', 'chavannes de bogis', 'chavannes des bois', 'signy avenex', 'saint cergue', 'arzier le muids', 'genolier', 'gingins', 'vich', 'celigny', 'mont sur rolle', 'bursins', 'gilly'] },
  { nom: 'Ouest lausannois', canton: 'vaud', immobilier: 'd124', homegate: 'geo-region-ouest-lausannois', communes: ['renens', 'prilly', 'crissier', 'ecublens', 'bussigny', 'chavannes pres renens', 'saint sulpice', 'villars sainte croix'] },
  { nom: 'Riviera-Pays-d\'Enhaut', canton: 'vaud', immobilier: 'd125', homegate: 'geo-region-riviera-pays-d-enhaut', communes: ['vevey', 'montreux', 'clarens', 'la tour de peilz', 'corseaux', 'corsier sur vevey', 'chardonne', 'jongny', 'saint legier la chiesaz', 'blonay', 'blonay saint legier', 'veytaux', 'chateau d oex', 'rossiniere', 'rougemont', 'chailly montreux', 'territet'] },
  // Fribourg (Homegate : pas de jeton de district vérifié, on lit le canton ou la commune)
  { nom: 'Broye (FR)', canton: 'fribourg', immobilier: 'd40', homegate: null, communes: ['estavayer', 'estavayer le lac', 'domdidier', 'cugy fr', 'font', 'les montets', 'cheyres chables'] },
  { nom: 'Glâne', canton: 'fribourg', immobilier: 'd41', homegate: null, communes: ['romont', 'mezieres fr', 'siviriez', 'mossel', 'ursy', 'villorsonnens'] },
  { nom: 'Gruyère', canton: 'fribourg', immobilier: 'd42', homegate: null, communes: ['bulle', 'gruyeres', 'broc', 'charmey', 'la tour de treme', 'riaz', 'vuadens', 'marsens', 'villars sous mont', 'le paquier'] },
  { nom: 'Sarine', canton: 'fribourg', immobilier: 'd43', homegate: null, communes: ['fribourg', 'villars sur glane', 'givisiez', 'granges paccot', 'marly', 'corminboeuf', 'matran', 'belfaux', 'avry', 'neyruz', 'corpataux', 'hauterive', 'le mouret'] },
  { nom: 'Lac', canton: 'fribourg', immobilier: 'd44', homegate: null, communes: ['morat', 'murten', 'courtepin', 'praz vully', 'kerzers', 'chietres', 'misery courtion'] },
  { nom: 'Singine', canton: 'fribourg', immobilier: 'd45', homegate: null, communes: ['flamatt', 'dudingen', 'guin', 'tafers', 'tentlingen', 'wunnewil', 'schmitten'] },
  { nom: 'Veveyse', canton: 'fribourg', immobilier: 'd46', homegate: null, communes: ['chatel saint denis', 'chatel st denis', 'attalens', 'remaufens', 'semsales', 'la verrerie'] },
  // Valais
  { nom: 'Brigue', canton: 'valais', immobilier: 'd126', homegate: null, communes: ['brig', 'brigue', 'glis', 'naters', 'brig glis'] },
  { nom: 'Conthey', canton: 'valais', immobilier: 'd127', homegate: null, communes: ['conthey', 'vetroz', 'ardon', 'chamoson', 'nendaz'] },
  { nom: 'Entremont', canton: 'valais', immobilier: 'd128', homegate: null, communes: ['verbier', 'bagnes', 'val de bagnes', 'orsieres', 'liddes', 'sembrancher', 'le chable'] },
  { nom: 'Hérens', canton: 'valais', immobilier: 'd130', homegate: null, communes: ['ayent', 'botyre ayent', 'anzere', 'nax', 'evolene', 'vex', 'mont noble'] },
  { nom: 'Loèche', canton: 'valais', immobilier: 'd131', homegate: null, communes: ['leuk', 'loeche', 'susten', 'leukerbad', 'salgesch'] },
  { nom: 'Martigny', canton: 'valais', immobilier: 'd132', homegate: null, communes: ['martigny', 'saxon', 'fully', 'riddes', 'leytron', 'saillon', 'charrat', 'martigny combe'] },
  { nom: 'Monthey', canton: 'valais', immobilier: 'd133', homegate: null, communes: ['monthey', 'collombey muraz', 'champery', 'vouvry', 'port valais', 'troistorrents', 'val d illiez', 'saint gingolph', 'vionnaz'] },
  { nom: 'Rarogne', canton: 'valais', immobilier: 'd134', homegate: null, communes: ['steg', 'raron', 'ausserberg'] },
  { nom: 'Saint-Maurice', canton: 'valais', immobilier: 'd135', homegate: null, communes: ['saint maurice', 'st maurice', 'massongex', 'vernayaz', 'evionnaz', 'salvan'] },
  { nom: 'Sierre', canton: 'valais', immobilier: 'd136', homegate: null, communes: ['sierre', 'crans montana', 'chalais', 'chippis', 'grone', 'noble contree', 'anniviers', 'miege', 'venthone'] },
  { nom: 'Sion', canton: 'valais', immobilier: 'd137', homegate: null, communes: ['sion', 'saviese', 'grimisuat', 'arbaz', 'veysonnaz', 'pont de la morge', 'bramois', 'salins'] },
  { nom: 'Viège', canton: 'valais', immobilier: 'd138', homegate: null, communes: ['visp', 'viege', 'stalden', 'zermatt', 'saas fee', 'saas grund', 'st niklaus'] },
  // Jura
  { nom: 'Delémont', canton: 'jura', immobilier: 'd146', homegate: null, communes: ['delemont', 'courroux', 'rossemaison', 'courrendlin', 'develier', 'bassecourt', 'haute sorne', 'vicques', 'val terbi'] },
  { nom: 'Franches-Montagnes', canton: 'jura', immobilier: 'd147', homegate: null, communes: ['saignelegier', 'les bois', 'le noirmont', 'les breuleux'] },
  { nom: 'Porrentruy', canton: 'jura', immobilier: 'd148', homegate: null, communes: ['porrentruy', 'courtedoux', 'alle', 'fontenais', 'courgenay', 'haute ajoie', 'basse allaine'] },
  { nom: 'Moutier', canton: 'jura', immobilier: 'd149', homegate: null, communes: ['moutier'] },
];

/** Cantons entiers (immobilier.ch sNNN, Homegate geo-canton-…). */
export const CANTONS: Record<string, { nom: string; immobilier: string; homegate: string | null; communes?: string[] }> = {
  vaud: { nom: 'Vaud', immobilier: 's118', homegate: 'geo-canton-vaud' },
  geneve: { nom: 'Genève', immobilier: 's40', homegate: 'geo-canton-geneve', communes: ['geneve', 'carouge', 'lancy', 'grand lancy', 'petit lancy', 'vernier', 'meyrin', 'onex', 'chene bougeries', 'chene bourg', 'thonex', 'plan les ouates', 'le grand saconnex', 'grand saconnex', 'versoix', 'bernex', 'confignon', 'veyrier', 'collonge bellerive', 'cologny', 'satigny', 'bellevue', 'pregny chambesy', 'troinex', 'chatelaine', 'les acacias', 'eaux vives', 'plainpalais', 'petit saconnex', 'servette', 'champel', 'paquis'] },
  fribourg: { nom: 'Fribourg', immobilier: 's37', homegate: 'geo-canton-fribourg' },
  neuchatel: { nom: 'Neuchâtel', immobilier: 's77', homegate: 'geo-canton-neuchatel', communes: ['neuchatel', 'la chaux de fonds', 'chaux de fonds', 'le locle', 'peseux', 'boudry', 'cortaillod', 'colombier ne', 'bevaix', 'saint blaise', 'marin epagnier', 'la tene', 'hauterive ne', 'val de ruz', 'val de travers', 'fleurier', 'cernier', 'milvignes', 'corcelles cormondreche', 'rochefort'] },
  valais: { nom: 'Valais', immobilier: 's115', homegate: null },
  jura: { nom: 'Jura', immobilier: 's55', homegate: null },
  berne: { nom: 'Berne', immobilier: 's19', homegate: null },
};

/** Commune normalisée (« Renens VD », « renens-vd » → « renens »). */
export function communeKey(s: unknown): string {
  return norm(s).replace(/\s+(vd|ge|fr|ne|vs|ju|be)$/, '').trim();
}

/** District d'une commune, s'il est connu. */
export function districtOf(commune: string): Lieu | null {
  const c = communeKey(commune);
  return DISTRICTS.find((d) => d.communes.includes(c) || norm(d.nom) === c) ?? null;
}

function cantonOf(commune: string): string | null {
  const c = communeKey(commune);
  const d = districtOf(c);
  if (d) return d.canton;
  for (const [k, v] of Object.entries(CANTONS)) if (k === c || (v.communes ?? []).includes(c)) return k;
  return null;
}

/** Jeton Homegate d'une commune (« Chavannes-près-Renens » → geo-city-chavannes-pres-renens). */
export const homegateCity = (commune: string) => `geo-city-${communeKey(commune).replace(/\s+/g, '-')}`;

export interface ZonePortails { immobilier: { code: string; zone: string }[]; homegate: { token: string; zone: string }[] }

/**
 * Codes à interroger pour une liste de communes : le district quand il est connu (une seule page pour toute la zone),
 * sinon le canton pour immobilier.ch et la commune pour Homegate.
 */
export function zonePortails(communes: string[]): ZonePortails {
  const im = new Map<string, string>();
  const hg = new Map<string, string>();
  for (const c of communes) {
    const d = districtOf(c);
    if (d) {
      if (d.immobilier) im.set(d.immobilier, `district ${d.nom}`);
      hg.set(d.homegate ?? homegateCity(c), d.homegate ? `district ${d.nom}` : c);
      continue;
    }
    const k = cantonOf(c);
    if (k === 'geneve') {
      im.set(CANTONS.geneve.immobilier, 'canton de Genève');
      hg.set(communeKey(c) === 'geneve' ? 'geo-city-geneve' : homegateCity(c), c);
    } else if (k) {
      im.set(CANTONS[k].immobilier, `canton ${CANTONS[k].nom}`);
      hg.set(homegateCity(c), c);
    } else {
      hg.set(homegateCity(c), c);
    }
  }
  return { immobilier: [...im].map(([code, zone]) => ({ code, zone })), homegate: [...hg].map(([token, zone]) => ({ token, zone })) };
}

export interface UrlRecherche { portail: 'immobilier.ch' | 'homegate'; zone: string; url: string }

/** Adresses de recherche prêtes (location) : prix maximal, pièces minimales, tri par date sur Homegate. */
export function urlsRecherche(o: { communes: string[]; plafond?: number | null; pieces?: number | null; maison?: boolean }): UrlRecherche[] {
  const z = zonePortails(o.communes);
  const px = o.plafond && o.plafond > 0 ? Math.floor(o.plafond) : null;
  const pc = o.pieces && o.pieces > 0 ? o.pieces : null;
  const out: UrlRecherche[] = [];
  if (!o.maison) {
    for (const { code, zone } of z.immobilier) {
      out.push({ portail: 'immobilier.ch', zone, url: `https://www.immobilier.ch/fr/louer/appartement/page-1?t=rent&c=1&p=${code}${px ? `&px=${px}` : ''}${pc ? `&nrn=${Math.floor(pc)}` : ''}&nb=false&gr=1` });
    }
  }
  for (const { token, zone } of z.homegate) {
    out.push({ portail: 'homegate', zone, url: `https://www.homegate.ch/louer/${o.maison ? 'maison' : 'appartement'}/liste-annonces?loc=${token}${px ? `&ah=${px}` : ''}${pc ? `&ac=${pc}` : ''}&o=dateCreated-desc` });
  }
  return out;
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());

/** Annonces d'une page de liste Homegate (window.__INITIAL_STATE__), au format des annonces lues par Steeve. */
export function parseHomegate(html: string): any[] {
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/);
  if (!m) return [];
  let st: any;
  try { st = JSON.parse(m[1].trim().replace(/;\s*$/, '').replace(/:undefined([,}\]])/g, ':null$1')); } catch { return []; }
  const items: any[] = st?.resultList?.search?.fullSearch?.result?.listings ?? [];
  return items.map((it) => {
    const l = it?.listing ?? {};
    const a = l.address ?? {};
    const loc = l.localization ?? {};
    const t = (loc[loc.primary] ?? loc.fr ?? {}).text ?? {};
    const rent = l.prices?.rent ?? {};
    const gross = Number(rent.gross) || ((Number(rent.net) || 0) + (Number(rent.extra) || 0)) || null;
    const id = String(it?.id ?? l.id ?? '');
    const cats: string[] = (l.categories ?? []).map(String);
    return {
      _source: 'homegate', _id: id, _lien: `https://www.homegate.ch/louer/${id}`,
      offer_type: l.offerType === 'RENT' ? 'RENT' : String(l.offerType ?? ''), status: 'act',
      street: a.street ?? null, zipcode: a.postalCode ?? null, city: a.locality ? titleCase(String(a.locality)) : null,
      rent_gross: gross, rent_charges: Number(rent.extra) || null, number_of_rooms: l.characteristics?.numberOfRooms != null ? String(l.characteristics.numberOfRooms) : null,
      surface_living: Number(l.characteristics?.livingSpace) || null, floor: l.characteristics?.floor ?? null, year_built: l.characteristics?.yearBuilt ?? null,
      is_furnished: cats.some((c) => /FURNISH/i.test(c)), short_title: t.title ?? '', description: t.description ?? '',
      published: l.meta?.createdAt ?? null, latitude: a.geoCoordinates?.latitude ?? null, longitude: a.geoCoordinates?.longitude ?? null,
    };
  }).filter((x) => /^\d{5,}$/.test(x._id));
}

/** Liens des annonces d'une page de liste immobilier.ch (JSON-LD ItemList). */
export function parseImmobilierList(html: string): string[] {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (j?.['@type'] === 'ItemList') return (j.itemListElement ?? []).map((x: any) => String(x?.url ?? '')).filter((u: string) => /^https:\/\/www\.immobilier\.ch\/fr\/louer\/.+-\d{6,}$/.test(u));
    } catch { /* bloc suivant */ }
  }
  return [];
}

/** Commune lue dans le lien immobilier.ch (/fr/louer/appartement/vaud/renens-vd/… → « renens »). */
export const immobilierCommune = (url: string) => communeKey(String(url).split('/')[7] ?? '');

/** Fiche immobilier.ch (JSON-LD RealEstateListing) au format des annonces lues par Steeve. */
export function parseImmobilierFiche(html: string, url: string): any | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let j: any;
    try { j = JSON.parse(m[1]); } catch { continue; }
    if (j?.['@type'] !== 'RealEstateListing') continue;
    const ab = j.about ?? {};
    const ad = ab.address ?? {};
    const net = Number(j.offers?.price) || null;
    const ch = String(j.name ?? '').match(/\(\+\s*([\d'’]+)(?:\.-?)?\s*charges?\)/i);
    const charges = ch ? Number(ch[1].replace(/['’]/g, '')) : null;
    const id = String(j.sku ?? url.match(/-(\d{6,})$/)?.[1] ?? '');
    return {
      _source: 'immobilier.ch', _id: id, _lien: url, _regie: j.brand?.name ?? null,
      offer_type: 'RENT', status: 'act', street: ad.streetAddress ?? null, zipcode: ad.postalCode ?? null, city: ad.addressLocality ?? null,
      // Loyer charges comprises : net + charges ; sans charges connues, le net seul (l'évaluation le sait : charges inconnues).
      rent_gross: net ? net + (charges ?? 0) : null, rent_charges: charges, number_of_rooms: ab.numberOfRooms != null ? String(ab.numberOfRooms) : null,
      surface_living: Number(ab.floorSize?.value) || null, floor: ab.floorLevel ?? null, year_built: ab.yearBuilt ?? null,
      attributes: (ab.amenityFeature ?? []).map((f: any) => ({ name: String(f?.name ?? f?.value ?? f ?? '') })).filter((f: any) => f.name),
      short_title: String(j.name ?? ''), description: String(j.description ?? ''), published: j.datePosted ?? null,
      moving_date: j.offers?.availabilityStarts ?? null, latitude: ab.geo?.latitude ?? null, longitude: ab.geo?.longitude ?? null,
    };
  }
  return null;
}
