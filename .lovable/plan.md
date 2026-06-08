## Objectif
SEO local premium sur `/` (Lausanne, Crissier, Genève, Suisse romande) sans toucher backend, routes, footer, formulaires, dépendances. Pas de promesse de 1ère position Google.

## Principe technique clé
`index.html` étant partagé par toutes les routes SPA, **on n'y met QUE le sitewide**. Tout ce qui est spécifique à `/` (canonical, FAQPage, title/description home) est injecté dynamiquement depuis `Landing.tsx` via un hook DOM natif — **zéro dépendance**.

---

## Fichiers modifiés (7)

### 1. `index.html` — sitewide uniquement
- `<title>` par défaut : `Agence de relocation à Lausanne | Logisorama by Immo-rama.ch`
- `<meta name="description">` générique (~155 car.)
- **❌ Aucun `<link rel="canonical">` global** (évite que `/mentions-legales`, `/nouveau-mandat`… soient canonicalisées vers `/`)
- OG / Twitter sitewide conservés (fallback social crawlers qui n'exécutent pas le JS)
- **JSON-LD sitewide seulement** (2 blocs) :
  - `Organization` (Immo-rama.ch, IDE CHE-442.303.796, Crissier)
  - `RealEstateAgent` + `LocalBusiness` (Chemin de l'Esparcette 5 / 1023 Crissier, 021 625 95 05, info@immo-rama.ch, geo, areaServed Vaud/Genève/Fribourg/Valais/Neuchâtel/Jura, services relocation/recherche/chasseur)
- **❌ Pas de `WebSite` + `SearchAction`** (pas de moteur interne, et Google a retiré le sitelinks searchbox en 11/2024)
- **❌ Pas de `FAQPage` global**

### 2. `src/hooks/useHomeHead.ts` (nouveau)
Hook natif, monté uniquement par `Landing.tsx` :
- Crée `<link rel="canonical" href="https://logisorama.ch/" data-home-head="true" id="home-canonical">` au mount
- Crée `<script type="application/ld+json" data-home-head="true" id="home-faq-jsonld">` contenant le FAQPage **généré automatiquement à partir de `HOME_FAQ`** importé de `PremiumFAQ`
- Met à jour `document.title` (home) + `<meta name="description">` (home), restaure les valeurs précédentes au unmount
- **Idempotent** : avant insertion, supprime tout élément existant avec le même `id` / `data-home-head` pour éviter les doublons en cas de remount React
- Nettoyage au unmount : retire uniquement les éléments portant `data-home-head="true"`

### 3. `src/pages/Landing.tsx`
- Appel `useHomeHead()` en tête
- Import lazy `SeoLocalSection` + insertion dans le `<Suspense>` avant `LandingFooter`

### 4. `src/components/landing/premium/PremiumHero.tsx`
- H1 unique : « Votre agence de relocation et chasseur d'appartement à Lausanne »
- Sous-titre enrichi (Lausanne, Genève, Suisse romande), ton premium conservé
- Les deux `<h2>` internes des cartes rétrogradés en `<p>` bold pour préserver la hiérarchie
- Aucun changement visuel, aucun CTA touché

### 5. `src/components/landing/premium/PremiumFAQ.tsx`
- **Export `HOME_FAQ`** : source unique de vérité (10 Q/R, 60–120 mots) → réutilisée par le DOM **et** par `useHomeHead` pour générer le JSON-LD FAQPage (zéro divergence)
- 10 questions SEO demandées, reformulant prix/garantie pour ne rien perdre côté conversion
- UX/visuel inchangé
- Note : le FAQPage reste utile pour la sémantique ; ne pas le vendre comme un levier garanti de rich snippet (Google a retiré l'affichage enrichi FAQ le 07/05/2026)

### 6. `src/components/landing/CoverageSection.tsx`
- Sous-titre enrichi avec communes (Crissier, Renens, Prilly, Ecublens, Morges, Nyon, Vevey, Montreux, Pully, Lutry) + mention UNIL · EPFL
- Layout inchangé, pas de liste brute

### 7. `src/components/landing/SeoLocalSection.tsx` (nouveau)
Section premium insérée avant le footer :
- H2 : « Recherche d'appartement à Lausanne, Genève et en Suisse romande »
- Texte 700–900 mots, H3 :
  - Un agent immobilier personnel pour trouver votre logement
  - Appartement à louer, maison à louer ou bien immobilier à vendre
  - Relocation pour étudiants UNIL & EPFL, expatriés et entreprises
  - Une agence immobilière basée à Crissier, proche de Lausanne
  - Pourquoi choisir Logisorama by Immo-rama.ch
- Bloc « Nous accompagnons votre recherche en Suisse romande » : 6 cartes (Ouest lausannois / zones étudiantes UNIL-EPFL / Riviera / La Côte / Genève / autres cantons romands)
- Maillage interne naturel vers `/nouveau-mandat`, `/vendre-mon-bien`, `/relouer-mon-appartement`, `/mentions-legales`, `/politique-confidentialite`
- Tokens design existants, mobile-first

---

## Non touché
Backend, routes, footer, formulaires, migrations SQL, dépendances, `robots.txt`, `sitemap.xml`, pages EN/DE des mentions légales, autres routes.

## Garanties après livraison
- `/` : title + description + canonical + JSON-LD FAQPage spécifiques home, injectés/nettoyés proprement
- Autres routes : aucun canonical erroné vers `/`, seulement `Organization` + `RealEstateAgent` sitewide (cohérent avec leur contenu)
- Aucun `SearchAction`, aucun doublon DOM (hook idempotent via `data-home-head`)
- FAQ visible et JSON-LD FAQPage strictement alignés via `HOME_FAQ`
- Aucune promesse de 1ère position Google
- Zéro dépendance ajoutée

## Stratégie future (hors scope)
Pages locales dédiées à créer plus tard : `/agence-relocation-lausanne`, `/chasseur-appartement-geneve`, `/logement-etudiant-unil-epfl`, `/recherche-appartement-montreux`, `/agence-immobiliere-crissier`…
