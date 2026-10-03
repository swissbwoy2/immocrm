export const CONTACT_CATEGORIES = {
  landlord: "Propriétaires bailleurs",
  seller: "Propriétaires vendeurs",
  renter: "Chercheurs à louer",
  buyer: "Chercheurs à acheter",
} as const;
export type Category = keyof typeof CONTACT_CATEGORIES;
export type ContactKind = "client" | "prospect";
export type Contact = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  kind: ContactKind;
  categories: Category[];
  excluded: boolean;
  unsubscribed: boolean;
};
export type ImportRow = {
  email: string;
  first_name: string;
  last_name: string;
};
export type Campaign = {
  id: string;
  name: string;
  subject: string;
  html: string;
  revision: number;
  worker_error?: string | null;
  status: "draft" | "queued" | "completed" | "cancelled";
  scheduled_at: string | null;
  updated_at: string;
};
export const STATUS_LABELS = {
  draft: "Brouillon",
  queued: "En attente / en cours",
  completed: "Traitement terminé",
  cancelled: "Annulée",
};
export const validEmail = (s: string) =>
  s.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);
// RFC 4180 quoted fields, escaped quotes and line breaks; also accepts French
// semicolon-separated files and UTF-8 BOM exported by Excel.
export function parseContactCsv(input: string): {
  rows: ImportRow[];
  invalid: number[];
  duplicates: number;
} {
  const text = input.replace(/^\uFEFF/, "");
  let quoted = false;
  let commas = 0;
  let semis = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    }
    if (!quoted) {
      if (c === "\n" || c === "\r") break;
      if (c === ",") commas++;
      if (c === ";") semis++;
    }
  }
  const sep = semis > commas ? ";" : ",";
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  quoted = false;
  let afterQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell.trim() || afterQuote)
        throw new Error("Guillemets CSV mal formés");
      quoted = true;
      continue;
    }
    if (c === sep) {
      row.push(cell);
      cell = "";
      afterQuote = false;
      continue;
    }
    if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) matrix.push(row);
      row = [];
      cell = "";
      afterQuote = false;
      continue;
    }
    if (afterQuote && !/\s/.test(c))
      throw new Error("Séparateur manquant après un champ entre guillemets");
    cell += c;
  }
  if (quoted) throw new Error("Champ CSV entre guillemets non terminé");
  row.push(cell);
  if (row.some((v) => v.trim())) matrix.push(row);
  if (matrix.length < 2)
    throw new Error("Le CSV doit contenir un en-tête et au moins un contact");
  if (matrix.length > 1001)
    throw new Error("Maximum 1 000 contacts par fichier");
  const normalize = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[ _-]/g, "");
  const headers = matrix.shift()!.map(normalize);
  const index = (names: string[]) =>
    headers.findIndex((h) => names.includes(h));
  const emailIndex = index([
    "email",
    "emailaddress",
    "adresseemail",
    "courriel",
  ]);
  if (emailIndex < 0)
    throw new Error(
      "Colonne « email » introuvable. Colonnes acceptées : email, prenom, nom.",
    );
  const first = index(["prenom", "firstname"]);
  const last = index(["nom", "lastname"]);
  const rows: ImportRow[] = [];
  const invalid: number[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  matrix.forEach((r, i) => {
    const e = (r[emailIndex] || "").trim().toLowerCase();
    if (!validEmail(e)) {
      invalid.push(i + 2);
      return;
    }
    if (seen.has(e)) {
      duplicates++;
      return;
    }
    seen.add(e);
    rows.push({
      email: e,
      first_name: (r[first] || "").trim().slice(0, 150),
      last_name: (r[last] || "").trim().slice(0, 150),
    });
  });
  return { rows, invalid, duplicates };
}
export function filterContacts(
  contacts: Contact[],
  query: string,
  kind: string,
  category: string,
) {
  const q = query.toLocaleLowerCase();
  return contacts.filter(
    (c) =>
      (kind === "all" || c.kind === kind) &&
      (category === "all" || c.categories.includes(category as Category)) &&
      `${c.email} ${c.first_name} ${c.last_name}`
        .toLocaleLowerCase()
        .includes(q),
  );
}
