## Problème

Sur le parcours **locataire sortant** (`/relouer-mon-appartement` → `/formulaire-relouer`), le bandeau affiche actuellement :

> « Garantie 90 jours — Remboursement complet sans succès au bout de 90 jours de recherche »

C'est **faux** pour cette prestation. La garantie 90 jours / remboursement concerne le mandat chasseur d'appartement (300 CHF), pas la relocation.

Pour **relouer mon appartement** (locataire sortant), la prestation est :
- **Forfait unique : 399.– CHF par appartement**
- **Facturé à l'activation de la recherche de locataire** (pas à la signature, pas conditionné au succès).
- Paiement par facture QR ou Twint.

## Correctif

### 1. Nouveau composant `src/components/forms-premium/RelouerForfaitBanner.tsx`
Même structure visuelle que `LandingGuaranteeBanner` (carte arrondie, vert primary Logisorama, icône `Tag` / `Receipt` lucide-react).

Contenu :
- Badge : « Forfait locataire sortant »
- Titre : « Prestation forfaitaire **399.– CHF** par appartement »
- Sous-texte : « Facturée à l'activation de la recherche de locataire. Paiement par facture QR ou Twint via 076 483 91 99. »

### 2. `src/pages/FormulaireRelouer.tsx`
- Retirer l'import et l'usage de `LandingGuaranteeBanner` (lignes 19 et 303).
- Insérer `<RelouerForfaitBanner />` à la place.

### 3. `src/pages/RelouerMonAppartement.tsx`
Ajouter une ligne de transparence prix dans la section RASSURANCE (liste juste avant « Pensé pour les locataires qui doivent partir vite ») :
> « Forfait unique de **399.– CHF** par appartement, facturé à l'activation de la recherche de locataire. »

Retirer la phrase actuelle « On ne vous facture rien tant qu'aucun repreneur solvable n'est trouvé. » qui contredit la facturation à l'activation.

### 4. Vérifications de cohérence
- `LandingGuaranteeBanner` reste utilisé uniquement sur les parcours mandat chasseur (300 CHF / 90 jours).
- Aucune mention « 90 jours », « remboursement » ou « gratuit tant que » ne doit subsister sur `/relouer-mon-appartement` ni `/formulaire-relouer` (vérification `rg` après edits).
- Pas de changement de logique métier, pas de migration, pas d'edge function impactée.

## Périmètre

- 1 fichier créé : `RelouerForfaitBanner.tsx`
- 2 fichiers modifiés : `FormulaireRelouer.tsx`, `RelouerMonAppartement.tsx`
