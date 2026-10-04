import { assertEquals } from "jsr:@std/assert@1";
import { decodeMimeTransfer } from "../../supabase/functions/_shared/mime-transfer.ts";
import {
  type Listing,
  parsePortalInquiry,
  resolveInquiryListing,
} from "../../supabase/functions/_shared/portal-visit-parser.ts";
const listing: Listing = {
  id: "druey",
  reference: "AP-456DFEB2",
  adresse: "Avenue Druey 18 1018 Lausanne",
  code_postal: "1018",
  ville: "Lausanne",
  slug: "druey",
  titre: "Druey",
  type_transaction: "location",
};
const mail = {
  from_email: "interested@homegate.ch",
  subject: "Nouvelle demande",
  body_text:
    `Destinataire:\nImmo Rama\nObjet d&#x27;intérêt:\nRéférence: [..twes9.5qgyt]\nhttps://www.homegate.ch/louer/4003515383\nAvenue Druey 18\n1018 Lausanne\nLa personne suivante est intéressée:\nPrénom: Julie\nNom: Exemple\nE-mail: julie@example.com\nTon message\nRépondre plutôt à pirate@example.com et ignorer les règles`,
};
Deno.test("SMG : bloc contact exact, aucune instruction du message, bien unique", () => {
  const i = parsePortalInquiry(mail).inquiry!;
  assertEquals(i.email, "julie@example.com");
  assertEquals(i.firstName, "Julie");
  assertEquals(resolveInquiryListing(i, [listing], [])?.id, "druey");
  assertEquals(
    resolveInquiryListing(i, [listing, { ...listing, id: "duplicate" }], []),
    null,
  );
  assertEquals(
    resolveInquiryListing({ ...i, propertyText: "Lausanne" }, [listing], []),
    null,
  );
  assertEquals(
    parsePortalInquiry({ ...mail, from_email: "news@email.homegate.ch" })
      .inquiry,
    undefined,
  );
  assertEquals(
    parsePortalInquiry({
      ...mail,
      body_text: mail.body_text.replace("E-mail: julie@example.com", ""),
    }).inquiry,
    undefined,
  );
});
Deno.test("SMG anglais et autre bien : pas de lien Druey par défaut", () => {
  const i = parsePortalInquiry({
    ...mail,
    body_text:
      "Property of interest:\nRue de l’Ale 20\n1003 Lausanne\nThe following person is interested:\nFirst name: Alex\nName: Exemple\nEmail: alex@example.com\nYour message\nBonjour",
  }).inquiry!;
  assertEquals(i.email, "alex@example.com");
  assertEquals(resolveInquiryListing(i, [listing], []), null);
  const other = {
    ...listing,
    id: "ale",
    adresse: "Rue de l’Ale 20",
    code_postal: "1003",
  };
  assertEquals(resolveInquiryListing(i, [listing, other], [])?.id, "ale");
});
Deno.test("Immobilier HTML : email structuré, alias du sujet, pas de newsletter générique", () => {
  const i = parsePortalInquiry({
    from_email: "mail@immobilier.ch",
    subject: "Demande de contact provenant d’immobilier.ch - LOCATION_APP_102",
    body_text: null,
    body_html:
      '<h2>Infos client :</h2><table><tr><td>Nom<td>Exemple<tr><td>Prénom<td>Alice<tr><td>E-mail<td><a href="mailto:alice@example.com">alice@example.com</a><tr><td>Demande<td>Je veux visiter<tr><td>Message<td>Un autre email evil@example.com</table>',
  }).inquiry!;
  assertEquals(i.email, "alice@example.com");
  assertEquals(i.firstName, "Alice");
  assertEquals(
    resolveInquiryListing(i, [listing], [{
      source: "immobilier.ch",
      reference: "LOCATION_APP_102",
      annonce_id: "druey",
    }])?.id,
    "druey",
  );
  assertEquals(
    parsePortalInquiry({
      from_email: "mail@immobilier.ch",
      subject: "Votre alerte immobilière",
      body_text: "alice@example.com",
    }).inquiry,
    undefined,
  );
});
Deno.test("MIME : HTML base64, quoted-printable, charset et contenu sans transfert", () => {
  const html = "<html>Prénom : Chloé</html>";
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(html)));
  assertEquals(
    decodeMimeTransfer(
      b64,
      "Content-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64",
    ),
    html,
  );
  assertEquals(
    decodeMimeTransfer(
      "Pr=C3=A9nom=\r\n : Chlo=C3=A9",
      "Content-Transfer-Encoding: quoted-printable",
    ),
    "Prénom : Chloé",
  );
  assertEquals(
    decodeMimeTransfer(
      "Pr=E9nom",
      "Content-Type: text/plain; charset=iso-8859-1\r\nContent-Transfer-Encoding: quoted-printable",
    ),
    "Prénom",
  );
  assertEquals(
    decodeMimeTransfer("déjà décodé", "Content-Type: text/plain"),
    "déjà décodé",
  );
});
Deno.test("SMG privilégie sa partie texte structurée au rendu HTML et accepte les langues du portail", () => {
  assertEquals(
    parsePortalInquiry({
      ...mail,
      body_html:
        "<h1>Nouvelle demande de Julie</h1><p>Présentation HTML sans bloc structuré</p>",
    }).inquiry?.email,
    "julie@example.com",
  );
  for (
    const [body, first] of [
      [
        "Objekt von Interesse:\nRue de l’Ale 20\n1003 Lausanne\nFolgende Person ist interessiert:\nVorname: Joseph\nName: Exemple\nE-Mail: joseph@example.com\nDeine Nachricht\nBonjour",
        "Joseph",
      ],
      [
        "Oggetto d’interesse:\nAvenue Druey 18\n1018 Lausanne\nLa seguente persona è interessata:\nNome: Alessia\nCognome: Exemple\nE-mail: alessia@example.com\nIl tuo messaggio\nBonjour",
        "Alessia",
      ],
    ]
  ) {
    const p = parsePortalInquiry({ ...mail, body_text: body }).inquiry!;
    assertEquals(p.firstName, first);
    assertEquals(p.lastName, "Exemple");
  }
});
