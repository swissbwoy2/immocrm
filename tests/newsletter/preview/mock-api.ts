import { trackingFixture } from "./tracking-fixtures";
// Local-only fixture: never imports Supabase and never makes network requests.
import type {
  Campaign,
  Category,
  Contact,
  ImportRow,
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
const forms: Record<string, unknown>[] = [];
export async function newsletterApi<T>(b: Record<string, unknown>): Promise<T> {
  if(String(b.action).startsWith("tracking-")) return trackingFixture(b) as T;
  let result: unknown;
  switch (b.action) {
    case "sync-leads":
      result = { shortlist: { imported: 2 }, meta: { imported: 1 } };
      break;
    case "contact-answers":
      result = {
        shortlist: [{
          formulaire: "Recherche de logement",
          type_recherche: "location",
          localite: "Lausanne",
        }],
        meta: [{
          form_name: "Projet immobilier",
          answers: { "Souhaitez-vous acheter ou louer ?": "Louer" },
        }],
        imports: [],
      };
      break;
    case "asset-upload":
      result = { url: "https://logisorama.ch/newsletter/visuel-premium.jpg" };
      break;
    case "forms-list":
      result = { forms };
      break;
    case "form-save": {
      const id = String(b.id || b.request_id);
      const f = {
        ...b,
        id,
        provider_form_id: 123,
        provider_domain_id: 66294,
        updated_at: new Date().toISOString(),
      };
      const index = forms.findIndex((x) => x.id === id);
      if (index >= 0) forms[index] = f;
      else forms.push(f);
      result = { id };
      break;
    }
    case "form-get": {
      const f = forms.find((x) => x.id === b.id)!;
      result = {
        local: f,
        form: {
          ...f,
          fields: [
            { id: 2, selected: f.firstname },
            { id: 3, selected: f.lastname },
          ],
          codes: {
            js: '<script src="https://example.com/form.js"></script>',
            html: "<form>Exemple local</form>",
          },
          statistics: { display: 0, conversions: 0 },
        },
      };
      break;
    }
    case "form-sync":
      result = { imported: 0 };
      break;
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
        if (prior) {
          prior.categories = [
            ...new Set([...prior.categories, ...(b.categories as Category[])]),
          ];
        } else {
          contacts.push({
            ...r,
            id: crypto.randomUUID(),
            kind: b.kind as Contact["kind"],
            categories: b.categories as Category[],
            excluded: false,
            unsubscribed: false,
          });
        }
      }
      result = { imported: rows.length };
      break;
    }
    case "contact-update":
      contacts = contacts.map((c) =>
        c.id === b.id ? ({ ...c, ...b } as Contact) : c
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
