import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://logisorama.ch';
const DEFAULT_IMAGE = `${SITE_URL}/app-icon.png`;
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex, nofollow, noarchive';

type SeoConfig = {
  title: string;
  description: string;
  canonical: string;
  lang?: string;
  schema?: Record<string, unknown>[];
};

const cantons = ['Vaud', 'Genève', 'Fribourg', 'Valais', 'Neuchâtel', 'Jura'];

const provider = {
  '@type': 'RealEstateAgent',
  '@id': `${SITE_URL}/#business`,
  name: 'Logisorama by Immo-rama.ch',
  url: SITE_URL,
};

const breadcrumb = (name: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Accueil',
      item: `${SITE_URL}/`,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name,
      item: `${SITE_URL}${path}`,
    },
  ],
});

const serviceSchema = (name: string, description: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name,
  description,
  url: `${SITE_URL}${path}`,
  provider,
  areaServed: cantons.map((name) => ({ '@type': 'AdministrativeArea', name })),
  availableLanguage: ['fr', 'en'],
});

const seoByPath: Record<string, SeoConfig> = {
  '/': {
    title: "Agence de relocation en Suisse romande | Logisorama",
    description:
      "Recherche d'appartement à Lausanne, Genève et en Suisse romande : agent dédié, dossier locataire optimisé, visites et candidatures suivies jusqu'au bail.",
    canonical: '/',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: 'Agence de relocation en Suisse romande',
        description:
          "Service de recherche d'appartement et de relocation à Lausanne, Genève et dans toute la Suisse romande.",
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#business` },
        inLanguage: 'fr-CH',
      },
      serviceSchema(
        "Recherche d'appartement et relocation en Suisse romande",
        "Recherche ciblée, dossier locataire optimisé, visites déléguées et suivi des candidatures jusqu'à la signature du bail.",
        '/',
      ),
    ],
  },
  '/chasseur-appartement': {
    title: "Chasseur d'appartement Lausanne & Suisse romande | Logisorama",
    description:
      "Votre chasseur d'appartement à Lausanne et en Suisse romande : veille quotidienne, biens ciblés, visites, dossier de location et suivi auprès des régies.",
    canonical: '/chasseur-appartement',
    schema: [
      serviceSchema(
        "Chasseur d'appartement à Lausanne et en Suisse romande",
        "Un agent immobilier personnel recherche les logements, filtre les annonces, organise les visites et suit votre dossier auprès des régies.",
        '/chasseur-appartement',
      ),
      breadcrumb("Chasseur d'appartement", '/chasseur-appartement'),
    ],
  },
  '/relouer-mon-appartement': {
    title: 'Reprise de bail : trouver un repreneur | Logisorama',
    description:
      "Reprise de bail en Suisse romande : Logisorama trouve un locataire solvable, organise les visites et transmet les dossiers complets à votre régie.",
    canonical: '/relouer-mon-appartement',
    schema: [
      serviceSchema(
        'Recherche de repreneur pour une reprise de bail',
        "Service pour locataire sortant : diffusion, visites, présélection de candidats solvables et transmission des dossiers à la régie.",
        '/relouer-mon-appartement',
      ),
      breadcrumb('Reprise de bail', '/relouer-mon-appartement'),
    ],
  },
  '/accompagnement-achat': {
    title: 'Chasseur immobilier en Suisse romande | Logisorama',
    description:
      "Accompagnement à l'achat immobilier en Suisse romande : financement, recherche de biens, visites, négociation, notaire et remise des clés.",
    canonical: '/accompagnement-achat',
    schema: [
      serviceSchema(
        "Chasseur immobilier et accompagnement à l'achat",
        "Accompagnement de l'acheteur, de la validation du financement à la recherche, la négociation et la signature notariale.",
        '/accompagnement-achat',
      ),
      breadcrumb('Accompagnement achat immobilier', '/accompagnement-achat'),
    ],
  },
  '/annonces': {
    title: 'Annonces immobilières en Suisse romande | Logisorama',
    description:
      "Recherchez des appartements et maisons à louer ou à vendre en Suisse romande avec filtres par ville, budget, pièces et surface.",
    canonical: '/annonces/recherche',
  },
  '/annonces/recherche': {
    title: 'Annonces immobilières en Suisse romande | Logisorama',
    description:
      "Recherchez des appartements et maisons à louer ou à vendre en Suisse romande avec filtres par ville, budget, pièces et surface.",
    canonical: '/annonces/recherche',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Annonces immobilières en Suisse romande',
        url: `${SITE_URL}/annonces/recherche`,
        inLanguage: 'fr-CH',
      },
      breadcrumb('Annonces immobilières', '/annonces/recherche'),
    ],
  },
  '/mentions-legales': {
    title: 'Mentions légales | Logisorama',
    description: "Informations légales de Logisorama, service immobilier d'Immo-rama.ch à Crissier, Suisse.",
    canonical: '/mentions-legales',
  },
  '/politique-confidentialite': {
    title: 'Politique de confidentialité | Logisorama',
    description: 'Découvrez comment Logisorama collecte, utilise et protège vos données personnelles en Suisse.',
    canonical: '/politique-confidentialite',
  },
  '/conditions-generales': {
    title: "Conditions générales d'utilisation | Logisorama",
    description: "Consultez les conditions générales d'utilisation des services et de la plateforme Logisorama.",
    canonical: '/conditions-generales',
  },
  '/en/legal-notice': {
    title: 'Legal notice | Logisorama',
    description: 'Legal information for Logisorama, an Immo-rama.ch real estate service in Switzerland.',
    canonical: '/en/legal-notice',
    lang: 'en',
  },
  '/en/privacy-policy': {
    title: 'Privacy policy | Logisorama',
    description: 'Learn how Logisorama collects, uses and protects personal data in Switzerland.',
    canonical: '/en/privacy-policy',
    lang: 'en',
  },
  '/de/impressum': {
    title: 'Impressum | Logisorama',
    description: 'Rechtliche Informationen zu Logisorama, einem Immobiliendienst von Immo-rama.ch in der Schweiz.',
    canonical: '/de/impressum',
    lang: 'de',
  },
  '/de/datenschutz': {
    title: 'Datenschutzerklärung | Logisorama',
    description: 'Erfahren Sie, wie Logisorama personenbezogene Daten in der Schweiz bearbeitet und schützt.',
    canonical: '/de/datenschutz',
    lang: 'de',
  },
};

