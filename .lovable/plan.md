## Cause racine identifiée

`LandingInput` n'est **pas** un composant `forwardRef`. Quand on fait `{...register('loyer_net')}`, React-Hook-Form injecte un `ref` qui est **silencieusement ignoré** par le composant fonctionnel. Le champ n'est donc jamais correctement attaché à RHF → à la validation `trigger()`, RHF lit son état interne vide → "Required" même quand l'utilisateur a tapé "1500".

Pourquoi ça "marchait" avant mes modifications : le pattern `value={watch('x') || ''}` rendait le champ **contrôlé**, ce qui forçait React à propager les valeurs via `onChange` et masquait le bug de ref manquant. En retirant `value={watch}`, le bug devient visible.

## Correctif — 2 fichiers seulement

### 1. `src/components/forms-premium/LandingInput.tsx`
Convertir en `React.forwardRef<HTMLInputElement, LandingInputProps>` :
- Wrapper la fonction dans `forwardRef`
- Transférer `ref` au `<input>` interne
- Détecter `hasValue` aussi via `ref.current?.value` (lecture lazy) pour que le label flottant fonctionne en mode non contrôlé. En pratique : remonter `hasValue` via un petit `useState` mis à jour dans `onChange` interne, en plus de `props.value || props.defaultValue`.

Aucun changement d'API ni de style.

### 2. `src/components/forms-premium/LandingSelect.tsx` et `LandingTextarea.tsx`
Même traitement préventif : `forwardRef` vers `<select>` / `<textarea>`. Évite que le `<select>` Pièces ajouté précédemment souffre du même bug.

### 3. `src/pages/FormulaireRelouer.tsx`
Aucun changement requis. Les champs restent en `type="text"` + `inputMode` + `register(...)` non contrôlé. Une fois le `ref` correctement transféré, RHF reçoit les valeurs.

## Vérification

- Build TS automatique.
- Vérifier sur preview mobile (430×778) que saisie de "1500" puis clic "Suivant" passe sans erreur "Required".

## Hors périmètre

- Logique métier, schéma Zod, Supabase, edge functions, design system : intacts.
- Bannière 399 CHF, redirections, SEO : intacts.