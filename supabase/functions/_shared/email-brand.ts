/**
 * Single source of the Logisorama / Immo-Rama e-mail identity.
 *
 * - Tokens (colours, spacing, typography) live in EMAIL_THEME and the style
 *   objects of `emailStyles` / `layoutStyles`.
 * - `renderEmailLayout` (string) and `EmailLayout` (react-email, see
 *   email-layout.tsx) render the same frame from these objects.
 * - Self-contained on purpose (no imports): this file is also compiled by the
 *   front-end (src/features/newsletter) and by the render tests in a bare VM.
 */

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";

export const EMAIL_THEME = {
  font: FONT,
  green: "#205a43",
  greenDark: "#193d2c",
  greenSoft: "#eaf3ee",
  page: "#f2f4f1",
  card: "#ffffff",
  panel: "#f6f8f5",
  heading: "#15261d",
  text: "#36443b",
  muted: "#66736a",
  faint: "#8a958d",
  border: "#e3e8e3",
  divider: "#e9ede9",
  radius: "18px",
  panelRadius: "12px",
  width: 600,
  padX: "40px",
};

const T = EMAIL_THEME;

/** Kept for existing imports (tests, newsletter studio, front-end). */
export const EMAIL_BRAND = {
  site: "https://logisorama.ch",
  logo: "https://logisorama.ch/email/logo-logisorama.png",
  green: T.green,
  dark: T.greenDark,
  cream: T.panel,
  background: T.page,
  text: T.heading,
  muted: T.text,
  border: T.border,
};

type Style = Record<string, string | number>;

/** Inline-style objects shared by the string shell and react-email components. */
export const emailStyles = {
  eyebrow: {
    fontSize: "12px",
    lineHeight: "18px",
    fontWeight: 600,
    letterSpacing: "0.8px",
    textTransform: "uppercase" as const,
    color: T.green,
    margin: "0 0 10px",
  },
  h1: {
    fontSize: "26px",
    lineHeight: "33px",
    letterSpacing: "-0.4px",
    fontWeight: 700,
    color: T.heading,
    margin: "0 0 20px",
  },
  h2: {
    fontSize: "18px",
    lineHeight: "26px",
    fontWeight: 600,
    color: T.heading,
    margin: "28px 0 12px",
  },
  text: {
    fontSize: "16px",
    lineHeight: "26px",
    color: T.text,
    margin: "0 0 16px",
  },
  small: {
    fontSize: "14px",
    lineHeight: "22px",
    color: T.muted,
    margin: "0 0 14px",
  },
  label: {
    fontSize: "13px",
    lineHeight: "20px",
    color: T.muted,
    margin: "0 0 2px",
  },
  value: {
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 600,
    color: T.heading,
    margin: "0 0 14px",
    overflowWrap: "anywhere" as const,
  },
  code: {
    fontSize: "22px",
    lineHeight: "30px",
    fontWeight: 700,
    fontFamily: "'SF Mono',Menlo,Consolas,'Courier New',monospace",
    color: T.greenDark,
    letterSpacing: "2px",
    margin: "0",
    overflowWrap: "anywhere" as const,
  },
  box: {
    backgroundColor: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: T.panelRadius,
    padding: "20px 22px",
    margin: "8px 0 22px",
  },
  boxTitle: {
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 600,
    color: T.heading,
    margin: "0 0 6px",
  },
  boxText: {
    fontSize: "15px",
    lineHeight: "24px",
    color: T.text,
    margin: "0",
  },
  link: {
    color: T.green,
    textDecoration: "underline",
    overflowWrap: "anywhere" as const,
  },
  button: {
    backgroundColor: T.green,
    border: `1px solid ${T.green}`,
    color: "#ffffff",
    fontFamily: FONT,
    fontSize: "16px",
    lineHeight: "22px",
    fontWeight: 600,
    borderRadius: "999px",
    padding: "14px 28px",
    textDecoration: "none",
    display: "inline-block",
  },
  footer: {
    fontSize: "12px",
    lineHeight: "19px",
    color: T.faint,
    margin: "0",
  },
};

