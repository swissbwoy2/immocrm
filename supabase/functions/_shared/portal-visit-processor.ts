import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type Listing,
  parsePortalInquiry,
  resolveInquiryListing,
} from "./portal-visit-parser.ts";
import {
  emailButton,
  escapeEmailHtml,
  renderCorporateEmail,
} from "./email-brand.ts";
export async function processPortalVisitRequests(
  db: SupabaseClient,
): Promise<number> {
  const { data: pending, error } = await db.rpc("portal_visit_pending");
  if (error) throw error;
  if (!pending?.length) return 0;
  const [a, b] = await Promise.all([
    db.from("annonces_publiques").select(
      "id,reference,adresse,code_postal,ville,slug,titre,type_transaction",
    ).eq("statut", "publie").or(
      "date_expiration.is.null,date_expiration.gt." + new Date().toISOString(),
    ),
    db.from("portal_visit_aliases").select("source,reference,annonce_id"),
  ]);
  if (a.error || b.error) throw a.error || b.error;
  let count = 0;
  for (const mail of pending) {
    const parsed = parsePortalInquiry(mail);
    const inquiry = parsed.inquiry;
    const listing = inquiry
      ? resolveInquiryListing(inquiry, a.data as Listing[], b.data || [])
      : null;
    const subject = listing ? "Votre demande de visite — " + listing.titre : "";
    const html = listing
      ? renderCorporateEmail({
        title: "Votre demande de visite",
        category: "VISITE · " + listing.ville,
        preview: subject,
        bodyHtml: `<p>Bonjour,</p><p>Merci pour votre intérêt pour <strong>${
          escapeEmailHtml(listing.titre)
        }</strong>.</p><p>Vous trouverez les photos, les conditions et les informations du bien dans l’annonce ci-dessous. Pour organiser une visite, consultez les créneaux et les modalités indiqués sur la page :</p>${
          emailButton(
            "Voir l’annonce et organiser une visite",
            "https://logisorama.ch/annonces/" + listing.slug,
          )
        }<p>Au plaisir de vous rencontrer !</p>`,
      })
      : "";
    const { error: e } = await db.rpc("portal_visit_process", {
      p_message: mail.id,
      p_source: inquiry?.source || mail.from_email,
      p_email: inquiry?.email || null,
      p_first: inquiry?.firstName || "",
      p_last: inquiry?.lastName || "",
      p_annonce: listing?.id || null,
      p_reason: inquiry
        ? (listing ? "" : "Annonce publiée introuvable ou ambiguë")
        : parsed.reason,
      p_subject: subject,
      p_html: html,
    });
    if (e) throw e;
    count++;
  }
  return count;
}
