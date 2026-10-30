/*
 * Pages de référencement local (une page par zone + agence + page hub).
 * Chaque page a un contenu propre (communes, marché, transports, conseils, FAQ) pour éviter les pages
 * « satellites » : seuls les chiffres officiels cités ont une source, aucun chiffre n'est inventé.
 */

export type SeoSource = { label: string; url: string };
export type SeoSection = { h2: string; paragraphs: string[]; bullets?: string[] };
export type SeoFaq = { q: string; a: string };

export type SeoZonePage = {
  slug: string;
  path: string;
  /** Nom court pour les liens et le fil d'Ariane */
  name: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  communes: string[];
  /** Cantons ou régions pour le balisage areaServed */
  areaServed: string[];
  sections: SeoSection[];
  faq: SeoFaq[];
  sources?: SeoSource[];
};

export const SITE_URL = 'https://logisorama.ch';
export const HUB_PATH = '/recherche-appartement';
export const AGENCE_PATH = '/agence-immobiliere-crissier';

const SRC_VD_2026: SeoSource = {
  label: 'État de Vaud, Statistique Vaud : logements vacants au 1er juin 2026 (résultats provisoires)',
  url: 'https://www.vd.ch/actualites/actualite/news/26491-25382-logements-vacants-en-baisse-au-1er-juin-2025-1',
};
const SRC_VD_2025: SeoSource = {
  label: 'État de Vaud, Statistique Vaud : logements vacants au 1er juin 2025',
  url: 'https://www.vd.ch/actualites/communiques-de-presse-de-letat-de-vaud/detail/communique/logements-vacants-en-baisse-au-1er-juin-2025',
};
const SRC_OFS_2026: SeoSource = {
  label: 'Office fédéral de la statistique : logements vacants au 1er juin 2026',
  url: 'https://www.admin.ch/fr/newnsb/kgvqAd91MYZr',
};

