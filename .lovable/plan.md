# Fix incohérence compteurs page Assignations

## Cause
`src/pages/admin/Assignations.tsx` charge `clients` **sans aucun filtre**, donc inclut les 65 comptes anonymisés RGPD :
- « Clients sans agent : 69 » = 4 vrais + 65 anonymisés RGPD
- « Clients assignés : 48 » = OK
- Total Gestion Clients (52) ≠ 69 + 48 = 117

## Correction

### Fichier : `src/pages/admin/Assignations.tsx`

1. **Requête `clients`** (ligne 77-81) : ajouter `.is('anonymise_at', null)` pour aligner avec `Clients.tsx`.
   ```ts
   .from('clients')
   .select('*')
   .is('anonymise_at', null)
   .order('created_at', { ascending: false })
   .limit(15000);
   ```

2. **Aucun autre changement** : la liste « Sans agent » dérive de `clients` filtré, les KPI dérivent du même état → tout devient cohérent automatiquement.

## Résultat attendu
- Clients sans agent : **4** (au lieu de 69)
- Clients assignés : **48** (inchangé)
- Total = 52 → cohérent avec Gestion des Clients.

## Hors périmètre
- Pas de migration DB.
- Pas de modification de la logique d'assignation, du dialogue d'édition, du bulk mode, ni du compteur d'agents actifs.
- Pas de modification de la page Clients.

## Validation
- Recharger `/admin/assignations` : vérifier les KPI 4 / 48 / 5.
- Vérifier que la liste des clients sans agent ne contient que des profils réels (pas de noms vides ou « anonymisé »).
