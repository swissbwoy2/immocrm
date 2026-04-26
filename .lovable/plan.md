
# 🎯 Refonte structurelle Macoloc-style sur TOUS les formulaires publics

## Objectif

Reproduire la **structure Macoloc** (vue dans tes screenshots) sur tous les formulaires publics, en conservant **100% du design Logisorama** (gold/dark, glassmorphism, BorderBeam) et **100% des champs / logique métier existants**. Ajouter sur chaque formulaire une **bannière hero "Garantie 90 jours"** avec image + Twint 076 483 91 99.

---

## 📐 Structure cible (de haut en bas)

1. **Header sticky** — Logo Logisorama (déjà OK via `PremiumFormShell`)
2. **Bouton "← Retour"**
3. **🆕 Bannière Hero "Garantie 90 jours"** (NOUVEAU `PremiumGuaranteeBanner`)
4. **Bloc progression** — Cercle % à gauche + "Étape X sur Y" + barre gold dégradée
5. **Stepper horizontal à icônes Lucide** rondes + labels
6. **Carte du formulaire** — Titre + sous-titre + champs (déjà OK via `PremiumFormCard`)
7. **Boutons "Précédent / Continuer" DANS la carte**

---

## 🆕 Composant `PremiumGuaranteeBanner.tsx`

- Image de fond + overlay dégradé sombre/gold
- Badge `Gift` icon + "GARANTIE 90 JOURS" (gold)
- Titre H2 : « Remboursement complet sans succès au bout de 90 jours de recherche »
- Sous-texte : « Paiement rapide par facture QR ou Twint via 076 483 91 99 »
- Coins arrondis 2xl, BorderBeam gold, responsive mobile/desktop

---

## 📦 Fichiers

### À créer
- `src/components/forms-premium/PremiumGuaranteeBanner.tsx`
- `src/components/forms-premium/PremiumProgressBlock.tsx` (cercle % + étape + barre)

### À refondre
- `src/components/forms-premium/PremiumStepIndicator.tsx` — passer aux **icônes Lucide rondes** au lieu d'emojis :
  - Identité → `User` · Critères/Recherche → `Search` · Contact → `Phone` · Adresse → `MapPin`
  - Situation → `Briefcase` · Documents → `FileText` · Finance → `Wallet`
  - Légal → `Scale` · Signature → `PenTool` · Paiement → `CreditCard`

### À modifier (intégration bannière + nouveau bloc progression)
- `src/pages/MandatV3.tsx` (locataire — 7 étapes)
- `src/pages/FormulaireVendeurComplet.tsx` (vendeur — 5 étapes)
- `src/pages/FormulaireRelouer.tsx` (propriétaire qui reloue)
- `src/pages/FormulaireConstruireRenover.tsx`
- `src/pages/NouveauMandat.tsx` (5 étapes)

---

## 🎨 Préservation du design Logisorama

**ZÉRO changement** sur les couleurs/effets :
- Fond `hsl(30 15% 8%)` · Or `hsl(38 45% 48%)` / gold clair `hsl(38 55% 65%)`
- Glassmorphism `bg-[hsl(30_15%_11%/0.8)] backdrop-blur-xl`
- BorderBeam gold + `LuxuryFormBackground` + clé 3D flottante

Seule **la disposition** change pour matcher Macoloc.

---

## ⚙️ Logique métier

**ZÉRO modification** : aucune Edge Function, aucun champ, aucune validation, aucune RLS, aucune route.
C'est **purement visuel/structurel**.

---

## 📋 Ordre d'exécution

1. Créer `PremiumGuaranteeBanner.tsx` (image + Twint 076 483 91 99)
2. Créer `PremiumProgressBlock.tsx`
3. Refondre `PremiumStepIndicator.tsx` (icônes Lucide)
4. Intégrer dans les 5 formulaires
5. QA visuel mobile (375px) + desktop

---

## ❓ Question préalable — Image de la bannière

1. **Tu uploades une photo** (couple, clés, maison suisse) — meilleur rendu
2. **Je génère via Lovable AI** (Gemini Image) — sur mesure, rapide
3. **Pas d'image, dégradé gold + icône `Gift` géante** — minimaliste

👉 Si tu approuves directement sans préciser, je pars sur **l'option 2 (génération AI)**.
