import {
  Sparkles,
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarCheck,
  Mail,
  HeartHandshake,
  FileCheck,
  Search,
  PhoneCall,
  Send,
  KeyRound,
  Award,
} from 'lucide-react';
import flatfoxLogo from '@/assets/partners/flatfox.svg';
import immobilierLogo from '@/assets/partners/immobilier-ch.svg';
import type { Chapter } from '../types';

// PARTIE A — APPLICATION LOGISORAMA

const ch01: Chapter = {
  id: '01-bienvenue',
  partie: 'application',
  numero: 1,
  titre: 'Bienvenue dans Logisorama',
  description: "Découvrez la philosophie Immo-Rama et l'esprit de votre nouvel outil de travail.",
  icon: Sparkles,
  duree: '5 min',
  isNew: true,
  blocks: [
    { type: 'heading', content: 'Bienvenue chez Logisorama by Immo-Rama.ch' },
    {
      type: 'text',
      content:
        "Logisorama est l'outil métier conçu pour vous, agent de relocation. Il centralise toute votre activité quotidienne : clients, mandats, dossiers, visites, candidatures, communications et commissions.",
    },
    {
      type: 'tip',
      variant: 'info',
      content:
        "Notre philosophie : simplicité, facilité, efficacité. Chaque écran a été pensé pour vous faire gagner du temps et offrir un service irréprochable au client.",
    },
    { type: 'heading', content: 'Ce que vous allez apprendre', level: 3 },
    {
      type: 'list',
      items: [
        "Maîtriser l'interface agent et tous les outils à votre disposition",
        "Trier et suivre vos dossiers clients efficacement",
        "Envoyer des offres et déposer des candidatures en respectant les contraintes",
        "Adopter les bonnes pratiques de communication",
        "Comprendre le métier de la relocation en Suisse romande",
      ],
    },
    {
      type: 'video',
      title: 'Bienvenue sur Logisorama',
      src: 'https://ydljsdscdnqrqnjvqela.supabase.co/storage/v1/object/public/formation-videos/01-bienvenue.mp4',
    },
    {
      type: 'cta',
      label: 'Aller au Tableau de bord',
      description: 'Voir vos KPIs et accéder rapidement à vos clients',
      path: '/agent',
    },
  ],
};

const ch02: Chapter = {
  id: '02-interface',
  partie: 'application',
  numero: 2,
  titre: 'Tour de l\'interface agent',
  description: "Sidebar, dashboard, notifications, messagerie : maîtrisez tous les écrans.",
  icon: LayoutDashboard,
  duree: '15 min',
  blocks: [
    { type: 'heading', content: "Les zones clés de l'application" },
    {
      type: 'text',
      content:
        "L'interface agent est organisée autour d'une sidebar à gauche (navigation) et d'une zone de contenu principale. Sur mobile, la sidebar se déploie via le bouton menu en haut à gauche.",
    },
    { type: 'heading', content: 'Sections principales de la sidebar', level: 3 },
    {
      type: 'feature-tour',
      items: [
        { icon: 'LayoutDashboard', title: 'Tableau de bord', description: 'Vue synthétique : clients actifs, visites, offres, commissions du mois.', path: '/agent' },
        { icon: 'Users', title: 'Mes clients', description: 'Liste et gestion de tous vos clients en mandat.', path: '/agent/mes-clients' },
        { icon: 'CalendarCheck', title: 'Visites', description: 'Toutes vos visites planifiées, à confirmer ou à debriefer.', path: '/agent/visites' },
        { icon: 'Calendar', title: 'Calendrier', description: 'Vue calendrier synchronisable avec Google Calendar.', path: '/agent/calendrier' },
        { icon: 'FileCheck', title: 'Candidatures', description: 'Suivi des candidatures déposées et leurs statuts.', path: '/agent/candidatures' },
        { icon: 'Send', title: 'Envoyer une offre', description: 'Créer une nouvelle offre pour un client.', path: '/agent/envoyer-offre' },
        { icon: 'MessageSquare', title: 'Messagerie', description: 'Chat interne avec admin et clients.', path: '/agent/messagerie' },
        { icon: 'Inbox', title: 'Boîte de réception', description: 'Emails entrants synchronisés via IMAP.', path: '/agent/boite-reception' },
        { icon: 'DollarSign', title: 'Transactions', description: 'Vos commissions, payées ou en attente.', path: '/agent/transactions' },
        { icon: 'Bell', title: 'Notifications', description: 'Toutes vos alertes en un seul endroit.', path: '/agent/notifications' },
      ],
    },
    {
      type: 'tip',
      variant: 'tip',
      content:
        "Astuce : la cloche en haut affiche un badge rouge dès qu'une nouvelle notification arrive. Cliquez pour voir les détails et accéder directement à l'élément concerné.",
    },
    { type: 'heading', content: 'Messagerie flottante', level: 3 },
    {
      type: 'text',
      content:
        "En bas à droite de chaque page, vous trouverez l'icône de messagerie flottante. Cliquez pour discuter en temps réel avec l'admin sans quitter votre page actuelle.",
    },
    { type: 'heading', content: 'Installer Logisorama sur votre téléphone (PWA)', level: 3 },
    {
      type: 'list',
      items: [
        "iOS Safari : appuyez sur Partager → 'Sur l'écran d'accueil'",
        "Android Chrome : menu ⋮ → 'Installer l'application'",
        "L'app fonctionne ensuite comme une vraie application native",
      ],
    },
    {
      type: 'tip',
      variant: 'success',
      content:
        "Votre statut 'en ligne' (badge vert) est mis à jour automatiquement toutes les 60 secondes pour que l'admin sache quand vous êtes disponible.",
    },
    {
      type: 'checklist',
      id: 'tour-interface',
      title: "Mini-checklist : faites le tour vous-même",
      items: [
        { id: 'a', label: "J'ai ouvert mon Tableau de bord et identifié mes KPIs" },
        { id: 'b', label: "J'ai consulté la liste Mes clients" },
        { id: 'c', label: "J'ai cliqué sur la cloche de notifications" },
        { id: 'd', label: "J'ai testé la messagerie flottante" },
        { id: 'e', label: "J'ai installé Logisorama sur mon téléphone" },
      ],
    },
  ],
};

