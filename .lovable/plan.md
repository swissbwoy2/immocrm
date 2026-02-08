

# Remonter les sections et ajouter un pop-up video Instagram

## Probleme actuel

Les sections `SocialProofBar`, `TeamSection` et `QuickLeadForm` sont actuellement placees tout en bas, apres `DifferentiationSection` (ligne 82-85). Elles doivent etre remontees juste apres le `HeroSection`.

## Modifications prevues

### 1. Reorganiser l'ordre des sections dans `Landing.tsx`

Nouvel ordre :

```text
HeroSection
SocialProofBar       <-- remonte juste apres Hero
TeamSection          <-- remonte juste apres
QuickLeadForm        <-- remonte juste apres ("Recois ta shortlist")
GuaranteeSection
BenefitsSection
HowItWorks
BudgetCalculatorSection
DifferentiationSection
FAQSection
CoverageSection
StatsSection
...
```

### 2. Creer un pop-up de bienvenue avec la video Instagram

**Nouveau fichier** : `src/components/landing/WelcomeVideoPopup.tsx`

- S'affiche automatiquement a l'atterrissage sur le site
- Contient un embed Instagram Reel (`https://www.instagram.com/reel/DUf-zVlDDDv/`) via une iframe Instagram embed
- Bouton CTA "Activer ma recherche" qui redirige vers `/nouveau-mandat`
- Bouton de fermeture (croix) en haut a droite
- Ne s'affiche qu'une seule fois par session (stockage en `sessionStorage` pour ne pas spammer le visiteur a chaque rechargement)
- Design : overlay sombre + modal centree, style coherent avec le reste du site

### 3. Integrer le pop-up dans `Landing.tsx`

- Importer et ajouter `<WelcomeVideoPopup />` dans le composant Landing

## Details techniques

| Fichier | Action |
|---------|--------|
| `src/pages/Landing.tsx` | Reorganiser les sections + ajouter le pop-up |
| `src/components/landing/WelcomeVideoPopup.tsx` | Nouveau composant : modal video Instagram + CTA |

