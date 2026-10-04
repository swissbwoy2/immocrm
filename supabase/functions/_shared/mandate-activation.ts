/** Input must come from the stored mandate, never from the request body. */
export function canActivateMandate(
  mandate: {
    signature_data?: string | null;
    cgv_acceptees?: boolean | null;
    statut?: string | null;
    date_paiement?: string | null;
  } | null,
  staff: boolean,
  lightInvitation: boolean,
): boolean {
  return !!mandate && !lightInvitation && !!mandate.signature_data?.trim() &&
    mandate.cgv_acceptees === true &&
    (staff || mandate.statut === "active" ||
      (!!mandate.date_paiement &&
        ["paye", "active"].includes(mandate.statut || "")));
}
