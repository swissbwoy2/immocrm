

## Plan — Ajouter toutes les nationalités de A à Z

### Problème
La constante `NATIONALITES` dans `src/components/mandat/types.ts` ne contient que 10 entrées (Suisse, France, Italie, etc.). Il faut une liste complète de tous les pays du monde, triée alphabétiquement, avec "Suisse" en premier (pays principal des utilisateurs).

### Modification

**Fichier unique** : `src/components/mandat/types.ts`

Remplacer le tableau `NATIONALITES` (lignes 98-100) par une liste complète d'environ 195 nationalités/pays, organisée ainsi :
- "Suisse" en première position (accès rapide)
- Puis tous les pays de A à Z par ordre alphabétique (Afghanistan → Zimbabwe)
- Supprimer "Autre" comme entrée séparée ou le garder en dernière position

Cette constante est importée par 4 composants (MandatFormStep1, MandatFormStep5, MandatV3Step1Identity, MandatV3Step3RelatedParties) — tous bénéficieront automatiquement de la mise à jour.

Le composant `EmployeDialog.tsx` a sa propre liste locale qui devra aussi être mise à jour pour cohérence.

