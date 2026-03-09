

## Plan — Mettre a jour le token Meta et lancer le backfill

Je vois sur votre capture d'ecran que vous avez genere un nouveau token dans le Graph API Explorer pour la page **Immo-rama.ch** avec les permissions necessaires (`leads_retrieval`, `pages_show_list`, etc.).

### Etape 1 : Mettre a jour le secret `META_PAGE_ACCESS_TOKEN`
Remplacer l'ancien token (invalide — session expiree) par le nouveau token que vous avez fourni precedemment.

### Etape 2 : Deployer et executer la fonction de diagnostic
Recreer temporairement `meta-leads-diagnostic` (verify_jwt = false) pour verifier que le nouveau token fonctionne avec le Page ID `108746365315870`.

### Etape 3 : Selon le resultat du diagnostic
- **Succes** : Lancer le backfill complet via `meta-leads-backfill` pour importer tous les leads historiques.
- **Echec** : Diagnostiquer l'erreur precise (permissions manquantes, token pas lie a la bonne page, etc.)

### Note importante
Le token genere via le Graph API Explorer est un **token de courte duree** (expire en ~1h). Il faudra ensuite le convertir en token longue duree pour que le webhook fonctionne en continu.

