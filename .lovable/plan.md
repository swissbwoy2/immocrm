
# Refonte couleurs site public — 100% clair

## Règles strictes (demande user)
- **Tous les fonds clairs / blancs** sur 100% des sections — aucune section sombre
- **Texte** : bleu-vert foncé (encre profonde), lisible, contraste fort
- **Aucun beige, brun, doré, anthracite** nulle part
- Accents : vert Immo-rama + bleu ciel discret uniquement
- Périmètre : **site public uniquement** (`.theme-luxury`)

## Problème actuel
Les sections publiques utilisent des classes Tailwind arbitraires hardcodées sombres (`bg-[hsl(30_15%_10%)]`, alpha `/0.6`, etc.) que mes overrides CSS via `[class*=]` ne couvrent pas toutes → fonds noirs persistent, texte sombre illisible.

## Solution
Refactor des composants publics pour utiliser des **tokens sémantiques**. Le scope `.theme-luxury` pilote tout, sans aucun fond foncé possible.

## Palette finale (`.theme-luxury` dans `src/index.css`)
```text
--background       : 0 0% 100%        (blanc pur)
--card             : 0 0% 100%
--muted            : 160 25% 97%      (vert-bleu très pâle pour alternance subtile)
--secondary        : 160 30% 94%      (carte mise en avant)
--foreground       : 200 35% 18%      (bleu-vert foncé encre — texte principal)
--muted-foreground : 200 20% 38%      (texte secondaire)
--primary          : 158 55% 38%      (vert Immo-rama foncé pour CTA)
--primary-foreground : 0 0% 100%
--accent           : 200 70% 45%      (bleu profond pour liens / accents)
--border           : 160 15% 88%
```
Toute teinte beige/brune/dorée bannie des tokens.

## Mapping de substitution (appliqué dans tous les composants publics)
```text
bg-[hsl(30_15%_8..14%)]         → bg-background   (ou bg-muted en alternance)
bg-[hsl(30_15%_..%/0.x)]        → bg-card / bg-muted
text-[hsl(40_25%_85..98%)]      → text-foreground
text-[hsl(40_20%_55..75%)]      → text-muted-foreground
text-[hsl(38_..%_..%)] (doré)   → text-primary
border-[hsl(38_..%)] (doré)     → border-border ou border-primary/30
bg-[hsl(38_..%)] (doré pâle)    → bg-secondary
luxury-grain, dark overlays     → supprimés
gradients sombres inline        → remplacés par bg-background ou gradient clair
```

## Fichiers touchés (site public uniquement)
### Sections (`src/components/public-site/sections/`)
HeroSection, StatsSection, SocialProofSection, ForWhoSection, HowItWorksSection, ServicesFullSection, DifferentiatorSection, PricingSection, GuaranteeSection, TeamSection, PartnersSection, CoverageSection, FAQSection, AppShowcaseSection, BudgetCalcSection, DossierAnalyseSection, DossierAnalyseForm, CloserSection, TechSection, StickyMobileCTA.

### Layout
PublicSiteLayout, PublicSiteHeader, PublicSiteFooter, PublicSiteMenu, sous-dossiers `3d/`, `animations/`, `magic/` (passes ciblées).

### Pages
Index (landing), VendreMonBien, RelouerMonAppartement, ChasseurAppartement, ConstruireRenover.

### CSS
`src/index.css` : 
- Mettre à jour les tokens `.theme-luxury` aux valeurs ci-dessus
- Nettoyer les blocs overrides `[class*=]` devenus inutiles
- `.imr-hero-bg` → gradient clair `from-secondary via-muted to-background`
- Retirer les références à `luxury-grain` côté public

## Alternance visuelle
Pour éviter un mur blanc plat :
- Sections impaires : `bg-background`
- Sections paires : `bg-muted` (vert-bleu très pâle ~3% de saturation)
- Cartes : `bg-card` + `shadow-md` + `border border-border`
- CTA principal : `bg-primary text-primary-foreground`
- CTA secondaire : `variant="outline"` avec `border-primary/40 text-primary`

## Hors scope
- App interne (admin/agent/client/closeur/courier/advertiser/buyer) : **intacte**, conserve son thème sombre
- Pas de modif de contenu, copy, structure, ni assets
- Pas de modif backend

## Vérification après build
1. Screenshot `/`, `/vendre-mon-bien`, `/relouer-mon-appartement`, `/chasseur-appartement`, `/construire-renover`
2. Confirmer : 0 section sombre, 0 nuance beige/brune, contraste AA partout
3. Vérifier mobile (StickyMobileCTA, menu)
