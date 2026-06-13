
# Aligner l'UX/UI du site public Logisorama sur Immo-Rama Reborn

## Principe
Garder **toutes** les pages, routes, contenus et logiques actuels de Logisorama. **Restyler** uniquement les composants visuels du site public pour qu'ils adoptent les patterns Reborn :

- Hero plein écran avec carte cream flottante (titre Playfair XXL + 2-3 CTA)
- Sections numérotées 01/02/03/04 en sage italique petites caps
- Footer dark 3 colonnes (Bureau / Siège légal / Mentions)
- Header sticky avec wordmark + nav uppercase tracking-widest + CTA "Estimation gratuite"
- Typo : Playfair Display sur titres, Plus Jakarta Sans sur body (déjà chargés)
- Boutons : rectangulaires (sans radius), uppercase tracking-widest, primary sage-dark
- Cards images : ratio 4/5 ou 3/4, légende en small caps numérotée

## Tokens (déjà en place depuis le passage précédent)
- `--background` cream, `--primary` sage-dark, `--accent` sage, polices importées
- Rien à ajouter, juste à appliquer correctement dans les composants

## Fichiers à restyler (uniquement le site public)

### Composants chrome
- `src/components/public-site/PublicSiteLayout.tsx` — déjà passé en sage, OK
- `src/components/public-site/PublicHeader.tsx` (et `PublicSiteHeader.tsx` si présent) → wordmark "IMM9-RAMA" style Reborn, nav uppercase tracking-widest, CTA "Estimation gratuite" en bouton sage-dark rectangulaire
- `src/components/public-site/PublicFooter.tsx` (ou équivalent) → fond sage-dark, 3 colonnes Bureau / Siège légal / Liens, copyright en bas
- `src/components/public-site/PageLoader.tsx` → fond cream + spinner sage-dark

### Page d'accueil et sections
- `src/pages/HomePage.tsx` (ou équivalent) → restructure le flow : hero plein écran + services 01/02/03/04 + about + featured + footer
- `src/components/public-site/HeroSection.tsx` → image plein écran derrière, carte cream flottante centrée avec :
  - eyebrow "IMMO-RAMA — SUISSE ROMANDE" tracking-widest
  - titre Playfair 7xl/8xl "L'immobilier accessible."
  - sous-titre Plus Jakarta
  - 3 CTA : "Découvrir nos biens" (primary), "Prendre rendez-vous" (sage outline), "Estimation gratuite" (ghost)
- `src/components/public-site/ServicesGrid.tsx` (ou créer si absent) → 4 cartes image 4/5 avec numéro `01` sage italique en eyebrow, titre Playfair, paragraphe court
- `src/components/public-site/AboutSection.tsx` → split 2 colonnes texte + image
- `src/components/public-site/FeaturedListings.tsx` → grille 2/3/4 cartes PropertyCard restylées

### Pages CTA "actions"
- `src/pages/VendreMonBien.tsx` — restyle hero + sections (carte cream, sections numérotées)
- `src/pages/RelouerMonAppartement.tsx` — idem
- `src/pages/ChasseurAppartement.tsx` — idem
- `src/pages/ConstruireRenover.tsx` (si existant) — idem
- `src/pages/Landing.tsx` — idem si elle sert au public

### Composants partagés
- `src/components/public-site/PropertyCard.tsx` → ratio 4/5, légende uppercase tracking-widest + prix Playfair
- Boutons : créer une variante `<Button variant="immo">` rectangulaire uppercase tracking-widest dans `src/components/ui/button.tsx` (variant additive, ne touche pas aux variants existants utilisés par le SaaS interne)

## Hors scope (strictement)
- Routes, navigation, contenu textuel des pages (sauf ce qui est de la chrome : nav, footer, CTA labels)
- Tout le SaaS interne (`/admin/*`, `/agent/*`, `/proprietaire/*`, `/client/*`, `/coursier/*`, `/annonceur/*`, etc.) — **0 changement**
- Logique, requêtes Supabase, edge functions, RLS, pixels, tracking, formulaires
- Composants shadcn `ui/*` (sauf ajout d'une variante de bouton additive)
- Emails, PDFs, brochures
- Logo Logisorama actuel (on garde, on ne reproduit pas "IMM9-RAMA" exact)

## Étapes d'exécution
1. **Cartographie** — lire l'arborescence actuelle de `src/components/public-site/` et `src/pages/` pour confirmer les fichiers exacts à restyler (l'inventaire ci-dessus est l'attendu)
2. **Hero + Home** — refonte de `HeroSection` + structure `HomePage`
3. **Services 01/02/03/04** — composant ou section dédiée
4. **Header / Footer** — chrome alignée
5. **Pages CTA** (vendre, relouer, chasseur, construire) — même grammaire visuelle
6. **PropertyCard** — restyle
7. **Variante bouton** `immo` rectangulaire
8. **Vérif visuelle** — screenshots `/`, `/vendre-mon-bien`, `/relouer-mon-appartement`, `/chasseur-appartement` en desktop + mobile

## Risques
- Certaines pages publiques sont aussi atterrissages Google Ads avec pixels/UTM → je touche uniquement le markup/classes, pas les hooks de tracking
- Le menu actuel a peut-être plus d'entrées que celui de Reborn → je garde toutes les entrées, juste restylées
- Le footer Logisorama actuel a des mentions légales spécifiques (IDE, adresse) → je garde le contenu, je restructure la mise en page
