import { assertEquals } from "jsr:@std/assert@1";
import { enrichContactOrigins } from "../../supabase/functions/_shared/newsletter-contact-provenance.ts";
import {
  type Contact,
  filterContacts,
} from "../../src/features/newsletter/model.ts";
const contact = (id: string) => ({
  id,
  email: `${id}@example.com`,
  first_name: "",
  last_name: "",
  kind: "prospect",
  categories: [],
  excluded: false,
  unsubscribed: false,
  source: "hubspot",
  created_at: "2026-10-04T12:00:00Z",
});
Deno.test("original lead dates beat bulk import dates; newest first with deterministic ties", () => {
  const rows = enrichContactOrigins(
    [contact("old"), contact("new"), contact("email")],
    [
      {
        email: "old@example.com",
        form_name: "Old form",
        form_id: "1",
        lead_created_time_meta: "2026-09-01T12:00:00Z",
        created_at: "2026-10-04T12:00:00Z",
      },
      {
        email: "new@example.com",
        form_name: "New form",
        form_id: "2",
        lead_created_time_meta: "2026-10-04T13:00:00Z",
      },
    ],
    [],
    [{
      contact_id: "email",
      source: "portails_location_email_20261004",
      answers: {
        Origine: "mail@immobilier.ch",
        "Reçu le": "2026-10-01 08:33:15+00",
      },
    }],
  ) as Contact[];
  assertEquals(filterContacts(rows, "", "all", "all").map((x) => x.id), [
    "new",
    "email",
    "old",
  ]);
  assertEquals(rows[2].provenance?.[0].source, "immobilier.ch");
  assertEquals(rows[0].latest_date_kind, "lead");
});
Deno.test("combined source and form filters must match the same provenance", () => {
  const rows = enrichContactOrigins([contact("multi")], [{
    email: "multi@example.com",
    form_name: "Recherche",
    form_id: "42",
    lead_created_time_meta: "2026-10-04T13:00:00Z",
  }], [{
    email: "multi@example.com",
    formulaire: "Recherche",
    created_at: "2026-09-01",
  }], []) as Contact[];
  assertEquals(
    filterContacts(rows, "", "prospect", "all", "meta", "meta:42").length,
    1,
  );
  assertEquals(
    filterContacts(rows, "", "all", "all", "shortlist", "meta:42").length,
    0,
  );
  assertEquals(
    rows[0].provenance?.filter((p) => p.form_name === "Recherche").length,
    2,
  );
});
Deno.test("unknown original dates explicitly use added date and malformed dates are harmless", () => {
  const rows = enrichContactOrigins([contact("csv")], [], [], [{
    contact_id: "csv",
    source: "hubspot",
    answers: { "Reçu le": "invalid" },
  }]) as Contact[];
  assertEquals(rows[0].latest_date_kind, "added");
  assertEquals(rows[0].latest_lead_at, "2026-10-04T12:00:00.000Z");
  assertEquals(filterContacts(rows, "", "all", "all", "hubspot").length, 1);
});
