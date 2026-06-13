
# Alignement design Logisorama → Immo-Rama Reborn

## Source de vérité (extrait de [Immo-Rama Reborn](/projects/af621b79-b45f-408f-b123-9d2fd191f8bd))

Direction **« Alpine editorial »** — sage green + cream, sobre et naturel.

**Couleurs brand (hex d'origine → HSL pour ce projet)**
- `--sage-dark` `#2C362D` → `125 8% 19%` (primary, foreground)
- `--sage` `#708271` → `123 7% 47%` (accent, ring)
- `--sage-light` `#A3B18A` → `85 19% 62%`
- `--cream` `#F9F8F4` → `50 33% 97%` (background)
- `--secondary / --muted` `#ECEAE2` → `47 22% 91%`
- `--muted-foreground` `#6B736B` → `120 3% 43%`
- `--border` sage 18% opacity, `--input` sage 22%

**Mapping sémantique**
- background = cream / foreground = sage-dark
- primary = sage-dark / primary-foreground = cream
- accent = sage / ring = sage
- Cards : blanc pur `#ffffff` sur fond cream

**Dark mode**
- background `#1A211B`, primary = sage-light, accent = sage

**Typographie**
- Display/titres : **Playfair Display** (serif)
- Body : **Plus Jakarta Sans** (sans)
- `h1–h5` letter-spacing `-0.01em`

**Radius** : `0.5rem`

## Pourquoi Tailwind v3 ≠ v4
Reborn est sur Tailwind v4 (`@theme inline`, hex directs). Logisorama est sur v3 avec tokens HSL. Je traduis tout en **HSL** pour rester compatible avec `tailwind.config.ts` actuel et toutes les classes existantes (`bg-primary`, `text-foreground`, etc.) — zéro refacto de composants nécessaire.

## Périmètre confirmé
**Tout le projet** : site public + landing + SaaS interne (admin, agent, propriétaire, client, coursier, annonceur, apporteur, mandats v3, formation, rénovation).

## Étapes

### 1. Réécrire les tokens de `src/index.css`
Remplacer les blocs `:root` et `.dark` par le mapping HSL sage/cream ci-dessus. Conserver à l'identique :
- Keyframes/animations existantes (`shimmer`, `gold-pulse`, `beam-sweep`, `meteor-fall`, `marquee`, etc.) — utilisées par le SaaS
- Tokens fonctionnels non-couleur (`--radius`, sidebar tokens recalés sur sage)
- Tokens `success` / `warning` / `destructive` (badges statuts métier intacts)

Ajouter l'import Google Fonts en tête :
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..800;1,400;1,500&family=Plus+Jakarta+Sans:wght@300..700&display=swap');
```

Forcer la typo dans `@layer base` :
```css
body { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
h1, h2, h3, h4, h5, h6 { font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.01em; }
```

### 2. Mettre à jour `tailwind.config.ts`
- `fontFamily.sans` → `['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif']`
- `fontFamily.serif` → `['Playfair Display', 'Georgia', 'serif']` (déjà OK)
- Ajouter color tokens brand : `sage` (DEFAULT/dark/light), `cream` pour usage en classes Tailwind
- Ne **pas** toucher keyframes/animations existantes

### 3. Resynchroniser les couleurs "hardcoded" du site public
Plusieurs fichiers utilisent `hsl(142 45% 40%)` (ancien vert sapin) en dur :
- `src/components/public-site/PublicSiteLayout.tsx` (banner haut + lien Immo-rama)
- `src/components/public/PublicHeader.tsx`
- `src/components/PageLoader.tsx` (halo doré → halo sage)
- `src/components/public-site/sections/HeroSection.tsx`
- `src/pages/public-site/HomePage.tsx`
- `src/pages/Landing.tsx`, `ChasseurAppartement.tsx`, `VendreMonBien.tsx`, `RelouerMonAppartement.tsx`

Remplacer par tokens sémantiques (`hsl(var(--primary))`, `hsl(var(--accent))`, `hsl(var(--background))`).

### 4. Mémoire projet
Mettre à jour `mem://style/brand-identity-guidelines` avec la nouvelle palette « Alpine editorial » pour cohérence future (emails, PDFs, etc.).

### 5. Vérification visuelle
- Capture `/` (site public) → contrôle banner + hero + boutons
- Capture une page admin (ex. `/admin/agent-ia`) + une page agent → s'assurer que les contrastes restent lisibles
- Vérifier focus rings (passent en sage)

## Détails techniques

**Conversion hex → HSL** (j'utilise des valeurs arrondies cohérentes) :
```css
:root {
  --background: 50 33% 97%;        /* cream */
  --foreground: 125 8% 19%;        /* sage-dark */
  --card: 0 0% 100%;
  --card-foreground: 125 8% 19%;
  --primary: 125 8% 19%;           /* sage-dark */
  --primary-foreground: 50 33% 97%;
  --secondary: 47 22% 91%;
  --secondary-foreground: 125 8% 19%;
  --muted: 47 22% 91%;
  --muted-foreground: 120 3% 43%;
  --accent: 123 7% 47%;            /* sage */
  --accent-foreground: 50 33% 97%;
  --border: 123 7% 47% / 0.18;     /* sage @ 18% */
  --input: 123 7% 47% / 0.22;
  --ring: 123 7% 47%;
  --radius: 0.5rem;
  /* brand utility tokens */
  --sage-dark: 125 8% 19%;
  --sage: 123 7% 47%;
  --sage-light: 85 19% 62%;
  --cream: 50 33% 97%;
}
```

**Risques connus** :
- Tous les boutons `bg-primary` du SaaS passent du vert sapin actuel au sage-dark profond (presque charbon vert). Bien plus sobre.
- Le focus ring devient sage clair.
- Le banner "Propulsé par Immo-rama.ch" perd son vert vif → sage-dark sur cream.
- Le `--radius` passe de la valeur actuelle à `0.5rem` → coins légèrement moins arrondis partout (sauf override local).

**Ce que je NE touche PAS** :
- Logique métier, queries Supabase, edge functions, RLS
- Layouts/structures de pages
- Logo Immo-rama
- Composants shadcn (auto-suivent les tokens)

## Hors scope (V2 si demandé)
- Refonte structurelle de pages publiques (hero, sections)
- Copie de composants spécifiques depuis Reborn
- Alignement des templates emails transactionnels
- Alignement des PDFs (mandats, factures)
