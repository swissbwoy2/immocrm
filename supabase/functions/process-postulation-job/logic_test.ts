import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeDeterministic, finalStatus, identityKind, nextBackoffSeconds } from "./logic.ts";

const recent = new Date().toISOString();
const fullDocs = [
  "fiche_salaire", "fiche_salaire", "fiche_salaire", "extrait_poursuites", "permis_sejour",
  "attestation_domicile", "attestation_employeur", "rc_menage",
].map((t) => ({ type_document: t, date_upload: recent }));

Deno.test("dossier complet : prêt, rien de manquant", () => {
  const d = computeDeterministic({ offre: { prix: 1500 }, client: { type_permis: "B", revenus_mensuels: 6000 }, candidates: [], documents: fullDocs });
  assertEquals(d.missing, []);
  assertEquals(d.indicators.revenu_total_sur_loyer, 4);
  assertEquals(finalStatus(d.missing, null), "ready");
});

Deno.test("pièces manquantes : bloqué même si l'IA dit prêt", () => {
  const d = computeDeterministic({ offre: { prix: 1500 }, client: { type_permis: "B", revenus_mensuels: 6000 }, candidates: [], documents: fullDocs.slice(1) });
  assertEquals(d.missing, ["Fiches de salaire (2/3)"]);
  assertEquals(finalStatus(d.missing, { readiness: "ready" }), "blocked");
});

Deno.test("poursuites trop anciennes", () => {
  const old = fullDocs.map((x) => x.type_document === "extrait_poursuites" ? { ...x, date_upload: "2020-01-01T00:00:00Z" } : x);
  const d = computeDeterministic({ offre: { prix: 1500 }, client: { type_permis: "C", revenus_mensuels: 6000 }, candidates: [], documents: old });
  assertEquals(d.missing, ["Extrait des poursuites de moins de 3 mois"]);
});

Deno.test("permis B → permis de séjour ; Suisse → pièce d'identité", () => {
  assertEquals(identityKind("B"), "permis_sejour");
  assertEquals(identityKind("Suisse"), "piece_identite");
});

Deno.test("backoff exponentiel plafonné", () => {
  assertEquals([1, 2, 3, 10].map(nextBackoffSeconds), [30, 60, 120, 3600]);
});

Deno.test("RC ménage absente : jamais bloquante, signalée comme recommandée", () => {
  const docs = ["piece_identite", "extrait_poursuites", "fiche_salaire", "fiche_salaire", "fiche_salaire", "attestation_domicile", "contrat_travail"]
    .map((t) => ({ type_document: t, date_upload: new Date().toISOString() }));
  const d = computeDeterministic({ offre: { prix: 1000 }, client: { revenus_mensuels: 4000, type_permis: "Suisse" }, candidates: [], documents: docs });
  assertEquals(d.missing, []);
  assertEquals(d.optional, ["Attestation RC ménage (recommandée, non bloquante)"]);
  assertEquals(finalStatus(d.missing, null), "ready");
});
