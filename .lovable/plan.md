

# Ajouter la section "Notre equipe" sur la landing page

## Objectif

Creer une nouvelle section "Notre equipe" avec les photos de profil rondes des 3 membres, placee juste en dessous du widget Google Reviews (SocialProofBar).

## Equipe a afficher

| Membre | Role | Photo |
|--------|------|-------|
| Christ Ramazani | Directeur d'agence - Courtier location et vente | CHRIST_RAMAZANI.png |
| Maurine Perret | Courtiere Location et Vente | MAURINE_PERRET.jpg |
| Thibault Depraz | Courtier Location et Vente | THIBAULT_DEPRAZ.jpg |

Tous partagent le service : **Courtage et Relocation**

## Design prevu

- Titre centre "Notre equipe" avec un sous-titre
- 3 cartes alignees horizontalement (desktop) / empilees (mobile)
- Photo de profil ronde (style avatar circulaire) avec bordure subtile
- Nom en gras, role en dessous, service en badge
- Style coherent avec le reste de la landing page (fond clair, sobre, premium)

## Modifications techniques

### 1. Copier les photos dans le projet
- `CHRIST_RAMAZANI.png` vers `src/assets/team/christ-ramazani.png`
- `MAURINE_PERRET.jpg` vers `src/assets/team/maurine-perret.jpg`
- `THIBAULT_DEPRAZ.jpg` vers `src/assets/team/thibault-depraz.jpg`

### 2. Creer le composant `TeamSection.tsx`
- Nouveau fichier : `src/components/landing/TeamSection.tsx`
- Photos importees depuis `@/assets/team/`
- Layout responsive : 3 colonnes desktop, 1 colonne mobile
- Photos rondes avec `rounded-full` et `object-cover`
- Animations fade-in coherentes avec les autres sections

### 3. Integrer dans `Landing.tsx`
- Importer `TeamSection`
- Placer `<TeamSection />` juste apres `<SocialProofBar />` et avant `<QuickLeadForm />`

Ordre final des sections :

```text
...
DifferentiationSection
SocialProofBar (widget Google Reviews)
TeamSection    <-- NOUVEAU
QuickLeadForm  (Recois ta shortlist)
FAQSection
...
```