const ch03: Chapter = {
  id: '03-mes-clients',
  partie: 'application',
  numero: 3,
  titre: 'Mes clients & fiche détaillée',
  description: "Statuts, onglets, co-assignation et gel des mandats.",
  icon: Users,
  duree: '15 min',
  blocks: [
    { type: 'heading', content: 'La page Mes clients' },
    {
      type: 'text',
      content:
        "Cette page liste tous les clients qui vous sont assignés. Vous pouvez filtrer par statut, rechercher par nom et accéder rapidement à la fiche détaillée de chacun.",
    },
    { type: 'heading', content: 'Statuts client', level: 3 },
    {
      type: 'table',
      headers: ['Statut', 'Signification', 'Mandat'],
      rows: [
        ['Actif', 'Recherche en cours, prêt à candidater', 'Compteur actif'],
        ['Reloge', 'Logement trouvé, dossier en finalisation', 'Mandat gelé'],
        ['Suspendu', 'Pause temporaire (ex: client absent)', 'Mandat gelé'],
        ['Stoppé', 'Recherche arrêtée définitivement', 'Mandat gelé'],
      ],
    },
    {
      type: 'tip',
      variant: 'warning',
      content:
        "Important : dès qu'un client passe en 'reloge', 'suspendu' ou 'stoppé', le compteur de durée du mandat se gèle automatiquement. Vous ne perdez pas de jours.",
    },
    { type: 'heading', content: 'Onglets de la fiche client', level: 3 },
    {
      type: 'feature-tour',
      items: [
        { icon: 'User', title: 'Informations', description: 'Coordonnées, situation, critères de recherche.' },
        { icon: 'FileText', title: 'Documents', description: 'Pièces du dossier, vérification mensuelle (cycle 25 → 5).' },
        { icon: 'FileCheck', title: 'Candidatures', description: 'Liste de toutes les candidatures déposées pour ce client.' },
        { icon: 'CalendarCheck', title: 'Visites', description: 'Visites passées et à venir.' },
        { icon: 'StickyNote', title: 'Notes', description: 'Vos notes privées sur le client.' },
        { icon: 'History', title: 'Historique', description: 'Journal complet des actions menées.' },
      ],
    },
    { type: 'heading', content: 'Co-assignation : travailler à plusieurs sur un client', level: 3 },
    {
      type: 'text',
      content:
        "Un client peut être suivi par plusieurs agents en même temps (par exemple si vous partez en congé). L'admin peut ajouter une co-assignation : tous les agents listés voient la même fiche, peuvent agir et déposer des candidatures.",
    },
    {
      type: 'tip',
      variant: 'info',
      content:
        "Toute action que vous voyez dans 'Historique' est tracée avec le nom de l'agent qui l'a effectuée — la traçabilité est totale.",
    },
    {
      type: 'cta',
      label: 'Ouvrir Mes clients',
      path: '/agent/mes-clients',
    },
  ],
};

