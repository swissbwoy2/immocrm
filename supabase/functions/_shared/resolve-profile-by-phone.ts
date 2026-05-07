// Resolve a profile by an incoming WhatsApp phone number.
// Multiple profiles may share the same phone (legacy data); pick the most relevant
// one based on recent activity (visite/offre). Falls back to first match.

export async function resolveClientProfileByPhone(
  supabase: any,
  phoneE164: string,
): Promise<{ id: string; prenom: string | null; nom: string | null; telephone: string | null } | null> {
  const stripped = phoneE164.replace("+", "");
  const variants = Array.from(new Set([
    phoneE164,
    stripped,
    "+" + stripped,
    "0" + stripped.replace(/^41/, ""),
  ]));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, prenom, nom, telephone, whatsapp_phone")
    .or(
      variants.flatMap((v) => [`whatsapp_phone.eq.${v}`, `telephone.eq.${v}`]).join(","),
    )
    .limit(20);

  const list = (profiles || []) as any[];
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];

  // Multi-match: prefer the profile that owns a CLIENT with the most recent visite/offre
  const userIds = list.map((p) => p.id);
  const { data: clients } = await supabase
    .from("clients")
    .select("id, user_id")
    .in("user_id", userIds);

  if (clients && clients.length > 0) {
    const clientIds = clients.map((c: any) => c.id);
    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: recentVisites }, { data: recentOffres }] = await Promise.all([
      supabase
        .from("visites")
        .select("client_id, created_at")
        .in("client_id", clientIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("offres")
        .select("client_id, created_at")
        .in("client_id", clientIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const winnerClientId =
      (recentVisites?.[0]?.client_id) ||
      (recentOffres?.[0]?.client_id) ||
      null;

    if (winnerClientId) {
      const winnerUserId = clients.find((c: any) => c.id === winnerClientId)?.user_id;
      const winner = list.find((p) => p.id === winnerUserId);
      if (winner) return winner;
    }

    // Otherwise prefer any profile that has a client over those that don't
    const withClient = list.find((p) => clients.some((c: any) => c.user_id === p.id));
    if (withClient) return withClient;
  }

  console.warn("[resolveClientProfileByPhone] ambiguous phone, falling back to first", phoneE164, list.map((p) => p.id));
  return list[0];
}
