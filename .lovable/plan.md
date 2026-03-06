

## Plan final — Refonte premium avec double onglet louer/acheter

### Ce qui existe

- **`HeroSection.tsx`** : contient le switch louer/acheter, le contenu location ET achat (headlines, promise box, CTAs, trust signals). Utilise `useSearchType()`.
- **`PremiumHero.tsx`** : version premium location-only (eyebrow, H1, mini-form 3 selects, social proof). Pas de tabs, pas de contenu achat.
- **`Landing.tsx`** : utilise `HeroSection`, `SocialProofBar`, `TeamSection`, `QuickLeadForm` en eager + ~15 sections lazy.

### Approche

Fusionner le meilleur des deux dans un nouveau `PremiumHero.tsx` :
- Conserver le background image `hero-bg.jpg`, le logo, le badge N°1, le slogan, le switch tabs de `HeroSection`
- Tab location : remplacer l'ancien contenu par la version premium (eyebrow, nouveau H1, subtitle, social proof, mini-form, CTA "Activer ma recherche maintenant", CTA secondaire "Voir comment ça marche", bloc offre)
- Tab achat : copier fidèlement le contenu actuel de `HeroSection` (headlines achat, promise box, CTAs, trust signals)

---

### Fichiers à créer (7)

Tous dans `src/components/landing/premium/` :

**1. ForWhoSection.tsx** — 3 cartes (Clock, Target, Compass) avec profils cibles + CTA discret `/nouveau-mandat`

**2. HowItWorksSection.tsx** — 3 étapes numérotées avec ligne verticale, `id="comment-ca-marche"` (remplace l'ancien `HowItWorks`)

**3. WhatYouGetSection.tsx** — 4 blocs grille 2x2 : agent dédié, recherche active, dossier optimisé, suivi temps réel (remplace `BenefitsSection`)

**4. PricingSection.tsx** — 3 colonnes (300 CHF activation / 1 mois loyer / 90j garantie) + CTA

**5. PremiumFAQ.tsx** — 5 questions avec Collapsible (remplace `FAQSection`)

**6. CloserSection.tsx** — Titre + trust signals + CTA principal + secondaire

**7. StickyMobileCTA.tsx** — `fixed bottom-0 md:hidden z-[55]`, eager, safe-area, apparaît après scroll hero

---

### Fichiers à modifier (2)

**`src/components/landing/premium/PremiumHero.tsx`** — Réécriture complète :
- Import `useSearchType`, `heroBg`, `logoImmoRama`, icônes (Crown, Key, Home, Rocket, ShieldCheck, etc.)
- Structure :
  - Background image + overlay (comme l'actuel)
  - Badge N°1 + Logo + Slogan
  - **Switch tabs** (identique visuellement à l'actuel `HeroSection`)
  - **Contenu conditionnel** :
    - `isLocation` (ou `!searchType`) → nouveau contenu premium :
      - Eyebrow : "Recherche locative accompagnée en Suisse romande"
      - H1 : "Nous trouvons votre appartement avec méthode, discrétion et efficacité."
      - Subtitle : "Un agent dédié vous accompagne..."
      - Social proof : "+500 familles · 4.8★ · Réponse 24h · 90j remboursé"
      - Mini-form 3 selects (zone/budget/permis) dans carte `rounded-2xl`
      - CTA principal "Activer ma recherche maintenant" → `/nouveau-mandat` avec query params
      - CTA secondaire "Voir comment ça marche" → `#comment-ca-marche`
      - Bloc offre : "Acompte 300 CHF · Commission succès · Remboursement échec"
    - `isAchat` → contenu achat copié de `HeroSection` (headlines, techLine, empathic sub, promise box, CTAs, trust signals) — identique à l'existant
  - Login link + trust block (communs)
  - Scroll indicator

**`src/pages/Landing.tsx`** — Mise à jour structure :
- **Supprimer imports** : `HeroSection`, `SocialProofBar`, `QuickLeadForm`, `BenefitsSection`, `HowItWorks`, `FAQSection`, `EntreprisesRHSection`
- **Ajouter imports eager** : `PremiumHero` (from premium/), `ForWhoSection`, `HowItWorksSection`, `StickyMobileCTA`
- **Ajouter imports lazy** : `WhatYouGetSection`, `PricingSection`, `PremiumFAQ`, `CloserSection`
- **Conserver** : `FloatingNav`, `TeamSection` (eager), tous les lazy conservés (TestimonialVideo, Video, DossierAnalyse, Guarantee, BudgetCalculator, Differentiation, Coverage, Stats, Partners, Proptech, Apporteur, LandingFooter, CookieConsent)
- Nouveau ordre de rendu (voir ci-dessous)
- WhatsApp widget : `z-40`, `opacity-70 hover:opacity-100`

**`src/components/landing/FloatingNav.tsx`** :
- Supprimer liens Annonces, Vendre, Se connecter + imports inutiles
- Garder : logo + CTA unique "Activer ma recherche" → `/nouveau-mandat`

---

### Structure de rendu finale

```text
FloatingNav (simplifié)
Top banner
PremiumHero                      (eager — tabs louer/acheter conservés)
TeamSection                      (eager — conservée)
ForWhoSection                    (eager — nouveau)
HowItWorksSection                (eager — nouveau, remplace HowItWorks)
--- Suspense lazy ---
TestimonialVideoSection          (conservée)
VideoSection                     (conservée)
WhatYouGetSection                (nouveau, remplace BenefitsSection)
DossierAnalyseSection            (conservée)
GuaranteeSection                 (conservée)
PricingSection                   (nouveau)
BudgetCalculatorSection          (conservée)
DifferentiationSection           (conservée)
PremiumFAQ                       (nouveau, remplace FAQSection)
CoverageSection                  (conservée)
StatsSection                     (conservée)
PartnersSection                  (conservée)
ProptechSection                  (conservée)
CloserSection                    (nouveau)
ApporteurSection                 (conservée)
LandingFooter                    (conservée)
--- fin Suspense ---
StickyMobileCTA                  (eager, hors Suspense)
WhatsApp widget                  (z-40, opacity-70)
CookieConsentBanner              (lazy)
```

### Z-index

```text
z-[60]  Cookie banner
z-[55]  StickyMobileCTA
z-50    FloatingNav
z-40    WhatsApp
```

### Anti-doublons

- `HowItWorksSection` remplace `HowItWorks` → ancien supprimé du rendu
- `WhatYouGetSection` remplace `BenefitsSection` → ancien supprimé du rendu
- `PremiumFAQ` remplace `FAQSection` → ancien supprimé du rendu