const ch04: Chapter = {
  id: '04-tri-suivi',
  partie: 'application',
  numero: 4,
  titre: 'Tri & suivi des dossiers',
  description: 'Routine quotidienne, filtres, documents manquants et déduplication.',
  icon: ClipboardList,
  duree: '15 min',
  blocks: [
    { type: 'heading', content: "Votre routine matinale dans Logisorama" },
    {
      type: 'text',
      content:
        "Chaque matin, prenez 15 minutes pour faire le tour de vos dossiers. Cette routine est la clé pour ne rien laisser tomber et garder le contrôle.",
    },
    {
      type: 'checklist',
      id: 'routine-matinale',
      title: 'Routine matinale (15 min)',
      items: [
        { id: 'a', label: "Consulter les notifications de la nuit" },
        { id: 'b', label: "Vérifier la boîte de réception (emails clients/régies)" },
        { id: 'c', label: "Filtrer Mes clients par statut 'actif' et passer chaque dossier en revue" },
        { id: 'd', label: "Identifier les documents manquants à relancer" },
        { id: 'e', label: "Vérifier les visites du jour et confirmer celles en attente" },
        { id: 'f', label: "Mettre à jour les statuts de candidatures (refus, acceptations)" },
      ],
    },
    { type: 'heading', content: 'Filtres puissants', level: 3 },
    {
      type: 'list',
      items: [
        "Statut du client (actif, reloge, suspendu, stoppé)",
        "NPA / canton / ville recherchée",
        "Type de bien (appartement, maison, commercial)",
        "Nombre de pièces (incréments de 0.5 : 1, 1.5, 2, 2.5…)",
        "Budget max",
      ],
    },
    {
      type: 'tip',
      variant: 'warning',
      content:
        "Documents manquants : un dossier incomplet ne peut pas être envoyé en candidature. Relancez systématiquement le client jusqu'à obtenir toutes les pièces.",
    },
    { type: 'heading', content: 'Vérification mensuelle des documents', level: 3 },
    {
      type: 'text',
      content:
        "Du 25 du mois au 5 du mois suivant, vous devez revérifier que chaque client actif a bien ses documents à jour (notamment fiche de salaire récente et OP < 3 mois). Logisorama vous affiche les dossiers à vérifier.",
    },
    {
      type: 'tip',
      variant: 'info',
      content:
        "Déduplication automatique : si vous tentez d'uploader un document portant le même nom et le même type qu'un existant, Logisorama l'empêche et vous le signale.",
    },
  ],
};

const ch05: Chapter = {
  id: '05-calendrier-visites',
  partie: 'application',
  numero: 5,
  titre: 'Calendrier & cycle de vie des visites',
  description: "Proposée → confirmée → effectuée. Délégation coursier et invitations ICS.",
  icon: CalendarCheck,
  duree: '15 min',
  blocks: [
    { type: 'heading', content: 'Le cycle de vie d\'une visite' },
    {
      type: 'table',
      headers: ['Statut', 'Qui agit', 'Action attendue'],
      rows: [
        ['Proposée', 'Vous ou l\'admin', 'Le client doit confirmer'],
        ['Confirmée', 'Le client a confirmé', 'Préparer la visite, recevoir l\'invitation ICS'],
        ['Effectuée', 'Vous (après visite)', 'Saisir le debrief'],
        ['Annulée', 'Client ou régie', 'Replanifier ou archiver'],
      ],
    },
    {
      type: 'tip',
      variant: 'info',
      content:
        "Toutes les heures sont gérées en timezone Europe/Zurich (UTC+1) — pas de mauvaise surprise, même pour vos clients expatriés.",
    },
    { type: 'heading', content: 'Déléguer une visite à un coursier', level: 3 },
    {
      type: 'text',
      content:
        "Si vous ne pouvez pas honorer une visite (autre rendez-vous, urgence), passez-la en statut 'proposée' et déléguez-la à un coursier. Il l'effectuera à votre place.",
    },
    {
      type: 'tip',
      variant: 'warning',
      content:
        "Coût coursier : 5.- CHF par visite, payés par vous (l'agent). Faites-en bon usage : c'est un dépannage, pas un automatisme.",
    },
    { type: 'heading', content: 'Invitations ICS automatiques', level: 3 },
    {
      type: 'list',
      items: [
        "Dès qu'une visite est confirmée, une invitation ICS est envoyée au client",
        "Elle s'ajoute à son agenda (Google, Apple, Outlook)",
        "Si vous modifiez la visite, l'invitation est mise à jour avec le même UID",
        "Si vous l'annulez, le client reçoit une notification d'annulation",
      ],
    },
    {
      type: 'tip',
      variant: 'success',
      content:
        "Prévention des doublons : Logisorama vous empêche de créer deux visites identiques (même client, même bien, même créneau).",
    },
    {
      type: 'cta',
      label: 'Ouvrir mes visites',
      path: '/agent/visites',
    },
  ],
};

