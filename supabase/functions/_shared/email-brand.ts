/** Shared identity for transactional emails and the newsletter reference. */
export const EMAIL_BRAND = {
  site: "https://logisorama.ch",
  logo: "https://logisorama.ch/__l5e/assets-v1/620cc5b1-18df-42ab-86d6-2ea17731daef/logisorama-email-logo.png",
  green: "#205a43",
  dark: "#193d2c",
  cream: "#f3f4ed",
  background: "#eef0eb",
  text: "#202b22",
  muted: "#5c665e",
  border: "#e7ebe5",
};
export const emailStyles = {
  h1: {
    fontSize: "30px",
    lineHeight: "36px",
    letterSpacing: "-0.7px",
    fontWeight: 700,
    color: "#1c523c",
    margin: "0 0 22px",
  },
  text: {
    fontSize: "16px",
    lineHeight: "26px",
    color: EMAIL_BRAND.muted,
    margin: "0 0 18px",
  },
  label: {
    fontSize: "11px",
    lineHeight: "18px",
    color: "#677a6c",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    margin: "0 0 5px",
  },
  value: {
    fontSize: "16px",
    lineHeight: "25px",
    color: EMAIL_BRAND.text,
    margin: "0 0 16px",
    overflowWrap: "anywhere" as const,
  },
  code: {
    fontSize: "22px",
    lineHeight: "30px",
    fontWeight: 700,
    color: EMAIL_BRAND.dark,
    letterSpacing: "1px",
    margin: "0",
    overflowWrap: "anywhere" as const,
  },
  box: {
    backgroundColor: EMAIL_BRAND.cream,
    border: `1px solid ${EMAIL_BRAND.border}`,
    borderRadius: "5px",
    padding: "22px",
    margin: "0 0 22px",
  },
  boxTitle: {
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 700,
    color: EMAIL_BRAND.dark,
    margin: "0 0 8px",
  },
  boxText: {
    fontSize: "15px",
    lineHeight: "25px",
    color: EMAIL_BRAND.muted,
    margin: "0",
  },
  link: {
    color: EMAIL_BRAND.green,
    textDecoration: "underline",
    overflowWrap: "anywhere" as const,
  },
  button: {
    backgroundColor: EMAIL_BRAND.green,
    border: `1px solid ${EMAIL_BRAND.green}`,
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: "22px",
    fontWeight: 700,
    borderRadius: "5px",
    padding: "14px 22px",
    textDecoration: "none",
    display: "inline-block",
  },
  footer: {
    fontSize: "12px",
    lineHeight: "20px",
    color: "#7b847a",
    margin: "0",
  },
};
export const EMAIL_RESPONSIVE_CSS =
  "@media screen and (max-width:520px){.email-stack{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important;box-sizing:border-box!important}.email-outer{padding:0!important}.email-pad{padding-left:24px!important;padding-right:24px!important}.email-heading{font-size:26px!important;line-height:32px!important}.email-brandline{font-size:9px!important;letter-spacing:.7px!important}}";
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
export function emailButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td bgcolor="${EMAIL_BRAND.green}" style="border-radius:5px;mso-padding-alt:14px 22px;"><a href="${
    escapeEmailHtml(emailUrl(url))
  }" style="display:inline-block;padding:14px 22px;border:1px solid ${EMAIL_BRAND.green};border-radius:5px;color:#ffffff;background:${EMAIL_BRAND.green};font:700 16px/22px Arial,Helvetica,sans-serif;text-decoration:none;text-align:center;">${
    escapeEmailHtml(label)
  }</a></td></tr></table>`;
}
/** bodyHtml is trusted application markup; escape interpolated user text at its source. */
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
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="logisorama-email-layout" content="corporate-v1"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${
    escapeEmailHtml(title)
  }</title><style>${EMAIL_RESPONSIVE_CSS}</style></head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.background};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${
    escapeEmailHtml(preview)
  }</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL_BRAND.background}"><tr><td align="center" class="email-outer" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="640"><tr><td><![endif]-->
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;border-top:4px solid ${EMAIL_BRAND.green};">
<tr><td class="email-pad" style="padding:24px 36px;border-bottom:1px solid ${EMAIL_BRAND.border};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><div style="font-size:27px;line-height:30px;font-weight:bold;letter-spacing:-1px;color:${EMAIL_BRAND.dark};">Logisorama</div><img src="${EMAIL_BRAND.logo}" width="144" height="40" alt="Logisorama" style="display:block;border:0;margin-top:3px;"></td><td align="right" class="email-brandline" style="font-size:10px;line-height:17px;letter-spacing:1.2px;color:#677a6c;">${
    escapeEmailHtml(category)
  }</td></tr></table></td></tr>
<tr><td class="email-pad" style="padding:32px 36px 30px;font-size:16px;line-height:26px;color:${EMAIL_BRAND.muted};overflow-wrap:anywhere;">
<h1 class="email-heading" style="margin:0 0 22px;font:700 30px/36px Arial,Helvetica,sans-serif;letter-spacing:-.7px;color:#1c523c;">${
    escapeEmailHtml(title)
  }</h1>${bodyHtml}</td></tr>
<tr><td class="email-pad" style="padding:22px 36px;background:${EMAIL_BRAND.cream};border-top:1px solid ${EMAIL_BRAND.border};font-size:13px;line-height:22px;color:#435b47;">${
    signatureHtml ||
    "<strong>L’équipe Logisorama</strong><br>Votre recherche de logement, au même endroit."
  }</td></tr>
<tr><td class="email-pad" style="padding:22px 36px;font-size:12px;line-height:20px;color:#7b847a;"><strong>Logisorama · Immo-rama</strong><br><a href="${EMAIL_BRAND.site}" style="color:${EMAIL_BRAND.green};">logisorama.ch</a> · <a href="mailto:support@logisorama.ch" style="color:${EMAIL_BRAND.green};">support@logisorama.ch</a>${
    footerHtml ? `<div style="margin-top:12px;">${footerHtml}</div>` : ""
  }</td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
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
    category: "INFORMATION & SUIVI",
    bodyHtml: `<p style="margin:0 0 18px;">${
      userName ? `Bonjour ${escapeEmailHtml(userName)},` : "Bonjour,"
    }</p><div style="padding:22px;background:${EMAIL_BRAND.cream};border:1px solid ${EMAIL_BRAND.border};border-radius:5px;">${
      escapeEmailHtml(message).replace(/\r?\n/g, "<br>")
    }</div>${link ? emailButton("Voir les détails", link) : ""}${
      type === "app_update"
        ? emailButton(
          "Ouvrir dans App Store",
          "https://apps.apple.com/app/id6756940233",
        ) +
          emailButton(
            "Disponible sur Google Play",
            "https://play.google.com/store/apps/details?id=ch.logisorama.app",
          )
        : ""
    }`,
    footerHtml:
      "Vous pouvez gérer vos préférences de notification dans les paramètres de votre compte.",
  });
}
