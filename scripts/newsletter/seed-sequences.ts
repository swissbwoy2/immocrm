import {
  emailButton,
  escapeEmailHtml,
  renderCorporateEmail,
} from "../../supabase/functions/_shared/email-brand.ts";
const groups = [
  {
    key: "renter",
    name: "Votre recherche de location",
    intro:
      "Vous cherchez un appartement en Suisse romande ? Confiez-nous votre recherche, vos visites et vos postulations.",
    cta: "Activer ma recherche",
    url: "https://logisorama.ch/nouveau-mandat",
  },
  {
    key: "buyer",
    name: "Votre projet d’achat",
    intro:
      "Vous cherchez un bien à acheter en Suisse romande ? Précisez vos critères et votre projet pour préparer votre accompagnement.",
    cta: "Présenter mon projet d’achat",
    url: "https://logisorama.ch/nouveau-mandat",
  },
  {
    key: "landlord",
    name: "Votre bien à louer",
    intro:
      "Vous êtes propriétaire bailleur en Suisse romande ? Échangeons sur votre bien et vos besoins pour préparer sa mise en location.",
    cta: "Parler de mon bien",
    url: "https://logisorama.ch/rendez-vous",
  },
  {
    key: "seller",
    name: "Votre projet de vente",
    intro:
      "Vous êtes propriétaire et envisagez de vendre en Suisse romande ? Présentez votre bien à Immo-rama pour préparer les prochaines étapes.",
    cta: "Présenter mon bien",
    url: "https://logisorama.ch/vendre-mon-bien",
  },
  {
    key: "relocation",
    name: "Votre recherche de repreneur",
    intro:
      "Vous quittez votre appartement et cherchez un repreneur ? Présentez votre logement et votre date de départ pour organiser la suite.",
    cta: "Préparer ma relocation",
    url: "https://logisorama.ch/relouer-mon-appartement",
  },
  {
    key: "cleaning",
    name: "Votre demande de nettoyage",
    intro:
      "Vous avez un besoin de nettoyage lié à votre logement ? Précisez le lieu, la surface et la date souhaitée pour que nous puissions examiner votre demande.",
    cta: "Discuter de ma demande",
    url: "https://logisorama.ch/rendez-vous",
  },
  {
    key: "commerce_buyer",
    name: "Votre projet d’achat de commerce",
    intro:
      "Vous recherchez un commerce à acheter ? Présentez votre activité, votre zone de recherche et votre budget pour échanger sur votre projet.",
    cta: "Présenter mon projet",
    url: "https://logisorama.ch/rendez-vous",
  },
];
const followups = [
  [
    "Faisons le point sur votre projet",
    "Votre projet est-il toujours d’actualité ? Vous pouvez compléter votre demande ou reprendre contact avec notre équipe.",
  ],
  [
    "Vos critères nous aident à avancer",
    "Précisez vos priorités, votre secteur et vos délais. Ces informations nous permettent de mieux comprendre votre demande.",
  ],
  [
    "Besoin d’aide pour la prochaine étape ?",
    "Si vous avez une question ou souhaitez être accompagné, notre équipe peut faire le point avec vous.",
  ],
  [
    "Votre projet a-t-il évolué ?",
    "Vous pouvez actualiser votre demande si vos besoins ou votre calendrier ont changé.",
  ],
  [
    "Restons disponibles pour votre projet",
    "Ceci est le dernier message de cette série de suivi. Vous pourrez reprendre votre démarche quand vous le souhaiterez.",
  ],
];
let sql =
  "-- Six editable messages per audience, disabled until explicitly configured. No historical enrollment.\n";
for (const g of groups) {
  const steps = [
    { subject: g.name, preheader: g.intro, html: render(g.name, g.intro) },
    ...followups.map(([title, text]) => ({
      subject: g.name + " — " + title,
      preheader: text,
      html: render(title, text),
    })),
  ];
  function render(title: string, text: string) {
    return renderCorporateEmail({
      title,
      category: g.name,
      bodyHtml:
        `<img src="https://logisorama.ch/newsletter/candidature-parcours.jpg" width="568" alt="Votre projet immobilier" style="display:block;width:100%;height:auto;margin-bottom:24px;"><p>${
          escapeEmailHtml(text)
        }</p>${
          emailButton(g.cta, g.url)
        }<p style="font-size:14px;">Vous avez déjà un compte ? <a href="https://logisorama.ch/login" style="color:#205a43;">Connectez-vous à votre espace</a> pour poursuivre votre démarche avec le même compte.</p>`,
    });
  }
  if (g.key === "renter") {
    steps[0] = {
      subject: "RE : Candidature appartement à louer",
      preheader:
        "Recherche, visite, postulation : laissez-nous prendre le relais.",
      html: await Deno.readTextFile(
        new URL(
          "../../src/features/newsletter/templates/candidature.html",
          import.meta.url,
        ),
      ),
    };
  }
  sql += `update newsletter_sequences set steps='${
    JSON.stringify(steps).replaceAll("'", "''")
  }'::jsonb where category='${g.key}';\n`;
}
await Deno.writeTextFile(
  new URL(
    "../../supabase/migrations/20261004161000_newsletter_sequence_templates.sql",
    import.meta.url,
  ),
  sql,
);