const ch06: Chapter = {
  id: '06-messagerie-emails',
  partie: 'application',
  numero: 6,
  titre: 'Messagerie, boîte de réception & emails',
  description: "Chat interne, emails entrants/sortants et bonnes pratiques.",
  icon: Mail,
  duree: '10 min',
  blocks: [
    { type: 'heading', content: 'Trois canaux complémentaires' },
    {
      type: 'feature-tour',
      items: [
        { icon: 'MessageSquare', title: 'Messagerie interne', description: 'Chat instantané avec l\'admin et avec vos clients connectés à Logisorama.', path: '/agent/messagerie' },
        { icon: 'Inbox', title: 'Boîte de réception', description: 'Emails reçus depuis vos comptes IMAP synchronisés (régies, clients).', path: '/agent/boite-reception' },
        { icon: 'MailPlus', title: 'Envoyer un email', description: 'Composer et envoyer un email depuis Logisorama, avec templates.', path: '/agent/envoyer-email' },
      ],
    },
    {
      type: 'tip',
      variant: 'info',
      content:
        "Les emails partent depuis le domaine notify.logisorama.ch — vos messages sont signés, suivis et archivés automatiquement.",
    },
    { type: 'heading', content: 'Bonnes pratiques de communication', level: 3 },
    {
      type: 'list',
      items: [
        "Répondre dans les 4h ouvrées en semaine, idéalement même le soir",
        "Toujours signer avec votre prénom + 'Logisorama by Immo-rama.ch'",
        "Éviter les abréviations dans les emails pros (régies, propriétaires)",
        "Reformuler les demandes du client par écrit pour confirmation",
        "Ne jamais critiquer une régie ou un client par écrit",
      ],
    },
    {
      type: 'tip',
      variant: 'warning',
      content:
        "Confidentialité : les documents et informations clients sont strictement confidentiels. Ne les transférez jamais hors Logisorama (WhatsApp personnel, email perso, etc.).",
    },
  ],
};

// PARTIE B — MÉTIER

const ch07: Chapter = {
  id: '07-accueil-qualification',
  partie: 'metier',
  numero: 7,
  titre: 'Accueil & qualification du client',
  description: "Premier contact, écoute active, présentation du service.",
  icon: HeartHandshake,
  duree: '20 min',
  blocks: [
    { type: 'heading', content: 'La phase la plus importante du mandat' },
    {
      type: 'text',
      content:
        "Une qualification ratée = des semaines de recherche pour rien. Prenez le temps de poser les bonnes questions et de reformuler.",
    },
    { type: 'heading', content: 'Critères à recueillir', level: 3 },
    {
      type: 'list',
      items: [
        "Situation : nouvel emploi, déménagement, expatriation, composition familiale, animaux",
        "Type de bien : appartement / maison, nombre de pièces, surface min, équipements (balcon, parking, ascenseur, cave)",
        "Zone géographique : ville/quartier privilégiés, distance max travail/écoles",
        "Budget loyer brut (charges comprises) — règle du 1/3 : loyer ≤ 1/3 du revenu mensuel ménage",
        "Date d'emménagement souhaitée + impératifs (préavis, prise de poste)",
        "Préférences/contraintes : transports, calme, étage, PMR, animaux",
      ],
    },
    {
      type: 'tip',
      variant: 'warning',
      content:
        "Règle du 1/3 du revenu : c'est la limite généralement appliquée par les bailleurs suisses. Si le client veut un loyer trop élevé, expliquez-lui qu'il faudra un garant ou ajuster.",
    },
    {
      type: 'script',
      title: 'Reformulation de qualification',
      variant: 'call',
      content: `« Si je résume bien, vous cherchez un 3 pièces à Lausanne ou environs, idéalement avec parking, pour un loyer maximum de CHF 2'000.- charges comprises, et vous en aurez besoin pour le 1er septembre, c'est bien cela ? »`,
    },
    { type: 'heading', content: 'Présenter le service Immo-Rama', level: 3 },
    {
      type: 'list',
      items: [
        "Accompagnement complet : recherche, visites, dossier, suivi jusqu'aux clés",
        "Mandat 3 mois renouvelable",
        "Principe satisfait ou remboursé : pas de location = acompte remboursé intégralement",
        "Acompte CHF 300.- pour démarrer (déductible de la commission finale)",
        "Commission = 1 mois de loyer brut, due seulement en cas de succès",
      ],
    },
  ],
};

