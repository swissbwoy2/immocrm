import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RC_CAMPAIGN, RC_CAMPAIGN_HTML } from "../../src/features/newsletter/rc-campaign.ts";

const output = resolve(process.argv[2] || "outputs/rc-campaign");
await mkdir(output, { recursive: true });
await writeFile(resolve(output, "newsletter.html"), RC_CAMPAIGN_HTML);
await writeFile(resolve(output, "campaign.json"), JSON.stringify({ ...RC_CAMPAIGN, html: RC_CAMPAIGN_HTML }, null, 2));
await copyFile("public/newsletter/rc-2026-10/dossier-beton.jpg", resolve(output, "dossier-beton.jpg"));
await copyFile("public/email/logo-logisorama.png", resolve(output, "logo-logisorama.png"));
await writeFile(resolve(output, "apercu.html"), RC_CAMPAIGN_HTML.replace("https://logisorama.ch" + RC_CAMPAIGN.image, "./dossier-beton.jpg").replace("https://logisorama.ch/email/logo-logisorama.png", "./logo-logisorama.png"));
console.log(`Campagne RC et aperçu créés : ${output}`);