export const ZONES: SeoZonePage[] = [
  {
    slug: 'lausanne-ouest-lausannois',
    path: `${HUB_PATH}/lausanne-ouest-lausannois`,
    name: 'Lausanne et Ouest lausannois',
    title: 'Appartement à Lausanne et Ouest lausannois | Logisorama',
    description:
      'Appartement à louer à Lausanne, Renens, Prilly, Crissier ou Ecublens : un agent dédié cible les biens, visite pour vous et suit votre dossier auprès des régies.',
    h1: 'Recherche d’appartement à Lausanne et dans l’Ouest lausannois',
    lede:
      'Lausanne et les communes de l’Ouest lausannois forment le marché locatif le plus disputé du canton de Vaud. Notre bureau est à Crissier, au cœur de ce secteur : nous y cherchons, visitons et postulons chaque jour pour nos clients.',
    communes: ['Lausanne', 'Renens', 'Prilly', 'Crissier', 'Ecublens', 'Bussigny', 'Chavannes-près-Renens', 'Saint-Sulpice', 'Villars-Sainte-Croix', 'Jouxtens-Mézery'],
    areaServed: ['Lausanne', 'Renens', 'Prilly', 'Crissier', 'Ecublens', 'Bussigny', 'Chavannes-près-Renens', 'Saint-Sulpice'],
    sections: [
      {
        h2: 'Un marché très tendu, des deux côtés de la ville',
        paragraphs: [
          'Selon Statistique Vaud, le district de l’Ouest lausannois comptait 0,67 % de logements vacants au 1er juin 2026 (résultat provisoire), contre 0,47 % un an plus tôt, le taux le plus bas du canton en 2025. Le district de Lausanne est resté stable, avec 0,63 % au 1er juin 2025. On parle d’un marché équilibré à partir de 1,5 % : ici, chaque bon appartement reçoit de nombreuses candidatures en quelques jours.',
          'Concrètement, la différence se fait sur la vitesse et la qualité du dossier. Un logement publié le matin peut avoir ses visites complètes le soir même. Votre agent surveille les publications en continu, réserve les créneaux de visite et transmet votre dossier dès que le bien correspond.',
        ],
      },
      {
        h2: 'Où chercher selon votre quotidien',
        paragraphs: [
          'Le métro m1 relie Lausanne-Flon à la gare de Renens en desservant les hautes écoles, et le m2 traverse la ville d’Ouchy aux Croisettes. La gare de Renens est un nœud ferroviaire majeur de l’agglomération. Pour ceux qui travaillent à Lausanne, Renens, Prilly et Crissier offrent souvent davantage de surface pour le même budget que le centre-ville.',
        ],
        bullets: [
          'Centre de Lausanne : proximité des commerces, des écoles et des transports, mais une concurrence maximale sur les petites surfaces.',
          'Prilly et Renens : bon compromis entre accès rapide à Lausanne et loyers parfois plus accessibles.',
          'Crissier, Bussigny et Villars-Sainte-Croix : quartiers résidentiels et zones d’activité, appréciés des familles motorisées.',
          'Ecublens, Chavannes-près-Renens et Saint-Sulpice : à proximité immédiate de l’UNIL et de l’EPFL, très demandés à la rentrée.',
        ],
      },
      {
        h2: 'Ce que les régies lausannoises attendent d’un dossier',
        paragraphs: [
          'Un dossier complet est envoyé en une fois et se lit en quelques secondes : pièce d’identité ou permis de séjour, extrait du registre des poursuites récent, justificatifs de revenus (fiches de salaire ou attestation de l’employeur) et, selon les cas, une attestation d’assurance responsabilité civile. Nous préparons ce dossier avec vous, le vérifions et l’adaptons au bien visé.',
          'Le loyer recommandé correspond généralement à un tiers du revenu net. Si votre budget dépasse cette limite, un garant ou un co-titulaire peut rassurer la régie : nous vous aidons à présenter cette solution clairement.',
        ],
      },
      {
        h2: 'Notre accompagnement sur place',
        paragraphs: [
          'Depuis notre bureau du Chemin de l’Esparcette 5 à Crissier, nous sommes à quelques minutes de la plupart des visites de la zone. Si vous ne pouvez pas vous déplacer, nous visitons pour vous et vous envoyons photos, vidéo et compte rendu, puis nous déposons votre candidature et relançons la régie jusqu’à la décision.',
        ],
      },
    ],
    faq: [
      { q: 'Combien de temps faut-il pour trouver un appartement à Lausanne ?', a: 'Cela dépend surtout du budget, de la surface et de la souplesse sur le quartier. Le mandat de recherche dure 90 jours : pendant cette période, votre agent cherche, visite et postule chaque semaine, et l’acompte de 300 CHF vous est remboursé sous 30 jours si aucun bail n’est signé au terme.' },
      { q: 'Faut-il chercher à Lausanne ou dans l’Ouest lausannois ?', a: 'Les deux secteurs sont tendus. L’Ouest lausannois (Renens, Prilly, Crissier, Ecublens) offre souvent plus de surface pour un budget équivalent et reste très bien relié à Lausanne par le m1 et le train. Nous élargissons la recherche aux communes voisines avec votre accord.' },
      { q: 'Pouvez-vous visiter à ma place ?', a: 'Oui. Nous visitons en votre nom et vous transmettons photos, vidéo et compte rendu détaillé pour que vous décidiez à distance.' },
    ],
    sources: [SRC_VD_2026, SRC_VD_2025],
  },
  {
    slug: 'logement-etudiant-unil-epfl',
    path: `${HUB_PATH}/logement-etudiant-unil-epfl`,
    name: 'Logement étudiant UNIL et EPFL',
    title: 'Logement étudiant près de l’UNIL et de l’EPFL | Logisorama',
    description:
      'Studio, chambre ou colocation près de l’UNIL et de l’EPFL (Ecublens, Chavannes, Renens, Lausanne) : dossier prêt et recherche avant la rentrée.',
    h1: 'Logement étudiant près de l’UNIL et de l’EPFL',
    lede:
      'Le campus de Dorigny, qui accueille l’Université de Lausanne et l’EPFL, attire chaque année des milliers d’étudiants qui cherchent un logement au même moment. Bien s’y prendre, c’est commencer tôt et arriver avec un dossier solide.',
    communes: ['Ecublens', 'Chavannes-près-Renens', 'Saint-Sulpice', 'Renens', 'Lausanne', 'Morges'],
    areaServed: ['Ecublens', 'Chavannes-près-Renens', 'Saint-Sulpice', 'Renens', 'Lausanne'],
    sections: [
      {
        h2: 'Le calendrier qui change tout : la rentrée de septembre',
        paragraphs: [
          'Le semestre d’automne commence mi-septembre. La demande explose entre mai et septembre, quand les nouveaux étudiants, les étudiants en échange et les doctorants cherchent tous en même temps. Lancer votre recherche au printemps vous laisse le choix ; attendre août réduit fortement les options autour du campus.',
          'Nous planifions la recherche à rebours depuis votre date d’arrivée : constitution du dossier, ciblage des communes desservies par le m1, puis visites et candidatures dès que les biens se libèrent.',
        ],
      },
      {
        h2: 'Studio, colocation ou résidence : bien choisir',
        paragraphs: [
          'Les résidences étudiantes (par exemple celles de la FMEL) restent l’option la moins chère, mais les places sont limitées et attribuées selon leurs propres critères : inscrivez-vous en parallèle. Sur le marché libre, le studio offre l’indépendance, la colocation divise le loyer et la sous-location dépanne pour un semestre, à condition que le bail principal l’autorise.',
        ],
        bullets: [
          'Ecublens et Chavannes-près-Renens : à pied ou à une station de m1 du campus.',
          'Saint-Sulpice : calme, au bord du lac, souvent recherché par les doctorants et les familles.',
          'Renens : gare CFF et m1, idéal pour combiner études et déplacements en train.',
          'Lausanne centre : plus de vie nocturne et de services, accès direct au campus par le m1 depuis le Flon.',
        ],
      },
      {
        h2: 'Un dossier étudiant qui rassure la régie',
        paragraphs: [
          'Sans revenu propre, la régie regarde surtout la solidité du garant : en général un parent qui fournit ses justificatifs de revenus et un extrait de poursuites. L’attestation d’immatriculation ou la lettre d’admission prouve votre lien avec la haute école. Pour la garantie de loyer, une caution par assurance (par exemple via notre partenaire FirstCaution) évite de bloquer plusieurs mois de loyer sur un compte.',
          'Étudiants internationaux : le permis de séjour pour études et l’attestation de l’école suffisent souvent à ouvrir les discussions. Nous pouvons mener la recherche à distance et visiter pour vous avant votre arrivée.',
        ],
      },
    ],
    faq: [
      { q: 'Quand commencer à chercher un logement pour la rentrée à l’EPFL ou à l’UNIL ?', a: 'Idéalement au printemps, entre avril et juin. La concurrence est maximale en juillet et août, juste avant le début du semestre d’automne mi-septembre.' },
      { q: 'Un étudiant sans revenu peut-il louer un appartement ?', a: 'Oui, avec un garant solvable (souvent un parent) qui fournit ses justificatifs de revenus et un extrait de poursuites récent. Nous vous aidons à préparer ce dossier.' },
      { q: 'Pouvez-vous chercher pour moi avant mon arrivée en Suisse ?', a: 'Oui. Nous cherchons et visitons à distance, puis nous vous envoyons photos, vidéo et compte rendu pour décider sans vous déplacer.' },
    ],
  },
  {
    slug: 'lavaux-riviera',
    path: `${HUB_PATH}/lavaux-riviera`,
    name: 'Lavaux et Riviera',
    title: 'Appartement à Lavaux et sur la Riviera | Logisorama',
    description:
      'Appartement à louer à Pully, Lutry, Vevey, La Tour-de-Peilz ou Montreux : recherche ciblée, visites déléguées et suivi de votre candidature jusqu’au bail.',
    h1: 'Recherche d’appartement à Lavaux et sur la Riviera',
    lede:
      'Entre Pully et Villeneuve, la rive vaudoise du Léman mêle villes vivantes, villages vignerons et quartiers résidentiels avec vue sur le lac. C’est aussi l’un des secteurs où les logements disponibles sont les plus rares du canton.',
    communes: ['Pully', 'Lutry', 'Bourg-en-Lavaux', 'Vevey', 'La Tour-de-Peilz', 'Montreux', 'Saint-Légier-La Chiésaz', 'Blonay', 'Villeneuve'],
    areaServed: ['Pully', 'Lutry', 'Bourg-en-Lavaux', 'Vevey', 'La Tour-de-Peilz', 'Montreux', 'Blonay', 'Villeneuve'],
    sections: [
      {
        h2: 'Lavaux-Oron, le district le plus tendu du canton',
        paragraphs: [
          'Au 1er juin 2026, le district de Lavaux-Oron affichait le plus faible taux de logements vacants du canton de Vaud, 0,64 % (résultat provisoire de Statistique Vaud). Sur la Riviera–Pays-d’Enhaut, le taux a enregistré la plus forte baisse du canton sur un an (−0,17 point). En pratique, les appartements avec vue ou à proximité d’une gare partent très vite.',
        ],
      },
      {
        h2: 'Deux visages : Lavaux et la Riviera',
        paragraphs: [
          'Les vignobles en terrasses de Lavaux sont inscrits au patrimoine mondial de l’UNESCO depuis 2007. Dans ces villages, l’offre locative est réduite et se compose souvent d’appartements anciens rénovés ou de petites résidences. Pully et Lutry, aux portes de Lausanne, combinent cadre lacustre et trajets courts vers la ville.',
          'Plus à l’est, Vevey, La Tour-de-Peilz et Montreux offrent un marché plus large, des centres-villes animés et la ligne CFF du bord du lac vers Lausanne. Sur les hauts, Saint-Légier et Blonay attirent les familles qui cherchent davantage d’espace.',
        ],
        bullets: [
          'Pully et Lutry : proximité de Lausanne, forte demande des familles et des cadres.',
          'Bourg-en-Lavaux (Cully, Grandvaux…) : villages vignerons, offre rare, logements de caractère.',
          'Vevey et La Tour-de-Peilz : vie de ville, gare, bon choix de 2,5 à 4,5 pièces.',
          'Montreux, Clarens et Villeneuve : grand bassin de logements, accès direct au train.',
        ],
      },
      {
        h2: 'Comment nous augmentons vos chances',
        paragraphs: [
          'Sur un marché où la vue sur le lac fait grimper la demande, nous vous aidons à fixer des priorités réalistes : étage, vue, proximité de la gare ou du lac. Nous visitons à votre place lorsque vous travaillez, présentons un dossier complet le jour même et suivons chaque candidature auprès de la régie.',
        ],
      },
    ],
    faq: [
      { q: 'Est-il plus facile de louer à Vevey ou à Montreux qu’à Lavaux ?', a: 'En général, le parc locatif est plus large à Vevey et à Montreux que dans les villages de Lavaux, où l’offre est rare. Nous élargissons la recherche entre ces communes avec votre accord.' },
      { q: 'Vous déplacez-vous pour les visites sur la Riviera ?', a: 'Oui. Nous visitons pour vous de Pully à Villeneuve et vous envoyons photos, vidéo et compte rendu.' },
      { q: 'Combien coûte votre accompagnement ?', a: 'Un montant d’activation de 300 CHF, imputé sur la commission, puis une commission d’un mois de loyer brut (min. CHF 500, + TVA si due) seulement si un bail est signé grâce à nous.' },
    ],
    sources: [SRC_VD_2026],
  },
  {
    slug: 'la-cote-morges-nyon',
    path: `${HUB_PATH}/la-cote-morges-nyon`,
    name: 'La Côte, Morges et Nyon',
    title: 'Appartement à Morges, Nyon et sur La Côte | Logisorama',
    description:
      'Appartement ou maison à louer à Morges, Rolle, Gland, Nyon ou Coppet : un agent dédié pour cibler les biens entre Lausanne et Genève et suivre votre dossier.',
    h1: 'Recherche d’appartement à Morges, Nyon et sur La Côte',
    lede:
      'Entre Lausanne et Genève, La Côte attire les familles, les cadres et les collaborateurs d’organisations internationales qui veulent l’espace d’une petite ville et le train à proximité. Nous cherchons pour vous de Morges à Coppet.',
    communes: ['Morges', 'Saint-Prex', 'Aubonne', 'Rolle', 'Gland', 'Nyon', 'Prangins', 'Coppet'],
    areaServed: ['Morges', 'Saint-Prex', 'Aubonne', 'Rolle', 'Gland', 'Nyon', 'Prangins', 'Coppet'],
    sections: [
      {
        h2: 'Une région entre deux villes',
        paragraphs: [
          'La ligne CFF Lausanne–Genève dessert Morges, Rolle, Gland, Nyon et Coppet. Beaucoup de nos clients choisissent La Côte pour vivre à mi-chemin de deux bassins d’emploi : Morges pour rester proche de Lausanne, Nyon et Coppet pour travailler à Genève sans en subir les loyers du centre.',
          'Selon Statistique Vaud, le taux de logements vacants a encore diminué entre 2025 et 2026 dans les districts de Morges et de Nyon : les biens familiaux bien situés restent très convoités.',
        ],
      },
      {
        h2: 'Familles, maisons et grands appartements',
        paragraphs: [
          'La Côte compte davantage de maisons mitoyennes, de villas et de grands appartements que le centre de Lausanne. Ces biens partent souvent à des familles qui ont préparé leur dossier à l’avance : revenus du ménage, extrait de poursuites de chaque adulte, et parfois une lettre de présentation.',
        ],
        bullets: [
          'Morges et Saint-Prex : vie de ville au bord du lac, écoles, accès rapide à Lausanne.',
          'Aubonne et l’arrière-pays : plus d’espace et de calme, voiture souvent utile.',
          'Rolle et Gland : bon compromis entre Lausanne et Genève, gare sur la ligne du lac.',
          'Nyon, Prangins et Coppet : proximité de Genève et des organisations internationales.',
        ],
      },
      {
        h2: 'Collaborateurs internationaux et relocation',
        paragraphs: [
          'Pour les personnes qui arrivent en Suisse pour un poste à Genève ou dans la région, nous préparons le dossier avec les documents disponibles (contrat de travail, attestation de l’employeur, permis en cours) et menons la recherche à distance, visites comprises, pour que le logement soit prêt à l’arrivée.',
        ],
      },
    ],
    faq: [
      { q: 'Vaut-il mieux habiter à Nyon ou à Genève quand on travaille à Genève ?', a: 'Nyon et Coppet sont reliés à Genève par le train et offrent souvent plus d’espace pour le budget. Le choix dépend de vos trajets, de l’école des enfants et de la surface recherchée ; nous vous aidons à comparer.' },
      { q: 'Cherchez-vous aussi des maisons à louer sur La Côte ?', a: 'Oui. Nous cherchons appartements, maisons mitoyennes et villas à louer, selon vos critères.' },
      { q: 'Pouvez-vous chercher avant mon arrivée en Suisse ?', a: 'Oui, la recherche et les visites peuvent se faire entièrement à distance, avec photos, vidéo et compte rendu.' },
    ],
    sources: [SRC_VD_2026],
  },
  {
    slug: 'geneve',
    path: `${HUB_PATH}/geneve`,
    name: 'Genève',
    title: 'Appartement à Genève et dans le Grand Genève | Logisorama',
    description:
      'Appartement à louer à Genève, Carouge, Lancy, Meyrin, Vernier ou Versoix : dossier complet, recherche quotidienne et suivi auprès des régies genevoises.',
    h1: 'Recherche d’appartement à Genève',
    lede:
      'Genève est l’un des marchés locatifs les plus tendus de Suisse. Trouver un appartement y demande un dossier irréprochable, une veille quotidienne et beaucoup de réactivité : c’est précisément ce que nous prenons en charge.',
    communes: ['Genève', 'Carouge', 'Lancy', 'Onex', 'Meyrin', 'Vernier', 'Le Grand-Saconnex', 'Chêne-Bougeries', 'Versoix'],
    areaServed: ['Genève', 'Carouge', 'Lancy', 'Onex', 'Meyrin', 'Vernier', 'Le Grand-Saconnex', 'Chêne-Bougeries', 'Versoix'],
    sections: [
      {
        h2: 'Un des taux de vacance les plus bas du pays',
        paragraphs: [
          'Selon l’Office fédéral de la statistique, le canton de Genève comptait 0,31 % de logements vacants au 1er juin 2026, le deuxième taux le plus bas de Suisse. Autrement dit, très peu de logements sont libres à un instant donné, et chaque annonce attire un grand nombre de candidatures.',
        ],
      },
      {
        h2: 'Les particularités du marché genevois',
        paragraphs: [
          'Une partie du parc genevois est composée de logements subventionnés (HBM, HLM, HM), attribués selon des conditions de revenu et de taux d’occupation fixées par le canton : il faut vérifier votre éligibilité avant de postuler. Sur le marché libre, les régies traitent de gros volumes de dossiers et privilégient ceux qui sont complets dès le premier envoi.',
          'Les communes proches de la ville, comme Carouge, Lancy ou Onex, et celles de la rive droite, comme Meyrin, Vernier ou Versoix, élargissent les possibilités, surtout si vous êtes souple sur le quartier.',
        ],
        bullets: [
          'Genève-ville : Eaux-Vives, Plainpalais, Pâquis, Servette, Champel… forte demande, petites surfaces très disputées.',
          'Carouge, Lancy et Onex : proches du centre, bien desservies par le tram.',
          'Meyrin, Vernier et Le Grand-Saconnex : proches de l’aéroport et des organisations internationales.',
          'Versoix et Chêne-Bougeries : cadre plus résidentiel, prisé des familles.',
        ],
      },
      {
        h2: 'Préparer un dossier qui passe le premier tri',
        paragraphs: [
          'Nous rassemblons avec vous les pièces que les régies demandent : pièce d’identité ou permis, extrait du registre des poursuites récent, justificatifs de revenus, et éventuellement une attestation de l’employeur ou un garant. Un dossier propre, lisible et envoyé rapidement fait souvent la différence entre une visite et un refus.',
          'Vous travaillez à Genève mais hésitez sur la commune ? Nous comparons aussi avec La Côte vaudoise (Nyon, Coppet), reliée à Genève par le train.',
        ],
      },
    ],
    faq: [
      { q: 'Pourquoi est-il si difficile de louer à Genève ?', a: 'Le canton a l’un des plus faibles taux de logements vacants de Suisse (0,31 % au 1er juin 2026 selon l’OFS). Peu de biens se libèrent et chacun reçoit de nombreuses candidatures.' },
      { q: 'Ai-je droit à un logement subventionné à Genève ?', a: 'Les logements HBM, HLM et HM sont soumis à des conditions de revenu et d’occupation fixées par le canton. Nous vous orientons vers les critères officiels avant de postuler.' },
      { q: 'Couvrez-vous aussi les communes autour de Genève ?', a: 'Oui : Carouge, Lancy, Onex, Meyrin, Vernier, Le Grand-Saconnex, Chêne-Bougeries, Versoix et les communes voisines.' },
    ],
    sources: [SRC_OFS_2026],
  },
  {
    slug: 'fribourg-neuchatel-valais-jura',
    path: `${HUB_PATH}/fribourg-neuchatel-valais-jura`,
    name: 'Fribourg, Neuchâtel, Valais et Jura',
    title: 'Appartement Fribourg, Neuchâtel, Valais, Jura | Logisorama',
    description:
      'Appartement à louer à Fribourg, Bulle, Neuchâtel, La Chaux-de-Fonds, Sion, Martigny, Monthey ou Delémont : un agent dédié pour toute la Suisse romande.',
    h1: 'Recherche d’appartement à Fribourg, Neuchâtel, en Valais et dans le Jura',
    lede:
      'Au-delà de l’Arc lémanique, les autres cantons romands offrent des marchés très différents les uns des autres. Nous adaptons la stratégie de recherche à chaque région, de Fribourg à Porrentruy.',
    communes: ['Fribourg', 'Bulle', 'Romont', 'Neuchâtel', 'La Chaux-de-Fonds', 'Sion', 'Sierre', 'Martigny', 'Monthey', 'Delémont', 'Porrentruy'],
    areaServed: ['Fribourg', 'Neuchâtel', 'Valais', 'Jura'],
    sections: [
      {
        h2: 'Des marchés contrastés',
        paragraphs: [
          'Tous les cantons romands ne sont pas aussi tendus que Genève ou Lausanne. Selon l’Office fédéral de la statistique, le Jura avait au 1er juin 2026 le taux de logements vacants le plus élevé de Suisse, 3,35 %. Dans ces régions, l’enjeu n’est pas seulement de décrocher un bien, mais de choisir le bon : état du logement, charges, trajets et qualité du quartier.',
        ],
      },
      {
        h2: 'Région par région',
        paragraphs: [
          'Fribourg et Bulle séduisent les pendulaires qui travaillent à Berne ou à Lausanne et cherchent des loyers plus doux ; la ville de Fribourg est bilingue, un atout pour de nombreux employeurs. Neuchâtel et La Chaux-de-Fonds proposent un parc varié, souvent plus spacieux pour le budget. En Valais, Sion, Sierre, Martigny et Monthey combinent emploi local, proximité des montagnes et accès au Chablais vaudois. Dans le Jura, Delémont et Porrentruy offrent davantage de choix, avec des logements plus grands.',
        ],
        bullets: [
          'Fribourg, Bulle, Romont : pendulaires vers Berne et Lausanne, familles.',
          'Neuchâtel, La Chaux-de-Fonds : horlogerie, formation, grands appartements.',
          'Sion, Sierre, Martigny, Monthey : emploi valaisan, cadre alpin.',
          'Delémont, Porrentruy : marché plus détendu, surfaces généreuses.',
        ],
      },
      {
        h2: 'Une recherche organisée, même à distance',
        paragraphs: [
          'Quand vous déménagez d’une région à l’autre, il est rarement possible de visiter chaque semaine. Nous ciblons les biens qui correspondent vraiment, organisons les visites ou visitons pour vous, puis préparons et suivons votre candidature auprès de la gérance.',
        ],
      },
    ],
    faq: [
      { q: 'Est-il plus facile de louer dans le Jura ou à Neuchâtel qu’à Lausanne ?', a: 'En général, oui : ces marchés sont moins tendus. Le Jura avait même le taux de logements vacants le plus élevé de Suisse au 1er juin 2026 (3,35 % selon l’OFS). Le défi devient alors de choisir le meilleur bien.' },
      { q: 'Intervenez-vous en Valais et à Fribourg ?', a: 'Oui, nous couvrons les cantons de Fribourg, Neuchâtel, Valais et Jura en plus de Vaud et Genève.' },
      { q: 'Comment se passent les visites loin de chez moi ?', a: 'Nous pouvons visiter pour vous et vous envoyer photos, vidéo et compte rendu, pour décider sans vous déplacer.' },
    ],
    sources: [SRC_OFS_2026],
  },
];