/** Frame styles (page, card, header, signature, footer). */
export const layoutStyles = {
  body: {
    margin: 0,
    padding: 0,
    width: "100%",
    backgroundColor: T.page,
    fontFamily: FONT,
    WebkitTextSizeAdjust: "100%",
  },
  outer: { padding: "32px 16px" },
  card: {
    width: "100%",
    maxWidth: `${T.width}px`,
    backgroundColor: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius,
  },
  header: { padding: `32px ${T.padX} 0` },
  logo: {
    display: "block",
    border: 0,
    outline: "none",
    textDecoration: "none",
    height: "40px",
    width: "144px",
  },
  content: {
    padding: `26px ${T.padX} 12px`,
    fontSize: "16px",
    lineHeight: "26px",
    color: T.text,
    overflowWrap: "anywhere" as const,
  },
  signature: {
    padding: `18px ${T.padX} 32px`,
    fontSize: "14px",
    lineHeight: "22px",
    color: T.muted,
  },
  signatureRule: { borderTop: `1px solid ${T.divider}`, paddingTop: "18px" },
  footer: {
    padding: `22px ${T.padX} 8px`,
    fontSize: "12px",
    lineHeight: "19px",
    color: T.faint,
    textAlign: "center" as const,
  },
  footerLink: { color: T.muted, textDecoration: "underline" },
};

export const EMAIL_RESPONSIVE_CSS =
  "body{margin:0!important;padding:0!important}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}" +
  "@media screen and (max-width:520px){.email-outer{padding:16px 8px!important}.email-pad{padding-left:22px!important;padding-right:22px!important}.email-heading{font-size:23px!important;line-height:30px!important}.email-stack{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important;box-sizing:border-box!important}.email-btn a{display:block!important}.email-btn{width:100%!important}.email-detail-label,.email-detail-value{display:block!important;width:100%!important;padding-right:0!important}.email-detail-label{padding-bottom:0!important}.email-detail-value{padding-top:2px!important}}";

/** camelCase style object -> inline CSS string. */
export function css(style: Style): string {
  return Object.entries(style).map(([k, v]) =>
    `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`
  ).join(";");
}

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function emailUrl(value: string): string {
  try {
    const u = new URL(value, EMAIL_BRAND.site);
    return ["https:", "http:", "mailto:", "tel:"].includes(u.protocol)
      ? u.href
      : EMAIL_BRAND.site;
  } catch {
    return EMAIL_BRAND.site;
  }
}

// ---------------------------------------------------------------------------
// Building blocks (bodyHtml is trusted markup: escape user text at its source)
// ---------------------------------------------------------------------------

/** Paragraph of trusted inline HTML. */
export function emailParagraph(html: string, muted = false): string {
  return `<p style="${css(muted ? emailStyles.small : emailStyles.text)}">${html}</p>`;
}

/** Section heading inside the body. */
export function emailSubheading(text: string): string {
  return `<h2 style="${css(emailStyles.h2)}">${escapeEmailHtml(text)}</h2>`;
}

/** Bulleted list of trusted inline HTML items. */
export function emailList(items: string[]): string {
  return `<ul style="margin:0 0 18px;padding:0 0 0 20px;color:${T.text};">${
    items.map((i) =>
      `<li style="margin:0 0 8px;font-size:16px;line-height:24px;">${i}</li>`
    ).join("")
  }</ul>`;
}

/**
 * Bulletproof pill button (table + link, Outlook safe).
 * `secondary` = outlined; `align` centres the button for hero-style CTAs.
 */
export function emailButton(
  label: string,
  url: string,
  variant: "primary" | "secondary" = "primary",
): string {
  const primary = variant === "primary";
  const bg = primary ? T.green : T.card;
  const fg = primary ? "#ffffff" : T.green;
  return `<table role="presentation" class="email-btn" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;border-collapse:separate;"><tr><td align="center" bgcolor="${bg}" style="border-radius:999px;border:1px solid ${T.green};mso-padding-alt:14px 28px;"><a href="${
    escapeEmailHtml(emailUrl(url))
  }" style="display:inline-block;padding:14px 28px;border-radius:999px;color:${fg};background:${bg};font-family:${FONT};font-size:16px;line-height:22px;font-weight:600;text-decoration:none;text-align:center;">${
    escapeEmailHtml(label)
  }</a></td></tr></table>`;
}

/** Several buttons stacked (first primary, the rest outlined). */
export function emailButtons(
  buttons: Array<{ label: string; url: string; variant?: "primary" | "secondary" }>,
): string {
  return buttons.map((b, i) =>
    emailButton(b.label, b.url, b.variant || (i === 0 ? "primary" : "secondary"))
  ).join("");
}

