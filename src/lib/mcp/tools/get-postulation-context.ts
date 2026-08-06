import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAutomationOperator, textResult, toZurichISO } from "../guard";

export default defineTool({
  name: "get_postulation_context",
  title: "Contexte d'une postulation",
  description:
    "Retourne le dossier borné d'UNE postulation : l'offre, le client, ses co-candidats et les documents liés. Aucun autre dossier n'est accessible.",
  inputSchema: {
    postulation_id: z.string().uuid().describe("Identifiant de l'offre (postulation)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ postulation_id }, ctx) => {
    const { supabase } = await requireAutomationOperator(ctx);

    const { data: offre, error } = await supabase
      .from("offres")
      .select(
        "id, created_at, date_envoi, adresse, prix, pieces, surface, etage, type_bien, description, lien_annonce, statut, disponibilite, contact_gerance, contact_annonceur, contact_visite, client_id",
      )
      .eq("id", postulation_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!offre) throw new ToolError("404 not found: postulation introuvable ou non autorisée.");

    const { data: client } = await supabase
      .from("clients")
      .select(
        "id, user_id, nationalite, type_permis, situation_familiale, profession, employeur, revenus_mensuels, charges_mensuelles, type_contrat, date_naissance, adresse, nombre_occupants, animaux, statut",
      )
      .eq("id", offre.client_id)
      .maybeSingle();

    let profile: { prenom: string | null; nom: string | null; email: string | null; telephone: string | null } | null = null;
    if (client?.user_id) {
      const { data } = await supabase
        .from("profiles")
        .select("id, prenom, nom, email, telephone")
        .eq("id", client.user_id)
        .maybeSingle();
      if (data) profile = { prenom: data.prenom, nom: data.nom, email: data.email, telephone: data.telephone };
    }

    const { data: candidates } = await supabase
      .from("client_candidates")
      .select(
        "id, type, prenom, nom, email, telephone, date_naissance, nationalite, type_permis, situation_familiale, profession, employeur, type_contrat, revenus_mensuels, charges_mensuelles",
      )
      .eq("client_id", offre.client_id);

    const { data: documents } = await supabase
      .from("documents")
      .select("id, nom, type_document, type, taille, statut, date_upload, candidate_id")
      .or(`client_id.eq.${offre.client_id}${client?.user_id ? `,user_id.eq.${client.user_id}` : ""}`)
      .order("date_upload", { ascending: false })
      .limit(300);

    return textResult({
      postulation: {
        postulation_id: offre.id,
        created_at: toZurichISO(offre.created_at),
        date_envoi: toZurichISO(offre.date_envoi),
        adresse: offre.adresse,
        prix: offre.prix,
        pieces: offre.pieces,
        surface: offre.surface,
        etage: offre.etage,
        type_bien: offre.type_bien,
        description: offre.description,
        lien_annonce: offre.lien_annonce,
        statut: offre.statut,
        disponibilite: offre.disponibilite,
        contact_gerance: offre.contact_gerance,
        contact_annonceur: offre.contact_annonceur,
        contact_visite: offre.contact_visite,
      },
      client: client
        ? {
            client_id: client.id,
            prenom: profile?.prenom ?? null,
            nom: profile?.nom ?? null,
            email: profile?.email ?? null,
            telephone: profile?.telephone ?? null,
            date_naissance: client.date_naissance,
            nationalite: client.nationalite,
            type_permis: client.type_permis,
            situation_familiale: client.situation_familiale,
            profession: client.profession,
            employeur: client.employeur,
            type_contrat: client.type_contrat,
            revenus_mensuels: client.revenus_mensuels,
            charges_mensuelles: client.charges_mensuelles,
            adresse: client.adresse,
            nombre_occupants: client.nombre_occupants,
            animaux: client.animaux,
            statut: client.statut,
          }
        : null,
      co_candidats: candidates ?? [],
      documents: (documents ?? []).map((d) => ({
        document_id: d.id,
        nom: d.nom,
        type_document: d.type_document,
        mime: d.type,
        taille: d.taille,
        statut: d.statut,
        date_upload: toZurichISO(d.date_upload),
        candidate_id: d.candidate_id,
      })),
    });
  },
});
