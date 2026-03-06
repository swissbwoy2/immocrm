

## Plan — Ajustements query params hero → tunnel

### Résumé

Le mapping `zone→localite`, `budget→budget`, `permis→permisNationalite` est validé. Deux ajustements seront appliqués lors de l'implémentation :

### Ajustement 1 — `encodeURIComponent()` sur chaque valeur

Dans `PremiumHero.tsx`, chaque valeur sera encodée avant insertion dans l'URL :

```typescript
const params = new URLSearchParams();
if (zone) params.set('zone', zone);
if (budget) params.set('budget', budget);
if (permis) params.set('permis', permis);
navigate(`/nouveau-mandat${params.toString() ? '?' + params.toString() : ''}`);
```

`URLSearchParams` gère automatiquement l'encodage — plus fiable que `encodeURIComponent()` manuel.

### Ajustement 2 — Aucun param vide dans l'URL

Les `if (value)` ci-dessus garantissent qu'un champ non rempli n'apparaît pas dans l'URL. Résultat possible :

- 3 champs remplis : `/nouveau-mandat?zone=Lausanne&budget=2000-2500&permis=B`
- 1 seul champ : `/nouveau-mandat?zone=Lausanne`
- Aucun champ : `/nouveau-mandat`

### Côté réception (`QuickLeadForm.tsx`)

Pas de changement : `searchParams.get('zone')` retourne `null` si absent, le `if` existant ne set rien. `URLSearchParams` décode automatiquement.

Ces ajustements seront intégrés lors de l'exécution globale de la refonte premium (création de `PremiumHero.tsx` + modification de `QuickLeadForm.tsx`).