export type EmailDetailRow =
  | [label: string, value: unknown]
  | { label: string; value?: unknown; html?: string };

/** Homogeneous label / value block. Tuple and `value` are escaped; `html` is trusted. */
export function emailDetails(rows: EmailDetailRow[], title?: string): string {
  const items = rows.map((r) =>
    Array.isArray(r) ? { label: r[0], html: escapeEmailHtml(r[1]) } : {
      label: r.label,
      html: r.html ?? escapeEmailHtml(r.value),
    }
  ).filter((r) => r.html !== "");
  if (!items.length) return "";
  const rowsHtml = items.map((r, i) =>
    `<tr><td class="email-detail-label" valign="top" width="38%" style="padding:${
      i ? "10px" : "0"
    } 12px 0 0;font-size:14px;line-height:22px;color:${T.muted};">${
      escapeEmailHtml(r.label)
    }</td><td class="email-detail-value" valign="top" style="padding:${
      i ? "10px" : "0"
    } 0 0;font-size:15px;line-height:22px;font-weight:600;color:${T.heading};overflow-wrap:anywhere;">${r.html}</td></tr>`
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.panel}" style="margin:8px 0 22px;background:${T.panel};border:1px solid ${T.border};border-radius:${T.panelRadius};border-collapse:separate;"><tr><td style="padding:18px 20px;">${
    title
      ? `<p style="${css(emailStyles.boxTitle)};margin:0 0 12px;">${escapeEmailHtml(title)}</p>`
      : ""
  }<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table></td></tr></table>`;
}

const NOTICE_TONES = {
  neutral: { bg: T.panel, border: T.border, bar: T.border, text: T.text },
  info: { bg: T.greenSoft, border: "#d3e6db", bar: T.green, text: T.greenDark },
  warning: { bg: "#fdf6e7", border: "#f1e0b5", bar: "#b7791f", text: "#5f4313" },
  danger: { bg: "#fcefee", border: "#f2d2cf", bar: "#b42318", text: "#7a1d14" },
};

/** Highlighted note (info / warning / danger / neutral) with optional title. Trusted HTML. */
export function emailNotice(
  html: string,
  tone: keyof typeof NOTICE_TONES = "info",
  title?: string,
): string {
  const c = NOTICE_TONES[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.bg}" style="margin:8px 0 22px;background:${c.bg};border:1px solid ${c.border};border-left:4px solid ${c.bar};border-radius:${T.panelRadius};border-collapse:separate;"><tr><td style="padding:16px 20px;font-size:15px;line-height:24px;color:${c.text};">${
    title
      ? `<p style="margin:0 0 4px;font-size:15px;line-height:22px;font-weight:600;color:${c.text};">${escapeEmailHtml(title)}</p>`
      : ""
  }${html}</td></tr></table>`;
}

/**
 * Compact data table for staff digests (header row + rows of trusted HTML).
 * Escape user text at its source (escapeEmailHtml) before passing cells.
 */
export function emailTable(headers: string[], rows: string[][]): string {
  if (!rows.length) return "";
  const th = headers.map((h) =>
    `<th align="left" style="padding:10px 12px;font-size:12px;line-height:18px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:${T.muted};border-bottom:1px solid ${T.border};">${escapeEmailHtml(h)}</th>`
  ).join("");
  const body = rows.map((r, i) =>
    `<tr>${
      r.map((c) =>
        `<td valign="top" style="padding:10px 12px;font-size:14px;line-height:21px;color:${T.heading};overflow-wrap:anywhere;${
          i ? `border-top:1px solid ${T.divider};` : ""
        }">${c}</td>`
      ).join("")
    }</tr>`
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.panel}" style="margin:8px 0 22px;background:${T.panel};border:1px solid ${T.border};border-radius:${T.panelRadius};border-collapse:separate;"><tr>${th}</tr>${body}</table>`;
}

/**
 * Property card (offer, alert, relance). Plain-text fields are escaped here;
 * `badgeHtml` is trusted. Image is optional (full width, rounded top).
 */
