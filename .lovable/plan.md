

# Phase 1 — Execution Ready

## Context Gathered
All 18 existing landing components have been fully read and analyzed. Business logic, data arrays, Supabase calls, UTM tracking, Meta Pixel firing, and calculation formulas are fully mapped.

## Execution Summary

**24 files to create:**

### Core Layout (4)
1. `src/components/public-site/PublicSiteHeader.tsx` — Sticky glassmorphism header
2. `src/components/public-site/PublicSiteMenu.tsx` — Fullscreen overlay menu
3. `src/components/public-site/PublicSiteFooter.tsx` — 4-column premium footer
4. `src/components/public-site/PublicSiteLayout.tsx` — Wrapper with SearchTypeProvider, WhatsApp, CookieConsent

### Sections (19 in `src/components/public-site/sections/`)
5. `HeroSection.tsx` — Full rebuild of PremiumHero (same data: HEADLINE_VARIANTS, zoneOptions, budgetOptions, permisOptions, tabs, mini-form, trust badges)
6. `DifferentiatorSection.tsx` — Same comparison data arrays, dark bg, desktop table + mobile cards
7. `HowItWorksSection.tsx` — Same 3 steps, timeline
8. `SocialProofSection.tsx` — Elfsight widget `6edfc233...` + Instagram reels `DVPQODmCNBU` + `DUf-zVlDDDv`
9. `ServicesFullSection.tsx` — Same 4 deliverables
10. `DossierAnalyseSection.tsx` — Full visual rebuild, same Supabase insert + UTM + Meta Pixel + notify-new-lead + 2-step form
11. `GuaranteeSection.tsx` — Same pricing items location/achat
12. `PricingSection.tsx` — Same 3 columns
13. `BudgetCalcSection.tsx` — Full visual rebuild, same calculation logic
14. `CoverageSection.tsx` — Same 6 cantons
15. `StatsSection.tsx` — Same Supabase query + AnimatedNumber
16. `PartnersSection.tsx` — Same 7 partner logos with imports
17. `TechSection.tsx` — Same 4 features
18. `ServiceCardsSection.tsx` — 3 service cards
19. `TeamSection.tsx` — Same Christ Ramazani data
20. `ForWhoSection.tsx` — Same 3 profiles
21. `FAQSection.tsx` — Same 5 FAQ items
22. `CloserSection.tsx` — Dark CTA + partner program merged
23. `index.ts` — Barrel exports

### Page (1)
24. `src/pages/public-site/HomePage.tsx` — Assembles all sections, auth redirect identical to Landing.tsx

**1 file to modify:**
- `src/App.tsx` — Line 18: replace Landing import with lazy HomePage, Line 240: swap route element

## Design Tokens (uniform)
- Sections: `py-24 md:py-32`
- Cards: `rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8`
- Inputs: `h-14` for premium feel
- CTA: `bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20`

## Confirmations
- No private component, page, logic, or business tunnel will be modified
- `/nouveau-mandat` remains strictly intact
- `src/App.tsx` is the only existing file modified
- Landing.tsx remains in codebase untouched

## Execution Order
1. Core layout (4 files)
2. All section components (19 files)
3. HomePage.tsx
4. App.tsx modification
5. Screenshots for validation

