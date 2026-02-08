

# Deplacer l'analyse de dossier et ajouter un CTA dans le Hero

## 2 modifications

### 1. Deplacer la section "Analyse de dossier" juste apres la video

Actuellement l'ordre est :
```text
VideoSection
QuickLeadForm
GuaranteeSection
BenefitsSection
HowItWorks
DossierAnalyseSection   <-- ici actuellement
```

Nouvel ordre :
```text
VideoSection
DossierAnalyseSection   <-- deplace ici, juste apres la video
QuickLeadForm
GuaranteeSection
BenefitsSection
HowItWorks
BudgetCalculatorSection
...
```

**Fichier** : `src/pages/Landing.tsx` -- Deplacer `<DossierAnalyseSection />` de la ligne 86 vers juste apres `<VideoSection />` (ligne 81).

### 2. Ajouter un bouton CTA "Analyse gratuite de solvabilite" dans le HeroSection

Ajouter un nouveau bouton en dessous du bouton "Tester le service gratuitement pendant 24h" (ligne 188). Ce bouton sera un lien ancre (`#analyse-dossier`) qui scrollera vers la section DossierAnalyseSection.

**Design** : bouton `variant="outline"` avec une icone `FileSearch`, texte "Analyse gratuite de solvabilite", style similaire au bouton "Tester le service" mais avec un visuel distinct (bordure en vert/success pour se demarquer).

**Fichier** : `src/components/landing/HeroSection.tsx` -- Ajouter un bouton entre la ligne 188 et la ligne 190 (apres le bouton "Tester le service" et avant les trust signals).

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `src/pages/Landing.tsx` | Deplacer `DossierAnalyseSection` juste apres `VideoSection` |
| `src/components/landing/HeroSection.tsx` | Ajouter le bouton CTA "Analyse gratuite de solvabilite" avec lien ancre vers `#analyse-dossier` |

