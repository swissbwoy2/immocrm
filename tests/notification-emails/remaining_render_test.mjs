// Isolated HTML rendering: no handlers, credentials, network requests or sends.
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const compile = (s) =>
  ts.transpileModule(s, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const brand = { exports: {}, URL };
vm.runInNewContext(
  compile(fs.readFileSync("supabase/functions/_shared/email-brand.ts", "utf8")),
  brand,
);
const E = brand.exports, outputs = [], expected = [];
const manifestPath = new URL("./remaining-actions.json", import.meta.url);
const record = process.env.RECORD_ACTIONS === "1";
const manifest = record
  ? []
  : JSON.parse(fs.readFileSync(manifestPath, "utf8"));
function render(name, fn, args, fixture = {}, old = false, variable = false) {
  const path = `supabase/functions/${name}/index.ts`;
  const src = old
    ? execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" })
    : fs.readFileSync(path, "utf8");
  const ast = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true);
  let code = "";
  if (variable) {
    function visit(n) {
      if (ts.isVariableDeclaration(n) && n.name.getText(ast) === fn) {
        code = "result=" + n.initializer.getText(ast) + ";";
      }
      ts.forEachChild(n, visit);
    }
    visit(ast);
  } else {
    const keep = new Set([
      "PUBLIC_BASE_URL",
      "LOCATION_CTA_RDV_HERO_URL",
      "LOCATION_CTA_RDV_FINAL_URL",
      "LOCATION_CTA_ACTIVATION_URL",
      "LOCATION_PREHEADER",
      "LOCATION_CTA_NOUVEAU_MANDAT_URL",
      "UNSPLASH_IMAGES",
      "FUNCTIONS_BASE",
      "esc",
    ]);
    code = ast.statements.filter((n) =>
      ts.isFunctionDeclaration(n) ||
      (ts.isVariableStatement(n) && n.declarationList.declarations.some((d) =>
        keep.has(d.name.getText(ast))
      ))
    ).map((n) => n.getText(ast)).join("\n");
    code += `\nresult=${fn}(...args);`;
  }
  const ctx = {
    ...E,
    URL,
    args,
    ...fixture,
    Deno: { env: { get: () => "https://example.test" } },
  };
  vm.runInNewContext(compile(code), ctx);
  return ctx.result;
}
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const urls = (h) =>
  [
    ...new Set(
      [...h.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1])).filter((u) =>
        ![
          "https://logisorama.ch",
          "https://logisorama.ch/",
          "mailto:support@logisorama.ch",
        ].includes(u)
      ),
    ),
  ].sort();
function check(name, fn, args, fixture = {}, variable = false, label = fn) {
  const html = render(name, fn, args, fixture, false, variable);
  const oldUrls = record
    ? urls(render(name, fn, args, fixture, true, variable))
    : manifest[outputs.length].urls;
  expected.push({ label, urls: oldUrls });
  assert.deepEqual(urls(html), oldUrls, label + " action links");
  assert.equal(
    (html.match(/alt="Immo-rama"/g) || []).length,
    1,
    label + " logo",
  );
  assert.equal((html.match(/<h1\b/g) || []).length, 1, label + " heading");
  assert(
    !/linear-gradient|#1e40af|#b8893d|#1e3a5f|#667eea|undefined/.test(html),
    label + " retired styling",
  );
  const clean = html.replace(/<!--[\s\S]*?-->/g, ""), stack = [];
  for (
    const m of clean.matchAll(
      /<(\/?)(table|tbody|tr|td|div|section|h1|h2|h3|p|ul|li)\b[^>]*>/gi,
    )
  ) {
    if (m[1]) assert.equal(stack.pop(), m[2].toLowerCase(), label + " " + m[0]);
    else stack.push(m[2].toLowerCase());
  }
  assert.equal(stack.length, 0, label + " balanced HTML");
  outputs.push({ label, html });
  return html;
}
const campaign = {
  campaign_key: "location",
  subject: "Votre projet immobilier",
  preview_text: "Un accompagnement personnalisé",
  hero_title: "Votre projet immobilier",
  hero_subtitle: "À vos côtés",
  body_intro: "Bonjour {{first_name}},<br>Découvrez notre accompagnement.",
  benefits: ["Recherche personnalisée", "Suivi de votre projet"],
  trust_text: "À votre écoute",
  cta_label: "Découvrir",
  cta_url: "https://logisorama.ch/nouveau-mandat?a=1&b=2",
  signature: "Votre conseiller\nImmo-rama",
  status: "active",
};
for (const key of ["location", "achat", "vente", "renovation"]) {
  const html = check(
    "send-followup-campaign",
    "renderForCampaign",
    [
      { ...campaign, campaign_key: key },
      { first_name: "Marie & Paul" },
      "demo-unsubscribe",
    ],
    {},
    false,
    key,
  );
  assert(html.includes("Marie &amp; Paul"), key + " personalization");
  const tracked = render("send-followup-campaign", "injectTracking", [
    html,
    "demo",
  ]);
  const hrefs = [...tracked.matchAll(/href="([^"]+)"/g)].map((m) =>
    decode(m[1])
  );
  for (const href of hrefs.filter((h) => h.includes("track-email-click"))) {
    const target = new URL(href).searchParams.get("url");
    assert(!target.includes("&amp;"), "tracked query params");
  }
  assert(
    tracked.includes("/unsubscribe/demo-unsubscribe"),
    "unsubscribe retained",
  );
}
for (const days of [1, 3, 7]) {
  check(
    "smart-followups",
    "html",
    [],
    {
      lead: { prenom: "Marie", nom: "Exemple" },
      days,
      ctaUrl: "https://immocrm.lovable.app/mandat?email=marie%40example.test",
    },
    true,
    `relance-j${days}`,
  );
}
check("candidat-suivi-emails", "activationHtml", [
  "Marie & Paul",
  "https://example.test/unsubscribe?token=demo",
]);
for (const count of [0, 1, 3]) {
  check(
    "send-lead-relance",
    "generateMarketingEmail",
    [
      "Marie",
      "Lausanne",
      "CHF 2200",
      Array.from(
        { length: count },
        () => ({
          adresse: "Rue Exemple 12",
          prix: 2000,
          pieces: 3.5,
          surface: 70,
          statut: "envoyee",
        }),
      ),
    ],
    {},
    false,
    `offres-${count}`,
  );
}
check(
  "send-recommendation-email",
  "htmlTemplate",
  [],
  { senderName: "Marie Exemple" },
  true,
  "recommandation",
);
if (record) {
  fs.writeFileSync(manifestPath, JSON.stringify(expected, null, 2) + "\n");
}
if (process.env.EMAIL_PREVIEW_DIR) {
  fs.mkdirSync(process.env.EMAIL_PREVIEW_DIR, { recursive: true });
  for (const o of outputs) {
    fs.writeFileSync(
      `${process.env.EMAIL_PREVIEW_DIR}/${o.label}.html`,
      o.html,
    );
  }
}
console.log(
  `${outputs.length} remaining email variants validated: brand, personalization, action links, unsubscribe, tracking, HTML nesting.`,
);
