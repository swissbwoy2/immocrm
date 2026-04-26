# Refonte "Tarifs transparents" — Design 21st.dev × Logisorama

## 🎯 Objectif

Remplacer le design actuel (3 cartes statiques avec icône Lucide) par le composant premium de **21st.dev/bigbogiballer/pricing-section** : cartes animées avec images décoratives flottantes, hover effect spring, layout aéré, sensation luxe.

Conservation **100%** du contenu FR : Activation / Succès / Garantie + variante Achat.

---

## 📦 Périmètre

### ✅ À refondre
1. **`src/components/public-site/sections/PricingSection.tsx`** — utilisé par HomePage (logisorama.ch) — supporte Location ET Achat via `useSearchType()`.
2. **`src/components/landing/premium/PricingSection.tsx`** — utilisé par l'ancienne `Landing.tsx` — Location uniquement.

### ⛔ Hors périmètre (confirmé)
- `src/pages/RelouerMonAppartement.tsx` → modèle Standard/Premium différent, on n'y touche pas.

---

## 🎨 Design — Inspiration 21st.dev adaptée

### Structure d'une carte
```
┌─────────────────────────────────┐
│  Activation        [🔑 image]   │  ← header avec image flottante
│  300 CHF                        │  ← prix gros, gradient gold
│  Acompte unique                 │
│                                 │
│  Acompte unique à l'inscription │  ← description
│  Déduit de la commission finale │
│                                 │
│  ✦ Sans engagement              │  ← features (Sparkles ou Diamond)
│  ✦ Remboursable                 │
│  ✦ Paiement sécurisé            │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Activer ma recherche   │   │  ← CTA pleine largeur
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Animations
- **Hover carte** : `scale: 1.03`, `y: -5`, shadow gold (`0px 15px 30px -5px hsl(38 45% 48% / 0.15)`), ressort `spring stiffness: 300, damping: 20`.
- **Hover image** : `scale: 1.1`, `rotate: -5deg`, même ressort.
- **Carte "Succès" (highlight)** : utilise `Sparkles` au lieu de `Diamond`, gradient gold sur le prix, bordure dorée pulse (réutilise `luxury-border-pulse` existant).

### Couleurs (alignées sur la charte logisorama)
- Bordure normale : `border-border/50`
- Bordure highlight : `border-[hsl(38_45%_48%/0.5)]`
- Background carte : `bg-card/50 backdrop-blur-sm`
- Background highlight : `bg-gradient-to-b from-[hsl(38_45%_48%/0.08)]`
- Prix highlight : classe `luxury-gradient-text` existante
- CTA : conserve `luxury-shimmer-btn luxury-cta-glow` existant

---

## 🖼️ Images thématiques (génération AI)

3 images PNG générées via **Lovable AI Gateway** (`google/gemini-2.5-flash-image`), style "Thiings" — illustrations 3D isométriques sur fond transparent, douces, premium.

| Carte | Image | Prompt |
|-------|-------|--------|
| **Activation** | `activation-key.png` | Clé dorée ancienne 3D isométrique, style Thiings, rendu doux pâte à modeler, fond transparent, lumière soft, palette or/beige luxe |
| **Succès** | `success-contract.png` | Document/contrat signé 3D isométrique avec sceau de cire dorée, style Thiings, fond transparent, palette or/ivoire |
| **Garantie** | `guarantee-shield.png` | Bouclier dorée 3D isométrique avec coche, style Thiings, fond transparent, élégant minimaliste, palette or/blanc cassé |

**Stockage** : `src/assets/pricing/` puis import ES module (`import activationKey from '@/assets/pricing/activation-key.png'`).

**Variante Achat** : on réutilise les 3 mêmes images (clé/contrat/bouclier) — les concepts restent valides pour l'achat immobilier.

---

## 📝 Contenu (inchangé)

### Variante LOCATION (default)
| Carte | Valeur | Description | Features |
|-------|--------|-------------|----------|
| Activation | **300 CHF** | Acompte unique à l'inscription. Déduit de la commission finale. | Sans engagement · Remboursable si échec · Paiement sécurisé |
| Succès ⭐ | **1 mois de loyer** | Commission uniquement si nous trouvons votre logement. | Zéro risque · Payable au bail signé · Visites incluses |
| Garantie | **90 jours** | Si nous ne trouvons rien en 90 jours, vous êtes remboursé intégralement. | Engagement écrit · Remboursement intégral · Sans condition |

### Variante ACHAT
| Carte | Valeur | Description | Features |
|-------|--------|-------------|----------|
| Activation | **2'500 CHF** | Acompte d'engagement, déduit de la commission finale d'achat. | Sans engagement · Remboursable · Mandat exclusif |
| Succès ⭐ | **1% du prix d'achat** | Commission uniquement à l'acte authentique. Acompte déduit. | Acompte déduit · Payable à l'acte · Off-market inclus |
| Garantie | **6 mois** | Pas de bien trouvé en 6 mois ? Acompte intégralement remboursé. | Engagement écrit · Remboursement intégral · Sans condition |

---

## 🛠️ Plan d'exécution

### Étape 1 — Génération des 3 images
Edge function temporaire OU script direct via `LOVABLE_API_KEY` → modèle `google/gemini-2.5-flash-image` → enregistrement dans `src/assets/pricing/`.

### Étape 2 — Création du composant réutilisable
Nouveau fichier **`src/components/shared/PremiumPricingCard.tsx`** :
- Props : `title`, `value`, `valueDescription`, `description`, `features[]`, `imageSrc`, `imageAlt`, `highlight?`, `iconType?: 'sparkles' | 'diamond'`
- Animations Framer Motion (cardVariants + imageVariants du composant 21st.dev)
- Style aligné charte gold logisorama
- Réutilisé par les 2 sections

### Étape 3 — Refonte `src/components/public-site/sections/PricingSection.tsx`
- Garde `useSearchType()` pour la variante Achat
- Garde `ScrollReveal`, `GoldDivider`, `staggerContainer`, `MagneticButton`
- Remplace les 3 `<TiltCard>` par 3 `<PremiumPricingCard>`
- Conserve le CTA "Activer ma recherche maintenant"
- Conserve `id="tarifs"` pour les ancres

### Étape 4 — Refonte `src/components/landing/premium/PricingSection.tsx`
- Version simplifiée (Location uniquement, pas de `useSearchType`)
- Réutilise le même `<PremiumPricingCard>`
- Garde le CTA actuel

### Étape 5 — QA
- Vérifier responsive mobile (cartes en colonne, image taille raisonnable)
- Vérifier dark mode contraste
- Vérifier que `/` (HomePage) et l'ancienne `/landing` affichent bien la nouvelle version
- Tester switch Location/Achat sur HomePage
- `cursor-pointer` sur cartes et CTA
- Touch target ≥ 44px sur mobile
- `prefers-reduced-motion` respecté (Framer Motion le gère nativement)

---

## ✅ Garanties

- **Aucune logique métier modifiée** (routing `/nouveau-mandat`, `useSearchType`, ancres `#tarifs`)
- **Charte gold conservée** (HSL `38 45% 48%`, classes `luxury-*` existantes)
- **i18n FR intégral** (zéro texte EN du composant original)
- **Accessibilité** : contraste 4.5:1, alt text sur images, focus visible
- **Performance** : images optimisées (PNG compressé, ~50-80kb chacune), lazy loading natif via `loading="lazy"`
- **Page Relouer intacte** (modèle Standard/Premium préservé)

---

## 📂 Fichiers impactés

### Créés
- `src/assets/pricing/activation-key.png`
- `src/assets/pricing/success-contract.png`
- `src/assets/pricing/guarantee-shield.png`
- `src/components/shared/PremiumPricingCard.tsx`

### Modifiés
- `src/components/public-site/sections/PricingSection.tsx`
- `src/components/landing/premium/PricingSection.tsx`

### Inchangés
- `src/pages/RelouerMonAppartement.tsx` ✋
- `src/pages/Landing.tsx` (juste l'import lazy)
- `src/pages/public-site/HomePage.tsx`