const ch08: Chapter = {
  id: '08-mandat-dossier',
  partie: 'metier',
  numero: 8,
  titre: 'Mandat & dossier de candidature',
  description: "Signature Mandat V3, pièces obligatoires et vérification.",
  icon: FileCheck,
  duree: '20 min',
  blocks: [
    { type: 'heading', content: 'Signature du mandat (Mandat V3)' },
    {
      type: 'text',
      content:
        "Le mandat de recherche se signe directement dans Logisorama via le module Mandat V3. Il est légalement contraignant et ouvre votre droit à la commission.",
    },
    { type: 'heading', content: 'Dossier de candidature complet', level: 3 },
    {
      type: 'checklist',
      id: 'dossier-complet',
      title: 'Pièces obligatoires (à valider pour chaque client)',
      items: [
        { id: 'a', label: 'Pièce d\'identité (recto/verso) ou passeport + permis B/C' },
        { id: 'b', label: '3 dernières fiches de salaire' },
        { id: 'c', label: 'Attestation Office des Poursuites < 3 mois' },
        { id: 'd', label: 'Attestation employeur (contrat ou lettre)' },
        { id: 'e', label: 'Copie du bail actuel (si applicable)' },
        { id: 'f', label: 'Lettre de motivation personnalisée par bien' },
        { id: 'g', label: 'Attestation RC ménage (selon régie)' },
      ],
    },
    {
      type: 'tip',
      variant: 'warning',
      content:
        "Cohérence : vérifiez que le salaire annoncé correspond aux fiches, et que l'adresse de l'OP correspond à la situation actuelle. Une incohérence = un dossier refusé.",
    },
    { type: 'heading', content: 'Documents en langue étrangère', level: 3 },
    {
      type: 'text',
      content:
        "Si un document est dans une autre langue que le français, faites-le traduire ou ajoutez une note d'explication dans le dossier. La régie doit pouvoir tout comprendre.",
    },
  ],
};

