

## Diagnostic

**1. Pas de retour vers l'accueil** — Les pages `RelouerMonAppartement.tsx` et `ConstruireRenover.tsx` n'ont **aucune navigation fixe** (pas de header, pas de FloatingNav). Seul un petit lien `← Retour à l'accueil` existe en bas de page (fin du CTA final), invisible sans scroller. `VendreMonBien` a son `VendeurFloatingNav` → la nav fonctionne pour ce parcours.

**2. Thème bleu** — La home (`/`) utilise le thème **luxury** (ivoire + or champagne via `theme-luxury` ou wrapper équivalent). `RelouerMonAppartement` et `ConstruireRenover` utilisent les variables par défaut → `--primary: 217 91% 60%` = bleu Tailwind. C'est pour ça que tout est bleu sur ces 2 landings.

**3. NPA / Ville auto qui ne marche pas** — Dans `FormulaireConstruireRenover.tsx` (lignes 264-274) et probablement `FormulaireRelouer.tsx`, les champs `NPA` et `Ville` sont en `readOnly` avec placeholder "Auto". Tu veux qu'ils soient **libres en saisie**.

## Corrections

### A. Navigation retour accueil sur les 2 landings
Ajouter en haut de `RelouerMonAppartement.tsx` et `ConstruireRenover.tsx` un **header fixe minimal** identique en logique à `VendeurFloatingNav` :
- Logo Immo-Rama à gauche → lien vers `/`
- Bouton "← Accueil" + bouton CTA principal à droite
- Position `fixed top-0`, fond blur, z-index élevé
- Padding-top compensé sur le hero

### B. Thème harmonisé avec la landing principale
Wrapper `<div className="theme-luxury …">` sur les 2 pages (landing **et** formulaires associés) pour récupérer les couleurs ivoire/or de la home. Aucun impact sur le reste du site (le scope est local au wrapper).

Pages concernées :
- `RelouerMonAppartement.tsx`
- `ConstruireRenover.tsx`
- `FormulaireRelouer.tsx`
- `FormulaireConstruireRenover.tsx`

### C. Champs NPA / Ville libres
Dans `FormulaireConstruireRenover.tsx` **et** `FormulaireRelouer.tsx` :
- Retirer `readOnly` et la classe `bg-muted/50`
- Remplacer placeholder `"Auto"` par `"1207"` (NPA) et `"Genève"` (Ville)
- Conserver le pré-remplissage automatique quand l'utilisateur sélectionne une adresse Google (mais éditable ensuite)

## Garanties

- ✅ La home `/` reste inchangée
- ✅ `/vendre-mon-bien` reste inchangé (a déjà sa nav + son thème)
- ✅ Les formulaires `Acheter` et `Louer` restent inchangés
- ✅ Création de compte intacte sur tous les parcours
- ✅ Photos / uploads inchangés

