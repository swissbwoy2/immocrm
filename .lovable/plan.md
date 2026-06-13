
# Alignement UI/UX site public sur home-bliss-redo.lovable.app

Constat : les **tokens couleurs sont déjà identiques** (sage-dark `#2C362D`, sage `#708271`, cream `#F9F8F4`). L'écart vient de la **structure des composants** du HomePage et du Header publics. La référence est un site vitrine éditorial, notre `/` actuel est une landing SaaS pour le logiciel Logisorama.

## Périmètre

**Fichiers touchés (uniquement public-site)** :
- `src/pages/public-site/HomePage.tsx` — refonte complète
- `src/components/public-site/PublicSiteHeader.tsx` — refonte
- `src/components/public-site/PublicSiteLayout.tsx` — suppression bannière "Propulsé par"
- éventuellement nouveaux composants dans `src/components/public-site/sections/`

**Hors périmètre (intouchés)** :
- SaaS interne (`/admin/*`, `/agent/*`, `/closeur/*`, espaces client, etc.)
- Auth, routes, Supabase, edge functions, données
- Autres pages publiques (`/contact`, `/annonces`, etc.) — pourront être faites en suivi

## Header public (refonte)

Structure cible (gauche → droite) :

```text
[IMMO-RAMA logo sage-dark]    ACCUEIL · ANNONCES · ACHAT-VENTE · RELOGEMENT · RELOCATION · PROJECT MANAGEMENT · RENDEZ-VOUS · À PROPOS    [ESTIMATION GRATUITE]
```

- Background : `bg-cream` (clair, pas dark)
- Hauteur : `h-20` fixe, `border-b border-border`
- Logo : SVG/texte serif sage-dark à gauche
- Nav : 8 liens uppercase, `text-xs tracking-[0.18em] font-medium`, hover → `text-accent`
- CTA : bouton rectangulaire `bg-primary text-primary-foreground px-6 py-3 uppercase tracking-widest text-xs font-bold`
- Pas de bannière "Propulsé par"
- Mobile : burger menu (drawer cream)

## HomePage public (refonte complète)

Sections dans l'ordre :

1. **Hero (h-[85vh])**
   - Image villa pleine largeur (background)
   - Overlay `bg-primary/20`
   - Carte `bg-cream/95 p-10 md:p-16 shadow-2xl max-w-2xl`
   - Eyebrow `text-accent uppercase tracking-[0.2em] text-xs` : "Immo-Rama — Suisse romande"
   - H1 serif `text-5xl md:text-7xl leading-[1.05]` : "L'immobilier accessible."
   - Paragraphe lead
   - 3 CTAs rectangulaires : Découvrir nos biens (primary) · Prendre RDV (accent) · Estimation gratuite (outline)

2. **Parcours — "Par où commencer ?"** (`bg-cream`)
   - Grille 5 cartes : Je cherche à louer · Je cherche à acheter · Je veux vendre · Je remets mon appartement · Projet de construction
   - Chaque carte : titre serif, baseline, lien "CONTINUER →", bouton "VOIR NOS ANNONCES"

3. **Biens choisis avec soin** (`bg-background`)
   - Eyebrow "SÉLECTION" + H2 serif + lien "EXPLORER TOUTES LES ANNONCES"
   - 3 PropertyCards (LOCATION / ACHAT badges)
   - Réutilise le composant existant de fiches biens publiques si présent

4. **Nos services** (`bg-primary text-primary-foreground` — section sombre sage-dark)
   - Eyebrow "NOS SERVICES" sage-light + H2 serif cream "Un accompagnement complet, taillé pour vous."
   - Grille 4 colonnes numérotées 01 · 02 · 03 · 04
   - 01 ACHAT-VENTE · 02 RELOGEMENT & PREMIÈRE ACQUISITION · 03 RELOCATION · 04 PROJECT MANAGEMENT 360°

5. **Stats** (`bg-cream`)
   - Eyebrow "IMMO-RAMA" + H2 "Stats"
   - 4 stats serif géantes : +145 clients relogés · +300 estimations · +300 offres proposées · 99% satisfaction

6. **Notre signature** (`bg-cream`)
   - Eyebrow + H2 serif italique "Une vision exigeante de l'immobilier."
   - Texte gauche + carte citation sage-light à droite (Christ Ramazani — Fondateur)
   - CTA "DÉCOUVRIR LA MAISON"

7. **CTA estimation** (`bg-sage-light` ou `bg-accent/20`)
   - H2 serif "Connaissez la juste valeur de votre bien."
   - Bouton "DEMANDER MON ESTIMATION"

8. **Footer** : déjà existant — vérifier alignement cream/sage-dark, sinon retoucher légèrement

## Composants à créer

```text
src/components/public-site/sections/
  HeroSection.tsx
  ParcoursSection.tsx
  BiensChoisisSection.tsx
  ServicesSection.tsx
  StatsSection.tsx
  SignatureSection.tsx
  EstimationCTASection.tsx
```

Chacun consomme exclusivement les tokens sémantiques (`bg-background`, `bg-primary`, `text-accent`, `font-serif`, etc.) — aucun hex hardcodé.

## Assets nécessaires

- 1 image hero villa (utiliser `imagegen` style architecture suisse moderne intérieur lumineux) → `src/assets/public-site/hero-villa.jpg`
- 3 images de biens placeholder si pas de données réelles (studio, appart, maison) — ou puiser depuis `listProperties` si dispo

## Hors scope explicite

- Pas de modification du SaaS (`PrivateLayout`, routes admin/agent/closeur, etc.)
- Pas de modif Supabase / RLS / edge functions
- Pas de changement de routing (`/` reste `HomePage`)
- Pas de modif des autres pages publiques dans ce ticket

## Validation

- Screenshot full-page de `/` après refonte
- Comparaison côte à côte avec `home-bliss-redo.lovable.app`
- Validation visuelle : header cream, hero éditorial, section services dark, stats serif géants
