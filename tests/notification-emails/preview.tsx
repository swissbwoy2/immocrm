// Local preview only; never calls a provider or starts an HTTP handler.
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { TEMPLATES } from "../../supabase/functions/_shared/transactional-email-templates/registry.ts";
import { renderNotificationEmail } from "../../supabase/functions/_shared/email-brand.ts";
const dir = Deno.args[0];
if (!dir) throw new Error("Specify an output directory");
await Deno.mkdir(dir, { recursive: true });
for (const [name, t] of Object.entries(TEMPLATES)) {
  await Deno.writeTextFile(
    `${dir}/${name}.html`,
    await renderAsync(React.createElement(t.component, t.previewData)),
  );
}
await Deno.writeTextFile(
  `${dir}/notification.html`,
  renderNotificationEmail(
    "Une nouvelle offre vous attend",
    "Un appartement correspondant à vos critères est disponible. Consultez les détails dans votre espace personnel.",
    "new_offer",
    "/client/offres",
    "Marie",
  ),
);

const { renderCorrespondenceEmail } = await import(
  "../../supabase/functions/_shared/correspondence-email.ts"
);
await Deno.writeTextFile(
  `${dir}/correspondance.html`,
  renderCorrespondenceEmail(
    "Candidature — Appartement à Lausanne",
    "Madame, Monsieur,\n\nVeuillez trouver en pièces jointes le dossier de candidature de Marie Exemple pour le logement visité.\n\nJe reste à votre disposition pour tout complément d’information.",
    '<strong>Christ Ramazani</strong><br>Immo-rama · Logisorama<br><a href="mailto:support@logisorama.ch" style="color:#205a43;">support@logisorama.ch</a>',
  ),
);