export const findZone = (slug?: string) => ZONES.find((z) => z.slug === slug) ?? null;

export const HUB = {
  path: HUB_PATH,
  name: 'Recherche d’appartement en Suisse romande',
  title: 'Recherche d’appartement en Suisse romande | Logisorama',
  description:
    'Un agent immobilier personnel cherche, visite et postule pour vous à Lausanne, Genève et dans toute la Suisse romande. Découvrez nos zones de recherche.',
  h1: 'Recherche d’appartement à Lausanne, Genève et en Suisse romande',
  lede:
    'Logisorama by Immo-rama.ch accompagne les locataires solvables, les familles, les jeunes actifs, les étudiants et les entreprises dans leur recherche de logement sur l’ensemble de la Suisse romande.',
  sections: [
    {
      h2: 'Un agent immobilier personnel pour trouver votre logement',
      paragraphs: [
        'Trouver un appartement à louer à Lausanne, à Genève ou dans une commune comme Crissier, Renens, Prilly, Pully, Morges ou Nyon demande du temps, de la méthode et un vrai réseau. Votre agent immobilier personnel analyse votre dossier, définit vos critères et active chaque jour les régies, propriétaires et plateformes pour vous proposer uniquement les biens pertinents.',
      ],
    },
    {
      h2: 'Appartement à louer, maison à louer ou bien à acheter',
      paragraphs: [
        'Que vous cherchiez un appartement à Lausanne, une maison sur La Côte, un logement étudiant proche de l’UNIL ou de l’EPFL, ou un bien à acheter sur la Riviera, notre approche reste la même : un cahier des charges clair, une sélection rigoureuse, un suivi régulier. Pour l’achat, nous accompagnons aussi la recherche de biens off-market que les portails ne diffusent pas.',
      ],
    },
    {
      h2: 'Relocation pour étudiants, expatriés et entreprises',
      paragraphs: [
        'Les étudiants bénéficient d’un service adapté au calendrier académique, les expatriés et cadres en mobilité d’un accompagnement souvent à distance, et les entreprises peuvent nous mandater pour reloger un collaborateur avec un reporting clair.',
      ],
    },
    {
      h2: 'Pourquoi choisir Logisorama by Immo-rama.ch',
      paragraphs: [
        'Logisorama n’est pas un site d’annonces : c’est un accompagnement humain et professionnel. La décision finale appartient toujours à la régie ou au propriétaire, mais nous maximisons vos chances grâce à un dossier soigné, une stratégie de candidature claire et une réactivité quotidienne. Au terme du mandat de 90 jours sans bail signé, l’acompte de 300 CHF vous est remboursé sous 30 jours ; en cas de résiliation anticipée de votre part, il reste acquis.',
      ],
    },
  ] as SeoSection[],
};