export function emailListingCard(c: {
  title: string;
  meta?: string;
  price?: string;
  url?: string;
  ctaLabel?: string;
  imageUrl?: string;
  badgeHtml?: string;
}): string {
  const img = c.imageUrl
    ? `<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${
      escapeEmailHtml(emailUrl(c.imageUrl))
    }" width="520" alt="${escapeEmailHtml(c.title)}" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:${T.panelRadius} ${T.panelRadius} 0 0;"></td></tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.card}" style="margin:0 0 14px;background:${T.card};border:1px solid ${T.border};border-radius:${T.panelRadius};border-collapse:separate;">${img}<tr><td style="padding:16px 18px;">${
    c.badgeHtml ? `<div style="margin:0 0 8px;">${c.badgeHtml}</div>` : ""
  }<p style="margin:0 0 4px;font-size:16px;line-height:23px;font-weight:600;color:${T.heading};">${
    escapeEmailHtml(c.title)
  }</p>${
    c.meta
      ? `<p style="margin:0;font-size:14px;line-height:21px;color:${T.muted};">${escapeEmailHtml(c.meta)}</p>`
      : ""
  }${
    c.price
      ? `<p style="margin:8px 0 0;font-size:17px;line-height:24px;font-weight:700;color:${T.green};">${escapeEmailHtml(c.price)}</p>`
      : ""
  }${
    c.url
      ? `<p style="margin:12px 0 0;font-size:15px;line-height:22px;"><a href="${
        escapeEmailHtml(emailUrl(c.url))
      }" style="color:${T.green};font-weight:600;text-decoration:none;">${
        escapeEmailHtml(c.ctaLabel || "Voir l’annonce")
      } &rarr;</a></p>`
      : ""
  }</td></tr></table>`;
}

/** Small pill badge (trusted text is escaped). */
export function emailBadge(text: string, tone: "green" | "neutral" | "warning" = "green"): string {
  const c = tone === "green"
    ? { bg: T.greenSoft, fg: T.greenDark }
    : tone === "warning"
    ? { bg: "#fdf6e7", fg: "#5f4313" }
    : { bg: T.panel, fg: T.muted };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${c.bg};color:${c.fg};font-size:12px;line-height:18px;font-weight:600;">${
    escapeEmailHtml(text)
  }</span>`;
}

/** Large, copyable code (password, verification code). */
export function emailCode(value: string): string {
  return `<p style="${css(emailStyles.code)}">${escapeEmailHtml(value)}</p>`;
}

/** Thin horizontal rule. */
export function emailDivider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;"><tr><td style="border-top:1px solid ${T.divider};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** Gives bare tags written without style (simple bodies) the shared typography. */
function normalizeBody(html: string): string {
  const linkStyle = `color:${T.green};text-decoration:underline;`;
  return html
    .replace(/<p>/gi, `<p style="${css(emailStyles.text)}">`)
    .replace(/<h2>/gi, `<h2 style="${css(emailStyles.h2)}">`)
    .replace(/<h3>/gi, `<h3 style="${css(emailStyles.h2)}">`)
    .replace(/<ul>/gi, `<ul style="margin:0 0 18px;padding:0 0 0 20px;">`)
    .replace(/<ol>/gi, `<ol style="margin:0 0 18px;padding:0 0 0 20px;">`)
    .replace(/<li>/gi, `<li style="margin:0 0 8px;">`)
    .replace(/<a (?![^>]*\bstyle=)/gi, `<a style="${linkStyle}" `);
}

const DEFAULT_SIGNATURE =
  `<strong style="color:${T.heading};">L’équipe Logisorama</strong><br>Votre recherche de logement, au même endroit.`;

export interface EmailLayoutOptions {
  /** Main heading (also the <title>). */
  title: string;
  /** Hidden inbox preview text; defaults to the title. */
  preheader?: string;
  /** Small label above the heading (e.g. "VOTRE MANDAT"). */
  category?: string;
  /** Greeting / first paragraph (plain text, escaped). */
  intro?: string;
  /** Label / value block shown after the intro. */
  details?: EmailDetailRow[];
  /** Primary call to action. */
  cta?: { label: string; url: string };
  /** Additional trusted HTML (after the details, before the CTA). */
  body?: string;
  /** Trusted HTML shown in the footer (e.g. unsubscribe / preference note). */
  footerNote?: string;
  /** Trusted HTML replacing the default signature. */
  signatureHtml?: string;
}

/** The one HTML frame for every e-mail produced by the code. */
export function renderEmailLayout(o: EmailLayoutOptions): string {
  const L = layoutStyles;
  const preheader = o.preheader || o.title;
  const inner = (o.intro ? emailParagraph(escapeEmailHtml(o.intro)) : "") +
    (o.details?.length ? emailDetails(o.details) : "") +
    normalizeBody(o.body || "") +
    (o.cta ? emailButton(o.cta.label, o.cta.url) : "");
  return `<!DOCTYPE html><html lang="fr" dir="ltr"><head><meta charset="utf-8"><meta name="logisorama-email-layout" content="corporate-v1"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><meta name="format-detection" content="telephone=no,address=no,email=no,date=no"><title>${
    escapeEmailHtml(o.title)
  }</title><!--[if mso]><style>table,td,p,a,h1,h2,li{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]--><style>${EMAIL_RESPONSIVE_CSS}</style></head>
