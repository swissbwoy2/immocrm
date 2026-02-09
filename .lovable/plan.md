

# Remonter le QuickLeadForm en 4eme position

## Modification

Un seul fichier a modifier : `src/pages/Landing.tsx`

Nouvel ordre des sections :

```text
HeroSection
SocialProofBar
TeamSection
QuickLeadForm        <-- Remonte de la 6eme a la 4eme position
VideoSection
DossierAnalyseSection
GuaranteeSection
BenefitsSection
HowItWorks
BudgetCalculatorSection
DifferentiationSection
FAQSection
CoverageSection
StatsSection
PartnersSection
ProptechSection
ApporteurSection
LandingFooter
```

## Ce qui change concretement

Le `QuickLeadForm` passe de la 6eme position (apres DossierAnalyseSection) a la 4eme position (apres TeamSection, avant VideoSection). Cela permet aux visiteurs Facebook de voir le formulaire rapide en 1-2 scrolls sur mobile au lieu de 4-5.

## Fichier modifie

- `src/pages/Landing.tsx` : deplacer la ligne `<QuickLeadForm />` entre `<TeamSection />` et `<VideoSection />`

