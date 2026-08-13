// Helper partagé : vérifie si on a le droit d'envoyer un EMAIL DE NOTIFICATION.
// N'applique JAMAIS ces règles aux emails essentiels (auth, sécurité, mot de passe).
// Source de vérité : profiles.notifications_email + email_unsubscribes + suppressed_emails.

type AnyClient = {
  from: (table: string) => any;
};

export async function canSendNotificationEmail(
  supabase: AnyClient,
  opts: { userId?: string | null; email?: string | null },
): Promise<{ allowed: boolean; reason?: string; email?: string | null }> {
  let email = opts.email ?? null;

  if (opts.userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, notifications_email")
      .eq("id", opts.userId)
      .maybeSingle();

    if (profile) {
      email = email || profile.email;
      if (profile.notifications_email === false) {
        return { allowed: false, reason: "notifications_email_disabled", email };
      }
    }
  } else if (email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("notifications_email")
      .ilike("email", email)
      .maybeSingle();

    if (profile && profile.notifications_email === false) {
      return { allowed: false, reason: "notifications_email_disabled", email };
    }
  }

  if (!email) return { allowed: false, reason: "no_email", email };

  const lower = email.toLowerCase();

  const { data: unsub } = await supabase
    .from("email_unsubscribes")
    .select("email")
    .ilike("email", lower)
    .limit(1);
  if (unsub && unsub.length > 0) {
    return { allowed: false, reason: "unsubscribed", email };
  }

  const { data: suppressed } = await supabase
    .from("suppressed_emails")
    .select("email")
    .ilike("email", lower)
    .limit(1);
  if (suppressed && suppressed.length > 0) {
    return { allowed: false, reason: "suppressed", email };
  }

  return { allowed: true, email };
}
