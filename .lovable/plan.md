

# Fix : Bouton "Confirmer visite" sans feedback pour l'agent

## Probleme identifie

Quand l'agent clique sur "Confirmer visite" pour une demande de delegation, **rien ne se passe visuellement** car :

1. **Aucun etat de chargement** : Le bouton n'a pas de spinner ni d'etat `disabled` pendant l'operation async. L'agent ne sait pas que son clic a ete pris en compte.

2. **Echec silencieux possible** : Si la requete pour trouver la visite ne retourne rien (par exemple si `offre_id` est `null` ou si la visite n'existe plus), le code entre dans le `if (visite)` qui est `false`, et **aucun toast d'erreur n'est affiche**. L'agent ne recoit aucun retour.

3. **Pas de mise a jour du statut de l'offre** : Contrairement au handler dans `Visites.tsx` qui met a jour le statut correctement, le handler dans `Messagerie.tsx` ne change pas le statut de l'offre, ce qui peut empecher le rafraichissement visuel des boutons d'action.

## Solution

### 1. Ajouter un etat de chargement au composant `OffreActions`

Ajouter un state `actionLoading` dans le composant `OffreActions` pour :
- Desactiver les boutons pendant l'operation
- Afficher un spinner sur le bouton clique
- Empecher les double-clics

### 2. Gerer le cas ou la visite n'est pas trouvee

Dans le case `'confirmer_visite_deleguee'` de `handleOffreAction`, ajouter un toast d'erreur si aucune visite n'est trouvee :

```
if (!visite) {
  toast({ title: "Erreur", description: "Visite introuvable", variant: "destructive" });
  return;
}
```

### 3. Rendre `handleOffreAction` async-aware dans `OffreActions`

Modifier `onAction` pour retourner une Promise, permettant au composant `OffreActions` de savoir quand l'operation est terminee et de desactiver le spinner.

## Details techniques

**Fichier modifie** : `src/pages/agent/Messagerie.tsx`

- Transformer `OffreActions` pour gerer un etat loading interne
- `onAction` devient `async` et le composant attend la fin avant de retirer le spinner
- Ajouter `disabled={loading}` et un `Loader2` spinner sur les boutons Confirmer/Refuser
- Ajouter un `else` au `if (visite)` pour afficher un toast d'erreur quand la visite est introuvable
- Optionnel : mettre a jour le statut de l'offre a `'visite_confirmee'` apres confirmation (alignement avec le comportement de `Visites.tsx`)

