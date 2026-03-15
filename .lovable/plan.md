

## Diagnostic: 3 problemes bloquants

### 1. Auth bloquee — l'agent IA n'a pas de `user_id`

L'agent IA actif (`19eb372b...`) a `user_id = null`. Or le code edge function filtre par `ai_agents.user_id = userId` (ligne 171). Resultat: un admin qui clique "Run" recoit toujours `403 - AI agent not found`.

**Correction**: Pour les admins, charger l'agent IA actif sans filtrer par `user_id`:
```
if admin role → load first active agent (no user_id filter)
if agent_ia role → filter by user_id (existing logic)
```

### 2. Criteres incomplets — pas de ville

Le `criteria_snapshot` de la mission est `{budget_max: 2000, min_rooms: 1, property_type: "Appartement"}`. Le client Philip Owusu a `region_recherche = ""` (vide). Le code lit `criteria.city` qui n'existe pas et fallback sur "Geneve".

**Correction**: 
- Dans `buildCriteriaSnapshot`, renommer `city` → garder la logique mais aussi stocker `region_recherche` 
- Dans `runAutonomousSearch`, lire `criteria.city || criteria.region_recherche`
- Permettre de passer une ville en parametre du body de la requete `/run` pour override

### 3. Aucun filtrage par `allowed_sources`

La mission a `allowed_sources: ['immoscout', 'homegate', 'comparis']` mais `runAutonomousSearch` scrape les 5 portails sans filtrer. De plus les noms ne matchent pas (mission: `immoscout` vs code: `immoscout24.ch`).

**Correction**: 
- Ajouter un mapping court → complet: `{immoscout: 'immoscout24.ch', homegate: 'homegate.ch', ...}`
- Filtrer `SEARCH_PORTALS` par `allowed_sources` de la mission
- Ajouter `comparis.ch` comme portail (manquant)

---

## Plan de correction

**Fichier: `supabase/functions/ai-relocation-api/index.ts`**

1. **Auth admin**: si le role est `admin`, charger le premier agent IA actif sans filtre `user_id`
2. **Source mapping**: ajouter `SOURCE_ALIASES` + filtrage par `allowed_sources` + portail Comparis
3. **Criteres ville**: fallback robuste `city || region_recherche || body.city`
4. **Override body**: accepter `{city, budget, rooms}` dans le body de POST `/run` pour pouvoir tester facilement

Aucune migration DB necessaire.

