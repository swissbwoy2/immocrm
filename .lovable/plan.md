

# Deplacer le SocialProofBar juste au-dessus de "Recois ta shortlist"

## Situation actuelle

L'ordre des sections dans la landing page est :

```text
HeroSection
SocialProofBar  <-- position actuelle (ligne 77)
QuickLeadForm   <-- "Recois ta shortlist"
GuaranteeSection
BenefitsSection
HowItWorks
BudgetCalculatorSection
DifferentiationSection
FAQSection
...
```

Le `SocialProofBar` est colle juste apres le hero, ce qui fait qu'il apparait toujours au meme endroit en haut de page.

## Modification

**Fichier** : `src/pages/Landing.tsx`

Deplacer `<SocialProofBar />` de la ligne 77 vers juste avant `<QuickLeadForm />`, mais **apres** les sections intermediaires. Le nouvel ordre sera :

```text
HeroSection
GuaranteeSection
BenefitsSection
HowItWorks
BudgetCalculatorSection
DifferentiationSection
SocialProofBar  <-- nouvelle position (juste au-dessus du formulaire)
QuickLeadForm   <-- "Recois ta shortlist"
FAQSection
...
```

Cela place les avis Google Reviews comme element de preuve sociale juste avant que le visiteur remplisse le formulaire, ce qui renforce la confiance au moment de la conversion.

## Resume

| Fichier | Changement |
|---------|-----------|
| `src/pages/Landing.tsx` | Deplacer `SocialProofBar` de apres `HeroSection` vers juste avant `QuickLeadForm` |
