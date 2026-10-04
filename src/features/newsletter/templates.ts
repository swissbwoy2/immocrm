import drueyVisit from "./templates/druey-visite.html?raw";
import premium from "./reference.html?raw";
import candidature from "./templates/candidature.html?raw";
import cancellation from "./templates/visite-annulee.html?raw";

export const NEWSLETTER_TEMPLATES = [
  {
    id: "druey-visite",
    name: "Invitation à visiter — Druey 18",
    audience: "Leads Meta · campagne Druey 18",
    subject: "Votre visite — Appartement 2.5 pièces, avenue Druey 18",
    preheader:
      "Photos, conditions de location et réservation de visite à Lausanne.",
    description:
      "Premier email spécifique à Druey 18, avant la séquence de recherche habituelle.",
    image: "/newsletter/candidature-parcours.jpg",
    html: drueyVisit,
  },
  {
    id: "premium",
    name: "Compte premium",
    audience: "Chercheurs à louer",
    subject: "Bonjour, vous avez trouvé un appart ?",
    preheader:
      "Passez au compte premium et mettez votre dossier en haut de la pile !",
    description:
      "Votre dossier en haut de la pile. Le modèle de référence Logisorama.",
    image: "/newsletter/visuel-premium.jpg",
    html: premium,
  },
  {
    id: "candidature",
    name: "Candidature appartement à louer",
    audience: "Chercheurs à louer",
    subject: "RE : Candidature appartement à louer",
    preheader:
      "Recherche, visite, postulation : laissez-nous prendre le relais.",
    description:
      "Relancer la recherche après une visite, avec un accompagnement de A à Z.",
    image: "/newsletter/candidature-hero.jpg",
    html: candidature,
  },
  {
    id: "visite-annulee",
    name: "Visite annulée — Druey 18",
    audience: "Personnes inscrites à la visite",
    subject: "Visite annulée — Appt. Druey 18 — Visite annulée",
    preheader:
      "La visite du 4 octobre à 14 h est annulée. Consultez les nouvelles dates dans votre espace.",
    description:
      "Modèle daté du 4 octobre 2026 à 14 h. Adapter l’adresse et la date avant réutilisation.",
    image: "/newsletter/visite-annulee-hero.jpg",
    html: cancellation,
  },
] as const;