export const AGENCE = {
  path: AGENCE_PATH,
  name: 'Agence immobilière à Crissier',
  title: 'Agence immobilière à Crissier, près de Lausanne | Logisorama',
  description:
    'Logisorama by Immo-rama.ch, Chemin de l’Esparcette 5 à Crissier : recherche d’appartement, relocation et achat dans l’Ouest lausannois et en Suisse romande.',
  h1: 'Notre agence immobilière à Crissier',
  lede:
    'Notre bureau se trouve au Chemin de l’Esparcette 5, à 1023 Crissier, à quelques minutes du centre de Lausanne, de Renens, de Prilly et d’Ecublens. C’est d’ici que nos agents organisent les recherches, les visites et le suivi des dossiers.',
  address: { street: 'Chemin de l’Esparcette 5', postalCode: '1023', locality: 'Crissier', region: 'VD', country: 'CH' },
  phoneDisplay: '021 634 31 61',
  phoneE164: '+41216343161',
  email: 'info@immo-rama.ch',
  geo: { latitude: 46.5436, longitude: 6.5773 },
  sections: [
    {
      h2: 'Une connaissance fine de l’Ouest lausannois',
      paragraphs: [
        'Cette implantation nous permet de bien connaître le tissu local : les régies de l’Ouest lausannois, les spécificités de chaque commune, les quartiers les plus demandés et les attentes réelles des bailleurs. Cette connaissance fait la différence quand il s’agit de présenter un dossier qui inspire confiance et de postuler au bon moment.',
      ],
    },
    {
      h2: 'Ce que nous faisons depuis Crissier',
      paragraphs: ['Immo-rama.ch, fondée en 2016 par Christ Ramazani, regroupe plusieurs services immobiliers.'],
      bullets: [
        'Recherche d’appartement et relocation à Lausanne, Genève et en Suisse romande.',
        'Accompagnement à l’achat immobilier, du financement à l’acte authentique.',
        'Reprise de bail : recherche d’un repreneur solvable pour les locataires sortants.',
        'Rendez-vous d’analyse gratuit au bureau, sur réservation.',
      ],
    },
  ] as SeoSection[],
};
