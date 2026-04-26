## Diagnostic honnête

Tu as raison : sur le précédent passage j'ai juste **empilé** la bannière + bloc % + stepper Lucide **par-dessus** l'ancien layout, sans jamais retirer les éléments existants. Résultat = doublons partout et structure Macoloc invisible.

### Doublons identifiés après audit

| # | Élément en double | Fichier |
|---|---|---|
| 1 | Step pills + mini barre dorée dans header sticky | `PremiumFormShell.tsx` (l.42-76) |
| 2 | Ancien titre `<h1>` + emoji + sous-titre dans chaque page | 5 pages (ex: `NouveauMandat.tsx` l.423-436) |
| 3 | Header décoratif "ImmoRésidence Sàrl" + divider gold | `MandatV3.tsx` l.230-245 |
| 4 | Step header interne dans la card (icône + label étape) | `MandatV3.tsx` l.286-295 |

→ Au total : **3 indicateurs de progression** + **2 titres** se superposent sur chaque formulaire.

---

## Plan correctif (3 lots)

### Lot 1 — Nettoyer `PremiumFormShell.tsx`
- **Supprimer** les step pills du header sticky (l.42-63) — on garde seulement le logo + compteur `X/Y`
- **Supprimer** la mini barre dorée sticky (l.67-76) — la progression est maintenant dans `PremiumProgressBlock`
- Conserver : background luxury, header sticky (logo + compteur texte), footer trust badges, floating 3D key

### Lot 2 — Nettoyer les 5 pages (retirer titres dupliqués)

**`NouveauMandat.tsx`** (l.422-436)
- Supprimer le bloc `<div className="text-center mb-8">` avec `<h1>` emoji + sous-titre
- Garder uniquement : `PremiumGuaranteeBanner` → `PremiumProgressBlock` → `PremiumStepIndicator` → `PremiumFormCard`

**`MandatV3.tsx`** (l.222-245 + l.286-295)
- Supprimer le header décoratif "ImmoRésidence Sàrl — Logisorama" + divider
- Supprimer le step header interne de la card (emoji + label étape redondant)

**`FormulaireVendeurComplet.tsx`, `FormulaireRelouer.tsx`, `FormulaireConstruireRenover.tsx`**
- Même traitement : retirer tous les titres/sous-titres décoratifs entre le stepper et la card

### Lot 3 — Standardiser l'en-tête de step (style Macoloc épuré)

Dans chaque step component (ex: `MandatV3Step1Identity.tsx`, etc.), ajouter en haut :

```tsx
<div className="mb-6">
  <h2 className="text-2xl font-bold text-white">Vérification d'identité</h2>
  <p className="text-sm text-[hsl(40_20%_55%)] mt-1">
    Pour sécuriser votre dossier, nous avons besoin de vérifier votre identité.
  </p>
</div>
```

Ce titre/sous-titre vit **dans le step**, pas dans la page parent → évite tout doublon futur.

---

## Résultat attendu (vertical, comme Macoloc)

```
┌─ Header sticky (logo + "2/8")
│  
│  ┌─ PremiumGuaranteeBanner (image + Garantie 90j + Twint)
│  ┌─ PremiumProgressBlock (cercle 25% + "Identité — Étape 2 sur 8" + barre)
│  ┌─ PremiumStepIndicator (8 cercles Lucide horizontaux)
│  ┌─ PremiumFormCard
│  │   H2 "Vérification d'identité"
│  │   p "Pour sécuriser votre dossier..."
│  │   [champs du step]
│  │   [Précédent]              [Continuer]
│  └─
│  
└─ Footer trust badges (SSL / Données / 500 clients)
```

---

## QA visuelle obligatoire

Après implémentation, je **navigue avec browser--act** sur les 5 routes (`/nouveau-mandat`, `/mandat-v3`, `/formulaire-vendeur`, `/formulaire-relouer`, `/formulaire-construire-renover`) et je prends un screenshot de chacune pour vérifier qu'il n'y a plus de doublon avant de te livrer. Cette étape n'a pas été faite la dernière fois, ce qui explique le problème.

---

## Fichiers touchés
- `src/components/forms-premium/PremiumFormShell.tsx` (nettoyage)
- `src/pages/NouveauMandat.tsx`, `MandatV3.tsx`, `FormulaireVendeurComplet.tsx`, `FormulaireRelouer.tsx`, `FormulaireConstruireRenover.tsx` (suppression titres dupliqués)
- Step components dans `src/components/mandat-v3/steps/` et équivalents (ajout H2 + sous-titre standardisé)

Aucun changement de logique métier, d'Edge Function ou de validation Zod.
