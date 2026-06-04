# Cause exacte la plus probable

Le vide dans l’agenda agent ne vient pas des données.

- **Carina a bien des données en juin** : 77 visites `proposee` ce mois-ci, regroupées en 22 créneaux visibles.
- **Victoria aussi** : 80 visites ce mois-ci (79 `proposee`, 1 `planifiee`), regroupées en 27 créneaux.
- **Aucune erreur DB/RLS détectée** sur `visites`, `calendar_events` ou `get_my_agent_id()`.

Le point faible exact est dans **`src/pages/agent/Calendrier.tsx`** :

- la page charge les visites via une requête compacte avec **`.or(...)`** ;
- puis elle **n’inspecte jamais `eventsRes.error` / `visitesRes.error` / `profiles.error` / `clientsRes.error`** ;
- si une requête échoue côté client, la page continue avec `data ?? []` et affiche simplement **un calendrier vide sans vrai signal**.

En parallèle, la prod a un vrai second problème confirmé :

- les logs applicatifs contiennent plusieurs **`Importing a module script failed`** / **`Failed to fetch dynamically imported module`** sur le domaine publié ;
- comme `/agent/calendrier` est une **route lazy-loaded**, un bundle obsolète peut casser le chargement chez certains appareils installés / en cache.

## Conclusion

Le problème le plus précis est donc :

**le calendrier agent a un bug de “silent failure” côté front, et le contexte de bundles obsolètes en production peut l’aggraver pour certains utilisateurs.**

# Plan de correction

## 1. Rendre le chargement calendrier robuste
- Remplacer la logique fragile du calendrier par le même schéma que `src/pages/agent/Visites.tsx` :
  - requête séparée pour les visites propres à l’agent ;
  - requête séparée pour les visites co-assignées ;
  - fusion + déduplication ensuite.
- Garder la fenêtre J-14 / J+90, mais l’appliquer sur des requêtes simples plutôt que sur un gros `.or(...)`.

## 2. Supprimer le faux “agenda vide”
- Vérifier explicitement toutes les erreurs Supabase dans `loadData()`.
- En cas d’échec :
  - logger la cause exacte ;
  - afficher un toast utile ;
  - éviter de présenter un vide comme si aucune visite n’existait.

## 3. Ajouter un diagnostic front minimal
- Journaliser les compteurs réellement reçus (`events`, `visites`, `clients`) et l’agent courant.
- Journaliser aussi les erreurs réseau/query pour identifier immédiatement les comptes touchés si le problème revient.

## 4. Sécuriser le chargement contre les bundles obsolètes
- Ajouter un garde-fou global pour les erreurs de lazy import (`Importing a module script failed`, `Failed to fetch dynamically imported module`, `ChunkLoadError`).
- En cas de détection : nettoyage léger + rechargement propre de l’application.

# Détails techniques

## Fichiers concernés
- `src/pages/agent/Calendrier.tsx`
- `src/main.tsx`
- éventuellement `src/hooks/useAppVersionCheck.ts` si le garde-fou est centralisé là

## Résultat attendu
- Victoria et Carina voient immédiatement leurs créneaux réels dans `/agent/calendrier`.
- Si une requête échoue, on obtient enfin **une erreur visible et exploitable**, pas un agenda artificiellement vide.
- Les appareils avec ancien cache récupèrent automatiquement le bon bundle au prochain chargement.