function ensureMeta(selector: string, attribute: 'name' | 'property', key: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  return element;
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  ensureMeta(selector, attribute, key).setAttribute('content', content);
}

function resolveSeo(pathname: string): SeoConfig | null {
  if (seoByPath[pathname]) return seoByPath[pathname];

  if (/^\/annonces\/(?!offre\/|recherche\/?$)[^/]+\/?$/.test(pathname)) {
    return {
      title: 'Annonce immobilière en Suisse romande | Logisorama',
      description: "Découvrez cette annonce immobilière à louer ou à vendre en Suisse romande sur Logisorama.",
      canonical: pathname,
    };
  }

  return null;
}

export function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';
    const seo = resolveSeo(normalizedPath);

    document.documentElement.lang = seo?.lang ?? 'fr';
    setMeta('name', 'robots', seo ? INDEX_ROBOTS : NOINDEX_ROBOTS);
    setMeta('name', 'googlebot', seo ? INDEX_ROBOTS : NOINDEX_ROBOTS);

    document.querySelectorAll('script[data-route-seo="true"]').forEach((element) => element.remove());

    if (!seo) {
      document.querySelector('link[rel="canonical"]')?.remove();
      setMeta('property', 'og:url', `${SITE_URL}${normalizedPath}`);
      return;
    }

    document.title = seo.title;
    setMeta('name', 'description', seo.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', seo.lang === 'en' ? 'en_GB' : seo.lang === 'de' ? 'de_CH' : 'fr_CH');
    setMeta('property', 'og:site_name', 'Logisorama');
    setMeta('property', 'og:title', seo.title);
    setMeta('property', 'og:description', seo.description);
    setMeta('property', 'og:url', `${SITE_URL}${seo.canonical}`);
    setMeta('property', 'og:image', DEFAULT_IMAGE);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', seo.title);
    setMeta('name', 'twitter:description', seo.description);
    setMeta('name', 'twitter:image', DEFAULT_IMAGE);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE_URL}${seo.canonical}`;

    seo.schema?.forEach((data, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.routeSeo = 'true';
      script.id = `route-seo-jsonld-${index}`;
      script.text = JSON.stringify(data);
      document.head.appendChild(script);
    });
  }, [pathname]);

  return null;
}
