

## Plan — Diagnostic direct Meta avec le Page ID 108746365315870

### Probleme
Le backfill n'a jamais ete execute car il requiert un JWT admin. On doit tester le token Meta et les permissions directement.

### Solution
Creer une edge function temporaire `meta-leads-diagnostic` (verify_jwt = false, protegee par un secret interne) qui :

1. Appelle `GET /{page_id}?fields=name,id` pour verifier le token et le page_id
2. Appelle `GET /{page_id}/leadgen_forms?fields=id,name,status&limit=100` pour lister les formulaires
3. Pour chaque formulaire, appelle `GET /{form_id}/leads?limit=1` pour compter les leads disponibles
4. Retourne un rapport JSON complet : validite du token, nom de la page, nombre de formulaires, nombre de leads par formulaire, erreurs eventuelles

### Fichiers

**Nouveau : `supabase/functions/meta-leads-diagnostic/index.ts`**
- Endpoint POST protege par un header secret (`x-diagnostic-key` = valeur hardcodee interne)
- Utilise `META_PAGE_ACCESS_TOKEN` depuis les secrets
- Page ID hardcode : `108746365315870`
- Retourne un diagnostic structure :
  - `token_valid: boolean`
  - `page_name: string | null`
  - `page_id: string`
  - `forms: Array<{id, name, status, lead_count}>`
  - `total_leads: number`
  - `errors: string[]`
  - `permissions_ok: boolean`

**Modifie : `supabase/config.toml`**
- Ajouter `[functions.meta-leads-diagnostic]` avec `verify_jwt = false`

### Execution
Apres deploiement, appeler la fonction via `curl_edge_functions` pour obtenir le diagnostic complet immediatement, sans besoin de se connecter en admin.

### Nettoyage
La fonction sera supprimee apres le diagnostic.