<body bgcolor="${T.page}" style="${css(L.body)}">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${
    escapeEmailHtml(preheader)
  }&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.page}" style="background:${T.page};"><tr><td align="center" class="email-outer" style="${css(L.outer)}">
<!--[if mso]><table role="presentation" width="${T.width}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="${T.width}" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.card}" style="${css(L.card)};border-collapse:separate;">
<tr><td class="email-pad" style="${css(L.header)}"><a href="${EMAIL_BRAND.site}" style="text-decoration:none;"><img src="${EMAIL_BRAND.logo}" width="144" height="40" alt="Logisorama" style="${css(L.logo)}"></a></td></tr>
<tr><td class="email-pad" style="${css(L.content)}">${
    o.category
      ? `<p style="${css(emailStyles.eyebrow)}">${escapeEmailHtml(o.category)}</p>`
      : ""
  }<h1 class="email-heading" style="${css(emailStyles.h1)}">${
    escapeEmailHtml(o.title)
  }</h1>${inner}</td></tr>
<tr><td class="email-pad" style="${css(L.signature)}"><div style="${css(L.signatureRule)}">${
    o.signatureHtml || DEFAULT_SIGNATURE
  }</div></td></tr>
</table>
<table role="presentation" width="${T.width}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${T.width}px;"><tr><td class="email-pad" style="${css(L.footer)}"><strong style="color:${T.muted};">Immo-Rama.ch</strong> · Crissier (VD)<br><a href="${EMAIL_BRAND.site}" style="${css(L.footerLink)}">logisorama.ch</a> · <a href="mailto:support@logisorama.ch" style="${css(L.footerLink)}">support@logisorama.ch</a>${
    o.footerNote ? `<div style="margin-top:10px;">${o.footerNote}</div>` : ""
  }</td></tr></table>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}

/** Legacy entry point used by most functions — same frame as renderEmailLayout. */
export function renderCorporateEmail(
  {
    title,
    preview = title,
    category = "VOTRE ESPACE IMMOBILIER",
    bodyHtml,
    footerHtml = "",
    signatureHtml,
  }: {
    title: string;
    preview?: string;
    category?: string;
    bodyHtml: string;
    footerHtml?: string;
    signatureHtml?: string;
  },
): string {
  return renderEmailLayout({
    title,
    preheader: preview,
    category,
    body: bodyHtml,
    footerNote: footerHtml,
    signatureHtml,
  });
}

export function renderNotificationEmail(
  title: string,
  message: string,
  type: string,
  link?: string,
  userName?: string,
): string {
  return renderCorporateEmail({
    title,
    preview: message.split(/\r?\n/)[0].slice(0, 140) || title,
    category: "INFORMATION & SUIVI",
    bodyHtml: emailParagraph(
      userName ? `Bonjour ${escapeEmailHtml(userName)},` : "Bonjour,",
    ) +
      emailNotice(escapeEmailHtml(message).replace(/\r?\n/g, "<br>"), "neutral") +
      (link ? emailButton("Voir les détails", link) : "") +
      (type === "app_update"
        ? emailButton(
          "Ouvrir dans l’App Store",
          "https://apps.apple.com/app/id6756940233",
          link ? "secondary" : "primary",
        ) +
          emailButton(
            "Disponible sur Google Play",
            "https://play.google.com/store/apps/details?id=ch.logisorama.app",
            "secondary",
          )
        : ""),
    footerHtml:
      "Vous pouvez gérer vos préférences de notification dans les paramètres de votre compte.",
  });
}
