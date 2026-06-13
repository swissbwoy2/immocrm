## Objectif

Appliquer la charte visuelle Immo-Rama (vue sur les 3 captures) au site public `logisorama.ch` — couleurs + typographie uniquement, sans toucher au contenu ni à la structure.

## Charte cible (extraite des captures)

**Couleurs**
- Background principal : crème `40 30% 96%`
- Vert sauge primaire (CTA, accents) : `145 18% 32%`
- Vert foncé bandeau (sections sombres) : `150 12% 25%`
- Foreground texte : `150 15% 15%`
- Muted / cartes : `40 20% 92%`
- Bordures discrètes : `40 15% 85%`

**Typographie**
- Titres : `Cormorant Garamond` (serif éditorial, comme « L'immobilier accessible. »)
- Corps + nav : `Manrope` (sans-serif géométrique, tracking légèrement étendu pour la nav en majuscules)

## Changements

### 1. `src/index.css`
- Dans `.theme-luxury` (et `:root` si nécessaire) : remplacer les tokens `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--accent`, `--muted`, `--card`, `--border`, `--ring` par les valeurs ci-dessus.
- Mettre à jour `--gold-*` / gradients `luxury-*` pour qu'ils utilisent les verts sauge (sinon le hero garde des reflets dorés incohérents).
- Forcer `body { font-family: 'Manrope', sans-serif }` et `h1,h2,h3,h4 { font-family: 'Cormorant Garamond', serif }` à l'intérieur du scope `.public-site` (ou équivalent) pour ne pas casser le reste de l'app.

### 2. `index.html`
- Ajouter les `<link>` Google Fonts : `Cormorant Garamond` (500, 600, 700) + `Manrope` (300, 400, 500, 600).

### 3. `tailwind.config.ts`
- `fontFamily.serif` → `['"Cormorant Garamond"', 'Georgia', 'serif']`
- Ajouter `fontFamily.sans` → `['Manrope', 'system-ui', 'sans-serif']`
- Ajouter `fontFamily.display` (alias serif) pour usage explicite dans les sections.

### 4. Sections du site public (`src/components/public-site/sections/*`)
- Aucune restructuration. Uniquement : s'assurer que les `<h1>/<h2>` portent bien `font-serif` (ils héritent déjà via le CSS scope mais on vérifie HeroSection, ServicesFullSection, etc.).
- Remplacer les classes hardcodées qui resteraient (`text-gold-*`, gradients dorés explicites) par les tokens sémantiques (`text-primary`, `bg-primary`).

## Hors scope
- Pas de changement de copy, de routes, de structure des sections, d'images, de logique métier ou de backend.
- Pas de modification de l'app authentifiée (CRM) — uniquement le scope `.theme-luxury` / site public.

## Vérification
- Screenshot desktop `/` : hero crème + titre serif + CTA vert sauge.
- Screenshot mobile 390 : même rendu cohérent.
- Vérifier que les pages CRM (login, dashboard) ne sont pas impactées visuellement.
