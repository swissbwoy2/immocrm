// Render builders in isolation: no handler, database, credential or email provider runs.
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
const brandFile = "supabase/functions/_shared/email-brand.ts";
const brand = { exports: {}, URL };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(brandFile, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  brand,
);
const E = brand.exports;
const outputs = [];
const expectedActions = JSON.parse(
  fs.readFileSync(new URL("./expected-actions.json", import.meta.url), "utf8"),
);
function expression(source, { variable, field, fn }) {
  const tree = ts.createSourceFile(
    "email.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  let found;
  function visit(n) {
    if (
      variable && ts.isVariableDeclaration(n) &&
      n.name.getText(tree) === variable && n.initializer
    ) found = n.initializer.getText(tree);
    if (
      field && ts.isPropertyAssignment(n) && n.name.getText(tree) === field &&
      (/renderCorporateEmail|`/.test(n.initializer.getText(tree)))
    ) found = n.initializer.getText(tree);
    if (fn && ts.isFunctionDeclaration(n) && n.name?.text === fn) {
      found = n.getText(tree);
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  assert.ok(found, JSON.stringify({ variable, field, fn }));
  return found;
}
function run(file, selector, fixture = {}, args = []) {
  const src = fs.readFileSync(file, "utf8");
  const code = expression(src, selector);
  const ctx = { ...E, Date, console, ...fixture };
  const js = ts.transpileModule(
    selector.fn
      ? code + "\nresult=" + selector.fn + "(...args);"
      : "result=(" + code + ");",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  ctx.args = args;
  vm.runInNewContext(js, ctx);
  return typeof ctx.result === "string" ? ctx.result : ctx.result.html;
}
const urls = (html) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, "&"))
    .filter((x) =>
      ![
        "https://logisorama.ch",
        "mailto:support@logisorama.ch",
        "mailto:info@immo-rama.ch",
      ].includes(x)
    ).sort();
function check(name, selector, fixture, args) {
  const file = `supabase/functions/${name}/index.ts`;
  const html = run(file, selector, fixture, args);
  const expected = expectedActions[outputs.length];
  assert.equal(expected.name, name);
  assert.ok(html.includes(E.EMAIL_BRAND.logo), name);
  assert.ok(!html.includes("undefined"), name);
  assert.deepEqual(
    [...new Set(urls(html))],
    expected.urls,
    `${name}: action URLs must stay unchanged`,
  );
  // A balanced fragment prevents Outlook/table layout corruption after replacing the frame.
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const stack = [];
  for (
    const m of clean.matchAll(
      /<(\/?)(table|tbody|tr|td|div|section|h1|h2|h3|p|ul|li)\b[^>]*>/gi,
    )
  ) {
    if (m[1]) {
      assert.equal(
        stack.pop(),
        m[2].toLowerCase(),
        `${name}: unbalanced ${m[0]}`,
      );
    } else stack.push(m[2].toLowerCase());
  }
  assert.equal(stack.length, 0, name);
  outputs.push({ name, html });
}
const person = {
  prenom: "Marie",
  nom: "Exemple",
  email: "marie@example.test",
  type_recherche: "Louer",
  type_bien: "Appartement",
  pieces_recherche: "3.5",
  region_recherche: "Lausanne",
  budget_max: 2200,
  montant_acompte: 300,
};
const when = {
  recipientName: "Marie",
  formattedDate: "Dimanche 4 octobre 2026",
  formattedTime: "14 h 00",
  heureText: "14 h 00",
  lieuSignature: "Bureau de Lausanne",
  adresse: "Rue Exemple 12, Lausanne",
};
check("send-signature-reminders", { variable: "emailHtml" }, when);
check("send-etat-lieux-reminders", { variable: "emailHtml" }, when);
check("send-invoice-reminders", { variable: "emailHtml" }, {
  invoice: { ...person, abaninja_invoice_ref: "TEST-2026" },
  montant: 300,
  daysPending: 10,
});
for (const payment_method of ["twint", "qr_invoice"]) {
  check("send-mandat-confirmation", { variable: "emailHtml" }, {
    data: { ...person, payment_method },
  });
  check("send-mandat-pdf", { field: "html" }, {
    data: { ...person, payment_method },
    sanitizeText: String,
    isPurchase: false,
    budgetFormatted: "2 200",
    acompte: 300,
  });
}
check("staff-send-mandate-for-signature", { variable: "html" }, {
  prenom: "Marie",
  nom: "Exemple",
  signLink: "https://logisorama.ch/mandat?token=demo",
});
check("mandate-submit-signature", { field: "html" }, {
  newStatus: "active",
  trackingUrl: "https://logisorama.ch/suivi?token=demo",
});
const appt = {
  prospect_name: "Marie Exemple",
  prospect_phone: "+41000000000",
  prospect_email: "marie@example.test",
  source_form: "Contact",
  notes_admin: "Exemple",
};
const office = {
  appt,
  dateStr: "4 octobre 2026",
  timeStr: "14 h 00",
  OFFICE_ADDRESS: "Bureau de Lausanne",
  OFFICE_MAPS_URL: "https://maps.google.com/?q=Lausanne",
};
check("confirm-phone-appointment", { variable: "htmlBody" }, office);
check("notify-admin-new-phone-appointment", { variable: "html" }, office);
check("send-calendar-invite", { variable: "htmlBody" }, {
  ...office,
  title: "Rendez-vous",
  location: "Lausanne",
  description: "Votre rendez-vous",
});
check("send-phone-appointment-reminders", { fn: "buildEmailHtml" }, office, [
  "Marie",
  "4 octobre 2026",
  "14 h 00",
  "Votre rendez-vous approche.",
]);
for (
  const name of [
    "send-document-update-reminders",
    "send-payslip-update-reminders",
  ]
) {
  check(name, { fn: "buildEmailHtml" }, {}, [{
    title: "Votre dossier doit être mis à jour",
    bodyHtml: "<p>Bonjour Marie, merci de déposer votre document.</p>",
    ctaLabel: "Mettre à jour mon dossier",
    ctaUrl: "https://logisorama.ch/client/documents",
    color: "#dc2626",
  }]);
}
for (const daysSinceSignature of [70, 85]) {
  check("mandate-expiry-reminders", { fn: "buildEmailHtml" }, {
    REFUND_ELIGIBILITY_DAY: 80,
    APP_BASE_URL: "https://immocrm.lovable.app",
  }, [{
    ...person,
    daysSinceSignature,
    daysRemaining: 90 - daysSinceSignature,
    endDate: new Date("2026-10-24T12:00:00Z"),
    renewUrl: "https://logisorama.ch/renew?token=demo",
    cancelUrl: "https://logisorama.ch/cancel?token=demo",
    refundUrl: "https://logisorama.ch/refund?token=demo",
    pauseUrl: "https://logisorama.ch/pause?token=demo",
  }]);
}
check("mandate-expiry-reminders", { variable: "autoRenewHtml" }, {
  profile: person,
  newEndStr: "24 décembre 2026",
  refundStartStr: "14 décembre 2026",
  refundEndStr: "24 décembre 2026",
  APP_BASE_URL: "https://immocrm.lovable.app",
});
for (const variant of ["refund", "cancel"]) {
  for (const initiator of ["client", "admin"]) {
    check("mandate-renewal-action", { fn: "buildClientEmail" }, {
      escapeHtml: E.escapeEmailHtml,
      formatDateFR: (s) => s,
    }, [{
      variant,
      initiator,
      firstName: "Marie",
      officialEnd: "24 octobre 2026",
      refundProcessDate: "24 novembre 2026",
      daysSinceSignature: 85,
      isTest: false,
      reasonLabel: "Projet terminé",
    }]);
  }
}
check("import-clients-csv", { fn: "generateCreationEmailHtml" }, {}, [
  "Marie",
  "Exemple",
  "marie@example.test",
  "EXAMPLE-password",
  "https://logisorama.ch",
]);
check("import-clients-csv", { fn: "generateActivationEmailHtml" }, {}, [
  "Marie",
  "Exemple",
  "https://logisorama.ch",
]);
check("contact-annonce", { variable: "html" }, {
  esc: E.escapeEmailHtml,
  annonce: { titre: "Appartement à Lausanne", reference: "EXEMPLE" },
  url: "https://logisorama.ch/annonces/exemple",
  nom: "Marie",
  email: "marie@example.test",
  telephone: "",
  message: "Je souhaite visiter.",
});
check("annonce-alertes-run", { variable: "html" }, {
  toSend: [{}],
  esc: E.escapeEmailHtml,
  alerte: { nom: "Lausanne" },
  cards: "<p>Appartement à Lausanne</p>",
  unsubUrl: "https://logisorama.ch/unsubscribe?token=example",
});
check("auto-offers-daily-digest", { variable: "html" }, {
  startOfDay: new Date("2026-10-03T12:00Z"),
  totalOffres: 4,
  clientsServis: 2,
  visitesFixees: [],
  manuel: [],
  APP_URL: "https://logisorama.ch",
});
check("ai-relocation-api", { variable: "emailBody" }, {
  clientName: "Marie",
  messageText: "Vos offres du jour",
  propertiesHtml: "<p>Appartement à Lausanne</p>",
});
check("notify-new-lead", { field: "html" }, {
  leadData: { ...person, is_qualified: true },
  qualificationStatus: "Nouveau lead",
  qualificationReasons: [],
});
console.log(
  `${outputs.length} legacy email variants rendered; action URLs and HTML nesting verified.`,
);
if (process.env.EMAIL_PREVIEW_DIR) {
  fs.mkdirSync(process.env.EMAIL_PREVIEW_DIR, { recursive: true });
  for (const [i, o] of outputs.entries()) {
    fs.writeFileSync(
      `${process.env.EMAIL_PREVIEW_DIR}/${o.name}-${i}.html`,
      o.html,
    );
  }
}
