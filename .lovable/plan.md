
Objectif validé: synchroniser le calendrier admin pour afficher correctement toutes les visites (historique + futures), sur aperçu et production.

Diagnostic confirmé
- La requête calendrier envoie bien `limit=15000` côté front (`/rest/v1/visites?...order=date_visite.asc&limit=15000`).
- Malgré ça, les données visibles s’arrêtent autour du 13–14 mars.
- Vérification DB:  
  - `visites` total = 1072  
  - `row #1000` (tri asc) = `2026-03-13 16:00:00+00`  
  - `row #1072` = `2026-12-12 17:00:00+00`
- Conclusion: la limite API effective reste 1000 lignes par requête; `.limit(15000)` seul ne suffit pas.

Do I know what the issue is?
- Oui: ce n’est pas un bug d’UI principal, c’est un problème de pagination de données (et manque de sync temps réel robuste sur admin calendrier).

Plan d’implémentation (sans changement de schéma)
1) Mettre une pagination par lots (range) pour les tables volumineuses du calendrier admin
- Fichier: `src/pages/admin/Calendrier.tsx`
- Remplacer le fetch unique `visites` par un fetch paginé:
  - batch size 1000
  - boucles `.range(0,999)`, `.range(1000,1999)`, etc.
  - concaténation jusqu’à batch incomplet
- Même pattern appliqué à `calendar_events` et `candidatures` (préventif, cohérence).

2) Ajouter une vraie synchronisation continue sur le calendrier admin
- Toujours dans `src/pages/admin/Calendrier.tsx`:
  - abonnement realtime sur `visites`, `calendar_events`, `candidatures`
  - gestion des statuts de souscription (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`)
  - fallback polling (ex: 15–30s avec backoff) si realtime indisponible
  - refresh debounced pour éviter les rafales de requêtes.

3) Fiabiliser les compteurs “à venir”
- Calcul “Tout à venir” basé sur comparaison timestamp (`date_visite >= now`) de manière robuste.
- Garder les filtres agent/client/type/statut existants, mais sur dataset complet paginé.

4) Instrumentation légère de vérification
- Ajouter des logs de sync non intrusifs (dev): nombre de visites chargées + dernière date.
- But: confirmer visuellement qu’on charge >1000 (attendu 1072+) et que des dates post-14 mars sont présentes.

Extension “toute l’app” (suite logique, même correctif)
- Factoriser un helper réutilisable (ex: `fetchAllWithRange`) puis migrer les écrans volumineux (`offres`, `visites`, `candidatures`) pour éliminer définitivement le plafond 1000 partout.

Validation (E2E)
- Ouvrir `/admin/calendrier` et vérifier:
  1) présence d’événements après le 14 mars
  2) bouton “Tout à venir” > 0
  3) cohérence avec DB (total visites visibles côté admin)
  4) création d’une nouvelle visite puis apparition automatique sans reload (realtime/polling).