const ch09: Chapter = {
  id: '09-recherche-active',
  partie: 'metier',
  numero: 9,
  titre: 'Recherche active de logements',
  description: "Sites d'annonces (incluant Flatfox), alertes, off-market et réactivité.",
  icon: Search,
  duree: '25 min',
  isNew: true,
  blocks: [
    { type: 'heading', content: 'Le marché locatif romand' },
    {
      type: 'text',
      content:
        "Le marché est tendu : il faut être proactif, organisé et créatif. Les bons biens partent en 24-48h.",
    },
    { type: 'heading', content: 'Sites d\'annonces à consulter chaque jour', level: 3 },
    {
      type: 'sites-grid',
      items: [
        {
          name: 'Flatfox.ch',
          url: 'https://flatfox.ch',
          type: 'portail',
          logo: flatfoxLogo,
          description: 'Portail moderne, interface fluide, candidature en ligne directe. Beaucoup d\'annonces de régies romandes.',
          highlight: true,
        },
        {
          name: 'Homegate.ch',
          url: 'https://homegate.ch',
          type: 'portail',
          description: 'Le plus grand portail suisse. Indispensable. Configurez des alertes par critères.',
        },
        {
          name: 'ImmoScout24.ch',
          url: 'https://immoscout24.ch',
          type: 'portail',
          description: 'Très répandu, complémentaire d\'Homegate. Beaucoup d\'annonces différentes.',
        },
        {
          name: 'Immobilier.ch',
          url: 'https://immobilier.ch',
          type: 'agregateur',
          logo: immobilierLogo,
          description: 'Agrégateur romand qui regroupe les offres de nombreuses régies de Suisse romande.',
        },
        {
          name: 'Newhome.ch',
          url: 'https://newhome.ch',
          type: 'portail',
          description: 'Portail historique, encore très utilisé par les régies.',
        },
        {
          name: 'Comparis.ch',
          url: 'https://comparis.ch/immobilier',
          type: 'agregateur',
          description: 'Comparateur qui recense les annonces de plusieurs portails en un seul endroit.',
        },
        {
          name: 'Anibis.ch',
          url: 'https://anibis.ch',
          type: 'petites-annonces',
          description: 'Petites annonces, parfois des particuliers. Attention aux arnaques.',
        },
        {
          name: 'Groupes Facebook locaux',
          url: 'https://facebook.com',
          type: 'reseau',
          description: 'Recherchez "Logement [Ville]" sur Facebook. Opportunités off-market.',
        },
      ],
    },
    {
      type: 'tip',
      variant: 'tip',
      content:
        "Configurez des alertes automatiques sur chaque portail avec les critères du client. Consultez-les dès le matin et en début d'après-midi.",
    },
    { type: 'heading', content: 'Off-market : le réseau Immo-Rama', level: 3 },
    {
      type: 'list',
      items: [
        "Régies partenaires : appelez-les pour demander si un bien correspond, parfois avant publication",
        "Réseau interne Logisorama : un collègue peut avoir un client qui libère un appartement",
        "Anciens clients/propriétaires : entretenez votre carnet, le bouche-à-oreille fonctionne",
        "Promotions neuves : surveillez les chantiers en cours dans la zone",
      ],
    },
    {
      type: 'table',
      caption: 'Exemple de tableau de suivi à tenir pour chaque client',
      headers: ['Date', 'Bien', 'Source', 'Action', 'Statut'],
      rows: [
        ['02.06', 'Appt 3.5p Lausanne CHF 1\'950.-', 'Homegate', 'Email régie X', 'Visite 05.06 15h'],
        ['03.06', 'Appt 4p Pully CHF 2\'100.-', 'Régie Y directe', 'Appel tél.', 'Attente créneau'],
        ['06.06', 'Appt 2.5p Lausanne CHF 1\'400.-', 'Régie Z (off-market)', 'Visite 07.06', 'Dossier si OK'],
      ],
    },
  ],
};

const ch10: Chapter = {
  id: '10-communication-regies',
  partie: 'metier',
  numero: 10,
  titre: 'Communication régies & propriétaires',
  description: "Scripts d'appel, modèles d'emails, registre des échanges.",
  icon: PhoneCall,
  duree: '15 min',
  blocks: [
    { type: 'heading', content: "Vendre la candidature dès le premier contact" },
    {
      type: 'text',
      content:
        "Vous représentez votre client. Préparez ses atouts (revenus stables, non-fumeur, sans animaux, date flexible) et mettez-les en avant dès le premier échange.",
    },
    {
      type: 'script',
      title: 'Script d\'appel — Première prise de contact régie',
      variant: 'call',
      content: `Bonjour, [Votre prénom] de Logisorama by Immo-Rama.ch à l'appareil.
Je vous appelle au sujet de l'annonce [référence] pour le [type de bien] à [ville].

Mon client est très intéressé. Il s'agit de [profil court : profession, revenus stables, non-fumeur, sans animaux], qui cherche à s'installer pour le [date].

Pouvez-vous me confirmer si l'objet est encore disponible et m'organiser une visite ? Je peux vous envoyer son dossier complet immédiatement par email si cela facilite votre décision.

Je vous remercie !`,
    },
    {
      type: 'script',
      title: 'Modèle email — Envoi de dossier de candidature',
      variant: 'email',
      content: `Objet : Candidature — [type de bien] [adresse] — [Nom du client]

Madame, Monsieur,

Suite à notre échange / à l'annonce parue sur [portail], je vous transmets le dossier complet de candidature de mon client [Nom Prénom] pour le [type de bien] situé [adresse complète].

Vous trouverez en pièces jointes :
• Pièce d'identité
• 3 dernières fiches de salaire
• Attestation OP de moins de 3 mois
• Attestation employeur
• Lettre de motivation personnalisée

Profil en bref : [1-2 lignes : revenus, situation, atouts].
Disponibilité d'emménagement : [date].

Je reste à votre disposition pour tout complément et vous remercie de votre retour.

Cordialement,
[Prénom Nom]
Logisorama by Immo-Rama.ch
[téléphone] | [email]`,
    },
    {
      type: 'tip',
      variant: 'info',
      content:
        "Tenez un registre des échanges (date, interlocuteur, objet, suite à donner). Logisorama trace automatiquement vos emails dans l'historique du client.",
    },
  ],
};

