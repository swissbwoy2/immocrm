import {
  emailButton,
  renderCorporateEmail,
} from "../../supabase/functions/_shared/email-brand.ts";
const url =
  "https://logisorama.ch/annonces/lumineux-2-5-pi-ces-lausanne-disponible-d-s-le-15-octobre-lausanne-ap-456dfeb2";
const subject = "Votre visite — Appartement 2.5 pièces, avenue Druey 18";
const preheader =
  "Photos, conditions de location et réservation de visite à Lausanne.";
const html = renderCorporateEmail({
  title: "Votre visite à l’avenue Druey 18",
  preview: preheader,
  category: "APPARTEMENT À LOUER · LAUSANNE",
  bodyHtml:
    `<p>Bonjour,</p><p>Merci pour votre intérêt pour l’appartement de <strong>2.5 pièces à Lausanne, avenue Druey 18</strong>.</p><p>Vous trouverez les photos, les conditions de location et les informations du logement dans l’annonce ci-dessous. Pour organiser une visite, sélectionnez directement un créneau disponible sur la page :</p>${
      emailButton("Voir l’annonce et réserver une visite", url)
    }<p>Au plaisir de vous rencontrer !</p>`,
});
await Deno.writeTextFile(
  new URL(
    "../../src/features/newsletter/templates/druey-visite.html",
    import.meta.url,
  ),
  html,
);
const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
await Deno.writeTextFile(
  new URL(
    "../../supabase/migrations/20261004171000_newsletter_druey_welcome_template.sql",
    import.meta.url,
  ),
  `-- Enable only after the migration and template have been verified.\ninsert into newsletter_sequence_welcomes(campaign_id,name,subject,preheader,html) values ('120248622162110217','Druey 18',${
    quote(subject)
  },${quote(preheader)},${quote(html)});\n`,
);
