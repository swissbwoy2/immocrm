

# Creer la section "Nos partenaires de confiance" avec 7 logos

## Objectif

Creer une nouvelle section sur la landing page affichant les logos de tous les partenaires de confiance, avec des liens d'affiliation pour certains d'entre eux.

## Liste complete des partenaires

| Partenaire | Fichier source | Lien |
|-----------|---------------|------|
| Allianz | Allianz.svg (deja uploade) | Aucun |
| AXA | AXA_Logo.svg (deja uploade) | Aucun |
| Resolve | download.svg (deja uploade) | https://app.resolve.ch/?ref=3cDockrkQdpgjmMqm&utm_source=referral_link_user |
| FirstCaution | download-1.svg (deja uploade) | https://www.firstcaution.ch/fr/onboarding/?ref=link=0062863 |
| Flatfox | download-3.svg (nouveau) | Aucun |
| Immobilier.ch | download-2.svg (nouveau) | Aucun |
| RealAdvisor | download.png (nouveau) | Aucun |

## Emplacement dans la page

```text
StatsSection
PartnersSection    <-- NOUVEAU
ProptechSection
```

## Modifications techniques

### 1. Copier les 7 logos dans `src/assets/partners/`

- `Allianz.svg` vers `src/assets/partners/allianz.svg`
- `AXA_Logo.svg` vers `src/assets/partners/axa.svg`
- `download.svg` vers `src/assets/partners/resolve.svg`
- `download-1.svg` vers `src/assets/partners/firstcaution.svg`
- `download-3.svg` vers `src/assets/partners/flatfox.svg`
- `download-2.svg` vers `src/assets/partners/immobilier-ch.svg`
- `download.png` vers `src/assets/partners/realadvisor.png`

### 2. Creer `src/components/landing/PartnersSection.tsx`

Nouveau composant contenant :
- Titre centre "Nos partenaires de confiance"
- Sous-titre discret
- Grille responsive centree avec les 7 logos de hauteur uniforme (~40-50px)
- Les logos **Resolve** et **FirstCaution** sont cliquables avec leurs liens d'affiliation respectifs (ouverts dans un nouvel onglet)
- Les autres logos (Allianz, AXA, Flatfox, Immobilier.ch, RealAdvisor) sont affiches sans lien
- Effet grayscale au repos avec couleur au survol pour tous les logos
- Animation fade-in coherente avec les autres sections du site
- Fond leger (`muted/30`) pour separer visuellement

### 3. Integrer dans `src/pages/Landing.tsx`

- Importer `PartnersSection`
- Placer `<PartnersSection />` entre `<StatsSection />` (ligne 89) et `<ProptechSection />` (ligne 90)

## Resume des fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/assets/partners/` (7 fichiers) | Copier les logos SVG et PNG |
| `src/components/landing/PartnersSection.tsx` | Nouveau composant |
| `src/pages/Landing.tsx` | Importer et placer la section |

