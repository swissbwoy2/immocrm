// Broadcast unsubscribe preferences must also be respected by API email sends.
// Fail closed if the provider cannot be checked; never silently bypass opt-outs.
export async function resendOptouts(
  key: string,
  request: typeof fetch = fetch,
): Promise<string[]> {
  const emails = new Set<string>();
  let after = "";
  for (let page = 0; page < 100; page++) {
    const response = await request(
      `https://api.resend.com/contacts?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw new Error(
        `Impossible de vérifier les désinscriptions Resend (${response.status}). Une clé autorisée à lire les contacts est requise.`,
      );
    const body = await response.json();
    if (!Array.isArray(body.data) || typeof body.has_more !== "boolean")
      throw new Error("Réponse contacts Resend invalide");
    for (const contact of body.data)
      if (contact.unsubscribed === true)
        emails.add(String(contact.email).toLowerCase());
    if (!body.has_more) return [...emails];
    const next = body.data.at(-1)?.id;
    if (!next || next === after) throw new Error("Pagination Resend invalide");
    after = next;
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(
    "Plus de 10 000 contacts Resend : synchronisation à adapter avant envoi",
  );
}
