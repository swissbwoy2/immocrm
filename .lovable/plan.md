## Cause exacte (et pourquoi ça arrive maintenant)

Le crash arrive UNIQUEMENT pour les clients aux champs financiers vides — comme Saba Haile, dont la fiche `clients` a été créée sans passer par tout le formulaire `/nouveau-mandat` (à cause du bug RLS d'hier), donc `revenus_mensuels = NULL`, `budget_max = NULL`, etc.

Dans `src/pages/admin/ClientDetail.tsx` ligne **1829** :

```tsx
<ClientCandidatesManager
  clientId={client.id}
  clientRevenus={client.revenus_mensuels}   // ❌ null pour Saba
  budgetDemande={client.budget_max}          // ❌ null pour Saba
/>
```

Côté `ClientCandidatesManager` (ligne 21), la signature met `clientRevenus = 0` en default. **Mais en JavaScript, le default ne s'applique qu'à `undefined`, pas à `null`** — donc `clientRevenus` reste `null`, puis ligne 284 : `clientRevenus.toLocaleString()` → `TypeError: null is not an object`.

Le stack pointe `CandidateDocumentsSection-QvxXR8l1.js` car Vite a bundlé `ClientCandidatesManager` + `CandidateDocumentsSection` dans le même chunk de la route. La pile remonte jusqu'à `ClientDetail`, confirmant l'origine.

La version admin de `ClientDetail.tsx` est buguée. La version **agent** (`src/pages/agent/ClientDetail.tsx:1605`) fait correctement `clientRevenus={client.revenus_mensuels || 0}` — voilà pourquoi le bug n'apparaissait pas avant : aucun client ne présentait de `revenus_mensuels = NULL` jusqu'à la création « incomplète » de Saba.

## Correctif (2 endroits, 1 fichier critique + 1 garde-fou)

### 1. `src/pages/admin/ClientDetail.tsx` ligne 1827-1832

```tsx
<ClientCandidatesManager
  clientId={client.id}
  clientRevenus={client.revenus_mensuels ?? 0}
  budgetDemande={client.budget_max ?? 0}
  onCandidatesChange={refreshCandidates}
/>
```

### 2. Garde-fou dans `src/components/ClientCandidatesManager.tsx`

Remplacer la déstructuration pour neutraliser `null` venant d'un autre appelant :

```tsx
export function ClientCandidatesManager({ 
  clientId, 
  clientRevenus: clientRevenusProp, 
  budgetDemande: budgetDemandeProp = 0,
  onDocumentsClick,
  onCandidatesChange
}: ClientCandidatesManagerProps) {
  const clientRevenus = clientRevenusProp ?? 0;
  const budgetDemande = budgetDemandeProp ?? 0;
  // …reste inchangé
```

Même garde-fou minimal dans `src/components/premium/PremiumCandidatesCard.tsx` (ligne 21) — même pattern à risque.

## Pourquoi je ne touche rien d'autre

- `CandidateDocumentsSection.tsx` n'a aucun appel `toLocaleString` — c'est juste le composant racine du chunk, donc affiché dans la pile. Pas besoin de le modifier.
- Les autres appels `toLocaleDateString` sur `client.date_naissance` etc. ne crashent pas (`new Date(null)` → 01.01.1970, moche mais ne plante pas). On les laisse pour ne pas dévier du scope.

## Après le fix : vérification

1. Recharger la fiche de Saba Haile dans `/admin/clients/…` → la page doit s'afficher sans crash.
2. Comme les champs sont vides, l'admin verra des « —/0 CHF » mais aura accès au dossier pour compléter les infos manuellement.

## Aucun changement DB

Pur frontend, 2 fichiers max.
