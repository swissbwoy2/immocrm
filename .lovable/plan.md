
## Objectif

Transformer le **thème visuel** de la landing publique (`/`) en style **ultra premium / luxe immobilier** (codes Sotheby's / Barnes / Christie's), en conservant strictement :
- ✅ Tout le texte
- ✅ Toutes les images
- ✅ L'ordre des sections actuel
- ❌ Modifié uniquement : couleurs, typographies, textures, ombres, traitement visuel

## Direction visuelle proposée

**Bi-tons alternés** (effet magazine luxe) :
- Sections sombres : noir minéral profond `#0E0E10` + accents or champagne `#C9A86A`
- Sections claires : ivoire crème `#F5F1E8` + accents bronze `#8B6F3D`
- Typographie titres : **Playfair Display** (serif contrastée, référence luxe)
- Body : Inter (conservé)
- Filets dorés fins en séparateurs, ombres profondes douces, animations lentes (700ms ease)
- Icônes Lucide affinées (`stroke-width={1.25}`)
- Boutons : noir mat avec bordure dorée + texte ivoire (au lieu de bleu plein)

## Stratégie d'isolation (critique)

Le nouveau thème est **scopé via une classe CSS** `.theme-luxury` posée sur `<PublicSiteLayout>` :

```css
.theme-luxury {
  --background: 222 15% 6%;
  --primary: 38 45% 58%;
  /* ... */
}
```

→ **Zéro impact** sur les espaces privés (admin / agent / client / apporteur), sur la landing legacy `/landing`, ni sur les pages publiques annexes.

## Plan d'exécution

### Lot 1 — Tokens design (`src/index.css`)
Ajouter le scope `.theme-luxury` avec nouvelle palette HSL (or, ivoire, noir minéral, anthracite, bronze) + ajustement `--radius: 0.25rem` (moins arrondi = plus chic) + ombres profondes.

### Lot 2 — Typographie (`index.html` + `tailwind.config.ts`)
- Preload Playfair Display via Google Fonts
- Ajouter `fontFamily.serif: ['Playfair Display', 'serif']` dans Tailwind
- Appliquer `font-serif` sur les `<h1>` / `<h2>` des sections

### Lot 3 — Layout publique
- `PublicSiteLayout.tsx` : ajouter `className="theme-luxury"` sur le wrapper racine
- Bandeau du haut : noir pur + liseré or 1px en bas
- `PublicSiteHeader.tsx` : transparent → noir mat au scroll, lien actif souligné en or
- `PublicSiteFooter.tsx` : noir profond, séparateurs dorés, copyright ivoire 60%

### Lot 4 — Sections (16 fichiers dans `src/components/public-site/sections/`)
Pour chacune, traitement chirurgical des classes Tailwind :
- Remplacer gradients vifs (bleu/violet/slate) → dégradés or/noir/ivoire
- Fonds blancs → ivoire `bg-[#F5F1E8]` ou noir minéral selon alternance
- Bordures grises → `border-primary/20` (filet doré)
- Cards : fond `card`, bordure dorée fine, ombre profonde douce
- Boutons CTA : style luxe (noir + bordure or + hover translate doux)
- Overlays sur images : dégradé noir bas → transparent haut (effet magazine)

Alternance proposée : Hero (sombre) → Dossier (ivoire) → Pricing (sombre) → Social proof (ivoire) → Team (sombre) → ForWho (ivoire) → HowItWorks (sombre) → etc.

### Lot 5 — Détails premium
- Animation `fade-in-up` 700ms cubic-bezier(0.16, 1, 0.3, 1)
- Hover boutons : transition 400ms, légère élévation `-translate-y-0.5`
- Icônes Lucide : `stroke-width={1.25}` (au lieu de 2)
- StickyMobileCTA : noir + or au lieu du bleu actuel

## Garanties

- ✅ Texte / images / ordre des sections **inchangés**
- ✅ Espaces privés (admin/agent/client/apporteur) **non impactés** (scope CSS strict)
- ✅ `/landing` legacy non touchée — seulement `/` (HomePage)
- ✅ Auth, RLS, Edge Functions, tracking UTM, pixels Meta/TikTok/Google **intacts**
- ✅ Responsive mobile préservé (testé sur 390x844)
- ✅ Performance : ajout d'une seule font Google (Playfair Display) — preload pour zéro flash

## Question rapide avant de coder

Merci de confirmer 2 points pour adapter précisément le rendu :

1. **Ambiance** :
   - **A)** Tout sombre (noir + or) — esprit Sotheby's gala
   - **B)** Tout clair (ivoire + or bronze) — esprit Barnes lumineux
   - **C)** Bi-tons alternés (sombre/ivoire) — esprit magazine luxe ← *ma reco*

2. **Police titres** :
   - **A)** Playfair Display (chic moderne, très lisible) ← *ma reco*
   - **B)** Cormorant Garamond (haute couture, plus délicate)
   - **C)** Bodoni Moda (magazine de mode, ultra contrastée)

Réponds par exemple "C + A" et je lance l'implémentation.