const ch11: Chapter = {
  id: '11-visites-offres',
  partie: 'metier',
  numero: 11,
  titre: 'Visites & envoi d\'offres',
  description: "Préparation, debrief, contraintes Logisorama pour l'envoi d'offre.",
  icon: Send,
  duree: '15 min',
  blocks: [
    { type: 'heading', content: 'Bien préparer une visite' },
    {
      type: 'checklist',
      id: 'prep-visite',
      title: 'Avant la visite',
      items: [
        { id: 'a', label: "J'ai la fiche critères du client sous la main" },
        { id: 'b', label: "J'ai une copie du dossier candidat prête (au cas où)" },
        { id: 'c', label: "J'ai noté l'adresse exacte, les horaires et le contact régie" },
        { id: 'd', label: "J'ai prévu 15 min de marge entre deux visites" },
        { id: 'e', label: "J'ai un bloc-note ou la grille de scoring du logement" },
      ],
    },
    { type: 'heading', content: 'Après la visite : debrief client', level: 3 },
    {
      type: 'list',
      items: [
        "Téléphonez au client le jour-même",
        "Énoncez factuellement : surface, état, points forts/faibles, voisinage",
        "Demandez-lui s'il souhaite candidater — sa réponse oriente la suite",
        "Si OUI → préparez l'envoi d'offre dans Logisorama immédiatement",
        "Si NON → notez les raisons précises pour affiner la recherche",
      ],
    },
    { type: 'heading', content: 'Envoi d\'offre dans Logisorama', level: 3 },
    {
      type: 'tip',
      variant: 'warning',
      content:
        "Contraintes strictes : pour envoyer une offre, vous devez (1) être lié au client via client_agents, (2) avoir un slot de visite associé. Sans ces deux conditions, le bouton est bloqué.",
    },
    {
      type: 'cta',
      label: 'Envoyer une offre',
      description: "Démarrer le formulaire d'offre pour un de vos clients",
      path: '/agent/envoyer-offre',
    },
  ],
};

const ch12: Chapter = {
  id: '12-conclusion',
  partie: 'metier',
  numero: 12,
  titre: 'Suivi jusqu\'aux clés & conclusion',
  description: "État des lieux, transaction automatique et commission.",
  icon: KeyRound,
  duree: '15 min',
  blocks: [
    { type: 'heading', content: 'Du dossier accepté aux clés remises' },
    {
      type: 'list',
      ordered: true,
      items: [
        "Régie/propriétaire valide le dossier → confirmez par écrit au client",
        "Lecture commune du bail (surtout pour expatriés peu familiers)",
        "Signature du bail (en agence ou par voie postale)",
        "État des lieux d'entrée (vous pouvez accompagner le client)",
        "Remise des clés → marquez 'Clés remises' dans Logisorama",
      ],
    },
    {
      type: 'tip',
      variant: 'success',
      content:
        "Dès que vous saisissez 'Clés remises', Logisorama crée automatiquement la transaction et déclenche le calcul de la commission. Vous n'avez rien d'autre à faire.",
    },
    { type: 'heading', content: 'Votre commission', level: 3 },
    {
      type: 'list',
      items: [
        "Location : commission = 1 mois de loyer brut, hors TVA et hors charges",
        "Split : 45% pour vous (l'agent) / 55% pour l'agence",
        "Acompte client (300.-) déduit du décompte final",
        "Paiement déclenché à la date de paiement de la commission par la régie",
      ],
    },
    {
      type: 'cta',
      label: 'Voir mes transactions',
      path: '/agent/transactions',
    },
  ],
};

