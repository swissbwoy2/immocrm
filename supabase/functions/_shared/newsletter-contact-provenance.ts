// Only origin metadata is returned to the list; form answers stay in the detail endpoint.
type Row = Record<string, unknown>;
type Origin = {
  source: string;
  form_key: string;
  form_name: string;
  received_at: string | null;
  date_kind: "lead" | "added";
};
const value = (v: unknown) => typeof v === "string" ? v.trim() : "";
const date = (v: unknown) => {
  const s = value(v);
  const t = Date.parse(s);
  return s && Number.isFinite(t) ? new Date(t).toISOString() : null;
};
export function contactSource(raw: unknown, origin?: unknown) {
  const s = value(raw), o = value(origin).toLowerCase();
  if (o.includes("immobilier.ch")) return "immobilier.ch";
  if (o.includes("homegate.ch")) return "homegate.ch";
  if (o.includes("immoscout24") || o.includes("smg")) return "smg";
  if (s.startsWith("meta")) return "meta";
  if (s.startsWith("portails_location_email")) return "portails_email";
  return s || "unknown";
}
export function enrichContactOrigins<T extends Row>(
  contacts: T[],
  meta: Row[],
  leads: Row[],
  imports: Row[],
) {
  const byEmail = new Map<string, Origin[]>(),
    byId = new Map<string, Origin[]>();
  function add(
    map: Map<string, Origin[]>,
    key: string,
    source: string,
    name: unknown,
    formId: unknown,
    time: unknown,
    kind: Origin["date_kind"],
  ) {
    if (!key) return;
    const form_name = value(name), id = value(formId) || form_name;
    const entry: Origin = {
      source,
      form_key: id ? `${source}:${id}` : "",
      form_name: form_name || value(formId),
      received_at: date(time),
      date_kind: kind,
    };
    map.set(key, [...(map.get(key) || []), entry]);
  }
  for (const r of meta) {
    add(
      byEmail,
      value(r.email).toLowerCase(),
      "meta",
      r.form_name,
      r.form_id,
      r.lead_created_time_meta || r.created_at,
      r.lead_created_time_meta ? "lead" : "added",
    );
  }
  for (const r of leads) {
    add(
      byEmail,
      value(r.email).toLowerCase(),
      "shortlist",
      r.formulaire || r.source,
      null,
      r.created_at,
      "lead",
    );
  }
  for (const r of imports) {
    const a =
      (r.answers && typeof r.answers === "object" ? r.answers : {}) as Row;
    add(
      byId,
      value(r.contact_id),
      contactSource(r.source, a.Origine),
      a.Formulaire || a.form_name,
      a["Identifiant du formulaire"],
      a["Reçu le"],
      "lead",
    );
  }
  return contacts.map((c) => {
    const entries = [
      ...(byEmail.get(value(c.email).toLowerCase()) || []),
      ...(byId.get(value(c.id)) || []),
    ];
    const source = contactSource(c.source);
    // A dated original lead takes precedence over the date of a bulk import.
    const dated = entries.filter((x) => x.received_at).sort((a, b) =>
      Date.parse(b.received_at!) - Date.parse(a.received_at!)
    );
    if (
      !entries.some((x) => x.source === source) &&
      !(source === "portails_email" &&
        entries.some((x) =>
          ["immobilier.ch", "homegate.ch", "smg"].includes(x.source)
        ))
    ) {
      entries.push({
        source,
        form_key: "",
        form_name: "",
        received_at: null,
        date_kind: "added",
      });
    }
    const unique = new Map<string, Origin>();
    for (
      const e of entries.sort((a, b) =>
        (Date.parse(b.received_at || "") || 0) -
        (Date.parse(a.received_at || "") || 0)
      )
    ) {
      const key = `${e.source}|${e.form_key}`;
      if (!unique.has(key)) unique.set(key, e);
    }
    return {
      ...c,
      provenance: [...unique.values()],
      latest_lead_at: dated[0]?.received_at || date(c.created_at),
      latest_date_kind: dated[0]?.date_kind || "added",
    };
  });
}
