# Ajouter "Déposer candidature" pour l'admin

L'admin n'a pas de page de dépôt de candidature. On en ajoute une, identique à celle de l'agent, mais qui charge **tous** les clients actifs de l'agence (l'admin a accès complet via RLS).

## Changements

1. **Nouveau fichier** `src/pages/admin/DeposerCandidature.tsx` — copie de la page agent, sans le filtre `agent_id` sur les clients. La requête `clients` charge tous les clients actifs (RLS admin déjà permissive).
2. **Route** dans `src/App.tsx` : `/admin/deposer-candidature` avec `allowedRoles={['admin']}`.
3. **Entrée sidebar** admin : "Déposer candidature" pointant vers `/admin/deposer-candidature` (juste après "Candidatures").

Aucune migration DB, aucune modif RLS — la policy candidatures + offres autorise déjà l'admin via `has_role(auth.uid(), 'admin')`.
