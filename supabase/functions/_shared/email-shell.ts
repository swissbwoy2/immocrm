/**
 * String e-mail shell for functions that build raw HTML.
 * Implementation lives in email-brand.ts (single source of tokens); this module
 * is the documented entry point:
 *
 *   renderEmailLayout({ preheader, title, category, intro, details, cta, body, footerNote })
 *
 * plus the building blocks emailParagraph, emailDetails, emailNotice, emailList,
 * emailButton(s), emailCode, emailSubheading, emailDivider, emailTable,
 * and the safe date / amount helpers re-exported from date-fr.ts.
 */
export {
  css,
  EMAIL_BRAND,
  EMAIL_THEME,
  emailBadge,
  emailButton,
  emailButtons,
  emailCode,
  emailDetails,
  emailDivider,
  emailList,
  emailListingCard,
  emailNotice,
  emailParagraph,
  emailSubheading,
  emailTable,
  emailUrl,
  escapeEmailHtml,
  renderCorporateEmail,
  renderEmailLayout,
  renderNotificationEmail,
} from "./email-brand.ts";
export type { EmailDetailRow, EmailLayoutOptions } from "./email-brand.ts";
export {
  formatCHF,
  formatDateFR,
  formatDateTimeFR,
  formatTimeFR,
  greetingFR,
  humanizeISODates,
} from "./date-fr.ts";
