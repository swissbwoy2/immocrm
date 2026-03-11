

## Plan — Mettre à jour le token Meta Page Access

### Constat
Le screenshot montre le Graph API Explorer avec :
- **Application** : lead auto 2025
- **Page** : Immo-rama.ch
- Token généré correctement comme **Page Access Token**

### Action
1. Mettre à jour le secret `META_PAGE_ACCESS_TOKEN` avec le nouveau token fourni
2. Tester la synchronisation des leads Meta pour vérifier que le token fonctionne

### Note importante
Ce token généré via le Graph API Explorer est un **token de courte durée** (expire en ~1h). Après validation que tout fonctionne, il faudra le convertir en token longue durée via l'endpoint `oauth/access_token?grant_type=fb_exchange_token` pour éviter qu'il expire rapidement.

