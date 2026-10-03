// Local-only fixture: never imports Supabase and never makes network requests.
import type {
  Campaign,
  Contact,
  ImportRow,
  Category,
} from "../../../src/features/newsletter/model";
let contacts: Contact[] = [
  {
    id: "one",
    email: "anne@example.com",
    first_name: "Anne",
    last_name: "Exemple",
    kind: "client",
    categories: ["renter"],
    excluded: false,
    unsubscribed: false,
  },
  {
    id: "two",
    email: "marc@example.com",
    first_name: "Marc",
    last_name: "Exemple",
    kind: "prospect",
    categories: ["landlord", "seller"],
    excluded: false,
    unsubscribed: false,
  },
  {
    id: "three",
    email: "lea@example.com",
    first_name: "Léa",
    last_name: "Exemple",
    kind: "prospect",
    categories: ["buyer"],
    excluded: false,
    unsubscribed: true,
  },
];
let campaigns: Campaign[] = [];
export async function newsletterApi<T>(b: Record<string, unknown>): Promise<T> {
  let result: unknown;
  switch (b.action) {
    case "connection":
      result = {
        ready: true,
        sender: "support@logisorama.ch",
        message: "Infomaniak connecté (démonstration)",
      };
      break;
    case "contacts":
      result = { contacts };
      break;
    case "list":
      result = { campaigns };
      break;
    case "clients":
      result = {
        clients: [
          {
            email: "client@example.com",
            first_name: "Client",
            last_name: "Exemple",
          },
        ],
      };
      break;
    case "import": {
      const rows = b.rows as ImportRow[];
      for (const r of rows) {
        const prior = contacts.find((c) => c.email === r.email);
        if (prior)
          prior.categories = [
            ...new Set([...prior.categories, ...(b.categories as Category[])]),
          ];
        else
          contacts.push({
            ...r,
            id: crypto.randomUUID(),
            kind: b.kind as Contact["kind"],
            categories: b.categories as Category[],
            excluded: false,
            unsubscribed: false,
          });
      }
      result = { imported: rows.length };
      break;
    }
    case "contact-update":
      contacts = contacts.map((c) =>
        c.id === b.id ? ({ ...c, ...b } as Contact) : c,
      );
      result = {};
      break;
    case "save": {
      const c = {
        ...b,
        id: b.id || crypto.randomUUID(),
        revision: Number(b.revision || 0) + 1,
        status: "draft",
        scheduled_at: null,
        updated_at: new Date().toISOString(),
      } as Campaign;
      campaigns = [c, ...campaigns.filter((x) => x.id !== c.id)];
      result = { campaign: c };
      break;
    }
    case "get":
      result = {
        campaign: campaigns.find((c) => c.id === b.id),
        counts: { pending: 2 },
        issues: [],
      };
      break;
    case "queue": {
      const c = campaigns.find((c) => c.id === b.id)!;
      c.status = "queued";
      c.scheduled_at = (b.scheduled_at as string) || new Date().toISOString();
      result = { queued: (b.contact_ids as string[]).length };
      break;
    }
    case "cancel":
      campaigns.find((c) => c.id === b.id)!.status = "cancelled";
      result = { success: true };
      break;
    case "test":
      result = { success: true };
      break;
    default:
      throw new Error("Unknown fixture action");
  }
  return structuredClone(result) as T;
}
