

# Plan — Figer la version de référence Rénovation Intelligente

## Objectif
Enregistrer dans la mémoire projet le périmètre définitif du module tel que décrit par l'utilisateur, sans modification de code ni migration.

## Actions

### 1. Créer `mem://features/renovation-intelligente-reference-version`

Fichier type `feature` contenant :
- Statut : LIVRÉ, DÉPLOYÉ, TESTÉ, VALIDÉ — clôturé 2026-04-15
- Périmètre fonctionnel complet (projets, documents, devis, budget/planning, entreprises, incidents, réserves, garanties, alertes, clôture, dossier final, historique, notifications)
- 15 Edge Functions listées (note : l'utilisateur en liste 15 malgré le titre "13")
- Architecture sécurité : verify_jwt manuel, RLS, bucket privé signed URLs, RPC SECURITY DEFINER, structured logging, filtrage par rôle, idempotence
- 3 points de vigilance maintenance

### 2. Mettre à jour `mem://index.md`

Ajouter dans Memories :
```
- [Rénovation Intelligente v1](mem://features/renovation-intelligente-reference-version) — Périmètre figé Lots 1-4, 15 Edge Functions, clôturé 2026-04-15
```

## Aucun impact technique
Zéro modification de code, zéro migration, zéro déploiement.

