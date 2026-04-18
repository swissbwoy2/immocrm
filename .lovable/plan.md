
L'utilisateur veut le même traitement (thème luxury + header fixe avec bouton "← Accueil") sur les 3 autres pages liées aux parcours. Je dois identifier lesquelles.

Pages déjà traitées : `RelouerMonAppartement`, `ConstruireRenover`, `FormulaireRelouer`, `FormulaireConstruireRenover`.

Pages probablement concernées (les "3 autres") :
- `VendreMonBien` (a déjà `VendeurFloatingNav` mais peut-être pas le thème luxury)
- `FormulaireVendeurComplet`
- `/nouveau-mandat` (parcours Acheter)
- `/mandat-v3` (parcours Louer)
- `/inscription-validee` (page de confirmation post-inscription)

Vu le contexte ("3 autres"), il s'agit probablement des 3 formulaires/landings restants du tunnel : **Vendre** (landing + formulaire) + **page de confirmation** OU les formulaires Acheter/Louer/confirmation.

Je vais vérifier rapidement.

## Plan

Appliquer sur les 3 pages restantes du tunnel :

1. **`VendreMonBien.tsx`** + **`FormulaireVendeurComplet.tsx`**
   - Wrapper `theme-luxury` (le `VendeurFloatingNav` existe déjà, on garde)
   - Vérifier que le bouton "← Accueil" est présent dans la nav, sinon l'ajouter

2. **`InscriptionValidee.tsx`** (page de succès post-signup commune aux 3 parcours)
   - Wrapper `theme-luxury`
   - Header fixe minimal avec logo + bouton "← Accueil"

3. **Formulaires `/nouveau-mandat` et `/mandat-v3`** : à confirmer — l'utilisateur a dit "Acheter et Louer sont déjà OK". Donc on **ne touche pas**.

### Garanties
- ✅ Home `/` inchangée
- ✅ Logique signup / mandats / photos inchangée
- ✅ `VendeurFloatingNav` conservée (juste enrichie si bouton Accueil manquant)
- ✅ Cohérence visuelle ivoire/or sur tout le tunnel

Si tu confirmes, j'applique.
