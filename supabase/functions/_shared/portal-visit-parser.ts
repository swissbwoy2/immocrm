export const PORTAL_SENDERS = [
  "mail@immobilier.ch",
  "interested@homegate.ch",
  "interested@immoscout24.ch",
];
export type InquiryMail = {
  from_email: string;
  subject: string | null;
  body_text: string | null;
  body_html?: string | null;
};
export type Inquiry = {
  source: string;
  email: string;
  firstName: string;
  lastName: string;
  propertyText: string;
  references: string[];
};
export type Listing = {
  id: string;
  reference: string;
  adresse: string;
  code_postal: string;
  ville: string;
  slug: string;
  titre: string;
  type_transaction: string;
};
export function plainPortalText(s: string): string {
  return s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(
      /<(?:br|p|div|td|th|tr|li)\b[^>]*>|<\/(?:p|div|td|th|tr|li)>/gi,
      "\n",
    ).replace(/<[^>]*>/g, "")
    .replace(
      /&#(x[0-9a-f]+|\d+);/gi,
      (_, n) =>
        String.fromCodePoint(
          Math.min(
            0x10ffff,
            n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n),
          ),
        ),
    )
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join("\n");
}
const normalized = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(
    /[^a-z0-9]+/g,
    " ",
  ).trim();
function value(block: string, label: string): string {
  return block.match(
    new RegExp("^(?:" + label + ")\\s*:?\\s*\\n?([^\\n]+)$", "im"),
  )?.[1]?.trim() || "";
}
export function parsePortalInquiry(
  mail: InquiryMail,
): { inquiry?: Inquiry; reason: string } {
  const sender = mail.from_email.trim().toLowerCase();
  if (!PORTAL_SENDERS.includes(sender)) {
    return { reason: "Expéditeur hors périmètre" };
  }
  const plain = plainPortalText(mail.body_text || "");
  const text =
    /Infos client|La personne suivante|The following person|Folgende Person|La seguente persona/i
        .test(plain)
      ? plain
      : plainPortalText(mail.body_html || plain);
  let contact: string, property: string;
  if (sender === "mail@immobilier.ch") {
    if (!/demande de contact/i.test(mail.subject || "")) {
      return { reason: "Message immobilier.ch sans demande de contact" };
    }
    const start = text.search(/Infos client\s*:/i);
    if (start < 0) return { reason: "Bloc client immobilier.ch introuvable" };
    // End before the free-form message, which is never trusted as routing metadata.
    contact =
      text.slice(start).split(/\n(?:Demande|Message)\s*:?\s*(?:\n|$)/i)[0];
    const p = text.match(
      /(?:Infos (?:bien|objet)|Informations (?:du|sur le) bien|Bien concerné|Votre bien|Objet concerné)\s*:?([\s\S]*)/i,
    );
    property = p?.[1] || "";
  } else {
    const start = text.search(
      /(?:La personne suivante est intéressée|The following person is interested|Folgende Person (?:interessiert sich|ist interessiert)|La seguente persona è interessata)\s*:/i,
    );
    if (start < 0) return { reason: "Bloc contact SMG introuvable" };
    contact = text.slice(start).split(
      /\n(?:Ton message|Votre message|Your message|Deine Nachricht|Nachricht|Il tuo messaggio)\s*:?\s*(?:\n|$)/i,
    )[0];
    property = text.slice(0, start).split(
      /(?:Objet d['’]intérêt|Property of interest|Interessiertes Objekt|Objekt von Interesse|Objekt|Oggetto d['’]interesse)\s*:/i,
    )[1] || "";
  }
  const emailValue = value(
    contact,
    "E-?mail(?: address)?|Adresse e-mail|E-Mail-Adresse",
  ).replace(/[<>\[\]]/g, "");
  if (
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(emailValue)
  ) return { reason: "Adresse du prospect absente ou ambiguë" };
  const email = emailValue.toLowerCase();
  if (
    /@(?:immo-rama\.ch|logisorama\.ch|immobilier\.ch|homegate\.ch|immoscout24\.ch)$/
      .test(email)
  ) return { reason: "Adresse agence ou portail exclue" };
  // Only the subject and dedicated property block supply identifiers; never the prospect's message.
  const references = [
    ...(mail.subject || "").matchAll(/(?:LOCATION|VENTE)_[A-Z0-9_]+/g),
    ...property.matchAll(/\b(?:AP-[A-Z0-9]+|400\d{7,})\b/gi),
  ].map((m) => m[0]);
  return {
    reason: "",
    inquiry: {
      source: sender.endsWith("@immobilier.ch")
        ? "immobilier.ch"
        : sender.endsWith("@homegate.ch")
        ? "homegate.ch"
        : "smg",
      email,
      firstName: value(contact, "Prénom|First name|Vorname|Nome"),
      lastName: value(contact, "Nom|Name|Nachname|Cognome"),
      propertyText: property,
      references,
    },
  };
}
export function resolveInquiryListing(
  inquiry: Inquiry,
  listings: Listing[],
  aliases: { source: string; reference: string; annonce_id: string }[],
): Listing | null {
  const refs = new Set(inquiry.references.map(normalized));
  const ids = new Set(
    aliases.filter((a) =>
      a.source === inquiry.source && refs.has(normalized(a.reference))
    ).map((a) => a.annonce_id),
  );
  const property = " " + normalized(inquiry.propertyText) + " ";
  for (const l of listings) {
    if (refs.has(normalized(l.reference))) ids.add(l.id);
    // Street AND house number AND locality are required, and must identify one live listing.
    const address = normalized(l.adresse || "").replace(
      new RegExp(" " + normalized(l.code_postal + " " + l.ville) + "$"),
      "",
    );
    if (
      /\d/.test(address) && address.length >= 8 &&
      property.includes(" " + address + " ") &&
      property.includes(" " + normalized(l.code_postal + " " + l.ville) + " ")
    ) ids.add(l.id);
  }
  const matches = listings.filter((l) => ids.has(l.id));
  return matches.length === 1 ? matches[0] : null;
}
