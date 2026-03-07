

## Plan — Test direct du backfill et diagnostic automatique

### Probleme
Le backfill n'a jamais ete execute. Les leads existent dans Meta (visibles dans Logisorama) mais la table `meta_leads` est vide. On doit verifier que le token, le page_id et les permissions fonctionnent.

### Etape 1 : Test direct de l'edge function via `curl_edge_functions`
Appeler `meta-leads-backfill` directement avec le page_id fourni par l'utilisateur pour obtenir un vrai diagnostic (token valide, permissions, nombre de formulaires, leads importes ou erreurs).

### Etape 2 : Selon le resultat
- **Succes** : Les leads apparaitront immediatement dans `/admin/meta-leads`. Aucune modification code necessaire.
- **Erreur 400 (page_id manquant)** : Demander le page_id Facebook a l'utilisateur.
- **Erreur Graph API (token/permissions)** : Diagnostiquer le token Meta (`META_PAGE_ACCESS_TOKEN`) — expiration, scopes manquants (`leads_retrieval`, `pages_read_engagement`).
- **Erreur 403** : Verifier que l'utilisateur connecte a bien le role admin.

### Action requise de l'utilisateur
Fournir le **Page ID Facebook** (le numero visible dans les parametres de la page Facebook, ex: `123456789012345`) pour que je puisse lancer le test directement.

Alternativement, se connecter en admin dans le preview, aller sur `/admin/meta-leads`, cliquer "Synchroniser Meta", saisir le Page ID et confirmer.