const ch13: Chapter = {
  id: '13-quiz-final',
  partie: 'bonus',
  numero: 13,
  titre: 'Quiz final — Certification',
  description: 'Validez vos acquis et obtenez le badge Agent Logisorama.',
  icon: Award,
  duree: '10 min',
  blocks: [
    { type: 'heading', content: 'Quiz de certification' },
    {
      type: 'text',
      content:
        "10 questions tirées des 12 chapitres. Vous avez besoin de 70% pour décrocher le badge Agent certifié Logisorama.",
    },
    {
      type: 'quiz',
      id: 'quiz-final',
      questions: [
        {
          id: 'q1',
          question: 'Quelle est la règle de prudence sur le loyer en Suisse ?',
          options: [
            { id: 'a', label: 'Loyer ≤ 50 % du revenu mensuel' },
            { id: 'b', label: 'Loyer ≤ 1/3 du revenu mensuel du ménage' },
            { id: 'c', label: 'Loyer ≤ 1/4 du revenu annuel' },
          ],
          correct: 'b',
          explanation: 'La règle généralement appliquée par les bailleurs suisses est : loyer ≤ 1/3 du revenu mensuel du ménage.',
        },
        {
          id: 'q2',
          question: 'Quel est le montant de l\'acompte demandé au client pour démarrer le mandat ?',
          options: [
            { id: 'a', label: '100.- CHF' },
            { id: 'b', label: '300.- CHF' },
            { id: 'c', label: '500.- CHF' },
          ],
          correct: 'b',
          explanation: 'L\'acompte est de 300.- CHF, déductible de la commission finale.',
        },
        {
          id: 'q3',
          question: 'Quelle est la durée standard d\'un mandat de recherche ?',
          options: [
            { id: 'a', label: '1 mois' },
            { id: 'b', label: '3 mois renouvelable' },
            { id: 'c', label: '6 mois' },
          ],
          correct: 'b',
        },
        {
          id: 'q4',
          question: 'Quel est le split de la commission location ?',
          options: [
            { id: 'a', label: '50 % agent / 50 % agence' },
            { id: 'b', label: '45 % agent / 55 % agence' },
            { id: 'c', label: '60 % agent / 40 % agence' },
          ],
          correct: 'b',
          explanation: 'En location : 45% agent / 55% agence, calculé sur le loyer brut hors TVA.',
        },
        {
          id: 'q5',
          question: 'Combien coûte une visite déléguée à un coursier (payée par l\'agent) ?',
          options: [
            { id: 'a', label: '5.- CHF' },
            { id: 'b', label: '10.- CHF' },
            { id: 'c', label: '20.- CHF' },
          ],
          correct: 'a',
        },
        {
          id: 'q6',
          question: 'Que se passe-t-il avec le mandat quand un client passe en statut "reloge" ?',
          options: [
            { id: 'a', label: 'Il continue à compter normalement' },
            { id: 'b', label: 'Il se gèle automatiquement' },
            { id: 'c', label: 'Il est supprimé' },
          ],
          correct: 'b',
          explanation: 'Le mandat se gèle automatiquement en cas de reloge, suspendu ou stoppé.',
        },
        {
          id: 'q7',
          question: 'Quelle est la durée de validité maximale acceptée pour une attestation de l\'Office des Poursuites ?',
          options: [
            { id: 'a', label: '1 mois' },
            { id: 'b', label: '3 mois' },
            { id: 'c', label: '6 mois' },
          ],
          correct: 'b',
        },
        {
          id: 'q8',
          question: 'Parmi ces sites, lequel est un agrégateur (et non un portail principal) ?',
          options: [
            { id: 'a', label: 'Flatfox.ch' },
            { id: 'b', label: 'Homegate.ch' },
            { id: 'c', label: 'Comparis.ch' },
          ],
          correct: 'c',
          explanation: 'Comparis et Immobilier.ch sont des agrégateurs. Flatfox, Homegate et ImmoScout24 sont des portails.',
        },
        {
          id: 'q9',
          question: 'Quelles sont les deux conditions strictes pour envoyer une offre dans Logisorama ?',
          options: [
            { id: 'a', label: 'Avoir le mandat signé et payé' },
            { id: 'b', label: 'Être lié au client (client_agents) ET avoir un slot de visite' },
            { id: 'c', label: 'Avoir l\'accord écrit de l\'admin' },
          ],
          correct: 'b',
        },
        {
          id: 'q10',
          question: 'Quand la transaction est-elle créée automatiquement dans Logisorama ?',
          options: [
            { id: 'a', label: 'À la signature du mandat' },
            { id: 'b', label: 'À la signature du bail' },
            { id: 'c', label: 'À la saisie de "Clés remises"' },
          ],
          correct: 'c',
          explanation: 'La transaction est déclenchée automatiquement par l\'événement "Clés remises".',
        },
      ],
    },
  ],
};

export const CHAPTERS: Chapter[] = [
  ch01, ch02, ch03, ch04, ch05, ch06,
  ch07, ch08, ch09, ch10, ch11, ch12,
  ch13,
];

export function getChapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function getNextChapter(id: string): Chapter | undefined {
  const idx = CHAPTERS.findIndex((c) => c.id === id);
  return idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : undefined;
}

export function getPrevChapter(id: string): Chapter | undefined {
  const idx = CHAPTERS.findIndex((c) => c.id === id);
  return idx > 0 ? CHAPTERS[idx - 1] : undefined;
}
