// Calculs déterministes de la qualification d'un dossier (sans IA, sans donnée nominative).
// deno-lint-ignore-file no-explicit-any

const POURSUITES_MAX_DAYS = 90;

export function identityKind(typePermis?: string | null): "permis_sejour" | "piece_identite" {
  return typePermis && ["B", "C", "F", "N"].includes(typePermis) ? "permis_sejour" : "piece_identite";
}

export function computeDeterministic(input: {
  offre: any; client: any; candidates: any[]; documents: { type_document: string | null; date_upload: string | null }[];
}) {
  const { offre, client, candidates, documents } = input;
  const count = (types: string[]) => documents.filter((d) => d.type_document && types.includes(d.type_document)).length;
  const now = Date.now();
  const freshPoursuites = documents.some((d) =>
    d.type_document === "extrait_poursuites" && d.date_upload &&
    now - new Date(d.date_upload).getTime() <= POURSUITES_MAX_DAYS * 86_400_000
  );

  const missing: string[] = [];
  const salaires = count(["fiche_salaire"]);
  if (salaires < 3) missing.push(`Fiches de salaire (${salaires}/3)`);
  if (!freshPoursuites) missing.push("Extrait des poursuites de moins de 3 mois");
  if (count(["piece_identite", "permis_sejour"]) < 1) {
    missing.push(identityKind(client?.type_permis) === "permis_sejour" ? "Permis de séjour (recto + verso)" : "Pièce d'identité (recto + verso)");
  }
  if (count(["attestation_domicile"]) < 1) missing.push("Attestation de domicile");
  if (count(["contrat_travail", "attestation_employeur"]) < 1) missing.push("Contrat de travail / attestation employeur");
  if (count(["rc_menage"]) < 1) missing.push("Attestation RC ménage");
  if (!client?.revenus_mensuels) missing.push("Revenu mensuel non renseigné");
  if (!client?.type_permis) missing.push("Type de permis non renseigné");

  const revenus = Number(client?.revenus_mensuels || 0) +
    (candidates || []).reduce((s, c) => s + Number(c?.revenus_mensuels || 0), 0);
  const loyer = Number(offre?.prix || 0);
  const ratio = loyer > 0 && revenus > 0 ? Math.round((revenus / loyer) * 100) / 100 : null;
  const indicators = {
    revenu_total_sur_loyer: ratio,
    revenu_suffisant: ratio === null ? null : ratio >= 3,
    co_candidats: (candidates || []).length,
    documents_total: documents.length,
  };

  const priority = missing.length === 0 ? (ratio !== null && ratio >= 3 ? "high" : "normal") : missing.length <= 2 ? "normal" : "low";
  const summary = missing.length === 0
    ? `Dossier complet${ratio !== null ? `, revenus ${ratio}× le loyer` : ""}. Prêt pour contrôle staff.`
    : `${missing.length} élément(s) manquant(s) avant dépôt.`;
  const actions = missing.length === 0
    ? ["Vérifier le dossier puis déposer la candidature auprès de la régie"]
    : ["Demander au client les éléments manquants", "Relancer le dossier une fois complété"];

  return {
    missing,
    indicators,
    priority,
    summary,
    actions,
    presentTypes: Array.from(new Set(documents.map((d) => d.type_document).filter(Boolean))),
    offerFacts: { loyer: offre?.prix ?? null, pieces: offre?.pieces ?? null, surface: offre?.surface ?? null, type_bien: offre?.type_bien ?? null },
    profileFacts: {
      type_permis: client?.type_permis ?? null, type_contrat: client?.type_contrat ?? null,
      revenus_mensuels: client?.revenus_mensuels ?? null, nombre_occupants: client?.nombre_occupants ?? null,
      animaux: client?.animaux ?? null, co_candidats: (candidates || []).length,
    },
  };
}

/** Des pièces manquantes calculées en code bloquent toujours, quoi que dise l'IA. */
export function finalStatus(missing: string[], ai: { readiness?: string } | null): "ready" | "blocked" {
  if (missing.length > 0) return "blocked";
  return ai?.readiness === "blocked" ? "blocked" : "ready";
}

export function nextBackoffSeconds(attempt: number): number {
  return Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1));
}
