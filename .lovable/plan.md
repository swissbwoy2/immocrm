## Cause racine

Tous les champs numériques de `FormulaireRelouer.tsx` utilisent le pattern cassé sur mobile :

```tsx
{...register('x')} value={watch('x') || ''} type="number"
```

Deux problèmes combinés :
1. **Contrôlé via `watch`** : à chaque frappe, RHF re-render le champ avec la nouvelle valeur. Sur mobile (Safari/Chrome iOS surtout), ça interrompt la saisie clavier — la touche pressée n'apparaît pas.
2. **`type="number"`** : sur clavier mobile FR-CH, refuse silencieusement virgule/point décimal et certains chiffres selon le `step`.

Conséquence : impossible de saisir Pièces, Surface, Étage (et potentiellement Loyer / Charges).

## Correction — `src/pages/FormulaireRelouer.tsx` uniquement

**1. Champ Pièces (ligne 366)** → remplacer par un `<select>` natif stylé cohérent design premium vert, valeurs `1 → 6.5+` par pas de 0.5 (mémoire projet "Rooms filter uses 0.5 increments"). Branché via `register('nombre_pieces')`, sans `value`/`watch`.

**2. Champs Surface, Étage, Loyer net, Charges (lignes 367, 368, 403, 404)** :
- Retirer `value={watch(...) || ''}` → laisser `register` gérer en non-contrôlé
- Remplacer `type="number"` par `type="text"` + `inputMode="numeric"` (étage) ou `inputMode="decimal"` (surface, loyer, charges)
- Ajouter `pattern="[0-9]*"` pour forcer le clavier numérique iOS

**3. Calcul loyer brut (lignes 100-106)** : inchangé, `watch('loyer_net')` continue de fonctionner avec register non contrôlé.

**4. Schéma Zod (lignes 33-46)** : inchangé (tout est déjà `z.string()`).

## Hors périmètre

- Aucun autre fichier modifié
- Aucune logique métier, Supabase, edge function, ou design system touché
- Bannière 399 CHF, redirections, SEO : intacts