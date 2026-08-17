// Contrôle d'accès partagé pour le module Rénovation.
// Vérifie que l'utilisateur est admin, membre du projet, entreprise rattachée
// au projet, ou agent gérant l'immeuble concerné.
// deno-lint-ignore-file no-explicit-any

export interface RenovationAccess {
  allowed: boolean;
  isAdmin: boolean;
  roles: string[];
  reason?: string;
}

export async function checkRenovationProjectAccess(
  svc: any,
  userId: string,
  projectId: string,
): Promise<RenovationAccess> {
  const { data: rolesRows } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles: string[] = (rolesRows || []).map((r: any) => r.role);

  if (roles.includes("admin")) return { allowed: true, isAdmin: true, roles };

  if (!projectId) {
    return { allowed: false, isAdmin: false, roles, reason: "projectId manquant" };
  }

  // Membre explicite du projet
  const { data: member } = await svc
    .from("renovation_project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (member) return { allowed: true, isAdmin: false, roles };

  const { data: project } = await svc
    .from("renovation_projects")
    .select("id, created_by, immeuble_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { allowed: false, isAdmin: false, roles, reason: "projet introuvable" };
  }
  if (project.created_by === userId) return { allowed: true, isAdmin: false, roles };

  // Entreprise rattachée au projet
  const { data: companyUser } = await svc
    .from("renovation_company_users")
    .select("company_id")
    .eq("user_id", userId);
  const companyIds = (companyUser || []).map((c: any) => c.company_id);
  if (companyIds.length > 0) {
    const { data: pc } = await svc
      .from("renovation_project_companies")
      .select("id")
      .eq("project_id", projectId)
      .in("company_id", companyIds)
      .limit(1);
    if (pc && pc.length > 0) return { allowed: true, isAdmin: false, roles };
  }

  // Agent responsable de l'immeuble concerné
  if (project.immeuble_id) {
    const { data: imm } = await svc
      .from("immeubles")
      .select("id")
      .eq("id", project.immeuble_id)
      .eq("agent_responsable_id", userId)
      .maybeSingle();
    if (imm) return { allowed: true, isAdmin: false, roles };
  }

  return { allowed: false, isAdmin: false, roles, reason: "non rattaché au projet" };
}

/** Renvoie une Response 403 prête à l'emploi si l'accès est refusé, sinon null. */
export async function denyIfNoProjectAccess(
  svc: any,
  userId: string,
  projectId: string,
  corsHeaders: Record<string, string>,
  fnName: string,
): Promise<Response | null> {
  const access = await checkRenovationProjectAccess(svc, userId, projectId);
  if (access.allowed) return null;
  console.error(`${fnName}: accès refusé`, { userId, projectId, reason: access.reason });
  return new Response(
    JSON.stringify({ error: "Accès refusé à ce projet de rénovation" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
