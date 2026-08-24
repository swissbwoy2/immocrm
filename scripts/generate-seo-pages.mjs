import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(projectRoot, 'dist');
const baseHtml = await readFile(join(distDir, 'index.html'), 'utf8');
const siteUrl = 'https://logisorama.ch';
const indexRobots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const noindexRobots = 'noindex, nofollow, noarchive';

const pages = [
  {
    path: '/chasseur-appartement',
    title: "Chasseur d'appartement Lausanne & Suisse romande | Logisorama",
    description:
      "Votre chasseur d'appartement à Lausanne et en Suisse romande : veille quotidienne, biens ciblés, visites, dossier de location et suivi auprès des régies.",
  },
  {
    path: '/relouer-mon-appartement',
    title: 'Reprise de bail : trouver un repreneur | Logisorama',
    description:
      "Reprise de bail en Suisse romande : Logisorama trouve un locataire solvable, organise les visites et transmet les dossiers complets à votre régie.",
  },
  {
    path: '/accompagnement-achat',
    title: 'Chasseur immobilier en Suisse romande | Logisorama',
    description:
      "Accompagnement à l'achat immobilier en Suisse romande : financement, recherche de biens, visites, négociation, notaire et remise des clés.",
  },
  {
    path: '/annonces',
    canonical: '/annonces/recherche',
    title: 'Annonces immobilières en Suisse romande | Logisorama',
    description:
      "Recherchez des appartements et maisons à louer ou à vendre en Suisse romande avec filtres par ville, budget, pièces et surface.",
  },
  {
    path: '/annonces/recherche',
    title: 'Annonces immobilières en Suisse romande | Logisorama',
    description:
      "Recherchez des appartements et maisons à louer ou à vendre en Suisse romande avec filtres par ville, budget, pièces et surface.",
  },
  {
    path: '/mentions-legales',
    title: 'Mentions légales | Logisorama',
    description: "Informations légales de Logisorama, service immobilier d'Immo-rama.ch à Crissier, Suisse.",
  },
  {
    path: '/politique-confidentialite',
    title: 'Politique de confidentialité | Logisorama',
    description: 'Découvrez comment Logisorama collecte, utilise et protège vos données personnelles en Suisse.',
  },
  {
    path: '/conditions-generales',
    title: "Conditions générales d'utilisation | Logisorama",
    description: "Consultez les conditions générales d'utilisation des services et de la plateforme Logisorama.",
  },
  {
    path: '/en/legal-notice',
    title: 'Legal notice | Logisorama',
    description: 'Legal information for Logisorama, an Immo-rama.ch real estate service in Switzerland.',
    lang: 'en',
  },
  {
    path: '/en/privacy-policy',
    title: 'Privacy policy | Logisorama',
    description: 'Learn how Logisorama collects, uses and protects personal data in Switzerland.',
    lang: 'en',
  },
  {
    path: '/de/impressum',
    title: 'Impressum | Logisorama',
    description: 'Rechtliche Informationen zu Logisorama, einem Immobiliendienst von Immo-rama.ch in der Schweiz.',
    lang: 'de',
  },
  {
    path: '/de/datenschutz',
    title: 'Datenschutzerklärung | Logisorama',
    description: 'Erfahren Sie, wie Logisorama personenbezogene Daten in der Schweiz bearbeitet und schützt.',
    lang: 'de',
  },
  {
    path: '/login',
    title: 'Connexion à votre espace | Logisorama',
    description: 'Connexion sécurisée à votre espace client Logisorama.',
    indexable: false,
  },
  {
    path: '/nouveau-mandat',
    title: 'Activer votre recherche | Logisorama',
    description: "Formulaire d'activation de votre recherche immobilière Logisorama.",
    indexable: false,
  },
  {
    path: '/rendez-vous',
    title: 'Prendre rendez-vous | Logisorama',
    description: "Réservez un rendez-vous avec l'équipe Logisorama.",
    indexable: false,
  },
  {
    path: '/formulaire-relouer',
    title: 'Formulaire reprise de bail | Logisorama',
    description: 'Transmettez les informations nécessaires à la recherche de votre locataire de remplacement.',
    indexable: false,
  },
  {
    path: '/connexion-annonceur',
    title: 'Connexion annonceur | Logisorama',
    description: 'Connexion sécurisée à votre espace annonceur Logisorama.',
    indexable: false,
  },
  {
    path: '/inscription-annonceur',
    title: 'Inscription annonceur | Logisorama',
    description: 'Créez votre espace annonceur Logisorama.',
    indexable: false,
  },
  {
    path: '/first-login',
    title: 'Activation du compte | Logisorama',
    description: 'Activation sécurisée de votre compte Logisorama.',
    indexable: false,
  },
  {
    path: '/reset-password',
    title: 'Réinitialiser le mot de passe | Logisorama',
    description: 'Réinitialisation sécurisée de votre mot de passe Logisorama.',
    indexable: false,
  },
];

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

function setMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${key}["'])[^>]*>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function buildPage(page) {
  const canonicalPath = page.canonical ?? page.path;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const robots = page.indexable === false ? noindexRobots : indexRobots;
  const locale = page.lang === 'en' ? 'en_GB' : page.lang === 'de' ? 'de_CH' : 'fr_CH';

  let html = baseHtml.replace(/<html\b[^>]*lang=["'][^"']*["'][^>]*>/i, `<html lang="${page.lang ?? 'fr'}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = setMeta(html, 'name', 'description', page.description);
  html = setMeta(html, 'name', 'robots', robots);
  html = setMeta(html, 'name', 'googlebot', robots);
  html = setMeta(html, 'property', 'og:locale', locale);
  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', page.description);
  html = setMeta(html, 'property', 'og:url', canonicalUrl);
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', page.description);
  html = html.replace(
    /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );
  return html;
}

for (const page of pages) {
  const outputPath = join(distDir, page.path.slice(1), 'index.html');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buildPage(page), 'utf8');
}

console.log(`Generated ${pages.length} route-specific SEO HTML files.`);
